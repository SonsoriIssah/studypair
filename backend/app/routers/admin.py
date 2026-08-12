"""Admin-only visibility routes for the dev team.

Originally read-only per docs/DECISIONS.md; the one write action (granting or
revoking admin access) was added because there was otherwise no way to make
the *first* admin, or any subsequent one, without a direct DB edit.
"""
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.course_application import CourseApplication, CourseApplicationStatus
from app.models.user import User
from app.schemas.admin import SetAdminRequest
from app.schemas.auth import UserRead
from app.schemas.students import CourseApplicationRead

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/health")
def health():
    return {"status": "ok"}


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required"
        )
    return current_user


@router.get("/course-applications", response_model=list[CourseApplicationRead])
def list_course_applications(
    status_filter: CourseApplicationStatus | None = Query(default=None, alias="status"),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> list[CourseApplication]:
    stmt = select(CourseApplication).order_by(CourseApplication.created_at.desc())
    if status_filter is not None:
        stmt = stmt.where(CourseApplication.status == status_filter)
    return list(db.scalars(stmt).all())


@router.get("/users", response_model=list[UserRead])
def list_users(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> list[User]:
    stmt = select(User).order_by(User.created_at.desc())
    return list(db.scalars(stmt).all())


@router.patch("/users/{user_id}", response_model=UserRead)
def set_admin(
    user_id: uuid.UUID,
    payload: SetAdminRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
) -> User:
    """Grant or revoke admin access. The only way to do this before now was
    direct DB access — this is the self-service replacement.
    """
    if user_id == current_user.id and not payload.is_admin:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You can't remove your own admin access",
        )

    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    user.is_admin = payload.is_admin
    db.commit()
    db.refresh(user)
    return user
