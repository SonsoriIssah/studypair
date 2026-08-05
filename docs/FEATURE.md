# FEATURE.md — Course Levels & Capacity-Based Sessions

Two new features on top of the existing booking system. Read this together
before either of you starts changing code — both touch shared logic
(`tutors.py`, `students.py`, the duplicate-check, the browse endpoint) that's
already built and tested, so building either half solo risks the same
mismatch the original four open questions were meant to avoid.

---

## Feature 1 — Course-level restriction

**What it does:** a tutor sets a level (100 / 200 / 300 / 400) when listing a
course. Only students at that same level can see or request that specific
course listing.

**Why `level` lives on the course, not just the person:** a tutor teaching
the same subject to two different levels needs two separate listings — e.g.
"Calculus I / Level 100" and "Calculus I / Level 200" are different rows,
each visible only to students at that level.

### Schema changes

```
users
├── ...existing fields...
├── level        NEW — int, e.g. 100/200/300/400

tutor_courses
├── id, tutor_id, course_name
├── level        NEW — int, same scale
```

### Behavior changes

- **Browse endpoint** (`GET /students/tutors`) — add a filter:
  `WHERE tutor_courses.level = student.level`. A course listing at a level
  that doesn't match the requesting student's own level should not appear at
  all, not just be greyed out.
- **Duplicate-check** — the existing "does this tutor already teach this
  course" check (case/whitespace-insensitive match on `course_name`) needs
  `level` added to the comparison. Without this, a tutor listing "Calculus I"
  at both Level 100 and Level 200 will incorrectly collide as a duplicate.
- **Student's own level** — captured during `POST /auth/complete-profile`
  (existing endpoint), alongside phone number.

### Open question — needs an answer before building

- **What happens if a student's `level` isn't set yet** when they hit the
  browse endpoint? Options: block browsing until profile is complete, or
  show nothing until level is set, or show everything (defeats the point of
  the feature). Pick one and note it here once decided.

---

## Feature 2 — Capacity-based sessions (1-on-1 vs bulk)

**What it does:** replaces the old boolean `is_booked` on a slot with a
capacity model. A tutor sets `max_students` when creating a slot — `1` means
one-on-one (works exactly like before), anything higher means a bulk/group
session that can hold multiple students.

### Schema changes

```
tutor_availability_slots
├── id, tutor_id, day_of_week, start_time, end_time
├── max_students        NEW, replaces is_booked — int, default 1
├── current_students     NEW — int, default 0
```

`is_booked` is removed entirely. "Is this slot full" becomes a computed
check: `current_students >= max_students`.

### Request-handling logic (the core behavior change)

```
On POST /students/requests:

  if slot.max_students == 1:
      → unchanged from today: status = "pending"
      → tutor manually accepts/rejects via existing endpoints

  elif slot.max_students > 1:
      if slot.current_students < slot.max_students:
          → status = "accepted" immediately (auto-accept)
          → current_students += 1
          → responded_at = now()
      else:
          → reject the request outright — slot is full, no pending/waitlist state
```

```
On tutor reject (bulk slot, request already auto-accepted):
  → status = "rejected"
  → current_students -= 1  (frees a spot for someone else)
```

**Why this is a smaller change than it looks:** `max_students = 1` behaves
exactly like the old `is_booked` boolean — the existing 1-on-1 flow,
including the row-level locking Daniel already built to prevent
double-booking, doesn't need to change. The only genuinely new code path is
the `max_students > 1` branch and its accompanying lock (see below).

### The part that needs real care: concurrency

The old model used a row lock to guarantee two students couldn't both win
the same 1-on-1 slot in a race. The same protection is needed for bulk slots,
but now it's protecting an **increment with a ceiling**, not a flip from
false to true — two students hitting "request" on the last open spot at the
same instant must not both succeed. This needs the same row-level locking
pattern extended to cover the `current_students < max_students` check and
the increment as one atomic operation, not a check-then-increment done as
two separate steps (which would reopen the race).

### Migration note

Because `is_booked` is being dropped and `max_students`/`current_students`
added, this needs a real Alembic migration — not just a model tweak. Any
existing demo/test data using `is_booked` will need to be migrated or wiped
(default `max_students = 1` and infer `current_students` from `is_booked` if
you want to preserve existing demo rows, or just reset the table if it's
throwaway data).

---

## Suggested split

| Sonsori | Daniel |
|---|---|
| Add `level` to `complete-profile` endpoint | Add `level` to course-creation endpoint |
| Write the Alembic migration (both features) | Update duplicate-check to include `level` |
| Re-run integration verification once merged (same role as last time) | Add `level` filter to browse endpoint |
| | Extend slot-locking to cover capacity/increment logic |
| | Build the auto-accept branch + reject-decrements-count logic |

