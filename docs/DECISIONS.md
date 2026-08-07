# Product Decisions

- The platform is free — no payments — and is limited to university students.
- Anyone can register as a tutor; there is no vetting process.
- Users can hold both student and tutor roles simultaneously.
- Course/subject names are free text, not drawn from a fixed seeded list.
- Auth is Google sign-in only — there is no password-based login.
- Phone number is collected but never SMS-verified; it is contact info only.
- A match request expires if the tutor doesn't respond within 48 hours.
- A course application auto-expires if no tutor is found within 2 days.
- When a tutor adds a course matching an open application, the student is notified in-app and must browse/book normally — no match request is auto-created.
- Bookings are ongoing weekly recurring arrangements, not single sessions.
- There is no session completion or no-show tracking in v1 — "accepted" is a permanent final state.
- The admin role/dashboard is for the development team only, not a public-facing feature.
