"""Reusable notification creation, for other routers/services to call.

Not wired into any caller here. tutors.py currently creates Notification rows
inline when a course fulfills an open application — that predates this
function and is out of scope to touch (see DO-NOT-TOUCH), but it's the
natural caller if that code is ever refactored to use this instead.
"""
import uuid

from sqlalchemy.orm import Session

from app.models.notification import Notification


def create_notification(db: Session, user_id: uuid.UUID, message: str) -> Notification:
    notification = Notification(user_id=user_id, message=message)
    db.add(notification)
    db.commit()
    db.refresh(notification)
    return notification
