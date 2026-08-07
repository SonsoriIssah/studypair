"""add level to users and tutor_courses

Revision ID: fd50ef01ec17
Revises: 0bb52636a549
Create Date: 2026-08-05 17:03:31.927240

FEATURE.md Feature 1 (course-level restriction).

users.level is nullable: unset until POST /auth/complete-profile. What the
browse endpoint shows for a student with no level set yet is still an open
question in FEATURE.md (Daniel's call, not resolved here).

tutor_courses.level is NOT NULL, added directly rather than via a nullable
column + backfill: tutor_courses is empty on every environment this has been
run against, and a course listing without a level doesn't mean anything
under this feature, so there's no reasonable default to backfill with
anyway. If tutor_courses isn't empty wherever this runs, the migration fails
loudly instead of guessing.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'fd50ef01ec17'
down_revision: Union[str, None] = '0bb52636a549'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('level', sa.Integer(), nullable=True))
    op.add_column('tutor_courses', sa.Column('level', sa.Integer(), nullable=False))


def downgrade() -> None:
    op.drop_column('tutor_courses', 'level')
    op.drop_column('users', 'level')
