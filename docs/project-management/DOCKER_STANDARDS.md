# DOCKER STANDARDS — SEECARAUTO

Docker là tiêu chuẩn bắt buộc (Henry, 25/11/2026): hệ thống phải được đóng
gói và chạy được bằng Docker. Không chỉ tạo file Docker cho có — phải chạy
thử và báo cáo kết quả thực tế.

## 1. Cấu trúc

```text
seecarauto/
├── frontend/Dockerfile    # Next.js, port 3000
├── admin/Dockerfile       # Next.js, port 3001
├── backend/Dockerfile     # NestJS, port 3002
├── docker-compose.yml     # Local stack
└── .dockerignore
```

- Mỗi app có Dockerfile riêng, multi-stage: `deps` → `builder` → `runner`.
- Base image: `node:20-alpine`, cài pnpm qua corepack (theo
  `packageManager` ở `package.json` gốc).
- Runner image cài `curl` để phục vụ healthcheck.
- `pnpm install --frozen-lockfile` trong Dockerfile — lockfile phải được
  commit cùng code.

## 2. docker-compose.yml (local)

Services:

| Service | Image | Port | Health check |
| --- | --- | --- | --- |
| postgres | postgres:16-alpine | 5432 | `pg_isready` |
| redis | redis:7-alpine | 6379 | `redis-cli ping` |
| meilisearch | getmeili/meilisearch:v1.11 | 7700 | `GET /health` |
| backend | build từ `backend/Dockerfile` | 3002 | `GET /api/v1/health` |
| frontend | build từ `frontend/Dockerfile` | 3000 | `GET /` |
| admin | build từ `admin/Dockerfile` | 3001 | `GET /` |

- Backend `depends_on` postgres + redis với `condition: service_healthy`.
- Frontend/admin `depends_on` backend (`service_started`).
- Dữ liệu local lưu trong named volumes: `postgres-data`, `redis-data`,
  `meilisearch-data`. Không commit dữ liệu local.
- Biến môi trường lấy từ `.env` (copy từ `.env.example`). Không commit
  file `.env` thật.

## 3. Lệnh

```bash
cp .env.example .env
docker compose up -d --build   # khởi động toàn bộ stack
docker compose ps              # kiểm tra: mọi service phải (healthy)
docker compose logs -f backend # xem log một service
docker compose down            # dừng stack
docker compose config --quiet  # chỉ validate file compose (không chạy)
```

## 4. Health check

- Mọi service đều có healthcheck trong compose và Dockerfile
  (`HEALTHCHECK` cho app, `healthcheck:` cho infra).
- Backend expose `GET /api/v1/health` trả `{ status: "ok", ... }`.
- Deploy chỉ được coi là đạt khi mọi service `(healthy)`.

## 5. GIỚI HẠN ĐÃ BIẾT — Docker runtime UNVERIFIED trên máy dev của Muse

Trên máy dev của Muse (VM), **container Docker KHÔNG chạy được**: host
không cấp cgroup controller nào cho user namespace
(`/sys/fs/cgroup/cgroup.controllers` trống), mọi runtime (runc, crun)
đều lỗi `operation not permitted` khi tạo container. Đã xác minh ngày
21/11/2026 và kiểm tra lại trong M00.

Hệ quả cho M00 và các milestone sau:

- Trên máy này chỉ xác minh được: Dockerfile đúng cú pháp, file compose
  hợp lệ (`docker compose config`), healthcheck đã khai báo, code app
  build được bằng pnpm.
- Tiêu chí `docker compose up chạy được` là **UNVERIFIED trên máy này**.
  Không được báo cáo là đã chạy được nếu chưa chạy thật.
- Việc kiểm tra thật `docker compose up` + health check phải làm trên:
  máy Windows của Henry (Docker Desktop), VPS, hoặc CI runner có Docker.
- Khi Henry/VPS/CI chạy được, cập nhật kết quả vào `CURRENT_STATE.md`
  và `CHANGELOG.md` của milestone tương ứng.

Docker daemon trên máy Muse: chạy bằng
`dockerd --data-root /home/hatch/docker-data --storage-driver=overlay2
--iptables=false --bridge=none` (không tự khởi động lại sau khi thay máy
ảo — cần cài lại Docker qua apt sau mỗi lần thay máy, dữ liệu images nằm
trong `/home/hatch/docker-data` nên còn giữ được).
