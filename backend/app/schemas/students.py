"""Request/response models for the student dashboard."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.course_application import CourseApplicationStatus
from app.models.match_request import MatchRequestStatus
from app.schemas.common import CourseRead, SlotRead


class TutorBrowseItem(BaseModel):
    """A tutor as seen from the browse screen.

    Contact details (email, phone) are deliberately left out — a student
    hasn't been matched with this tutor yet.
    """

    id: uuid.UUID
    full_name: str
    courses: list[CourseRead]
    available_slots: list[SlotRead]


class MatchRequestCreate(BaseModel):
    course_id: uuid.UUID
    slot_id: uuid.UUID


class RequestedTutor(BaseModel):
    """The tutor behind an outgoing request — the mirror of tutors.py's
    RequestingStudent."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    full_name: str
    email: str


class OutgoingMatchRequest(BaseModel):
    """A request this student made, from their side — mirrors tutors.py's
    IncomingMatchRequest but shows the tutor instead of the student."""

    id: uuid.UUID
    status: MatchRequestStatus
    created_at: datetime
    responded_at: datetime | None
    tutor: RequestedTutor
    course: CourseRead
    slot: SlotRead


class CourseApplicationCreate(BaseModel):
    course_name: str = Field(min_length=1, max_length=120)

    @field_validator("course_name")
    @classmethod
    def _strip(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("course_name cannot be blank")
        return stripped


class CourseApplicationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    student_id: uuid.UUID
    course_name: str
    status: CourseApplicationStatus
    created_at: datetime
    expires_at: datetime


class NotificationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    message: str
    read: bool
    created_at: datetime
