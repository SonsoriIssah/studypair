import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, field_validator

# FEATURE.md's scale: 100/200/300/400. Kept here rather than as a DB CHECK
# constraint so the scale can change without a migration if it ever needs to.
VALID_LEVELS = {100, 200, 300, 400}


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str
    full_name: str
    phone_number: str | None
    level: int | None
    profile_completed: bool
    is_admin: bool
    created_at: datetime


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class CompleteProfileRequest(BaseModel):
    phone_number: str
    level: int

    @field_validator("level")
    @classmethod
    def _valid_level(cls, value: int) -> int:
        if value not in VALID_LEVELS:
            raise ValueError(f"level must be one of {sorted(VALID_LEVELS)}")
        return value
