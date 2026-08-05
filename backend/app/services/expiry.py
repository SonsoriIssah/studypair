"""Lazy expiry for match requests and course applications.

DECISIONS.md: expiry is checked when a record is read, not by a cron job. Every
endpoint that reads these tables calls into here first, so a caller can never
see a record that should already have lapsed.

Windows:
- match request: 48 hours from `created_at` without a tutor response
- course application: `expires_at`, which the model defaults to `created_at` + 2 days

Only PENDING requests can expire. Under FEATURE.md a bulk request is accepted
the moment it's made, so in practice expiry only ever touches one-on-one slots
— but the seat is released either way.

Timestamps are naive UTC to match the models (`datetime.utcnow`). If the team
moves the models to timezone-aware datetimes, `utcnow()` below moves with them.
"""

import uuid
from datetime import datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import CourseApplication, MatchRequest
from app.models.course_application import CourseApplicationStatus
from app.models.match_request import MatchRequestStatus
from app.services.slots import release_seat_by_id

MATCH_REQUEST_TTL = timedelta(hours=48)


def utcnow() -> datetime:
    """Naive UTC now, matching the column defaults in `app/models`."""
    return datetime.utcnow()


def expire_match_request(db: Session, request: MatchRequest, now: datetime | None = None) -> bool:
    """Expire one request if its 48 hours are up. Returns True if it changed.

    An expired request hands its seat back. `responded_at` stays null — the
    tutor never responded, which is the whole point.

    Does not commit; the caller owns the transaction.
    """
    if request.status != MatchRequestStatus.PENDING:
        return False
    if (now or utcnow()) - request.created_at < MATCH_REQUEST_TTL:
        return False

    request.status = MatchRequestStatus.EXPIRED
    release_seat_by_id(db, request.slot_id)
    return True


def expire_due_match_requests(
    db: Session,
    *,
    tutor_id: uuid.UUID | None = None,
    student_id: uuid.UUID | None = None,
) -> int:
    """Expire every pending request past its window, freeing each seat.

    Narrow with `tutor_id`/`student_id` when the caller only cares about one
    person's rows; pass neither to sweep the table (used by tutor browsing,
    where any tutor's stale seat would otherwise hide an available slot).

    Commits if anything changed. Returns the number of requests expired.
    """
    cutoff = utcnow() - MATCH_REQUEST_TTL
    stmt = select(MatchRequest).where(
        MatchRequest.status == MatchRequestStatus.PENDING,
        MatchRequest.created_at <= cutoff,
    )
    if tutor_id is not None:
        stmt = stmt.where(MatchRequest.tutor_id == tutor_id)
    if student_id is not None:
        stmt = stmt.where(MatchRequest.student_id == student_id)

    # Materialise before mutating: release_seat_by_id() issues its own locking
    # query, and iterating a live result while doing so is unsafe under
    # server-side cursors.
    expired = 0
    for request in db.scalars(stmt).all():
        request.status = MatchRequestStatus.EXPIRED
        release_seat_by_id(db, request.slot_id)
        expired += 1

    if expired:
        db.commit()
    return expired


def expire_due_course_applications(db: Session, *, student_id: uuid.UUID | None = None) -> int:
    """Expire every open application past `expires_at`.

    Commits if anything changed. Returns the number of applications expired.
    """
    stmt = select(CourseApplication).where(
        CourseApplication.status == CourseApplicationStatus.OPEN,
        CourseApplication.expires_at <= utcnow(),
    )
    if student_id is not None:
        stmt = stmt.where(CourseApplication.student_id == student_id)

    expired = 0
    for application in db.scalars(stmt).all():
        application.status = CourseApplicationStatus.EXPIRED
        expired += 1

    if expired:
        db.commit()
    return expired
