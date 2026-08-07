"""add cancelled and withdrawn statuses

Revision ID: 0bb52636a549
Revises: abe864dded2c
Create Date: 2026-08-04 20:07:08.437179

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0bb52636a549'
down_revision: Union[str, None] = 'abe864dded2c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Autogenerate doesn't diff enum members, so this is hand-written.
    # Adding a value doesn't need a full type rebuild — just can't be used in
    # the same transaction it's added in, and nothing else here does that.
    #
    # Case matters: the existing labels are the Python Enum member NAMES
    # (PENDING, OPEN, FULFILLED, ...), not their lowercase .value strings —
    # SQLAlchemy's Enum(SomeEnumClass) persists .name by default. Confirmed
    # empirically against this DB before writing this migration.
    op.execute("ALTER TYPE match_request_status ADD VALUE IF NOT EXISTS 'CANCELLED'")
    op.execute("ALTER TYPE course_application_status ADD VALUE IF NOT EXISTS 'WITHDRAWN'")


def downgrade() -> None:
    # Postgres has no ALTER TYPE ... DROP VALUE. Removing one means rebuilding
    # the type: rename it aside, recreate without the value, cast the column
    # over, drop the old type. Refuse instead of silently destroying data if
    # any row still uses the value being removed.
    conn = op.get_bind()

    cancelled_in_use = conn.execute(
        sa.text("SELECT 1 FROM match_requests WHERE status = 'CANCELLED' LIMIT 1")
    ).first()
    if cancelled_in_use:
        raise RuntimeError(
            "Cannot downgrade: match_requests has rows with status='CANCELLED'. "
            "Reassign or delete them first."
        )

    withdrawn_in_use = conn.execute(
        sa.text("SELECT 1 FROM course_applications WHERE status = 'WITHDRAWN' LIMIT 1")
    ).first()
    if withdrawn_in_use:
        raise RuntimeError(
            "Cannot downgrade: course_applications has rows with status='WITHDRAWN'. "
            "Reassign or delete them first."
        )

    op.execute("ALTER TYPE match_request_status RENAME TO match_request_status_old")
    op.execute(
        "CREATE TYPE match_request_status AS ENUM "
        "('PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED')"
    )
    op.execute(
        "ALTER TABLE match_requests "
        "ALTER COLUMN status TYPE match_request_status "
        "USING status::text::match_request_status"
    )
    op.execute("DROP TYPE match_request_status_old")

    op.execute("ALTER TYPE course_application_status RENAME TO course_application_status_old")
    op.execute(
        "CREATE TYPE course_application_status AS ENUM ('OPEN', 'FULFILLED', 'EXPIRED')"
    )
    op.execute(
        "ALTER TABLE course_applications "
        "ALTER COLUMN status TYPE course_application_status "
        "USING status::text::course_application_status"
    )
    op.execute("DROP TYPE course_application_status_old")
