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
| `PUBLIC_SITE_URL` | Recommended in production | Origin used in certificate QR / verification links. Default: request host or `https://vscacademy.vn`. |
| `CONVEX_URL` / `CONVEX_SELF_HOSTED_URL` | Yes | Convex API, default `http://127.0.0.1:3280`. |
| `HOST` | No | Bind address, default `127.0.0.1`. |
| `PORT` | No | Web port, default `4173`. |
| `NODE_ENV` | Production plist | `production` on the LaunchAgent. |
| `VSC_OWNER_TEMP_PASSWORD` | Seed only | Temporary OWNER password when running `npm run seed`. |
| `VSC_ADMIN_TEMP_PASSWORD` | Seed only | Temporary ADMIN password when running `npm run seed`. |

LMS does not add SMTP keys in this MVP. Activation and password-reset messages are stored in `mail_outbox` for admin copy until email is connected.

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
