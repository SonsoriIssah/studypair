import importlib
import os

from cryptography.fernet import Fernet
from pydantic import ValidationError

from app.schemas.auth import RegisterRequest


def test_password_hashing_round_trip():
    from app.core import security

    password = "SuperSecure123!"
    hashed = security.hash_password(password)

    assert hashed != password
    assert security.verify_password(password, hashed)
    assert not security.verify_password("wrong-password", hashed)


def test_encrypted_string_round_trip(monkeypatch):
    monkeypatch.setenv("FIELD_ENCRYPTION_KEY", Fernet.generate_key().decode())
    import app.core.encryption as encryption

    importlib.reload(encryption)

    original = "0241234567"
    encrypted = encryption.EncryptedString().process_bind_param(original, None)

    assert encrypted is not None
    assert encrypted != original
    assert encryption.EncryptedString().process_result_value(encrypted, None) == original


def test_register_request_requires_matching_passwords():
    try:
        RegisterRequest(
            email="student@example.com",
            password="StrongPass123",
            confirm_password="DifferentPass123",
            full_name="Student User",
        )
    except ValidationError as exc:
        assert "passwords do not match" in str(exc)
    else:
        raise AssertionError("Expected matching passwords validation to fail")
