"""Working out who the admins are.

`users.is_admin` now exists (see app/models/user.py and the
`add_is_admin_to_users` migration), so this queries that column directly
instead of the STUDYPAIR_ADMIN_EMAILS env-var allowlist it used as a stopgap.
"""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import User


def get_admin_users(db: Session) -> list[User]:
    return list(db.scalars(select(User).where(User.is_admin.is_(True))).all())
