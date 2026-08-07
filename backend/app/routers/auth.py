"""Google OAuth login, profile completion, and the current user's profile.

The app supports both Google OAuth and email/password sign-in. The frontend
stores the issued JWT in session storage and sends it as a Bearer token.
"""
import hashlib
import os
import secrets
import smtplib
import time
from dataclasses import dataclass
from email.message import EmailMessage

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
    CompleteProfileRequest,
    LoginRequest,
    RegisterRequest,
    TokenResponse,
    UserRead,
    VerifyRegistrationRequest,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@dataclass
class PendingRegistration:
    email: str
    full_name: str
    password_hash: str
    code_hash: str
    expires_at: float
    attempts: int = 0


PENDING_REGISTRATIONS: dict[str, PendingRegistration] = {}

# A 6-digit code only has 1,000,000 possibilities, which is guessable well
# within the 10-minute expiry window if an attacker can hit /register/verify
# as fast as the network allows and there's nothing capping how many wrong
# guesses are accepted. Capping attempts per pending registration closes
# that off without needing a separate rate-limiting dependency.
MAX_CODE_ATTEMPTS = 5

# Same idea for password login: without a cap, /auth/login is a plain
# password brute-force oracle (bcrypt slows each guess down, but a botnet
# doesn't care). Keyed by normalized email — not IP — so a single account
# can't be hammered from many IPs, and the lockout doesn't help an attacker
# tell a real account apart from an unregistered one (both just 401).
MAX_LOGIN_ATTEMPTS = 5
LOGIN_LOCKOUT_SECONDS = 15 * 60

FAILED_LOGIN_ATTEMPTS: dict[str, list[float]] = {}


def _generate_code() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"


def _hash_code(code: str) -> str:
    return hashlib.sha256(code.encode("utf-8")).hexdigest()


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


def _send_verification_email(to_email: str, code: str) -> None:
    smtp_host = settings.SMTP_HOST
    if smtp_host:
        message = EmailMessage()
        message["Subject"] = "StudyPair verification code"
        message["To"] = to_email
        message["From"] = settings.SMTP_FROM_EMAIL or "no-reply@studypair.local"
        message.set_content(
            f"Your StudyPair verification code is {code}. It expires in 10 minutes."
        )
        with smtplib.SMTP(smtp_host, settings.SMTP_PORT or 587) as smtp:
            if settings.SMTP_USERNAME:
                smtp.starttls()
                smtp.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
            smtp.send_message(message)
        return

    print(f"[auth] verification code for {to_email}: {code}")


@router.get("/health")
def health():
    return {"status": "ok"}


@router.post("/register/initiate")
def initiate_registration(payload: RegisterRequest, db: Session = Depends(get_db)) -> dict[str, str]:
    normalized_email = payload.email
    existing_user = db.scalar(select(User).where(User.email == normalized_email))
    if existing_user is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    code = _generate_code()
    pending = PendingRegistration(
        email=normalized_email,
        full_name=payload.full_name,
        password_hash=hash_password(payload.password),
        code_hash=_hash_code(code),
        expires_at=time.time() + 10 * 60,
    )
    PENDING_REGISTRATIONS[normalized_email] = pending
    _send_verification_email(normalized_email, code)
    return {"message": "Verification code sent to your email", "email": normalized_email}


@router.post("/register/verify", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def verify_registration(payload: VerifyRegistrationRequest, db: Session = Depends(get_db)) -> TokenResponse:
    normalized_email = payload.email
    pending = PENDING_REGISTRATIONS.get(normalized_email)
    if pending is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No pending registration found")
    if pending.expires_at < time.time():
        PENDING_REGISTRATIONS.pop(normalized_email, None)
        raise HTTPException(status_code=status.HTTP_410_GONE, detail="Verification code expired")

    if pending.code_hash != _hash_code(payload.code):
        pending.attempts += 1
        if pending.attempts >= MAX_CODE_ATTEMPTS:
            # Burn the pending registration rather than leaving it guessable
            # for the rest of the 10-minute window. The user just restarts
            # registration from initiate, which issues a fresh code.
            PENDING_REGISTRATIONS.pop(normalized_email, None)
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many incorrect attempts. Please request a new verification code.",
            )
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid verification code")

    existing_user = db.scalar(select(User).where(User.email == normalized_email))
    if existing_user is not None:
        PENDING_REGISTRATIONS.pop(normalized_email, None)
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    user = User(
        email=normalized_email,
        full_name=pending.full_name,
        google_id=None,
        password_hash=pending.password_hash,
        profile_completed=False,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    PENDING_REGISTRATIONS.pop(normalized_email, None)

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
    current_user.profile_completed = True
    db.commit()
    db.refresh(current_user)
    return current_user


@router.get("/me", response_model=UserRead)
def me(current_user: User = Depends(get_current_user)) -> User:
    return current_user
