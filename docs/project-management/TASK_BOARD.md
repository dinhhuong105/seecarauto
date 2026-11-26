# TASK BOARD — SEECARAUTO

Trạng thái: `BACKLOG` / `READY` / `IN_PROGRESS` / `IN_REVIEW` / `DONE` /
`BLOCKED`. Cập nhật file này sau mỗi task. Chi tiết từng task xem
`tasks/M00-01.md` … (mỗi task có Task Brief riêng).

## M00 — Project Foundation & Engineering Standards (tuần 1)

| Task | Tên | Trạng thái | Ghi chú |
| --- | --- | --- | --- |
| M00-01 | Initialize monorepo | DONE | Monorepo `seecarauto/`: frontend, admin, backend, packages, infrastructure, docs |
| M00-02 | Setup pnpm workspace, Turborepo và package.json | DONE | `pnpm-workspace.yaml`, `turbo.json` |
| M00-03 | Setup TypeScript và code conventions | DONE | `tsconfig.base.json`, ESLint + Prettier; đã sửa 36 lỗi lint backend 26/11 |
| M00-04 | Setup Git và branch conventions | DONE | `.gitignore`, branch rules |
| M00-05 | Tạo tài liệu README và project documentation | DONE | `docs/`, `README.md` |
| M00-06 | Setup Docker và docker-compose | DONE | Dockerfile ×3, `docker-compose.yml`; runtime UNVERIFIED trên máy Muse |
| M00-07 | Tạo Project Handbook | DONE | `docs/project-management/` + `tasks/` |

Tiêu chí nghiệm thu M00: (1) đúng cấu trúc thư mục ✓; (2) `pnpm install`
chạy ✓ (exit 0, 991 packages); (3) workspace build thành công ✓
(`pnpm typecheck` 9/9, `pnpm lint` 9/9, `pnpm test` 9/9, `pnpm build`
5/5 — 26/11/2026); (4) `docker compose up` + health check —
**UNVERIFIED runtime trên máy Muse**, chỉ validate config ✓
(`docker compose config --quiet` exit 0, 6 services); (5) không secret +
GitHub Actions CI cơ bản — CI file đã có, chạy trên GitHub sau khi push.

## M01 — Architecture & UI/UX (tuần 2–3)

| Task | Tên | Trạng thái |
| --- | --- | --- |
| M01-01 | PRD / SRS | IN_REVIEW | PRD + SRS đã soạn xong 26/11; chờ ChatGPT review + Henry nghiệm thu |
| M01-02 | ERD chi tiết (Product, SKU, OEM, Vehicle Fitment) | BACKLOG |
| M01-03 | API Specification | BACKLOG |
| M01-04 | Sitemap và Wireframe | BACKLOG |
| M01-05 | Cấu trúc Admin Dashboard | BACKLOG |
| M01-06 | Nghiên cứu mẫu UI/UX và đề xuất phương án | BACKLOG |
| M01-07 | Backlog và chia Sprint | BACKLOG |

## M02 — Infrastructure & Authentication (tuần 3–5) — 8 task, BACKLOG

PostgreSQL + Prisma, Redis + BullMQ, Meilisearch, S3/R2, Auth JWT +
Refresh Token, RBAC nền tảng, CI/CD, môi trường Dev/Staging/Production.

## M03 — Product Catalog & Search (tuần 5–8) — 10 task, BACKLOG

## M04 — Vehicle & Fitment (tuần 7–10) — 9 task, BACKLOG

## M05 — E-commerce & Order Management (tuần 9–12) — 10 task, BACKLOG

## M06 — Admin & Dynamic RBAC (tuần 10–13) — 9 task, BACKLOG

## M07 — CMS & AI SEO (tuần 12–15) — 10 task, BACKLOG

## M08 — SEO, Performance & Security (tuần 14–17) — 9 task, BACKLOG

## M09 — QA, UAT & Production Launch (tuần 17–20) — 10 task, BACKLOG

Tổng: 87 task (M00: 7, M01: 7, M02: 8, M03: 10, M04: 9, M05: 10,
M06: 9, M07: 10, M08: 9, M09: 10).
