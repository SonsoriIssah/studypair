"""Request/response models for the tutor dashboard."""

import enum
import uuid
from datetime import datetime, time

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.models.match_request import MatchRequestStatus
from app.models.tutor_availability_slot import DayOfWeek
from app.schemas.common import CourseRead, Level, SlotRead


class MatchRequestStatusFilter(str, enum.Enum):
    """Status filter for the tutor's request list. `all` skips filtering."""

    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    EXPIRED = "expired"
    CANCELLED = "cancelled"
    ALL = "all"


class RequestingStudent(BaseModel):
    """The student behind an incoming request — enough for the tutor to decide."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    full_name: str
    email: str
    level: int | None


class IncomingMatchRequest(BaseModel):
    id: uuid.UUID
    status: MatchRequestStatus
    created_at: datetime
    responded_at: datetime | None
    student: RequestingStudent
    course: CourseRead
    slot: SlotRead


class CourseCreate(BaseModel):
    course_name: str = Field(min_length=1, max_length=120)
    level: Level

    @field_validator("course_name")
    @classmethod
    def _strip(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("course_name cannot be blank")
        return stripped


class CourseAddResult(BaseModel):
    """Adding a course can fulfil open course applications — report how many."""

    course: CourseRead
    fulfilled_applications: int
    students_notified: int


class SlotCreate(BaseModel):
    day_of_week: DayOfWeek
    start_time: time
    end_time: time
    # 1 is one-on-one and behaves like the old is_booked flag; above 1 makes
    # this a bulk slot, where requests are auto-accepted until it fills.
    max_students: int = Field(default=1, ge=1, le=50)

    @model_validator(mode="after")
    def _check_time_range(self) -> "SlotCreate":
        if self.start_time >= self.end_time:
            raise ValueError("start_time must be before end_time")
        return self


class SlotUpdate(BaseModel):
    """Partial update — only the fields you send are changed.

    The full start/end-time-range check happens in the router against the
    merged (existing + incoming) values, since either side alone doesn't
    tell you enough here.
    """

    day_of_week: DayOfWeek | None = None
    start_time: time | None = None
    end_time: time | None = None
    max_students: int | None = Field(default=None, ge=1, le=50)
