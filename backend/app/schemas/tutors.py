"""Request/response models for the tutor dashboard."""

import enum
import uuid
from datetime import datetime, time

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.models.match_request import MatchRequestStatus
from app.models.tutor_availability_slot import DayOfWeek
from app.schemas.common import CourseRead, SlotRead


class MatchRequestStatusFilter(str, enum.Enum):
    """Status filter for the tutor's request list. `all` skips filtering."""

    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    EXPIRED = "expired"
    ALL = "all"


class RequestingStudent(BaseModel):
    """The student behind an incoming request — enough for the tutor to decide."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    full_name: str
    email: str


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

    @model_validator(mode="after")
    def _check_time_range(self) -> "SlotCreate":
        if self.start_time >= self.end_time:
            raise ValueError("start_time must be before end_time")
        return self
