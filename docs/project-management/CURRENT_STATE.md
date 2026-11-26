# CURRENT STATE — SEECARAUTO

Cập nhật sau mỗi task. Đây là nơi cuộc chat task mới đọc đầu tiên để biết
dự án đang ở đâu.

## Trạng thái hiện tại (sau M00, M01-01 đã soạn — 26/11/2026)

- **Milestone đang làm:** M01 — Architecture & UI/UX.
- **Trạng thái M00:** DONE (7/7 task, nghiệm thu đầy đủ 26/11/2026:
  `pnpm typecheck` 9/9, `pnpm lint` 9/9, `pnpm test` 9/9, `pnpm build`
  5/5, `docker compose config --quiet` exit 0). Commit feea4d4 đã push
  lên GitHub; CI #1 chạy SUCCESS 1m22s (theo kiểm tra của ChatGPT ngày
  26/11/2026 — Muse chưa tự kiểm chứng độc lập).
- **Trạng thái M01-01 (PRD/SRS):** bản đầu đã commit 0ecabf0 và push lên
  GitHub ngày 26/11/2026 ~09:37 (remote HEAD
  0ecabf015ea57b3191354afefd4d63f04c01d441 đã kiểm chứng). Revision 01 đã
  commit 9dab12d và push lên GitHub (remote HEAD
  9dab12d67f1a6bc246bdd01646ad042da6196f91 đã kiểm chứng, parent 0ecabf0,
  6 files, +159/-55). ChatGPT re-review Revision 01: 7/9 tiêu chí đạt,
  chưa chấp nhận, yêu cầu Revision 02 (3 điểm: đồng bộ CURRENT_STATE
  với Revision 01; AC-19 cho phần P1 của BR-012; nhất quán kiểm thử
  sao lưu/khôi phục NFR-015) — Revision 02 đang thực hiện, vẫn
  IN_REVIEW, chờ ChatGPT kiểm tra cuối + Henry nghiệm thu (tiêu chí
  nghiệm thu số 9 của task). M01-02 chưa bắt đầu.
  Tài liệu: `docs/product/PRD.md`, `docs/product/SRS.md`,
  `docs/project-management/tasks/M01-01.md`.
- **Việc kế tiếp:** sau khi M01-01 được nghiệm thu, sang M01-02 (ERD chi
  tiết).
- **Repository:** https://github.com/dinhhuong105/seecarauto.git
  (nhánh `main`; commit M00 feea4d4, commit M01-01 0ecabf0 và commit
  Revision 01 9dab12d đã push — xem `git log`).
- **Môi trường chạy:** frontend http://localhost:3000, admin
  http://localhost:3001, backend http://localhost:3002
  (`GET /api/v1/health`, Swagger tại `/api/docs`).

## Đã xong

- M00-01: monorepo `seecarauto/` với frontend (Next.js), admin (Next.js),
  backend (NestJS), packages (typescript-config, eslint-config, shared,
  ui), infrastructure, docs.
- M00-02: pnpm workspace + Turborepo (`pnpm-workspace.yaml`, `turbo.json`).
- M00-03: TypeScript strict dùng chung (`tsconfig.base.json`,
  `nextjs.json`, `nestjs.json`), ESLint + Prettier.
- M00-04: Git conventions (`.gitignore`, branch rules, commit message).
- M00-05: `README.md` + `docs/` (hướng dẫn chạy local).
- M00-06: Dockerfile cho frontend/admin/backend + `docker-compose.yml`
  (postgres, redis, meilisearch, backend, frontend, admin) + health check
  + `.env.example`.
