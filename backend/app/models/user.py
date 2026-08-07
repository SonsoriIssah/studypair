import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.core.encryption import EncryptedString


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    google_id: Mapped[str | None] = mapped_column(String, unique=True, nullable=True)
    email: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String, nullable=False)
    password_hash: Mapped[str | None] = mapped_column(String, nullable=True)
    # Encrypted at rest (see app/core/encryption.py) — PII we don't need to
    # search or filter on, only display back to its owner.
    phone_number: Mapped[str | None] = mapped_column(EncryptedString, nullable=True)
    # Nullable: unset until POST /auth/complete-profile. Resolved in
    # FEATURE.md: the browse/booking endpoints in students.py block with a
    # 409 while this is null, rather than showing an empty or unfiltered list.
    level: Mapped[int | None] = mapped_column(Integer, nullable=True)
    profile_completed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
