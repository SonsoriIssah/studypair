"""Student dashboard: browsing tutors, requesting slots, applying for courses."""

import uuid
from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi import status as http_status
from sqlalchemy import select
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
from app.schemas.students import (
    CourseApplicationCreate,
    CourseApplicationRead,
    MatchRequestCreate,
    NotificationRead,
    OutgoingMatchRequest,
    RequestedTutor,
    TutorBrowseItem,
)
from app.schemas.tutors import MatchRequestStatusFilter
from app.services.admins import get_admin_users
from app.services.course_names import name_matches
from app.services.expiry import (
    expire_due_course_applications,
    expire_due_match_requests,
    expire_match_request,
    utcnow,
)
from app.services.slots import is_bulk, lock_slot, release_seat_by_id, take_seat

router = APIRouter(prefix="/students", tags=["students"])


@router.get("/health")
def health():
    return {"status": "ok"}


def _require_level(user: User) -> int:
    """Every student-side action is scoped to a level, so it must be set.

    Answers FEATURE.md's first open question: browsing is *blocked* until the
    level is known, rather than showing nothing or showing everything. Showing
    nothing is indistinguishable from "no tutors exist" and sends students
    looking for a bug; showing everything defeats the feature. A 409 tells them
    exactly what to do next.

    `users.level` is set during profile completion, which is the auth module's
    job — see the note in the PR.
    """
    if user.level is None:
        raise HTTPException(
            status_code=http_status.HTTP_409_CONFLICT,
            detail="Set your level in your profile before browsing or booking",
        )
    return user.level


def _load_own_outgoing_request(
    db: Session, request_id: uuid.UUID, student_id: uuid.UUID
) -> MatchRequest:
    """Fetch a request this student made, or 404.

    Mirrors tutors.py's _load_own_request: someone else's request is reported
    as missing rather than forbidden.
    """
    request = db.get(MatchRequest, request_id)
    if request is None or request.student_id != student_id:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND, detail="Match request not found"
        )
    return request


@router.get("/tutors", response_model=list[TutorBrowseItem])
def browse_tutors(
    course: str | None = Query(
        default=None,
        description="Case-insensitive substring match on course name, e.g. `calc`.",
    ),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[TutorBrowseItem]:
    """Browse course listings at your own level, with the tutor's open slots.

    A listing at another level is absent entirely, not greyed out — the level
    filter is applied in the query.

    Sweeps expired requests table-wide first: a lapsed seat from any tutor
    would otherwise stay hidden when it should be bookable again.
    """
    level = _require_level(current_user)
    expire_due_match_requests(db)

    # A user is a tutor precisely when they have rows in tutor_courses
    # (DECISIONS.md — no separate role flag). Exclude self: you can't book you.
    course_stmt = select(TutorCourse).where(
        TutorCourse.tutor_id != current_user.id,
        TutorCourse.level == level,
    )
    if course:
        course_stmt = course_stmt.where(TutorCourse.course_name.ilike(f"%{course.strip()}%"))
    courses = db.scalars(course_stmt).all()
    if not courses:
        return []

    tutor_ids = {course_row.tutor_id for course_row in courses}
    tutors = db.scalars(
        select(User).where(User.id.in_(tutor_ids)).order_by(User.full_name)
    ).all()
    # "Not full" replaces the old is_booked check. A bulk slot stays listed
    # while it still has seats.
    slots = db.scalars(
        select(TutorAvailabilitySlot)
        .where(
            TutorAvailabilitySlot.tutor_id.in_(tutor_ids),
            TutorAvailabilitySlot.current_students < TutorAvailabilitySlot.max_students,
        )
        .order_by(TutorAvailabilitySlot.day_of_week, TutorAvailabilitySlot.start_time)
    ).all()

    courses_by_tutor: dict = defaultdict(list)
    for course_row in courses:
        courses_by_tutor[course_row.tutor_id].append(CourseRead.model_validate(course_row))

    slots_by_tutor: dict = defaultdict(list)
    for slot in slots:
        slots_by_tutor[slot.tutor_id].append(SlotRead.model_validate(slot))

    return [
        TutorBrowseItem(
            id=tutor.id,
            full_name=tutor.full_name,
            courses=courses_by_tutor[tutor.id],
            available_slots=slots_by_tutor[tutor.id],
        )
        for tutor in tutors
    ]


@router.post(
    "/requests", response_model=MatchRequestRead, status_code=http_status.HTTP_201_CREATED
)
def create_match_request(
    payload: MatchRequestCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MatchRequest:
    """Take a seat in one of a tutor's slots.

    One-on-one (`max_students == 1`): the request sits `pending` and the tutor
    accepts or rejects it, exactly as before. The seat is held meanwhile, so
    nobody else can take the slot, and the 48-hour expiry frees it if the tutor
    never replies.

    Bulk (`max_students > 1`): the request is `accepted` immediately while
    seats remain, and refused outright once full — there is no waitlist.

    The slot row is locked before the capacity check, so the check and the
    increment are a single atomic step and two students racing for the last
    seat cannot both win.
    """
    level = _require_level(current_user)
    expire_due_match_requests(db)

    course = db.get(TutorCourse, payload.course_id)
    if course is None:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND, detail="Course not found"
        )
    if course.level != level:
        raise HTTPException(
            status_code=http_status.HTTP_403_FORBIDDEN,
            detail="That course is taught at a different level",
        )

    slot = lock_slot(db, payload.slot_id)
    if slot is None:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="Slot not found")

    if slot.tutor_id != course.tutor_id:
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail="That course and slot belong to different tutors",
        )
    if course.tutor_id == current_user.id:
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail="You cannot book yourself as a tutor",
        )

    already_in_slot = db.scalar(
        select(MatchRequest).where(
            MatchRequest.slot_id == slot.id,
            MatchRequest.student_id == current_user.id,
            MatchRequest.status.in_(
                (MatchRequestStatus.PENDING, MatchRequestStatus.ACCEPTED)
            ),
        )
    )
    if already_in_slot is not None:
        raise HTTPException(
            status_code=http_status.HTTP_409_CONFLICT,
            detail="You already have a seat in that slot",
        )

    if not take_seat(slot):
        raise HTTPException(
            status_code=http_status.HTTP_409_CONFLICT,
            detail="That slot is full",
        )

    bulk = is_bulk(slot)
    request = MatchRequest(
        student_id=current_user.id,
        tutor_id=course.tutor_id,
        course_id=course.id,
        slot_id=slot.id,
        status=MatchRequestStatus.ACCEPTED if bulk else MatchRequestStatus.PENDING,
        responded_at=utcnow() if bulk else None,
    )
    db.add(request)

    when = f"{slot.day_of_week.value} {slot.start_time.strftime('%H:%M')}"
    verb = "joined your group session for" if bulk else "requested"
    db.add(
        Notification(
            user_id=course.tutor_id,
            message=f'{current_user.full_name} {verb} {course.course_name} ({when}).',
        )
    )

    db.commit()
    db.refresh(request)
    return request


