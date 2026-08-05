"""replace is_booked with capacity (max_students / current_students)

Revision ID: 8a3f6c2d19e4
Revises: fd50ef01ec17
Create Date: 2026-08-05 17:20:00.000000

FEATURE.md Feature 2 (capacity-based sessions).

Resolves FEATURE.md's open question #2 ("migrate or wipe existing is_booked
demo data") in favor of migrating: every existing row was implicitly 1-on-1
under the old model, so the mapping to the new one is lossless and
mechanical, not a judgment call —

    max_students     = 1                          for every existing row
    current_students = 1 if is_booked else 0

There's no ambiguous case here, so there's no reason to throw the data away.

Sequencing within upgrade(): max_students is added NOT NULL with a
server_default of 1 (safe on a non-empty table, matches the model's
default). current_students is added nullable first, backfilled from
is_booked while is_booked still exists, then tightened to NOT NULL — only
after that is is_booked dropped. Order matters; doing this in one shot
without the intermediate nullable step would have no is_booked column left
to backfill from.

downgrade() is inherently lossy for bulk slots (current_students > 1 has no
faithful boolean representation) — that's an accepted, expected consequence
of downgrading a richer model to a simpler one, not a bug. It maps back to
is_booked = (current_students > 0), which is exact for every 1-on-1 slot
(max_students = 1, the only kind that could exist before this migration)
and a reasonable "was something using this slot" approximation otherwise.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8a3f6c2d19e4'
down_revision: Union[str, None] = 'fd50ef01ec17'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'tutor_availability_slots',
        sa.Column('max_students', sa.Integer(), nullable=False, server_default='1'),
    )
    op.add_column(
        'tutor_availability_slots',
        sa.Column('current_students', sa.Integer(), nullable=True),
    )

    op.execute(
        "UPDATE tutor_availability_slots "
        "SET current_students = CASE WHEN is_booked THEN 1 ELSE 0 END"
    )

    op.alter_column(
        'tutor_availability_slots', 'current_students',
        existing_type=sa.Integer(), nullable=False,
    )

    op.drop_column('tutor_availability_slots', 'is_booked')


def downgrade() -> None:
    op.add_column(
        'tutor_availability_slots',
        sa.Column('is_booked', sa.Boolean(), nullable=True),
    )

    op.execute(
        "UPDATE tutor_availability_slots SET is_booked = (current_students > 0)"
    )

    op.alter_column(
        'tutor_availability_slots', 'is_booked',
        existing_type=sa.Boolean(), nullable=False,
    )

    op.drop_column('tutor_availability_slots', 'current_students')
    op.drop_column('tutor_availability_slots', 'max_students')
