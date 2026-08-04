"""Tutor dashboard: incoming requests, courses, and weekly availability."""

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi import status as http_status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.deps import get_current_user
from app.models import (
    CourseApplication,
    MatchRequest,
    Notification,
    TutorAvailabilitySlot,
    TutorCourse,
    User,
)
from app.models.course_application import CourseApplicationStatus
from app.models.match_request import MatchRequestStatus
from app.schemas.common import CourseRead, MatchRequestRead, SlotRead
from app.schemas.tutors import (
    CourseAddResult,
    CourseCreate,
    IncomingMatchRequest,
    MatchRequestStatusFilter,
    RequestingStudent,
    SlotCreate,
)
from app.services.course_names import name_matches
from app.services.expiry import (
    expire_due_course_applications,
    expire_due_match_requests,
    expire_match_request,
    utcnow,
)
from app.services.slots import release_slot

router = APIRouter(prefix="/tutors", tags=["tutors"])


@router.get("/health")
def health():
    return {"status": "ok"}


def _load_own_request(db: Session, request_id: uuid.UUID, tutor_id: uuid.UUID) -> MatchRequest:
    """Fetch a request that belongs to this tutor, or 404.

    Someone else's request is reported as missing rather than forbidden, so the
    endpoint doesn't confirm that an id exists to a tutor who can't act on it.
    """
    request = db.get(MatchRequest, request_id)
    if request is None or request.tutor_id != tutor_id:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND, detail="Match request not found"
        )
    return request


