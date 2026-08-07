"""Application-level encryption for sensitive columns (e.g. phone numbers).

We encrypt specific PII fields in the app layer rather than relying only on
disk/volume encryption, so the data is protected even if someone gets a raw
DB dump, a backup file, or read access to the database without the app's
key. Fernet (AES-128-CBC + HMAC, from the `cryptography` package that
`python-jose[cryptography]` already pulls in) gives authenticated
encryption: tampered ciphertext fails to decrypt rather than silently
returning garbage.

Usage: use `EncryptedString` as a SQLAlchemy column type. Encryption/
decryption happens transparently on write/read — the rest of the app just
sees a plain Python `str`.
"""
from __future__ import annotations

import os
from functools import lru_cache

from cryptography.fernet import Fernet, InvalidToken
from sqlalchemy import String
from sqlalchemy.types import TypeDecorator

from app.core.config import settings


@lru_cache(maxsize=1)
def _fernet() -> Fernet:
    key = settings.FIELD_ENCRYPTION_KEY or os.getenv("FIELD_ENCRYPTION_KEY", "")
    if not key:
        raise RuntimeError(
            "FIELD_ENCRYPTION_KEY is not set. Generate one with:\n"
            "  python -c \"from cryptography.fernet import Fernet; "
            "print(Fernet.generate_key().decode())\"\n"
            "and put it in your .env file."
        )
    return Fernet(key.encode())


class EncryptedString(TypeDecorator):
    """A String column that is encrypted at rest and decrypted on read.

    Do NOT use this for columns you need to filter/search/uniquely-constrain
    on in SQL (e.g. email) — Fernet ciphertext is non-deterministic (a fresh
    random IV each time), so `WHERE column = value` and UNIQUE constraints
    won't work against it. It's meant for PII that's only ever read back for
    display, like a phone number.
    """

    impl = String
    cache_ok = True

    def process_bind_param(self, value: str | None, dialect) -> str | None:
        if value is None:
            return None
        return _fernet().encrypt(value.encode()).decode()

    def process_result_value(self, value: str | None, dialect) -> str | None:
        if value is None:
            return None
        try:
            return _fernet().decrypt(value.encode()).decode()
        except InvalidToken:
            # Ciphertext doesn't match the current key (wrong/rotated key,
            # or pre-existing plaintext row from before encryption was
            # added). Fail loudly rather than showing corrupted data.
            raise ValueError(
                "Could not decrypt stored value — check FIELD_ENCRYPTION_KEY, "
                "or this row predates encryption and needs a data migration."
            )
