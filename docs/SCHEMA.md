# StudyPair Data Model

This document describes the initial database schema. All primary keys are UUIDs.

## users

A person using StudyPair. A single user can act as both a student and a tutor.

| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| google_id | string | Unique, not null — from Google OAuth |
| email | string | Unique, not null |
| full_name | string | Not null |
| phone_number | string | Nullable, contact info only, never SMS-verified |
| level | integer | Nullable — 100/200/300/400, set at profile completion |
| profile_completed | boolean | Default false |
| created_at | datetime | Default now |

## tutor_courses

A course/subject a tutor has listed themselves as able to teach. Free text, no fixed subject list.

| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| tutor_id | UUID | FK -> users.id |
| course_name | string | Not null, free text |
| level | integer | Not null — the level this listing is taught at |

The same subject at two levels is two rows. A listing is visible only to
students whose own level matches, so the duplicate check is on name **and**
level.

## tutor_availability_slots

A recurring weekly time block during which a tutor is available. Not tied to a specific calendar date.

| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| tutor_id | UUID | FK -> users.id |
| day_of_week | enum | Mon-Sun |
| start_time | time | |
| end_time | time | |
| max_students | integer | Default 1 — 1 is one-on-one, above 1 is a group session |
| current_students | integer | Default 0 — seats currently held |

`is_booked` is gone. "Full" is `current_students >= max_students`. A seat is
taken when a student requests the slot and released on reject, expiry or
cancel. Requests against a slot with `max_students > 1` are accepted
immediately while seats remain, and refused once full — there is no waitlist.
`app/services/slots.py` owns every change to `current_students` and takes a
row lock so the capacity check and the increment are atomic.

## match_requests

A student's request to book a specific tutor for a specific course at a specific slot.

| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| student_id | UUID | FK -> users.id |
| tutor_id | UUID | FK -> users.id |
| course_id | UUID | FK -> tutor_courses.id |
| slot_id | UUID | FK -> tutor_availability_slots.id |
| status | enum | pending, accepted, rejected, expired |
| created_at | datetime | Default now |
| responded_at | datetime | Nullable |

Expires if the tutor doesn't respond within 48 hours. "Accepted" is a permanent final state — there is no session completion or no-show tracking in v1.

## course_applications

A student's open request for a course that no tutor currently offers.

| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| student_id | UUID | FK -> users.id |
| course_name | string | Not null |
| status | enum | open, fulfilled, expired |
| created_at | datetime | Default now |
| expires_at | datetime | created_at + 2 days |

Auto-expires if no tutor is found within 2 days. When a tutor later adds a matching course, the student is notified in-app but must browse and book normally — no match request is auto-created.

## notifications

An in-app notification for a user.

| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| user_id | UUID | FK -> users.id |
| message | text | Not null |
| read | boolean | Default false |
| created_at | datetime | Default now |