Daniel's side is the heavier lift here since it touches code he already
wrote and tested — worth syncing on the concurrency piece specifically
before he starts, since getting that wrong reintroduces the exact
double-booking bug the original lock was built to prevent.

## Still open — resolve together before writing code

1. Student browsing with no `level` set yet — what do they see? **Still
   open** — this is Daniel's territory (browse endpoint), not decided here.
2. Migration strategy for existing `is_booked` demo data — migrate or wipe?
   **Resolved (Sonsori, migration author):** migrate, not wipe. Every
   existing row was implicitly 1-on-1 under the old model, so the mapping is
   lossless and mechanical — `max_students = 1` for every existing row,
   `current_students = 1 if is_booked else 0`. There's no ambiguous case to
   decide by judgment; wiping would only be simpler, not more correct, so
   there's no reason to lose data over it. See the migration in
   `backend/alembic/versions/` for the exact `UPDATE`.
3. Does a bulk slot need a floor as well as a ceiling (e.g. tutor won't run a
   session for just 1 student when they set `max_students = 5`)? Not raised
   yet, but the same clarifying instinct that resolved the earlier four open
   questions suggests deciding on purpose rather than by omission. **Still
   open** — this affects the auto-accept branch, which is Daniel's.

## Schema status (Sonsori's side — done)

Both migrations are in `backend/alembic/versions/`, applied and verified
against a real Postgres database (forward *and* backward — including
feeding it real `is_booked` rows and confirming the backfill maps them to
`current_students` exactly):

- `fd50ef01ec17` — `users.level` (nullable), `tutor_courses.level` (NOT NULL)
- `8a3f6c2d19e4` — `tutor_availability_slots`: drops `is_booked`, adds
  `max_students` (default 1) / `current_students` (default 0), with the
  `is_booked → current_students` backfill described above

`POST /auth/complete-profile` now accepts and validates `level` (must be
100/200/300/400), and `GET /auth/me` returns it.

**This branch does not run end-to-end on its own.** `is_booked` is gone and
`tutor_courses.level` is required, so `tutors.py`, `students.py`'s
booking logic, and `services/slots.py` — none of which this branch
touches — will throw until Feature 2's slot-locking/auto-accept work and
Feature 1's course-creation/duplicate-check/browse-filter work land on top
of this schema. Confirmed this fails the way it should (a clean
`NotNullViolation`, not a mystery 500) rather than leaving it to be
discovered by surprise.

## Verification checklist for once Daniel's PR lands

Not written as test code yet — his endpoint shapes don't exist, so
assertions against them would just be guessing. This is the concrete list
to run through once they do, in the same "actually hit a real database"
style as the last integration pass.

**Feature 1 — course levels**
- [ ] Same course name at two different levels does *not* collide as a
  duplicate (two 201s) — the exact bug FEATURE.md calls out
- [ ] Same course name *and* same level still collides (409), unchanged
  from today
- [ ] A student at level 100 does not see a course listed at level 200 in
  `GET /students/tutors`, and vice versa — not just hidden client-side,
  absent from the response entirely
- [ ] Whatever open question #1 gets decided as (block / show nothing /
  something else) for a student with no `level` set — verify that specific
  behavior once it's picked, not before

**Feature 2 — capacity**
- [ ] `max_students = 1` (the default) behaves identically to the old
  `is_booked` flow — full regression of the existing accept/reject/expiry
  scenarios from the last integration pass
- [ ] A bulk slot's first N requests (N = `max_students`) each get
  `status: accepted` immediately, `responded_at` set, `current_students`
  incrementing by exactly one each time
- [ ] The (N+1)th request on a full bulk slot is rejected outright —
  no pending state, `current_students` unchanged
- [ ] **Concurrency, the part that matters most:** fire several simultaneous
  requests at the single remaining spot on a bulk slot — exactly one
  succeeds, the rest reject cleanly, none 500, none double-book. Same style
  of test as the original 1-on-1 row-lock verification, extended to the
  increment case
- [ ] Tutor rejecting an already-auto-accepted bulk request decrements
  `current_students` and actually frees the spot (a subsequent request
  succeeds where it would have been rejected before)
- [ ] Whatever open question #3 (floor) gets decided as — verify once
  it's picked, not before

**Cross-cutting**
- [ ] Fresh clone, single `alembic upgrade head` to a clean database
  succeeds with no manual intervention — watch specifically for a second
  migration head if Daniel's model changes get autogenerated independently
  rather than layered on top of `8a3f6c2d19e4`
- [ ] The delete-decision fix from the last integration pass still holds
  now that `tutor_courses.level` is required — deleting a course with only
  resolved (rejected/expired) history against it should still purge that
  history and succeed
- [ ] Full regression of the untouched pieces (auth, admin, notifications,
  student self-service cancel/withdraw/mark-read) — nothing here should
  have moved, confirming it hasn't
