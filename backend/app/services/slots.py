"""Seat accounting for availability slots.

FEATURE.md replaced the `is_booked` boolean with a capacity pair:
`max_students` (the ceiling, 1 meaning one-on-one) and `current_students` (how
many seats are currently held). "Full" is `current_students >= max_students`.

A seat is taken the moment a student requests the slot — for bulk slots as
well as one-on-one — so `max_students = 1` reproduces the old lock-on-request
behaviour exactly. The seat comes back when the request is rejected, expires,
or is cancelled.

## Concurrency

`lock_slot()` takes a row-level lock (`SELECT ... FOR UPDATE`) that PostgreSQL
holds until the transaction ends. Callers must lock the slot *before* testing
`is_full()` and calling `take_seat()`, which makes the check and the increment
one atomic step.

This matters more than it did under the boolean. Reading `current_students`,
deciding there's room, and then incrementing as a separate statement is a
read-modify-write: two students racing for the last seat could both read 4 of
5, both increment, and leave the slot at 6 of 5. Holding the lock across both
serialises them, so the second one sees 5 of 5 and is refused.

Every mutation of `current_students` lives in this module.
"""

import uuid

from sqlalchemy.orm import Session

from app.models import TutorAvailabilitySlot


def lock_slot(db: Session, slot_id: uuid.UUID) -> TutorAvailabilitySlot | None:
    """Load a slot under a row lock held until the transaction ends.

    Take this before any capacity check you intend to act on.
    """
    return db.get(TutorAvailabilitySlot, slot_id, with_for_update=True)


def is_bulk(slot: TutorAvailabilitySlot) -> bool:
    """A slot that can hold more than one student — the auto-accept path."""
    return slot.max_students > 1


def is_full(slot: TutorAvailabilitySlot) -> bool:
    return slot.current_students >= slot.max_students


def seats_available(slot: TutorAvailabilitySlot) -> int:
    return max(slot.max_students - slot.current_students, 0)


def take_seat(slot: TutorAvailabilitySlot) -> bool:
    """Claim a seat, returning False if the slot is already full.

    The caller must be holding the row lock from `lock_slot()`; without it this
    is a read-modify-write and two students can overfill the slot.

    Does not commit; the caller owns the transaction.
    """
    if is_full(slot):
        return False
    slot.current_students += 1
    return True


def release_seat(slot: TutorAvailabilitySlot) -> None:
    """Hand a seat back after a rejection, expiry or cancellation.

    Floors at zero so a double release can't drive the count negative and
    silently hand out a seat that doesn't exist.
    """
    if slot.current_students > 0:
        slot.current_students -= 1


def release_seat_by_id(db: Session, slot_id: uuid.UUID) -> None:
    """Release a seat when the caller has the slot id rather than the row."""
    slot = lock_slot(db, slot_id)
    if slot is not None:
        release_seat(slot)
