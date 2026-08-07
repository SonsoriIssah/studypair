import enum
import uuid
from datetime import datetime, timedelta

from sqlalchemy import DateTime, Enum, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class CourseApplicationStatus(str, enum.Enum):
    OPEN = "open"
    FULFILLED = "fulfilled"
    EXPIRED = "expired"
    WITHDRAWN = "withdrawn"


def _default_expires_at() -> datetime:
    return datetime.utcnow() + timedelta(days=2)


class CourseApplication(Base):
    __tablename__ = "course_applications"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    course_name: Mapped[str] = mapped_column(String, nullable=False)
    status: Mapped[CourseApplicationStatus] = mapped_column(
        Enum(CourseApplicationStatus, name="course_application_status"),
        default=CourseApplicationStatus.OPEN,
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime, default=_default_expires_at, nullable=False)
