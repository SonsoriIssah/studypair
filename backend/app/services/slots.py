"""Availability-slot bookkeeping."""

import uuid

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import MatchRequest, TutorAvailabilitySlot
from app.models.match_request import MatchRequestStatus


def release_slot(db: Session, slot_id: uuid.UUID) -> None:
    """Make a slot requestable again after a rejection or expiry.

    SCHEMA.md: an accepted match request locks its slot permanently, so refuse
    to free a slot that an accepted request still holds. In practice a slot is
    locked the moment a request is made, so this guard should never fire — it
    is here so a stale pending row can never unlock a live booking.

    Does not commit; the caller owns the transaction.
    """
    slot = db.get(TutorAvailabilitySlot, slot_id)
    if slot is None:
        return

    accepted_holds = db.scalar(
        select(func.count())
        .select_from(MatchRequest)
        .where(
            MatchRequest.slot_id == slot_id,
            MatchRequest.status == MatchRequestStatus.ACCEPTED,
        )
    )
    if accepted_holds:
        return

    slot.is_booked = False
