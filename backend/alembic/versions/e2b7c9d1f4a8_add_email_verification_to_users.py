"""add email verification fields to users

Revision ID: e2b7c9d1f4a8
Revises: d8f4a1b2c3e6
Create Date: 2026-08-12 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e2b7c9d1f4a8'
down_revision: Union[str, None] = 'd8f4a1b2c3e6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # server_default=true so existing accounts (created before this feature
    # existed, under the old "no verification" flow) aren't retroactively
    # locked out. New accounts get False from the ORM's Python-side default
    # when the app inserts the row, not from this server default.
    op.add_column(
        'users',
        sa.Column('email_verified', sa.Boolean(), nullable=False, server_default=sa.true()),
    )
    op.add_column(
        'users',
        sa.Column('email_verification_code_hash', sa.String(), nullable=True),
    )
    op.add_column(
        'users',
        sa.Column('email_verification_expires_at', sa.DateTime(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column('users', 'email_verification_expires_at')
    op.drop_column('users', 'email_verification_code_hash')
    op.drop_column('users', 'email_verified')
