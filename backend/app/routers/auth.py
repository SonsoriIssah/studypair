"""Google OAuth login, profile completion, and the current user's profile.

The app supports both Google OAuth and email/password sign-in. Password
sign-up creates the account immediately — no email verification step (see
docs/DECISIONS.md). The frontend stores the issued JWT in session storage
and sends it as a Bearer token.
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
from app.models.user import User
from app.schemas.auth import (
    AvatarUpdateRequest,
    CompleteProfileRequest,
    LoginRequest,
    RegisterRequest,
    TokenResponse,
    UserRead,
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


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: Session = Depends(get_db)) -> TokenResponse:
    """Create a password-auth account immediately — no email verification."""
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
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return TokenResponse(access_token=create_access_token(user.id), token_type="bearer")


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

    _clear_failed_logins(normalized_email)
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
        else:
            user = User(google_id=google_id, email=email, full_name=full_name)
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
