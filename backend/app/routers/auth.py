"""Google OAuth login, profile completion, and the current user's profile.

Auth is Google-only (see docs/DECISIONS.md) — there is no password grant.
The mobile client stores the JWT itself and sends it as a Bearer token; the
callback returns the token in the JSON body rather than a cookie.
"""
from authlib.integrations.starlette_client import OAuth
from fastapi import APIRouter, Depends, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.security import create_access_token, get_current_user
from app.models.user import User
from app.schemas.auth import CompleteProfileRequest, TokenResponse, UserRead

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/health")
def health():
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
async def google_callback(request: Request, db: Session = Depends(get_db)) -> TokenResponse:
    token = await oauth.google.authorize_access_token(request)
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
    return TokenResponse(access_token=access_token)


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
