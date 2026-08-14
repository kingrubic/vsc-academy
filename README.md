# VSC Academy

Site tĩnh VSC Academy + CMS, backend **Convex self-hosted local** (cùng kiểu LVT CRM).

## URL local

| Service | URL |
|--------|-----|
| Website | http://127.0.0.1:4173 (`/gioi-thieu`, `/khoa-hoc/ai-starter`, `/en/about` — không đuôi `.html`) |
| Admin CMS | http://127.0.0.1:4173/admin |
| Learner portal | http://127.0.0.1:4173/hoc-vien |
| Convex API | http://127.0.0.1:3280 |
| Convex dashboard | http://127.0.0.1:6796 |

Đăng nhập admin: `vutrananh97@gmail.com` (mật khẩu tạm, bắt buộc đổi lần đầu)  
Fallback seed: `owner@vsc.academy` / `VscAcademy!2026`  
Học viên demo: `hoc-vien@vsc.academy` / `VscLearner!2026`

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
npm start
```
