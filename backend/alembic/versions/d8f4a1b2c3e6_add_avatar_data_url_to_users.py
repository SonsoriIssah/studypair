"""add avatar_data_url to users

Revision ID: d8f4a1b2c3e6
Revises: c1a2e9f3d4b7
Create Date: 2026-08-11 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd8f4a1b2c3e6'
down_revision: Union[str, None] = 'c1a2e9f3d4b7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'users',
        sa.Column('avatar_data_url', sa.Text(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column('users', 'avatar_data_url')
