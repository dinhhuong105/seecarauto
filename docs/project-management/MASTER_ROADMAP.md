# MASTER ROADMAP — SEECARAUTO (M00–M09)

Tổng: **89 task**, dự kiến **16–20 tuần**. Mỗi task có Task Brief riêng
trong `tasks/` (mã task, mục tiêu, yêu cầu kỹ thuật, tiêu chí nghiệm thu,
test cases, trạng thái).

Trạng thái task: `BACKLOG` / `READY` / `IN_PROGRESS` / `IN_REVIEW` / `DONE` /
`BLOCKED`. Xem trạng thái hiện tại trong `TASK_BOARD.md`.

## M00 — Project Foundation & Engineering Standards (5 task cũ → 7 task mới)

Tuần 1. Priority: Critical. Không có dependency.

| Task | Tên | Deliverable |
| --- | --- | --- |
| M00-01 | Initialize monorepo | `seecarauto/` |
| M00-02 | Setup pnpm workspace, Turborepo và package.json | `pnpm-workspace.yaml`, `turbo.json` |
| M00-03 | Setup TypeScript và code conventions | `tsconfig.base.json` |
| M00-04 | Setup Git và branch conventions | `.gitignore`, branch rules |
| M00-05 | Tạo tài liệu README và project documentation | `docs/`, `README.md` |
| M00-06 | Setup Docker và docker-compose | `Dockerfile`, `docker-compose.yml` |
| M00-07 | Tạo Project Handbook | `docs/project-management/`, `TASK_BOARD.md` |

Tiêu chí nghiệm thu M00: (1) đúng cấu trúc thư mục; (2) `pnpm install`
chạy; (3) workspace build thành công; (4) `docker compose up` chạy được,
PostgreSQL/Redis/app có health check; (5) không secret + GitHub Actions CI
cơ bản. **Lưu ý M00:** mục (4) là UNVERIFIED trên máy dev của Muse
(containers không chạy được) — xem `DOCKER_STANDARDS.md`.

## M01 — Architecture & UI/UX (7 task, tuần 2–3)

PRD/SRS, ERD chi tiết (Product, SKU, OEM, Vehicle Fitment), API
Specification, Sitemap và Wireframe, cấu trúc Admin Dashboard, nghiên cứu
mẫu UI/UX e-commerce + admin hiện đại và đề xuất phương án tham khảo trước
khi triển khai.

## M02 — Infrastructure & Authentication (8 task, tuần 3–5)

PostgreSQL + Prisma schema, Redis cache + BullMQ, Meilisearch, S3/R2,
Auth JWT + Refresh Token, RBAC nền tảng, CI/CD, môi trường
Development → Staging → Production, backup.

## M03 — Product Catalog & Search (10 task, tuần 5–8)

Products, SKUs, categories, brands, images, specs, OEM codes, variants,
Import/Export Excel, tìm kiếm theo SKU/OEM/tên/thương hiệu/dòng xe, tìm
ngược phụ tùng → xe tương thích.

## M04 — Vehicle & Fitment (9 task, tuần 7–10)

Vehicle makes/models/generations/engines/variants, bảng `vehicle_fitments`
(quan trọng nhất), Import Fitment Excel, tra cứu phụ tùng theo xe.

## M05 — E-commerce & Order Management (10 task, tuần 9–12)

Cart/Checkout, orders (snapshot tên/SKU/giá/số lượng lúc đặt hàng),
payments (COD + chuyển khoản trước), shipments, inventory, promotions.

## M06 — Admin & Dynamic RBAC (9 task, tuần 10–13)

Admin dashboard, ma trận vai trò × module × hành động (checkbox, Select
All/None theo module), bảng `users`, `roles`, `permissions`,
`role_permissions`, `user_roles`, `user_permissions`, audit log, quy tắc
không cho Super Admin cuối cùng tự khóa mình.

## M07 — CMS & AI SEO (10 task, tuần 12–15)

CMS bài viết, module "AI SEO Assistant" (Lớp 1 Rule Engine + Lớp 2 AI
Content Analysis), SEO Title/Meta Description/Focus Keyword/Secondary
Keywords/slug chuẩn SEO/Search Intent, manual override không bị ghi đè,
Google Search Preview.

## M08 — SEO, Performance & Security (9 task, tuần 14–17)

Technical SEO (SSR/SSG, meta unique, canonical, sitemap, robots,
breadcrumb, JSON-LD, faceted navigation), Core Web Vitals
(LCP ≤ 2,5s, INP ≤ 200ms, CLS ≤ 0,1), bảo mật (Argon2id, RBAC, rate
limiting, chống SQL Injection/XSS/CSRF, audit log, backup tự động).

## M09 — QA, UAT & Production Launch (10 task, tuần 17–20)

Testing & UAT, kiểm thử toàn hệ thống, nghiệm thu với Henry, launch
Production, tối ưu sau launch. Không tự deploy Production khi chưa được
Product Owner chấp thuận.
