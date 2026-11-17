# Nur Academy — Islamic classes LMS (clickable prototype)

Static prototype for a customer who wants an Islamic class-teaching LMS with an integrated class scheduler and Zoom.
No build step: open `index.html` or run `python3 -m http.server` in this folder.

Use the **Viewing as** dropdown to switch between Admin, Teacher and Student. Data lives in `localStorage` (Zoom setup → Reset demo data).

## What it demonstrates
- **Courses & enrolment** — Tajweed, Hifz, Arabic, Fiqh, Seerah; rosters; admin enrols/removes students.
- **Class scheduler** — weekly calendar, one-off and weekly recurring classes (one shared Zoom link per series), teacher double-booking check, reschedule, cancel one / cancel series, add-to-Google-Calendar link, Hijri date.
- **Zoom (simulated)** — auto-created meeting ID/passcode or pasted real link; Join/Start enabled 10 min before class. The Zoom setup page documents the real Server-to-Server OAuth plan (`POST /users/me/meetings`, PATCH, DELETE, webhooks).
- **Attendance & progress** — present/late/absent/excused per class, teacher progress notes, student view of their own record.

## Next steps for production
Real backend + auth, Zoom Server-to-Server OAuth integration, email/WhatsApp reminders, recordings, fees, prayer-time-aware scheduling, parent accounts.
