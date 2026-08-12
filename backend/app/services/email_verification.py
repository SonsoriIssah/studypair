"""6-digit email-verification codes for new password-auth signups.

Google sign-ins skip this entirely — Google has already confirmed the
email. The code is hashed at rest with the same bcrypt helper used for
passwords: short-lived and single-use, but there's no reason to store it
recoverable when a hash-and-compare works just as well.
"""
import secrets
from datetime import datetime, timedelta

from app.core.security import hash_password, verify_password
from app.models.user import User

CODE_TTL = timedelta(minutes=15)
RESEND_COOLDOWN = timedelta(seconds=60)


def generate_code() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"


def issue_code(user: User) -> str:
    """Generate a fresh code, store its hash + expiry on the user, and return the raw code to send."""
    code = generate_code()
    user.email_verification_code_hash = hash_password(code)
    user.email_verification_expires_at = datetime.utcnow() + CODE_TTL
    return code


def is_in_resend_cooldown(user: User) -> bool:
    if user.email_verification_expires_at is None:
        return False
    sent_at = user.email_verification_expires_at - CODE_TTL
    return datetime.utcnow() - sent_at < RESEND_COOLDOWN


def verify_code(user: User, code: str) -> bool:
    if not user.email_verification_code_hash or user.email_verification_expires_at is None:
        return False
    if datetime.utcnow() > user.email_verification_expires_at:
        return False
    return verify_password(code, user.email_verification_code_hash)


def clear_code(user: User) -> None:
    user.email_verification_code_hash = None
    user.email_verification_expires_at = None


def verification_email_html(code: str) -> str:
    return (
        f"<p>Your StudyPair verification code is:</p>"
        f"<p style='font-size:28px;font-weight:700;letter-spacing:4px'>{code}</p>"
        f"<p>This code expires in 15 minutes. If you didn't request this, you can ignore this email.</p>"
    )
