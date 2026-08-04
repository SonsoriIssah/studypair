"""Student dashboard: browsing tutors, requesting slots, applying for courses."""

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
    TutorBrowseItem,
)
from app.services.admins import get_admin_users
from app.services.course_names import name_matches
from app.services.expiry import expire_due_course_applications, expire_due_match_requests

router = APIRouter(prefix="/students", tags=["students"])


@router.get("/health")
def health():
    return {"status": "ok"}


@router.get("/tutors", response_model=list[TutorBrowseItem])
def browse_tutors(
    course: str | None = Query(
        default=None,
        description="Case-insensitive substring match on course name, e.g. `calc`.",
    ),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[TutorBrowseItem]:
    """Browse tutors with their courses and un-booked slots.

    Sweeps expired requests table-wide first: a lapsed lock from any tutor would
    otherwise keep a slot hidden that should be bookable again.

    A tutor with no free slots is still listed, so a student can see the course
    is taught even when nothing is open right now.
    """
    expire_due_match_requests(db)

    # A user is a tutor precisely when they have rows in tutor_courses
    # (DECISIONS.md — no separate role flag). Exclude self: you can't book you.
    course_stmt = select(TutorCourse).where(TutorCourse.tutor_id != current_user.id)
    if course:
        course_stmt = course_stmt.where(TutorCourse.course_name.ilike(f"%{course.strip()}%"))
    courses = db.scalars(course_stmt).all()
    if not courses:
        return []

    tutor_ids = {course_row.tutor_id for course_row in courses}
    tutors = db.scalars(
        select(User).where(User.id.in_(tutor_ids)).order_by(User.full_name)
    ).all()
    slots = db.scalars(
        select(TutorAvailabilitySlot)
        .where(
            TutorAvailabilitySlot.tutor_id.in_(tutor_ids),
            TutorAvailabilitySlot.is_booked.is_(False),
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
    """Request a specific course at one of the tutor's existing slots.

    SCHEMA.md: the slot locks immediately on request, not on acceptance, so two
    students can't hold the same slot. The 48-hour expiry frees it if the tutor
    never replies.
    """
    expire_due_match_requests(db)

    course = db.get(TutorCourse, payload.course_id)
    if course is None:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND, detail="Course not found"
        )

    # Row lock so two students racing for the last slot can't both win.
    slot = db.get(TutorAvailabilitySlot, payload.slot_id, with_for_update=True)
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
    if slot.is_booked:
        raise HTTPException(
            status_code=http_status.HTTP_409_CONFLICT,
            detail="That slot has already been taken",
        )

    request = MatchRequest(
        student_id=current_user.id,
        tutor_id=course.tutor_id,
        course_id=course.id,
        slot_id=slot.id,
        status=MatchRequestStatus.PENDING,
    )
    slot.is_booked = True
    db.add(request)
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
    # taught. Matched case-insensitively on the whole name, the same rule
    # add_course uses to fulfil applications.
    existing_tutor_course = db.scalar(
        select(TutorCourse).where(
            TutorCourse.tutor_id != current_user.id,
            name_matches(TutorCourse.course_name, course_name),
        )
    )
    if existing_tutor_course is not None:
        raise HTTPException(
            status_code=http_status.HTTP_409_CONFLICT,
            detail="A tutor already teaches this course — browse tutors to book a slot",
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

    # DECISIONS.md: admin is notified in-app. See services/admins.py — with no
    # admin column in the schema yet, this is an env-var allowlist and is a
    # no-op when unset.
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
