"""Working out who the admins are.

DECISIONS.md says admin is "set directly in the database for now", but `users`
has no admin column and SCHEMA.md doesn't define one — so there is currently no
way to identify an admin from the data alone.

Rather than change the shared schema (which needs a team decision and a
migration), this reads a comma-separated allowlist from the
STUDYPAIR_ADMIN_EMAILS environment variable and matches it against user emails.
If the variable is unset, there are no admins and admin notifications are
skipped silently — nothing breaks.

This is the stopgap. Once `users` grows an `is_admin` flag, replace the body of
`get_admin_users` with a query on that column and delete the env var.
"""

import os

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import User

ADMIN_EMAILS_ENV_VAR = "STUDYPAIR_ADMIN_EMAILS"


def admin_emails() -> list[str]:
    raw = os.getenv(ADMIN_EMAILS_ENV_VAR, "")
    return [email.strip().lower() for email in raw.split(",") if email.strip()]


def get_admin_users(db: Session) -> list[User]:
    emails = admin_emails()
    if not emails:
        return []
    return list(db.scalars(select(User).where(func.lower(User.email).in_(emails))).all())
