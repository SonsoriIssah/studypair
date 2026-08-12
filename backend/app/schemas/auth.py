import re
import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, field_validator, model_validator

# FEATURE.md's scale: 100/200/300/400. Kept here rather than as a DB CHECK
# constraint so the scale can change without a migration if it ever needs to.
VALID_LEVELS = {100, 200, 300, 400}


def _validate_password_strength(value: str) -> str:
    """Shared by signup and password-reset — both create/replace a password_hash."""
    if len(value) < 8:
        raise ValueError("password must be at least 8 characters long")
    if not re.search(r"[A-Z]", value) or not re.search(r"[a-z]", value):
        raise ValueError("password must include both upper and lower case letters")
    if not re.search(r"\d", value):
        raise ValueError("password must include at least one number")
    if not re.search(r"[^A-Za-z0-9]", value):
        raise ValueError("password must include at least one symbol")
    return value


def _normalize_email(value: str) -> str:
    normalized = value.strip().lower()
    if "@" not in normalized or "." not in normalized:
        raise ValueError("email must be a valid email address")
    return normalized


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str
    full_name: str
    phone_number: str | None
    university_id: str | None
    avatar_data_url: str | None
    level: int | None
    profile_completed: bool
    email_verified: bool
    is_admin: bool
    created_at: datetime


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class RegisterResponse(BaseModel):
    """No token yet — the account can't sign in until the email is verified."""

    email: str
    message: str = "Verification code sent"


class VerifyEmailRequest(BaseModel):
    email: str
    code: str

    @field_validator("email")
    @classmethod
    def _normalize_email(cls, value: str) -> str:
        return value.strip().lower()


class ResendVerificationRequest(BaseModel):
    email: str

    @field_validator("email")
    @classmethod
    def _normalize_email(cls, value: str) -> str:
        return value.strip().lower()


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
        if not re.search(r"[^A-Za-z0-9]", value):
            raise ValueError("password must include at least one symbol")
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


class ForgotPasswordRequest(BaseModel):
    email: str

    @field_validator("email")
    @classmethod
    def _normalize(cls, value: str) -> str:
        return value.strip().lower()


class ResetPasswordRequest(BaseModel):
    email: str
    code: str
    new_password: str
    confirm_password: str

    @field_validator("email")
    @classmethod
    def _normalize(cls, value: str) -> str:
        return _normalize_email(value)

    @field_validator("new_password")
    @classmethod
    def _valid_password(cls, value: str) -> str:
        return _validate_password_strength(value)

    @model_validator(mode="after")
    def _confirm_passwords(self) -> "ResetPasswordRequest":
        if self.new_password != self.confirm_password:
            raise ValueError("passwords do not match")
        return self


class AvatarUpdateRequest(BaseModel):
    # A data: URL (e.g. "data:image/jpeg;base64,...") produced by resizing
    # the image client-side before upload. The size cap keeps a single row
    # reasonable given this is stored inline rather than in object storage.
    data_url: str

    @field_validator("data_url")
    @classmethod
    def _valid_data_url(cls, value: str) -> str:
        if not value.startswith("data:image/"):
            raise ValueError("data_url must be an image data URL")
        if len(value) > 400_000:
            raise ValueError("Image is too large — please use a smaller photo")
        return value


class CompleteProfileRequest(BaseModel):
    phone_number: str
    level: int
    university_id: str
    full_name: str | None = None

    @field_validator("level")
    @classmethod
    def _valid_level(cls, value: int) -> int:
        if value not in VALID_LEVELS:
            raise ValueError(f"level must be one of {sorted(VALID_LEVELS)}")
        return value

    @field_validator("phone_number")
    @classmethod
    def _valid_phone(cls, value: str) -> str:
        digits = re.sub(r"\D", "", value)
        if len(digits) != 10:
            raise ValueError("phone_number must be 10 digits")
        return value.strip()

    @field_validator("university_id")
    @classmethod
    def _valid_university_id(cls, value: str) -> str:
        cleaned = value.strip()
        if len(cleaned) != 8:
            raise ValueError("university_id must be 8 characters")
        return cleaned

    @field_validator("full_name")
    @classmethod
    def _non_empty_full_name(cls, value: str | None) -> str | None:
        if value is not None and not value.strip():
            raise ValueError("full_name cannot be blank")
        return value.strip() if value else value
