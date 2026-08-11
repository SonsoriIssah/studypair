import re
import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, field_validator, model_validator

# FEATURE.md's scale: 100/200/300/400. Kept here rather than as a DB CHECK
# constraint so the scale can change without a migration if it ever needs to.
VALID_LEVELS = {100, 200, 300, 400}


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str
    full_name: str
    phone_number: str | None
    university_id: str | None
    level: int | None
    profile_completed: bool
    is_admin: bool
    created_at: datetime


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class RegisterRequest(BaseModel):
    email: str
    password: str
    confirm_password: str
    full_name: str

    @field_validator("email")
    @classmethod
    def _normalize_email(cls, value: str) -> str:
        normalized = value.strip().lower()
        if "@" not in normalized or "." not in normalized:
            raise ValueError("email must be a valid email address")
        return normalized

    @field_validator("password")
    @classmethod
    def _valid_password(cls, value: str) -> str:
        if len(value) < 8:
            raise ValueError("password must be at least 8 characters long")
        if not re.search(r"[A-Z]", value) or not re.search(r"[a-z]", value):
            raise ValueError("password must include both upper and lower case letters")
        if not re.search(r"\d", value):
            raise ValueError("password must include at least one number")
        return value

    @field_validator("full_name")
    @classmethod
    def _valid_name(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("full_name is required")
        return cleaned

    @model_validator(mode="after")
    def _confirm_passwords(self) -> "RegisterRequest":
        if self.password != self.confirm_password:
            raise ValueError("passwords do not match")
        return self


class LoginRequest(BaseModel):
    email: str
    password: str

    @field_validator("email")
    @classmethod
    def _normalize_email(cls, value: str) -> str:
        normalized = value.strip().lower()
        if "@" not in normalized or "." not in normalized:
            raise ValueError("email must be a valid email address")
        return normalized


class CompleteProfileRequest(BaseModel):
    phone_number: str
    level: int
    full_name: str | None = None
    university_id: str | None = None

    @field_validator("level")
    @classmethod
    def _valid_level(cls, value: int) -> int:
        if value not in VALID_LEVELS:
            raise ValueError(f"level must be one of {sorted(VALID_LEVELS)}")
        return value

    @field_validator("full_name")
    @classmethod
    def _non_empty_full_name(cls, value: str | None) -> str | None:
        if value is not None and not value.strip():
            raise ValueError("full_name cannot be blank")
        return value.strip() if value else value
