# VSC Academy Learner Portal — Architecture

VSC Academy LMS is not a separate product. It is a learner surface on the same CMS, database, programs, sessions, venues, instructors and authentication stack as the public website.

```
PUBLIC WEBSITE → REGISTRATION → CMS
                                  ↓
                         STUDENT ACCOUNT
                                  ↓
                            ENROLLMENT
                                  ↓
                         LEARNER PORTAL
                                  ↓
                    COURSE → MEETINGS → MATERIALS
                                  ↓
                    ATTENDANCE → COMPLETION → CERTIFICATE → PUBLIC VERIFY
```

One CMS. One Convex document store. One student account. One source of truth.

## Stack

| Layer | Choice |
|---|---|
| Public site | Static HTML/CSS/JS |
| Admin + Learner UI | Static SPA shells (`/admin`, `/hoc-vien`, `/en/student`) |
| API | Express (`cms/server.js`) |
| Database | Convex self-hosted local (`documents` table keyed by `table` + `id`) |
| Auth | `express-session` cookie (`vsc_admin`) — admin user XOR student |
| Files | `uploads/learner/` (private), `uploads/certificates/` (issued PDFs), `uploads/cms/` (public) |
| Certificate PDF | `pdfkit` + `qrcode`, Noto Sans for Vietnamese names |

No framework migration. Learner Portal does not load the Admin bundle.

## Data models

Existing CMS entities remain the parent records:

`Program` · `Session` · `Registration` · `Instructor` · `Venue` · `User`

LMS entities:

| Table | Role |
|---|---|
| `students` | Learner account (created on registration **confirm**, not on form submit) |
| `enrollments` | Student ↔ Program ↔ Session. Status, payment, progress, completion, certificate status |
| `class_meetings` | Session timetable. Online URL / venue / recording live here |
| `attendance` | Per enrollment × meeting (`present` / `absent` / `excused` / `not_recorded`) |
| `learning_materials` | Files/links scoped to program, session, meeting, or specific students |
| `announcements` | In-app notices (`all` / program / session / student) |
| `announcement_reads` | Read state |
| `notifications` | In-app events (material, meeting change, certificate) |
| `certificates` | Issued/revoked/reissued records with **snapshots** of names |
| `certificate_templates` | Wording, signers, language, version |
| `password_resets` | Hashed, expiring reset tokens |
| `mail_outbox` | Activation / reset messages until SMTP is connected |
| `audit_logs` | Certificate issue / revoke / reissue |

Student status: `invited` · `active` · `inactive` · `suspended`  
Enrollment status: `active` · `completed` · `paused` · `cancelled`  
Payment: `unpaid` · `pending` · `paid` · `refunded`  
Completion: `in_progress` · `eligible` · `completed` · `incomplete`  
Certificate: `none` · `eligible` · `issued` · `revoked` · `reissued`

A student may have many enrollments. VI and EN share the same student/enrollment/meeting/attendance/certificate records. Only UI copy and `*_vi` / `*_en` fields are localized.

## Relations

```
User (OWNER/ADMIN/EDITOR/INSTRUCTOR)
Program ─┬─ Sessions ─┬─ ClassMeetings ─ Attendance
         │            ├─ Enrollments ─ Student
         │            ├─ LearningMaterials
         │            └─ Certificates
         └─ CertificateTemplate (optional)

Announcement → all | program | session | student
Certificate.replacesCertificateId → previous certificate (reissue)
```

## Authorization

Server-side checks are mandatory. Hiding UI is not enough.

| Actor | Access |
|---|---|
| STUDENT | Own enrollments, meetings, materials, attendance, certificates. Join URL only via `/api/learner/meetings/:id/join` after enrollment + time window |
| INSTRUCTOR | Assigned programs/sessions: view roster, upload materials, announce, attendance, recommend completion. Cannot change pricing, delete programs, issue/revoke certificates |
| ADMIN | Students, enrollments, meetings, materials, announcements, attendance, completion, certificates |
| OWNER | Everything, including settings |

Join class:

- `joinLinkOpenMinutesBefore` defaults to 30 (program/session override)
- Meeting URL is **not** serialized to the learner HTML/JSON until the join endpoint authorizes it
- Offline meetings never return a join URL

Private materials stream through `/api/learner/materials/:id/file` after `canSeeMaterial`. Files under `uploads/learner/` are not static.

## Learner routes

| VI | EN |
|---|---|
| `/hoc-vien` | `/en/student` |
| `/hoc-vien/dang-nhap` | `/en/student/login` |
| `/hoc-vien/kich-hoat` | `/en/student/activate` |
| `/hoc-vien/quen-mat-khau` | `/en/student/forgot-password` |
| `/hoc-vien/dat-lai-mat-khau` | `/en/student/reset-password` |
| `/hoc-vien/khoa-hoc` | `/en/student/courses` |
| `/hoc-vien/khoa-hoc/:enrollmentId` | `/en/student/courses/:enrollmentId` |
| `/hoc-vien/lich-hoc` | `/en/student/schedule` |
| `/hoc-vien/tai-lieu` | `/en/student/materials` |
| `/hoc-vien/thong-bao` | `/en/student/announcements` |
| `/hoc-vien/chung-nhan` | `/en/student/certificates` |
| `/hoc-vien/tai-khoan` | `/en/student/account` |
| `/hoc-vien/ho-tro` | `/en/student/support` |
| `/verify` · `/verify/:code` | `/en/verify` · `/en/verify/:code` |

APIs: `/api/learner/*` (session student) · `/api/admin/*` (staff) · `GET /api/public/certificates/:code` (no login).

## Certificate architecture

1. Admin marks enrollment completed (or student meets rules).
2. Eligibility: `certificateEnabled`, `minimumAttendancePercent` (default 75), `requireCompletion`, `requirePayment`, `requireAdminApproval`.
3. Status becomes `eligible`. **No auto-issue.**
4. Admin issues (single or bulk on the session CERTIFICATES tab).
5. System generates `VSC-{YEAR}-{PROGRAM}-{SEGMENT}` (not a database incremental id).
6. PDF (A4 landscape) + QR encoding **only** the verification URL.
7. Student sees the certificate in the portal and can download PDF.
8. Public verify shows name, program snapshot, dates, id, issuer. Never email, phone, payment, attendance or notes.
9. Revoke keeps the record (`REVOKED`). Reissue marks the old row `reissued` and creates a new `issued` row with `replacesCertificateId`.

Snapshots: `studentNameSnapshot`, `programNameViSnapshot`, `programNameEnSnapshot` stay frozen if the program is renamed later.

## Material security

Private bucket on disk (`uploads/learner`). Authenticated download. Visibility: program / session / meeting / specific students. Unpublished or future `publishedAt` is hidden.

## Notifications (MVP)

In-app only. Triggers: new announcement, new material, meeting rescheduled/cancelled, certificate issued. Email/Zalo/push are future; activation and reset currently land in `mail_outbox` for admin copy.

## Localization

One student. Shared operational data. Localized UI, meeting titles, material titles, announcements, certificate wording.

## Deployment

Same process as the public site + CMS:

```bash
npm install
docker compose -f infra/convex-local/docker-compose.yml up -d
npm run convex:deploy
npm run seed
npm start
```

`http://127.0.0.1:4173/hoc-vien` · `/admin` · `/verify`  
Set `SESSION_SECRET` and optionally `PUBLIC_SITE_URL` in production (used for certificate QR links).

## Future-ready (not in MVP)

Assignments, quiz, forum, AI tutor, payment gateway, LinkedIn share, analytics, SCORM/xAPI, Zalo/email automation.
