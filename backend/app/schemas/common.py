"""Response shapes shared by the tutor and student routers."""

import uuid
from datetime import datetime, time
from typing import Annotated

from pydantic import AfterValidator, BaseModel, ConfigDict, computed_field

from app.models.match_request import MatchRequestStatus
from app.models.tutor_availability_slot import DayOfWeek

# FEATURE.md gives the scale as 100/200/300/400.
LEVEL_CHOICES = (100, 200, 300, 400)


def _valid_level(value: int) -> int:
    if value not in LEVEL_CHOICES:
        raise ValueError(f"level must be one of {', '.join(str(l) for l in LEVEL_CHOICES)}")
    return value


Level = Annotated[int, AfterValidator(_valid_level)]


class CourseRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    course_name: str
    level: int


class SlotRead(BaseModel):
    """A slot with its capacity. `is_booked` is gone — fullness is computed."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    day_of_week: DayOfWeek
    start_time: time
    end_time: time
    max_students: int
    current_students: int

    @computed_field  # type: ignore[prop-decorator]
    @property
    def seats_available(self) -> int:
        return max(self.max_students - self.current_students, 0)

    @computed_field  # type: ignore[prop-decorator]
    @property
    def is_full(self) -> bool:
        return self.current_students >= self.max_students

    @computed_field  # type: ignore[prop-decorator]
    @property
    def is_bulk(self) -> bool:
        """True when requesting this slot is auto-accepted rather than pending."""
        return self.max_students > 1


class MatchRequestRead(BaseModel):
    """Flat view of a match request, returned after create/accept/reject."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    student_id: uuid.UUID
    tutor_id: uuid.UUID
    course_id: uuid.UUID
    slot_id: uuid.UUID
    status: MatchRequestStatus
    created_at: datetime
    responded_at: datetime | None
