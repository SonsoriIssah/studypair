"""add password reset fields to users

Revision ID: f3a9c7e1b2d5
Revises: e2b7c9d1f4a8
Create Date: 2026-08-12 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f3a9c7e1b2d5'
down_revision: Union[str, None] = 'e2b7c9d1f4a8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'users',
        sa.Column('password_reset_code_hash', sa.String(), nullable=True),
    )
    op.add_column(
        'users',
        sa.Column('password_reset_expires_at', sa.DateTime(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column('users', 'password_reset_expires_at')
    op.drop_column('users', 'password_reset_code_hash')
