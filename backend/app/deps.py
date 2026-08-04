"""Shared request dependencies for the tutor and student routers.

PROVISIONAL — please read before relying on this.

Google OAuth and JWT session issuing are Sonsori's piece (`app/routers/auth.py`),
and they aren't written yet. Every endpoint in `tutors.py` and `students.py`
needs a current user, so this is a placeholder built against the token shape
implied by the foundation: HS256, signed with `settings.JWT_SECRET`
(python-jose is already in requirements.txt), with the user's UUID in `sub`.

If the real auth issues a different claim shape, THIS FILE is the only thing
that needs to change — no router touches tokens directly.

The `X-Debug-User-Id` header fallback exists purely so these endpoints can be
exercised in /docs before auth lands. It is only honoured while `JWT_SECRET`
is unset or still the `.env.example` placeholder, so it is inert as soon as a
real secret is configured. Delete it once auth is merged.
"""

import uuid

from fastapi import Depends, Header, HTTPException
from fastapi import status as http_status
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.models import User

JWT_ALGORITHM = "HS256"

# Values that mean "no real secret has been configured yet".
_PLACEHOLDER_SECRETS = {"", "changeme"}


def _unauthorised(detail: str) -> HTTPException:
    return HTTPException(
        status_code=http_status.HTTP_401_UNAUTHORIZED,
        detail=detail,
        headers={"WWW-Authenticate": "Bearer"},
    )


def _user_id_from_token(token: str) -> uuid.UUID:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except JWTError as exc:
        raise _unauthorised("Invalid or expired token") from exc

    subject = payload.get("sub")
    if subject is None:
        raise _unauthorised("Token is missing a subject claim")
    try:
        return uuid.UUID(str(subject))
    except ValueError as exc:
        raise _unauthorised("Token subject is not a valid user id") from exc


def get_current_user(
    authorization: str | None = Header(default=None),
    x_debug_user_id: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> User:
    """Resolve the signed-in user, or raise 401."""
    if authorization and authorization.lower().startswith("bearer "):
        user_id = _user_id_from_token(authorization.split(" ", 1)[1].strip())
    elif x_debug_user_id and settings.JWT_SECRET in _PLACEHOLDER_SECRETS:
        try:
            user_id = uuid.UUID(x_debug_user_id)
        except ValueError as exc:
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail="X-Debug-User-Id must be a UUID",
            ) from exc
    else:
        raise _unauthorised("Not authenticated")

    user = db.get(User, user_id)
    if user is None:
        raise _unauthorised("User no longer exists")
    return user
