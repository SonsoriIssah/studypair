"""6-digit password-reset codes for password-auth accounts.

Mirrors app/services/email_verification.py's mechanics (hash-and-compare,
short TTL, resend cooldown) against the separate password_reset_* columns —
see the comment on those columns in app/models/user.py for why they're kept
apart from the signup verification code.
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
    user.password_reset_code_hash = hash_password(code)
    user.password_reset_expires_at = datetime.utcnow() + CODE_TTL
    return code


def is_in_resend_cooldown(user: User) -> bool:
    if user.password_reset_expires_at is None:
        return False
    sent_at = user.password_reset_expires_at - CODE_TTL
    return datetime.utcnow() - sent_at < RESEND_COOLDOWN


def verify_code(user: User, code: str) -> bool:
    if not user.password_reset_code_hash or user.password_reset_expires_at is None:
        return False
    if datetime.utcnow() > user.password_reset_expires_at:
        return False
    return verify_password(code, user.password_reset_code_hash)


def clear_code(user: User) -> None:
    user.password_reset_code_hash = None
    user.password_reset_expires_at = None


def reset_email_html(code: str) -> str:
    return (
        f"<p>Your StudyPair password reset code is:</p>"
        f"<p style='font-size:28px;font-weight:700;letter-spacing:4px'>{code}</p>"
        f"<p>This code expires in 15 minutes. If you didn't request this, you can ignore this email — "
        f"your password won't change unless someone enters this code.</p>"
    )
