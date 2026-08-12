"""Google OAuth login, profile completion, and the current user's profile.

The app supports both Google OAuth and email/password sign-in. Password
sign-up creates the account immediately but withholds the access token
until the emailed 6-digit code is confirmed via POST /verify-email — see
app/services/email_verification.py. Google sign-ins skip this: Google has
already confirmed the address. The frontend stores the issued JWT in
session storage and sends it as a Bearer token.
"""
import time

from authlib.integrations.starlette_client import OAuth, OAuthError
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import RedirectResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.security import (
    create_access_token,
    get_current_user,
    hash_password,
    verify_password,
)
from app.models import CourseApplication, MatchRequest, Notification, TutorAvailabilitySlot, TutorCourse
from app.models.user import User
from app.schemas.auth import (
    AvatarUpdateRequest,
    CompleteProfileRequest,
    ForgotPasswordRequest,
    LoginRequest,
    RegisterRequest,
    RegisterResponse,
    ResendVerificationRequest,
    ResetPasswordRequest,
    TokenResponse,
    UserRead,
    VerifyEmailRequest,
)
from app.services.email import send_email
from app.services.email_verification import (
    clear_code,
    is_in_resend_cooldown,
    issue_code,
    verification_email_html,
    verify_code,
)
from app.services.password_reset import (
    clear_code as clear_reset_code,
    is_in_resend_cooldown as is_in_reset_cooldown,
    issue_code as issue_reset_code,
    reset_email_html,
    verify_code as verify_reset_code,
)

router = APIRouter(prefix="/auth", tags=["auth"])

# Password login is a brute-force oracle without a cap (bcrypt slows each
# guess down, but a botnet doesn't care). Keyed by normalized email — not
# IP — so a single account can't be hammered from many IPs, and the lockout
# doesn't help an attacker tell a real account apart from an unregistered
# one (both just 401).
MAX_LOGIN_ATTEMPTS = 5
LOGIN_LOCKOUT_SECONDS = 15 * 60

FAILED_LOGIN_ATTEMPTS: dict[str, list[float]] = {}

# Exact text the frontend pattern-matches on to route to the verify-email
# screen instead of showing a generic login error.
EMAIL_NOT_VERIFIED_DETAIL = "Please verify your email before signing in."


def _register_failed_login(email: str) -> None:
    now = time.time()
    attempts = [t for t in FAILED_LOGIN_ATTEMPTS.get(email, []) if now - t < LOGIN_LOCKOUT_SECONDS]
    attempts.append(now)
    FAILED_LOGIN_ATTEMPTS[email] = attempts


def _is_login_locked_out(email: str) -> bool:
    now = time.time()
    attempts = [t for t in FAILED_LOGIN_ATTEMPTS.get(email, []) if now - t < LOGIN_LOCKOUT_SECONDS]
    FAILED_LOGIN_ATTEMPTS[email] = attempts
    return len(attempts) >= MAX_LOGIN_ATTEMPTS


def _clear_failed_logins(email: str) -> None:
    FAILED_LOGIN_ATTEMPTS.pop(email, None)


@router.get("/health")
def health():
    return {"status": "ok"}


@router.post("/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: Session = Depends(get_db)) -> RegisterResponse:
    """Create a password-auth account and email it a verification code.

    No access token is issued here — the account can't sign in until
    POST /verify-email confirms the code.
    """
    normalized_email = payload.email
    existing_user = db.scalar(select(User).where(User.email == normalized_email))
    if existing_user is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    user = User(
        email=normalized_email,
        full_name=payload.full_name,
        google_id=None,
        password_hash=hash_password(payload.password),
        profile_completed=False,
        email_verified=False,
    )
    code = issue_code(user)
    db.add(user)
    db.flush()

    try:
        send_email(user.email, "Your StudyPair verification code", verification_email_html(code))
    except Exception:
        # Don't leave an unverifiable, unreachable account behind — a send
        # failure should be retry-able via registering again, not a 409
        # dead-end because the row already exists with no way to reach it.
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Could not send the verification email. Please try again shortly.",
        )

    db.commit()
    return RegisterResponse(email=user.email)


@router.post("/verify-email", response_model=TokenResponse)
def verify_email(payload: VerifyEmailRequest, db: Session = Depends(get_db)) -> TokenResponse:
    user = db.scalar(select(User).where(User.email == payload.email))
    if user is None or not verify_code(user, payload.code):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired code")

    user.email_verified = True
    clear_code(user)
    db.commit()

    return TokenResponse(access_token=create_access_token(user.id), token_type="bearer")


@router.post("/resend-verification", status_code=status.HTTP_204_NO_CONTENT)
def resend_verification(payload: ResendVerificationRequest, db: Session = Depends(get_db)) -> None:
    user = db.scalar(select(User).where(User.email == payload.email))
    # Same response whether or not the account exists, or is already
    # verified — this endpoint shouldn't let someone probe which emails
    # are registered.
    if user is None or user.email_verified:
        return
    if is_in_resend_cooldown(user):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Please wait a moment before requesting another code.",
        )

    code = issue_code(user)
    try:
        send_email(user.email, "Your StudyPair verification code", verification_email_html(code))
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Could not send the verification email. Please try again shortly.",
        )
    db.commit()


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    normalized_email = payload.email

    if _is_login_locked_out(normalized_email):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many failed login attempts. Please try again in a few minutes.",
        )

    user = db.scalar(select(User).where(User.email == normalized_email))
    if user is None or not user.password_hash or not verify_password(payload.password, user.password_hash):
        _register_failed_login(normalized_email)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    if not user.email_verified:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=EMAIL_NOT_VERIFIED_DETAIL)

    _clear_failed_logins(normalized_email)
    return TokenResponse(access_token=create_access_token(user.id), token_type="bearer")


