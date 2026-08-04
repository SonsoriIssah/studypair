"""Response shapes shared by the tutor and student routers."""

import uuid
from datetime import datetime, time

from pydantic import BaseModel, ConfigDict

from app.models.match_request import MatchRequestStatus
from app.models.tutor_availability_slot import DayOfWeek


class CourseRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    course_name: str


class SlotRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    day_of_week: DayOfWeek
    start_time: time
    end_time: time
    is_booked: bool


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
