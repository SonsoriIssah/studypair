"""add password_hash and make google_id nullable

Revision ID: 8752ae850065
Revises: 8a3f6c2d19e4
Create Date: 2026-08-07 14:49:46.100887

Schema side of the switch to database-stored email/password auth
(frontend/Elliot branch). A user can now exist without a google_id (created
via POST /auth/register/verify instead of the Google callback), so the
column can no longer be NOT NULL. password_hash is nullable because a
Google-only user still won't have one — a row must have at least one of the
two set, but that's an application-level invariant, not something a single
CHECK constraint should own here since which one is required depends on how
the user signed up, not the column values in isolation.

Both changes are safe on a non-empty table: relaxing NOT NULL / adding a
nullable column never violates existing rows.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8752ae850065'
down_revision: Union[str, None] = '8a3f6c2d19e4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('password_hash', sa.String(), nullable=True))
    op.alter_column(
        'users', 'google_id',
        existing_type=sa.VARCHAR(),
        nullable=True,
    )


def downgrade() -> None:
    # Re-tightening google_id to NOT NULL would fail with a raw constraint
    # violation if any password-only user exists (google_id IS NULL) — refuse
    # explicitly instead so the cause is obvious.
    conn = op.get_bind()
    orphaned = conn.execute(
        sa.text("SELECT 1 FROM users WHERE google_id IS NULL LIMIT 1")
    ).first()
    if orphaned:
        raise RuntimeError(
            "Cannot downgrade: at least one user has no google_id (registered "
            "via email/password). Assign them one or delete those rows first."
        )

    op.alter_column(
        'users', 'google_id',
        existing_type=sa.VARCHAR(),
        nullable=False,
    )
    op.drop_column('users', 'password_hash')
