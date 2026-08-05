import uuid

from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class TutorCourse(Base):
    __tablename__ = "tutor_courses"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tutor_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    course_name: Mapped[str] = mapped_column(String, nullable=False)
    # FEATURE.md: a tutor teaching the same subject at two levels needs two
    # rows — "Calculus I / 100" and "Calculus I / 200" are different
    # listings. Required (not nullable): a course listing without a level
    # doesn't mean anything under this model. NOT NULL is safe to add
    # directly since tutor_courses is currently empty on this DB — if that's
    # no longer true elsewhere, the migration will fail loudly rather than
    # silently guessing a default.
    level: Mapped[int] = mapped_column(Integer, nullable=False)
