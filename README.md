# VSC Academy

Site tĩnh VSC Academy + CMS, backend **Convex self-hosted local** (cùng kiểu LVT CRM).

## URL local

| Service | URL |
|--------|-----|
| Website | http://127.0.0.1:4173 (`/gioi-thieu`, `/khoa-hoc/ai-starter`, `/en/about` — không đuôi `.html`) |
| Admin CMS | http://127.0.0.1:4173/admin |
| Cổng giảng viên | http://127.0.0.1:4173/giang-vien |
| Learner portal | http://127.0.0.1:4173/hoc-vien |
| Certificate verify | http://127.0.0.1:4173/verify |
| Convex API | http://127.0.0.1:3280 |
| Convex dashboard | http://127.0.0.1:6796 |

Đăng nhập admin: `vutrananh97@gmail.com`, `nnqbao@gmail.com` (mật khẩu tạm riêng từ `VSC_OWNER_TEMP_PASSWORD` và `VSC_ADMIN_TEMP_PASSWORD`, bắt buộc đổi lần đầu)
Học viên demo: `hoc-vien@vsc.academy` / `VscLearner!2026`

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `SESSION_SECRET` | Production | Express session signing. If unset, CMS writes a local `cms/data/.secret` (do not commit). |
| `PUBLIC_SITE_URL` | Required for email links | Exact `https://vscacademy.edu.vn`. Extra hosts only via explicit `PUBLIC_SITE_URL_HOSTS`. Process env wins over `.env` files. |
| `CONVEX_URL` / `CONVEX_SELF_HOSTED_URL` | Yes | Convex API, default `http://127.0.0.1:3280`. |
| `HOST` | No | Bind address, default `127.0.0.1`. |
| `PORT` | No | Web port, default `4173`. |
| `NODE_ENV` | Production plist | `production` on the LaunchAgent. |
| `VSC_OWNER_TEMP_PASSWORD` | Seed only | Temporary OWNER password when running `npm run seed`. |
| `VSC_ADMIN_TEMP_PASSWORD` | Seed only | Temporary ADMIN password when running `npm run seed`. |
| `SMTP_USER` / `SMTP_PASS` | Password-reset email | Gmail (or SMTP) account used to send learner/instructor reset links. |
| `SMTP_HOST` | No | Default `smtp.gmail.com`. |
| `MAIL_FROM` | No | From address, default `vscacademy8@gmail.com`. |

Activation and password-reset emails require SMTP plus `PUBLIC_SITE_URL=https://vscacademy.edu.vn`. The CMS fails closed with 503 if either is missing and rolls back any invited student/enrollment it just created. `mail_outbox` is a synchronous delivery audit (metadata only, no raw tokens), not a retry queue. Do not commit SMTP passwords. `.env*` is gitignored; keep `.env.example`.

After pulling LMS changes, run `npm install` and `npm run convex:deploy` so Convex accepts the new document tables (`certificate_templates`, `password_resets`, `notifications`, `mail_outbox`, `audit_logs`). There is no SQL migration: production data lives in Convex documents.

## Auto-start (giống LVT CRM)

LaunchAgents (RunAtLoad + KeepAlive):

- `ai.vsc.academy.convex` → `scripts/vsc-academy-convex-ensure.sh` (Colima + Docker Compose)
- `ai.vsc.academy.web` → `npm start` trên cổng 4173

Log Convex: `~/Library/Logs/vsc-academy-convex-ensure.log`
Log web: `~/.openclaw/logs/ai.vsc.academy.web.log`

## Chạy tay

```bash
npm install
docker compose -f infra/convex-local/docker-compose.yml up -d
npm run convex:deploy
npm run seed
npm run seed:admin
npm start
```
