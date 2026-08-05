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
    # FEATURE.md: replaces is_booked. max_students=1 (default) behaves
    # exactly like the old boolean — the 1-on-1 flow is unchanged. Anything
    # higher is a bulk/group session. "Full" is computed:
    # current_students >= max_students. Checking and incrementing this must
    # happen as one atomic, row-locked operation on the request path — see
    # FEATURE.md's concurrency section. That locking code is Daniel's, not
    # added here; this is the schema layer only.
    max_students: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    current_students: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
