# VSC Academy CMS — Architecture

One CMS, one database, one public data layer. Vietnamese and English websites, schedule, course pages, and registration all read from the same source.

## Why this stack

The live site is static HTML/CSS/JS with no framework. Hard-coded facts live in:

| File | Role |
|---|---|
| `schedule-data.js` | Shared program facts + sessions (price, venue, capacity, dates) |
| `course-data.js` | VI course copy (curriculum, FAQ, outcomes, faculty) |
| `course-data-en.js` | EN overlay only — never duplicates price/session |
| `i18n-apply.js` | EN labels for shared facts + registration/detail URLs |
| `article-data.js` / `resource-data.js` | Insights & resources |
| `registration.js` | Form currently writes `localStorage` only |

**Decision:** keep the public frontend. Add a Node + Convex self-hosted local layer beside it. Do not migrate to Next.js/React.

When the CMS server is running, it intercepts the existing data script URLs (`schedule-data.js`, `course-data.js`, …) and serves generated JS in the **same global shape** (`window.VSC_PROGRAM_INFO`, `window.VSC_SCHEDULES`, `window.VSC_PROGRAMS`). If the CMS is down, Express falls through to the original files — rollback is automatic.

## Topology

```
Admin UI  (/admin)
Learner Portal (/hoc-vien · /en/student)
    ↓ session cookie (admin user XOR student)
Admin API (/api/admin/*) · Learner API (/api/learner/*)
    ↓
Convex local (http://127.0.0.1:3280)
    ↓
Public site VI + EN + schedule + registration
Learner dashboard (enrollments, meetings, materials, announcements)
```

Student accounts are **not** created on public form submit. When a registration is set to `confirmed`, CMS creates/finds the Student, creates an Enrollment, and issues an activation link (`/hoc-vien/kich-hoat?token=`).

Learner portal uses the same Programs, Sessions, Venues, Instructors. Class meetings, materials and announcements are extra tables keyed by session/program.

Private learning files live in `uploads/learner/` and are only streamed through `/api/learner/materials/:id/file` after enrollment checks. They are not publicly static.

## Localization model

One record per entity. Shared operational fields live in columns. Copy lives in `*_vi` / `*_en` columns or a JSON content blob per language.

```
Program
├── shared: price, format, capacity, status, venue, platform
├── vi: title, headline, curriculum, FAQ, SEO
└── en: title, headline, curriculum, FAQ, SEO
```

There is no `program_vi` / `program_en` table. Sessions, prices, venues, and registrations are never duplicated by language.

Language workflow status (per locale): `not_created` | `ai_draft` | `review` | `published`

Generate English Draft copies VI structure into EN as `ai_draft`. It is never auto-published.

## Roles

| Role | Access |
|---|---|
| OWNER | Everything, including settings |
| ADMIN | Content, sessions, registrations, instructors, venues, media, learner LMS, certificates |
| EDITOR | Content only (no price/status/settings, no destructive deletes) |
| INSTRUCTOR | Assigned sessions: roster, materials, announcements, attendance. No pricing, no certificate issue/revoke |
| STUDENT | Own learner portal data only (`/hoc-vien`, `/api/learner/*`) |

All `/admin` and `/api/admin/*` routes require a session except `/admin/login` and `POST /api/admin/login`.

## Public data access

Do not query SQLite from page scripts. Use:

- Generated `schedule-data.js` / `course-data.js` / `course-data-en.js` / `article-data.js` / `resource-data.js` (same globals as today)
- `GET /api/public/bootstrap`
- `POST /api/public/registrations`

Helpers used by the server: `getPrograms()`, `getProgram(slug, locale)`, `getSessions()`, `getSessionsByProgram()`, `getUpcomingSessions()`, `getInstructors()`, `getInsights(locale)`, `getResources(locale)`, `submitRegistration()`.

## Routes

### Admin UI

`/admin` `/admin/login` `/admin/programs` `/admin/programs/:id` `/admin/sessions` `/admin/sessions/:id` `/admin/registrations` `/admin/registrations/:id` `/admin/students` `/admin/students/:id` `/admin/materials` `/admin/announcements` `/admin/certificates` `/admin/certificate-templates` `/admin/instructors` `/admin/insights` `/admin/resources` `/admin/media` `/admin/venues` `/admin/settings`

### Learner Portal

- VI: `/hoc-vien` `/hoc-vien/dang-nhap` `/hoc-vien/kich-hoat` `/hoc-vien/quen-mat-khau` `/hoc-vien/khoa-hoc` `/hoc-vien/khoa-hoc/:enrollmentId` `/hoc-vien/lich-hoc` `/hoc-vien/tai-lieu` `/hoc-vien/thong-bao` `/hoc-vien/chung-nhan` `/hoc-vien/tai-khoan` `/hoc-vien/ho-tro`
- EN: `/en/student` `/en/student/login` `/en/student/activate` `/en/student/courses` …
- Public verify: `/verify` `/verify/:certificateCode` · `/en/verify`

### Public API

- `GET /api/public/health`
- `GET /api/public/bootstrap`
- `POST /api/public/registrations`

### Admin API

REST under `/api/admin/` for programs, sessions, venues, instructors, registrations (incl. CSV export), students, enrollments, class meetings, learning materials, announcements, attendance, insights, resources, media, settings, dashboard.

### Learner API

Authenticated under `/api/learner/`: login, forgot/reset password, activate, me, dashboard, enrollments, schedule, join meeting, materials (incl. private file stream), announcements/read, certificates/pdf, support.

Learner files are **not** public. Only `/uploads/cms` is statically served. Certificate PDFs stream through authenticated learner/admin routes. Public verify is `/api/public/certificates/:code` (no private fields).

## Session status map

Stored in DB with public keys the frontend already understands:

| Admin label | Stored / public |
|---|---|
| Draft | `draft` (hidden) |
| Registration Open | `open` |
| Opening Soon | `upcoming` |
| Limited Seats | `limited` |
| Full | `full` |
| Completed | `completed` (public `ended`) |
| Cancelled | `cancelled` (hidden) |

## Migration

1. **Programs** — model + seed from `course-data.js` / `course-data-en.js` / `schedule-data.js`
2. **Sessions** — seed `VSC_SCHEDULES`; venue as relation
3. **Registration** — POST to API, localStorage fallback
4. **Instructors / venues**
5. **Insights & resources**
6. **Site settings**

Each phase: schema → seed → connect → verify → only then stop relying on the hand-authored JS (files stay as fallback).

## Deployment

```bash
npm install
docker compose -f infra/convex-local/docker-compose.yml up -d
npm run convex:deploy
npm run seed
npm start
```

Default: `http://127.0.0.1:4173` (site + `/admin`). Convex API: `http://127.0.0.1:3280`. Dashboard: `http://127.0.0.1:6796`.

Requirements: Node 18+, Colima/Docker, write access to `uploads/`. Set `SESSION_SECRET` in production. CMS rows live in the Convex Docker volume. LaunchAgents `ai.vsc.academy.convex` and `ai.vsc.academy.web` start the stack on login/reboot.

## Hard-coded inventory (pre-CMS)

- Program facts / sessions: `schedule-data.js`
- Course copy VI/EN: `course-data.js`, `course-data-en.js`
- EN fact labels: `i18n-apply.js` (`PROGRAM_LABELS`, `SESSION_COPY`)
- Insights / resources: `article-data.js`, `resource-data.js`, `content-en.js`
- Registration persistence: `registration.js` → `localStorage`
- Footer contact, logos: HTML + settings seed
- Venue address: program info + session rows (now `venues`)
