# SEECARAUTO — Automotive Parts E-commerce Platform

Website bán phụ tùng ô tô cho thương hiệu **SeeCar Auto** — "Phụ tùng ô tô Chính Hãng - Giá Tốt", chuyên phụ tùng nhiều hãng. Liên hệ: SĐT/Zalo **0886706338**.

> Nguồn sự thật chung của dự án: `docs/project-management/` (Project Handbook).
> Mỗi task mới bắt đầu bằng việc đọc Project Handbook; khi xong task, cập nhật
> `docs/project-management/CURRENT_STATE.md` và `TASK_BOARD.md`.

## Vai trò

| Vai trò | Người | Trách nhiệm |
| --- | --- | --- |
| Project Manager / Solution Architect / Reviewer | ChatGPT | Giao task, xét duyệt, phê bình, quản lý roadmap M00–M09 |
| Developer | Muse (Pi Em) | Viết code, test, deploy, báo cáo lại cho ChatGPT |
| Product Owner | Henry | Quyết định nghiệp vụ, xác nhận giao diện/tính năng, nghiệm thu từng milestone |

## Kiến trúc (đã duyệt)

- **Monorepo** với pnpm workspace + Turborepo. Root: `seecarauto/`
- **Frontend** (website khách hàng): Next.js + TypeScript — `frontend/`
- **Admin** (trang quản trị): Next.js + TypeScript — `admin/`
- **Backend** (API độc lập): NestJS + TypeScript — `backend/`
- **Database**: PostgreSQL + Prisma
- **Cache / queue**: Redis (+ BullMQ)
- **Search**: Meilisearch
- **Storage**: S3 / Cloudflare R2
- **API**: REST, Swagger / OpenAPI, prefix `/api/v1`
- **Kiến trúc**: Modular Monolith, API-first
- **Deploy**: Vercel (frontend + admin), backend trên Railway / Render / VPS (chưa chốt)
- **URL cố định 100% tiếng Anh**, chữ thường, gạch ngang, không dấu. Ví dụ:
  `/parts`, `/products/water-pump-aisin`, `/brands/aisin`,
  `/vehicles/toyota/vios`, `/blog`, `/cart`, `/checkout`, `/account`, `/contact`.
  Nội dung hiển thị tiếng Việt, URL tiếng Anh.
- **Quy mô mặc định**: 2.000–10.000 SKU. Dữ liệu tương thích xe (fitment) chưa có, xây từ đầu.
- **Thanh toán ban đầu**: COD + chuyển khoản.

## Cấu trúc thư mục

```text
seecarauto/
├── frontend/                 # Website khách hàng (Next.js)
├── admin/                    # Trang quản trị (Next.js)
├── backend/                  # API NestJS + Prisma
├── packages/
│   ├── typescript-config/    # tsconfig dùng chung
│   ├── eslint-config/        # ESLint config dùng chung
│   ├── shared/               # Types, hằng số, permission codes, TTL cache
│   └── ui/                   # Component dùng chung (Modal, Toast, Tooltip...)
├── infrastructure/
│   └── docker/               # Ghi chú / file hạ tầng bổ sung (compose ở root)
├── docs/
│   ├── README.md             # Tài liệu dự án
│   └── project-management/   # Project Handbook (nguồn sự thật chung)
├── Dockerfile                # (mỗi app có Dockerfile riêng trong thư mục app)
├── docker-compose.yml        # Local: postgres + redis + meilisearch + apps
├── .env.example              # Mẫu cấu hình (KHÔNG chứa secret thật)
└── .github/workflows/ci.yml  # CI cơ bản
```

## Chạy dự án local

### Yêu cầu

- Node.js >= 20, pnpm >= 10
- Docker + Docker Compose (để chạy postgres / redis / meilisearch local)

### Cách 1 — Chạy bằng pnpm (không cần Docker)

```bash
cp .env.example .env
pnpm install
pnpm build        # build toàn workspace
pnpm dev          # chạy frontend :3000, admin :3001, backend :3002
```

### Cách 2 — Chạy bằng Docker (khuyến nghị cho môi trường giống production)

```bash
cp .env.example .env
docker compose up -d --build
docker compose ps
docker compose logs -f
```

Health check:

- Frontend: http://localhost:3000
- Admin: http://localhost:3001
- Backend: http://localhost:3002/health
- Backend Swagger: http://localhost:3002/api/docs

> Lưu ý: trên máy dev của Muse, container Docker KHÔNG chạy được (cgroup
> controllers trống — xem `docs/project-management/DOCKER_STANDARDS.md`).
> Tiêu chí `docker compose up` của M00 vì vậy là **UNVERIFIED trên máy này**,
> chỉ xác minh được bằng `docker compose config`. Cần kiểm tra thật trên
> Windows của Henry / VPS / CI.

## Lệnh thường dùng

| Lệnh | Ý nghĩa |
| --- | --- |
| `pnpm install` | Cài dependencies toàn workspace |
| `pnpm build` | Build toàn workspace (turbo) |
| `pnpm dev` | Chạy dev toàn workspace |
| `pnpm lint` | Lint toàn workspace |
| `pnpm typecheck` | Typecheck toàn workspace |
| `pnpm test` | Test toàn workspace |
| `pnpm format` | Format code bằng Prettier |
| `docker compose config --quiet` | Validate file docker-compose.yml |
| `docker compose up -d --build` | Khởi động toàn bộ stack local |
| `docker compose down` | Dừng stack local |

## Quy tắc code (tóm tắt — xem đầy đủ trong `docs/project-management/`)

- Không tự ý đổi kiến trúc đã duyệt; phát hiện vấn đề kiến trúc thì báo cáo trước.
- Không cài thư viện không cần thiết; không sửa code ngoài phạm vi task.
- Không commit secret / API key / mật khẩu. Chỉ commit `.env.example`.
- Mỗi task lớn có branch riêng; mỗi thay đổi phải có test phù hợp.
- Không tự đánh dấu DONE khi test chưa đạt.
- Mọi quyết định chưa được Henry duyệt không được coi là quyết định chính thức.

## Roadmap

Master Roadmap M00–M09, tổng 87 task, dự kiến 16–20 tuần.
Xem `docs/project-management/MASTER_ROADMAP.md` và
`docs/project-management/TASK_BOARD.md` để biết trạng thái hiện tại.
