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
    SlotUpdate,
)
from app.services.course_names import name_matches
from app.services.expiry import (
    expire_due_course_applications,
    expire_due_match_requests,
    expire_match_request,
    utcnow,
)
from app.services.slots import is_bulk, lock_slot, release_seat

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
    """Requests students have sent to this tutor, newest first.

    Note that bulk-slot requests arrive already `accepted`, so a tutor
    reviewing only the default `pending` filter won't see them — they show up
    under `accepted` or `all`.
    """
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
    """Accept a pending request.

    Only one-on-one requests ever reach here — a bulk request is accepted at
    creation time. The seat was already claimed when the student requested it,
    so the count doesn't move.
    """
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

    db.commit()
    db.refresh(request)
    return request


@router.post("/me/requests/{request_id}/reject", response_model=MatchRequestRead)
def reject_request(
    request_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MatchRequest:
    """Reject a request, freeing its seat for another student.

    FEATURE.md allows rejecting an *accepted* request when the slot is bulk,
    since those were auto-accepted and the tutor never got a say. For a
    one-on-one slot, accepted stays final per DECISIONS.md.
    """
    request = _load_own_request(db, request_id, current_user.id)
    if expire_match_request(db, request):
        db.commit()

    # Lock before touching the count, same rule as claiming a seat.
    slot = lock_slot(db, request.slot_id)
    bulk = slot is not None and is_bulk(slot)

    rejectable = request.status is MatchRequestStatus.PENDING or (
        request.status is MatchRequestStatus.ACCEPTED and bulk
    )
    if not rejectable:
        raise HTTPException(
            status_code=http_status.HTTP_409_CONFLICT,
            detail=f"Request is already {request.status.value}",
        )

    request.status = MatchRequestStatus.REJECTED
    request.responded_at = utcnow()
    if slot is not None:
        release_seat(slot)

    db.commit()
    db.refresh(request)
    return request


@router.get("/course-names", response_model=list[str])
def list_course_names(
    level: int = Query(..., description="Only names already taught at this level."),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[str]:
    """Distinct course names already taught at a level, across all tutors.

    Backs the "pick a course" control on the add-course form — there's no
    fixed course catalog (DECISIONS.md), so this is the closest thing: names
    that already exist. Case/whitespace variants of the same name are folded
    together via the same rule as name_matches, keeping whichever spelling
    was entered first.
    """
    rows = db.scalars(
        select(TutorCourse.course_name)
        .where(TutorCourse.level == level)
        .order_by(TutorCourse.course_name)
    ).all()

    seen: dict[str, str] = {}
    for name in rows:
        key = name.strip().lower()
        seen.setdefault(key, name.strip())
    return sorted(seen.values(), key=str.lower)


@router.get("/me/courses", response_model=list[CourseRead])
def list_my_courses(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[TutorCourse]:
    """Courses this tutor currently teaches, across all levels."""
    stmt = (
        select(TutorCourse)
        .where(TutorCourse.tutor_id == current_user.id)
        .order_by(TutorCourse.course_name)
    )
    return list(db.scalars(stmt).all())


@router.post(
    "/me/courses", response_model=CourseAddResult, status_code=http_status.HTTP_201_CREATED
)
def add_course(
    payload: CourseCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CourseAddResult:
    """List a course this tutor can teach, at a given level.

    The same subject at two levels is two listings, each visible only to
    students at that level — so the duplicate check is on name *and* level.
    Without the level in the comparison, "Calculus I" at 100 and at 200 would
    collide as a duplicate.
    """
    course_name = payload.course_name
    duplicate = db.scalar(
        select(TutorCourse).where(
            TutorCourse.tutor_id == current_user.id,
            TutorCourse.level == payload.level,
            name_matches(TutorCourse.course_name, course_name),
        )
    )
    if duplicate is not None:
        raise HTTPException(
            status_code=http_status.HTTP_409_CONFLICT,
            detail="You already teach this course at that level",
        )

    course = TutorCourse(
        tutor_id=current_user.id, course_name=course_name, level=payload.level
    )
    db.add(course)

    # Lapse stale applications first so a 3-day-old one isn't marked fulfilled.
    expire_due_course_applications(db)

    # NOTE: course_applications has no level column in the agreed schema, so a
    # course at any level fulfils a matching application. Raised in the PR.
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
                    f'A tutor is now available for "{course_name}" at level '
                    f"{payload.level}. Browse tutors to pick a time slot."
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
                "and cannot be removed. Reject those requests first."
            ),
        )

    # The FK has no ON DELETE rule, so it blocks the delete regardless of
    # status — only PENDING/ACCEPTED are excluded above, so anything left
    # referencing this course is resolved history (REJECTED/EXPIRED/
    # CANCELLED). Purge it first so the delete below doesn't hit the DB
    # constraint. (Re-added: this was dropped in the level/capacity merge —
    # confirmed the crash reproduces without it, see verification pass.)
    db.query(MatchRequest).filter(
        MatchRequest.course_id == course_id,
        MatchRequest.status.in_(
            [
                MatchRequestStatus.REJECTED,
                MatchRequestStatus.EXPIRED,
                MatchRequestStatus.CANCELLED,
            ]
        ),
    ).delete(synchronize_session=False)

    db.delete(course)
    db.commit()


@router.get("/me/availability", response_model=list[SlotRead])
def list_my_availability(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[TutorAvailabilitySlot]:
    """This tutor's weekly recurring slots, in schedule order."""
    stmt = (
        select(TutorAvailabilitySlot)
        .where(TutorAvailabilitySlot.tutor_id == current_user.id)
        .order_by(TutorAvailabilitySlot.day_of_week, TutorAvailabilitySlot.start_time)
    )
    return list(db.scalars(stmt).all())


@router.post(
    "/me/availability", response_model=SlotRead, status_code=http_status.HTTP_201_CREATED
)
def add_availability_slot(
    payload: SlotCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TutorAvailabilitySlot:
    """Add a recurring weekly slot.

    `max_students=1` is one-on-one: a student's request sits pending until you
    respond. Above 1 makes it a group session, where requests are accepted
    automatically until the seats run out.
    """
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
        max_students=payload.max_students,
        current_students=0,
    )
    db.add(slot)
    db.commit()
    db.refresh(slot)
    return slot


@router.patch("/me/availability/{slot_id}", response_model=SlotRead)
def update_availability_slot(
    slot_id: uuid.UUID,
    payload: SlotUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TutorAvailabilitySlot:
    """Edit a slot's schedule and/or capacity. Only the sent fields change."""
    slot = db.get(TutorAvailabilitySlot, slot_id)
    if slot is None or slot.tutor_id != current_user.id:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="Slot not found")

    new_day = payload.day_of_week if payload.day_of_week is not None else slot.day_of_week
    new_start = payload.start_time if payload.start_time is not None else slot.start_time
    new_end = payload.end_time if payload.end_time is not None else slot.end_time
    new_max = payload.max_students if payload.max_students is not None else slot.max_students

    if new_start >= new_end:
        raise HTTPException(
            status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="start_time must be before end_time",
        )

    if new_max < slot.current_students:
        raise HTTPException(
            status_code=http_status.HTTP_409_CONFLICT,
            detail=f"Can't reduce capacity below the {slot.current_students} student(s) already booked",
        )

    schedule_changed = (
        new_day != slot.day_of_week or new_start != slot.start_time or new_end != slot.end_time
    )
    if schedule_changed:
        # Same rule as delete: an active ask or a real commitment against
        # this slot's current time shouldn't get silently rescheduled out
        # from under the student. Capacity-only edits skip this.
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
                    "This slot has a pending or accepted match request against it, "
                    "so its day/time can't change. Reject those requests first, or "
                    "only update capacity."
                ),
            )

        overlapping = db.scalar(
            select(TutorAvailabilitySlot).where(
                TutorAvailabilitySlot.tutor_id == current_user.id,
                TutorAvailabilitySlot.id != slot_id,
                TutorAvailabilitySlot.day_of_week == new_day,
                TutorAvailabilitySlot.start_time < new_end,
                TutorAvailabilitySlot.end_time > new_start,
            )
        )
        if overlapping is not None:
            raise HTTPException(
                status_code=http_status.HTTP_409_CONFLICT,
                detail="This overlaps a slot you already have on that day",
            )

    slot.day_of_week = new_day
    slot.start_time = new_start
    slot.end_time = new_end
    slot.max_students = new_max
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
                "and cannot be removed. Reject those requests first."
            ),
        )

    # Same reasoning as delete_course: the FK has no ON DELETE rule, so purge
    # the inert resolved-history rows first — anything PENDING/ACCEPTED was
    # already blocked above. (Re-added: dropped in the level/capacity merge.)
    db.query(MatchRequest).filter(
        MatchRequest.slot_id == slot_id,
        MatchRequest.status.in_(
            [
                MatchRequestStatus.REJECTED,
                MatchRequestStatus.EXPIRED,
                MatchRequestStatus.CANCELLED,
            ]
        ),
    ).delete(synchronize_session=False)

    db.delete(slot)
    db.commit()