@router.get("/me/requests", response_model=list[IncomingMatchRequest])
def list_incoming_requests(
    status: MatchRequestStatusFilter = Query(
        MatchRequestStatusFilter.PENDING,
        description="Filter by status. Use `all` to include every status.",
    ),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[IncomingMatchRequest]:
    """Requests students have sent to this tutor, newest first."""
    expire_due_match_requests(db, tutor_id=current_user.id)

    stmt = (
        select(MatchRequest, User, TutorCourse, TutorAvailabilitySlot)
        .join(User, User.id == MatchRequest.student_id)
        .join(TutorCourse, TutorCourse.id == MatchRequest.course_id)
        .join(TutorAvailabilitySlot, TutorAvailabilitySlot.id == MatchRequest.slot_id)
        .where(MatchRequest.tutor_id == current_user.id)
        .order_by(MatchRequest.created_at.desc())
    )
    if status is not MatchRequestStatusFilter.ALL:
        stmt = stmt.where(MatchRequest.status == MatchRequestStatus(status.value))

    return [
        IncomingMatchRequest(
            id=request.id,
            status=request.status,
            created_at=request.created_at,
            responded_at=request.responded_at,
            student=RequestingStudent.model_validate(student),
            course=CourseRead.model_validate(course),
            slot=SlotRead.model_validate(slot),
        )
        for request, student, course, slot in db.execute(stmt).all()
    ]


@router.post("/me/requests/{request_id}/accept", response_model=MatchRequestRead)
def accept_request(
    request_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MatchRequest:
    """Accept a request. Final state — the slot stays booked permanently."""
    request = _load_own_request(db, request_id, current_user.id)
    if expire_match_request(db, request):
        db.commit()

    if request.status != MatchRequestStatus.PENDING:
        raise HTTPException(
            status_code=http_status.HTTP_409_CONFLICT,
            detail=f"Request is already {request.status.value}",
        )

    request.status = MatchRequestStatus.ACCEPTED
    request.responded_at = utcnow()

    # SCHEMA.md: the slot was locked when the student requested it and stays
    # locked forever once accepted, since a booking is an ongoing weekly
    # arrangement. Set it defensively in case the lock was lost.
    slot = db.get(TutorAvailabilitySlot, request.slot_id)
    if slot is not None:
        slot.is_booked = True

    db.commit()
    db.refresh(request)
    return request


@router.post("/me/requests/{request_id}/reject", response_model=MatchRequestRead)
def reject_request(
    request_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MatchRequest:
    """Reject a request and free the slot for other students."""
    request = _load_own_request(db, request_id, current_user.id)
    if expire_match_request(db, request):
        db.commit()

    if request.status != MatchRequestStatus.PENDING:
        raise HTTPException(
            status_code=http_status.HTTP_409_CONFLICT,
            detail=f"Request is already {request.status.value}",
        )

    request.status = MatchRequestStatus.REJECTED
    request.responded_at = utcnow()
    release_slot(db, request.slot_id)

    db.commit()
    db.refresh(request)
    return request


@router.post(
    "/me/courses", response_model=CourseAddResult, status_code=http_status.HTTP_201_CREATED
)
def add_course(
    payload: CourseCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CourseAddResult:
    """List a course this tutor can teach, fulfilling any open applications for it."""
    course_name = payload.course_name
    duplicate = db.scalar(
        select(TutorCourse).where(
            TutorCourse.tutor_id == current_user.id,
            name_matches(TutorCourse.course_name, course_name),
        )
    )
    if duplicate is not None:
        raise HTTPException(
            status_code=http_status.HTTP_409_CONFLICT,
            detail="You already teach this course",
        )

    course = TutorCourse(tutor_id=current_user.id, course_name=course_name)
    db.add(course)

    # Lapse stale applications first so a 3-day-old one isn't marked fulfilled.
    expire_due_course_applications(db)

    # Free-text matching rule lives in services/course_names.py so that this and
    # the student-side application check can never drift apart.
    applications = db.scalars(
        select(CourseApplication).where(
            CourseApplication.status == CourseApplicationStatus.OPEN,
            name_matches(CourseApplication.course_name, course_name),
        )
    ).all()

    for application in applications:
        application.status = CourseApplicationStatus.FULFILLED
        # DECISIONS.md: notify only. Do NOT auto-create a match request — the
        # student browses and books through the normal flow.
        db.add(
            Notification(
                user_id=application.student_id,
                message=(
                    f'A tutor is now available for "{course_name}". '
                    "Browse tutors to pick a time slot."
                ),
            )
        )

    db.commit()
    db.refresh(course)
    return CourseAddResult(
        course=CourseRead.model_validate(course),
        fulfilled_applications=len(applications),
        students_notified=len(applications),
    )


@router.delete("/me/courses/{course_id}", status_code=http_status.HTTP_204_NO_CONTENT)
def delete_course(
    course_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    """Stop offering a course."""
    course = db.get(TutorCourse, course_id)
    if course is None or course.tutor_id != current_user.id:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND, detail="Course not found"
        )

    # Team decision: only PENDING (an open ask) or ACCEPTED (a real ongoing
    # commitment — DECISIONS.md says accepted is permanent) block deletion.
    # REJECTED/EXPIRED requests are inert history and shouldn't lock a course
    # out of deletion forever, which is what counting every status did.
    referencing = db.scalar(
        select(func.count())
        .select_from(MatchRequest)
        .where(
            MatchRequest.course_id == course_id,
            MatchRequest.status.in_(
                [MatchRequestStatus.PENDING, MatchRequestStatus.ACCEPTED]
            ),
        )
    )
    if referencing:
        raise HTTPException(
            status_code=http_status.HTTP_409_CONFLICT,
            detail=(
                "This course has a pending or accepted match request against it "
                "and cannot be removed. Reject any pending requests first — "
                "accepted bookings can't be removed at all."
            ),
        )

    # The FK has no ON DELETE rule, so it blocks the delete regardless of
    # status — only PENDING/ACCEPTED are excluded above, so anything left
    # referencing this course is REJECTED/EXPIRED history. Purge it first so
    # the delete below doesn't hit the DB constraint.
    db.query(MatchRequest).filter(
        MatchRequest.course_id == course_id,
        MatchRequest.status.in_([MatchRequestStatus.REJECTED, MatchRequestStatus.EXPIRED]),
    ).delete(synchronize_session=False)

    db.delete(course)
    db.commit()


@router.post(
    "/me/availability", response_model=SlotRead, status_code=http_status.HTTP_201_CREATED
)
def add_availability_slot(
    payload: SlotCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TutorAvailabilitySlot:
    """Add a recurring weekly slot. Not tied to a calendar date."""
    overlapping = db.scalar(
        select(TutorAvailabilitySlot).where(
            TutorAvailabilitySlot.tutor_id == current_user.id,
            TutorAvailabilitySlot.day_of_week == payload.day_of_week,
            TutorAvailabilitySlot.start_time < payload.end_time,
            TutorAvailabilitySlot.end_time > payload.start_time,
        )
    )
    if overlapping is not None:
        raise HTTPException(
            status_code=http_status.HTTP_409_CONFLICT,
            detail="This overlaps a slot you already have on that day",
        )

    slot = TutorAvailabilitySlot(
        tutor_id=current_user.id,
        day_of_week=payload.day_of_week,
        start_time=payload.start_time,
        end_time=payload.end_time,
    )
    db.add(slot)
    db.commit()
    db.refresh(slot)
    return slot


@router.delete("/me/availability/{slot_id}", status_code=http_status.HTTP_204_NO_CONTENT)
def delete_availability_slot(
    slot_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    """Remove a weekly slot."""
    slot = db.get(TutorAvailabilitySlot, slot_id)
    if slot is None or slot.tutor_id != current_user.id:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="Slot not found")

    # Team decision: same rule as delete_course above — only an active ask
    # (PENDING) or a real ongoing commitment (ACCEPTED, permanent per
    # DECISIONS.md) blocks deletion. Resolved history (REJECTED/EXPIRED)
    # doesn't.
    referencing = db.scalar(
        select(func.count())
        .select_from(MatchRequest)
        .where(
            MatchRequest.slot_id == slot_id,
            MatchRequest.status.in_(
                [MatchRequestStatus.PENDING, MatchRequestStatus.ACCEPTED]
            ),
        )
    )
    if referencing:
        raise HTTPException(
            status_code=http_status.HTTP_409_CONFLICT,
            detail=(
                "This slot has a pending or accepted match request against it "
                "and cannot be removed. Reject any pending requests first — "
                "accepted bookings can't be removed at all."
            ),
        )

    # Same reasoning as delete_course: the FK has no ON DELETE rule, so purge
    # the inert REJECTED/EXPIRED rows first — anything PENDING/ACCEPTED was
    # already blocked above.
    db.query(MatchRequest).filter(
        MatchRequest.slot_id == slot_id,
        MatchRequest.status.in_([MatchRequestStatus.REJECTED, MatchRequestStatus.EXPIRED]),
    ).delete(synchronize_session=False)

    db.delete(slot)
    db.commit()
