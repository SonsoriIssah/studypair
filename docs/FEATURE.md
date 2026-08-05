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

### Open question — RESOLVED

- **What happens if a student's `level` isn't set yet** when they hit the
  browse endpoint? **Decided: block.** Browsing and booking return `409` with
  "Set your level in your profile before browsing or booking" until
  `users.level` is set. Showing nothing was rejected because an empty list is
  indistinguishable from "no tutors exist" and sends students hunting for a
  bug; showing everything defeats the feature. Implemented as `_require_level`
  in `students.py`.

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

1. Student browsing with no `level` set yet — what do they see?
2. Migration strategy for existing `is_booked` demo data — migrate or wipe?
3. Does a bulk slot need a floor as well as a ceiling (e.g. tutor won't run a
   session for just 1 student when they set `max_students = 5`)? Not raised
   yet, but the same clarifying instinct that resolved the earlier four open
   questions suggests deciding on purpose rather than by omission.