@router.post("/forgot-password", status_code=status.HTTP_204_NO_CONTENT)
def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)) -> None:
    user = db.scalar(select(User).where(User.email == payload.email))
    # Same response whether or not the account exists, or is a Google-only
    # account with no password to reset — this endpoint shouldn't let someone
    # probe which emails are registered.
    if user is None or user.password_hash is None:
        return
    if is_in_reset_cooldown(user):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Please wait a moment before requesting another code.",
        )

    code = issue_reset_code(user)
    try:
        send_email(user.email, "Reset your StudyPair password", reset_email_html(code))
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Could not send the reset email. Please try again shortly.",
        )
    db.commit()


@router.post("/reset-password", response_model=TokenResponse)
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)) -> TokenResponse:
    user = db.scalar(select(User).where(User.email == payload.email))
    if user is None or not verify_reset_code(user, payload.code):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired code")

    user.password_hash = hash_password(payload.new_password)
    clear_reset_code(user)
    _clear_failed_logins(user.email)
    db.commit()

    return TokenResponse(access_token=create_access_token(user.id), token_type="bearer")


@router.post("/logout")
def logout() -> dict[str, str]:
    return {"status": "ok"}


oauth = OAuth()
oauth.register(
    name="google",
    client_id=settings.GOOGLE_CLIENT_ID,
    client_secret=settings.GOOGLE_CLIENT_SECRET,
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_kwargs={"scope": "openid email profile"},
)


@router.get("/google/login")
async def google_login(request: Request):
    redirect_uri = request.url_for("google_callback")
    return await oauth.google.authorize_redirect(request, redirect_uri)


@router.get("/google/callback", name="google_callback")
async def google_callback(request: Request, db: Session = Depends(get_db)) -> RedirectResponse:
    """Finish the Google handoff and send the browser back to the SPA.

    This can't return the token as a JSON body the way a native app's
    in-app browser might expect: the browser lands on this URL directly
    after Google's redirect, so the only way to get the token to the React
    app is to redirect *to* it. The token is passed in the URL fragment
    (`#token=...`, not `?token=...`) so it's never sent to any server —
    fragments aren't included in the HTTP request for the page that reads
    them, or in Referer headers on subsequent navigation. The frontend reads
    it from `window.location.hash` on the /auth/callback route and then
    strips it from the URL immediately.
    """
    try:
        token = await oauth.google.authorize_access_token(request)
    except OAuthError:
        return RedirectResponse(f"{settings.FRONTEND_URL}/auth/callback#error=oauth_failed")

    userinfo = token["userinfo"]

    google_id = userinfo["sub"]
    email = userinfo["email"]
    full_name = userinfo.get("name", "")

    user = db.scalar(select(User).where(User.google_id == google_id))

    if user is None:
        # Shouldn't normally happen since Google is the only auth method, but
        # guard against a pre-existing row with the same email anyway.
        user = db.scalar(select(User).where(User.email == email))
        if user is not None:
            user.google_id = google_id
            # Google has now confirmed they own this address, even if the
            # row was originally created via unverified password signup.
            user.email_verified = True
        else:
            user = User(google_id=google_id, email=email, full_name=full_name, email_verified=True)
            db.add(user)
        db.commit()
        db.refresh(user)

    access_token = create_access_token(user.id)
    return RedirectResponse(f"{settings.FRONTEND_URL}/auth/callback#token={access_token}")


@router.post("/complete-profile", response_model=UserRead)
def complete_profile(
    payload: CompleteProfileRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> User:
    current_user.phone_number = payload.phone_number
    current_user.level = payload.level
    if payload.full_name:
        current_user.full_name = payload.full_name
    if payload.university_id is not None:
        current_user.university_id = payload.university_id
    current_user.profile_completed = True
    db.commit()
    db.refresh(current_user)
    return current_user


@router.post("/me/avatar", response_model=UserRead)
def update_avatar(
    payload: AvatarUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> User:
    """Set (or replace) the current user's profile photo.

    The frontend resizes the image before sending it — this endpoint just
    validates it's still a reasonably-sized image data URL and stores it.
    """
    current_user.avatar_data_url = payload.data_url
    db.commit()
    db.refresh(current_user)
    return current_user


@router.get("/me", response_model=UserRead)
def me(current_user: User = Depends(get_current_user)) -> User:
    return current_user


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
def delete_account(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    """Permanently delete the current user and everything tied to them.

    No FK in this schema cascades on delete, so dependents are removed by
    hand in dependency order: match requests first (they reference courses,
    slots, and users), then the tutor's own courses/slots, then everything
    else that references this user directly.
    """
    user_id = current_user.id

    db.query(MatchRequest).filter(
        (MatchRequest.student_id == user_id) | (MatchRequest.tutor_id == user_id)
    ).delete(synchronize_session=False)
    db.query(CourseApplication).filter(CourseApplication.student_id == user_id).delete(
        synchronize_session=False
    )
    db.query(Notification).filter(Notification.user_id == user_id).delete(synchronize_session=False)
    db.query(TutorAvailabilitySlot).filter(TutorAvailabilitySlot.tutor_id == user_id).delete(
        synchronize_session=False
    )
    db.query(TutorCourse).filter(TutorCourse.tutor_id == user_id).delete(synchronize_session=False)

    db.delete(current_user)
    db.commit()