@router.get("/me/requests", response_model=list[OutgoingMatchRequest])
def list_my_requests(
    status: MatchRequestStatusFilter = Query(
        MatchRequestStatusFilter.ALL,
        description="Filter by status. Defaults to `all` — unlike the tutor "
        "view, a student cares about pending and accepted alike.",
    ),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[OutgoingMatchRequest]:
    """Requests this student has made, newest first."""
    expire_due_match_requests(db, student_id=current_user.id)

    stmt = (
        select(MatchRequest, User, TutorCourse, TutorAvailabilitySlot)
        .join(User, User.id == MatchRequest.tutor_id)
        .join(TutorCourse, TutorCourse.id == MatchRequest.course_id)
        .join(TutorAvailabilitySlot, TutorAvailabilitySlot.id == MatchRequest.slot_id)
        .where(MatchRequest.student_id == current_user.id)
        .order_by(MatchRequest.created_at.desc())
    )
    if status is not MatchRequestStatusFilter.ALL:
        stmt = stmt.where(MatchRequest.status == MatchRequestStatus(status.value))

    return [
        OutgoingMatchRequest(
            id=request.id,
            status=request.status,
            created_at=request.created_at,
            responded_at=request.responded_at,
            tutor=RequestedTutor.model_validate(tutor),
            course=CourseRead.model_validate(course),
            slot=SlotRead.model_validate(slot),
        )
        for request, tutor, course, slot in db.execute(stmt).all()
    ]


@router.post("/me/requests/{request_id}/cancel", response_model=MatchRequestRead)
def cancel_request(
    request_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MatchRequest:
    """Withdraw a request before the tutor has acted on it.

    Only valid from PENDING — DECISIONS.md says ACCEPTED is permanent, so a
    student can't back out of one that way. Note this means a bulk booking,
    which is accepted on creation, can't be cancelled by the student; raised
    in the PR as a question for the team.
    """
    request = _load_own_outgoing_request(db, request_id, current_user.id)
    if expire_match_request(db, request):
        db.commit()

    if request.status != MatchRequestStatus.PENDING:
        raise HTTPException(
            status_code=http_status.HTTP_409_CONFLICT,
            detail=f"Request is already {request.status.value}",
        )

    request.status = MatchRequestStatus.CANCELLED
    request.responded_at = utcnow()
    release_seat_by_id(db, request.slot_id)

    db.commit()
    db.refresh(request)
    return request


@router.post(
    "/course-applications",
    response_model=CourseApplicationRead,
    status_code=http_status.HTTP_201_CREATED,
)
def create_course_application(
    payload: CourseApplicationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CourseApplication:
    """Register demand for a course nobody teaches yet. Expires after 2 days."""
    course_name = payload.course_name
    expire_due_course_applications(db, student_id=current_user.id)

    # An application is for unmet demand, so refuse it if the course is already
    # taught at this student's level — a listing at another level is invisible
    # to them and so doesn't count as met demand.
    existing_tutor_course = db.scalar(
        select(TutorCourse).where(
            TutorCourse.tutor_id != current_user.id,
            TutorCourse.level == _require_level(current_user),
            name_matches(TutorCourse.course_name, course_name),
        )
    )
    if existing_tutor_course is not None:
        raise HTTPException(
            status_code=http_status.HTTP_409_CONFLICT,
            detail="A tutor already teaches this course at your level — browse to book a slot",
        )

    duplicate = db.scalar(
        select(CourseApplication).where(
            CourseApplication.student_id == current_user.id,
            CourseApplication.status == CourseApplicationStatus.OPEN,
            name_matches(CourseApplication.course_name, course_name),
        )
    )
    if duplicate is not None:
        raise HTTPException(
            status_code=http_status.HTTP_409_CONFLICT,
            detail="You already have an open application for this course",
        )

    application = CourseApplication(student_id=current_user.id, course_name=course_name)
    db.add(application)

    # DECISIONS.md: admin is notified in-app. services/admins.py reads
    # users.is_admin; a no-op if nobody is flagged admin yet.
    for admin in get_admin_users(db):
        db.add(
            Notification(
                user_id=admin.id,
                message=(
                    f'{current_user.full_name} applied for a tutor in "{course_name}". '
                    "No tutor currently teaches it."
                ),
            )
        )

    db.commit()
    db.refresh(application)
    return application


@router.get("/me/course-applications", response_model=list[CourseApplicationRead])
def list_my_course_applications(
    status: CourseApplicationStatus | None = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[CourseApplication]:
    """This student's own course applications, newest first."""
    expire_due_course_applications(db, student_id=current_user.id)

    stmt = select(CourseApplication).where(CourseApplication.student_id == current_user.id)
    if status is not None:
        stmt = stmt.where(CourseApplication.status == status)

    return list(db.scalars(stmt.order_by(CourseApplication.created_at.desc())).all())


@router.post(
    "/me/course-applications/{application_id}/withdraw", response_model=CourseApplicationRead
)
def withdraw_course_application(
    application_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CourseApplication:
    """Withdraw an application before it's fulfilled or expires.

    Only valid from OPEN — once FULFILLED a tutor has already been notified,
    and EXPIRED is already final.
    """
    # Sweep first: an application overdue for expiry but not yet marked as
    # such shouldn't be withdrawable as if it were still live.
    expire_due_course_applications(db, student_id=current_user.id)

    application = db.get(CourseApplication, application_id)
    if application is None or application.student_id != current_user.id:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND, detail="Course application not found"
        )

    if application.status != CourseApplicationStatus.OPEN:
        raise HTTPException(
            status_code=http_status.HTTP_409_CONFLICT,
            detail=f"Application is already {application.status.value}",
        )

    application.status = CourseApplicationStatus.WITHDRAWN
    db.commit()
    db.refresh(application)
    return application


@router.get("/me/notifications", response_model=list[NotificationRead])
def list_notifications(
    unread_only: bool = Query(default=False, description="Return only unread notifications."),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[Notification]:
    """This user's in-app notifications, newest first."""
    stmt = select(Notification).where(Notification.user_id == current_user.id)
    if unread_only:
        stmt = stmt.where(Notification.read.is_(False))
    return list(db.scalars(stmt.order_by(Notification.created_at.desc())).all())


@router.patch("/me/notifications/{notification_id}/read", response_model=NotificationRead)
def mark_notification_read(
    notification_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Notification:
    notification = db.get(Notification, notification_id)
    if notification is None or notification.user_id != current_user.id:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND, detail="Notification not found"
        )

    notification.read = True
    db.commit()
    db.refresh(notification)
    return notification