- M00-07: Project Handbook đầy đủ (9 tài liệu + Task Brief M00-01..M00-07).
- Kiểm tra M00 (26/11/2026, đã pass đầy đủ): `pnpm install` exit 0
  (991 packages); `pnpm typecheck` 9/9; `pnpm lint` 9/9 (đã sửa 36 lỗi
  lint backend: `.prettierrc` backend đổi sang double quotes theo chuẩn
  monorepo, tạo `tsconfig.eslint.json` riêng cho eslint, sửa expectation
  e2e cũ; bỏ `next/font/google` — build không phụ thuộc mạng ngoài,
  xem ADR-011); `pnpm test` 9/9 (shared 5/5 Vitest, backend 2/2 Jest);
  `pnpm build` 5/5 (frontend/admin Next.js + backend NestJS);
  `docker compose config --quiet` exit 0 (6 services, healthcheck đủ).
  Docker runtime vẫn UNVERIFIED (xem "Vấn đề chưa giải quyết" 1).
- M01-01 (PRD/SRS) đã soạn xong 26/11/2026, IN_REVIEW: `docs/product/
  PRD.md` (13 module, luồng nghiệp vụ + ngoại lệ, quyết định mở D-01 →
  D-09), `docs/product/SRS.md` (94 FR, 20 NFR, 16 BR, 7 INT, AC-01 →
  AC-19, bảng truy vết tách P0/P1), Task Brief `tasks/M01-01.md`. Commit
  0ecabf0 đã push lên GitHub ngày 26/11/2026 ~09:37 (remote HEAD đã kiểm
  chứng). Revision 01 đã commit 9dab12d và push lên GitHub (remote HEAD
  đã kiểm chứng); Revision 02 đang thực hiện theo re-review của ChatGPT
  (3 điểm). Chỉ làm tài liệu — không code tính năng, không Prisma
  schema/migration, không dữ liệu giả. Henry duyệt làm lúc ~08:59 ngày
  26/11/2026.

## Đang làm

- M01-01 (PRD/SRS) Revision 02: Revision 01 đã commit 9dab12d và push
  lên GitHub (remote HEAD 9dab12d67f1a6bc246bdd01646ad042da6196f91 đã kiểm
  chứng). Revision 02 đang thực hiện theo 3 điểm re-review của ChatGPT
  (đồng bộ CURRENT_STATE, AC-19 cho BR-012 phần P1, kiểm thử NFR-015);
  vẫn IN_REVIEW — chờ ChatGPT kiểm tra cuối + Henry nghiệm thu. Parent
  sẽ kiểm tra, commit và push Revision 02.

## Vấn đề chưa giải quyết (UNRESOLVED)

1. **Docker runtime UNVERIFIED trên máy dev của Muse** — containers
   không chạy được trên VM này (cgroup controllers trống). Chỉ validate
   được config. Cần kiểm tra thật `docker compose up` + health check trên
   Windows của Henry / VPS / CI.
2. Tên miền chính thức chưa chốt: seecarauto.com hay tên miền khác?
3. Nhà cung cấp AI cho AI SEO + ngân sách API chưa chốt.
4. Nguồn dữ liệu phụ tùng và dữ liệu tương thích xe chưa chốt.
5. Backend hosting chưa chốt: Railway, Render hay VPS?
6. Dữ liệu sản phẩm thật chưa có — frontend/admin hiện chỉ có trang
   placeholder M00, chưa có catalogue/search/fitment (M03–M05).

## Quyết định đã duyệt (tóm tắt — chi tiết xem ARCHITECTURE_DECISIONS.md)

- Phương án 2: xây từ đầu bằng Next.js + NestJS (không WordPress).
- Monorepo, Modular Monolith, API-first, REST `/api/v1`.
- URL 100% tiếng Anh. Phân quyền động RBAC. Redis cache bắt buộc.
- SEO bài viết tự động + sửa tay không bị ghi đè.
- Docker bắt buộc. UI/UX: modal, toast/popup, tooltip (cả bàn phím),
  animation tinh tế, design system thống nhất.
- Quy mô 2.000–10.000 SKU; fitment xây từ đầu; thanh toán đầu COD +
  chuyển khoản.
