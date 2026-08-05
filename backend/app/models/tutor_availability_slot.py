import enum
import uuid
from datetime import time

from sqlalchemy import Enum, ForeignKey, Integer, Time
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class DayOfWeek(str, enum.Enum):
    MON = "Mon"
    TUE = "Tue"
    WED = "Wed"
    THU = "Thu"
    FRI = "Fri"
    SAT = "Sat"
    SUN = "Sun"


class TutorAvailabilitySlot(Base):
    __tablename__ = "tutor_availability_slots"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tutor_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    day_of_week: Mapped[DayOfWeek] = mapped_column(Enum(DayOfWeek, name="day_of_week"), nullable=False)
    start_time: Mapped[time] = mapped_column(Time, nullable=False)
    end_time: Mapped[time] = mapped_column(Time, nullable=False)
    # FEATURE.md: capacity replaces the old `is_booked` boolean. max_students=1
    # is a one-on-one slot and behaves exactly as is_booked did. "Full" is
    # current_students >= max_students — see app/services/slots.py, which owns
    # every change to current_students.
    max_students: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    current_students: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
