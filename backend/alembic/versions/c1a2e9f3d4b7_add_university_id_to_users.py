"""add university_id to users

Revision ID: c1a2e9f3d4b7
Revises: 8752ae850065
Create Date: 2026-08-10 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c1a2e9f3d4b7'
down_revision: Union[str, None] = '8752ae850065'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'users',
        sa.Column('university_id', sa.String(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column('users', 'university_id')
