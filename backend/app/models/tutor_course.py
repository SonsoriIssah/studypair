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
    # The level this course is taught at. Students only see courses at their own
    # level, but a tutor may offer a course at any level, so this is a property
    # of the course rather than of the tutor.
    level: Mapped[int] = mapped_column(Integer, nullable=False)
