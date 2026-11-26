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
| M01-01 | PRD / SRS | DONE | PRD + SRS đã soạn xong 26/11, ChatGPT ACCEPT Revision 03 (commit e82cd0e) ngày 26/11 ~10:22; M01-01 chốt DONE theo quyết định của Henry 26/11 ~11:55 (chỉ cần ChatGPT đồng ý là đủ) |
| M01-02 | ERD chi tiết (Product, SKU, OEM, Vehicle Fitment) | DONE | ChatGPT ACCEPT Revision 02 (commit ad95bd8) ngày 26/11 ~12:50, 12/12 tiêu chí PASS; M01-02 chốt DONE theo quyết định của Henry 26/11 ~11:55; PD-01 → PD-09 giữ nguyên chờ Henry |
| M01-03 | API Specification | DONE | Revision 02 hoàn thành 26/11 (commit b491055, đã push, remote HEAD khớp): đồng bộ HTTP status, If-Match bắt buộc, 14 endpoint P0-PROVISIONAL (tổng 30/66 P0), Error Catalog 11 nhóm/44 mã lỗi; Redocly lint 0 errors, script đối chiếu ALL CHECKS PASS, preview 96/96 operationId; ChatGPT review Revision 02 trên GitHub 26/11 ~15:00: 14/15 PASS (AC-11, AC-12 PASS*), chỉ AC-15 FAIL (Handbook chưa cập nhật đúng Revision 02). Revision 03 hoàn thành (commit c4c5153, đã push, remote HEAD khớp), đã báo cáo ChatGPT ~15:06; ChatGPT kiểm tra lại AC-15 ~15:08: vẫn FAIL vì các file mô tả Revision 03 là "đang làm" thay vì "đã hoàn thành" — Revision 04 hoàn thành (commit b593e98, đã push, remote HEAD khớp), đã báo cáo ChatGPT ~15:11; ChatGPT kiểm tra lại AC-15 ~15:12: vẫn FAIL vì Task Brief còn thông tin cũ (ngày báo cáo, checklist Handbook/Git) và CURRENT_STATE chưa ghi rõ b593e98 — Revision 05 hoàn thành (commit 6a7301b, đã push, remote HEAD khớp), đã báo cáo ChatGPT ~15:15; ChatGPT kiểm tra lại AC-15 ~15:16: vẫn FAIL vì checklist Git còn ghi b593e98, CHANGELOG chưa ghi Revision 05 hoàn thành, checklist Handbook chưa xác nhận trạng thái sau Revision 05 — ChatGPT ACCEPT M01-03 ngày 26/11/2026 ~15:22, 15/15 AC đạt (AC-11, AC-12 PASS*), commit được chấp nhận b625015 (Revision 06); M01-03 DONE (housekeeping f320968, ChatGPT xác minh ~15:51); M01-04 DONE (xem dòng M01-04) |
| M01-04 | Sitemap và Wireframe | DONE | Bản đầu hoàn thành 26/11/2026 (branch feature/M01-04-sitemap-wireframe, base f320968): SITEMAP.md (19 mục), sitemap.mmd (Mermaid render OK: 18 node / 25 cạnh), WIREFRAMES.md (13 mẫu trang, desktop + mobile), USER_FLOWS.md (15 luồng F-01 → F-15, 5 luồng thay thế, 10 trường hợp lỗi), Task Brief M01-04.md. Kiểm tra thật: URL 20/20 PASS, đối chiếu API 30/30 PASS, walkthrough 15/15 PASS, tự đánh giá 15/15 AC. D-08/D-09 giữ Pending (chỉ đề xuất); không dữ liệu giả. Đã báo cáo ChatGPT trong chat mới của Project, đang chờ review; M01-05 tiếp theo sau khi M01-04 được ACCEPT — ChatGPT review bản đầu 26/11/2026 ~16:15: 14/15 AC PASS, chỉ AC-12 FAIL (thiếu wireframe Mobile cho mẫu 13b trang 404); Revision 02 hoàn thành (bổ sung Mobile cho 13b + nhãn Desktop cho 13b; bằng chứng 14 Desktop + 14 Mobile; kiểm tra lại 15/15 AC PASS), đã báo cáo lại ChatGPT trong cùng chat review. ChatGPT ACCEPT Revision 02 ngày 26/11/2026 — 15/15 AC PASS — M01-04 DONE (commit được chấp nhận fcd4db7). M01-05 đã được giao brief, AUTHORIZED TO START ngay |
| M01-05 | Cấu trúc Admin Dashboard | BACKLOG | Brief đã nhận 26/11/2026, AUTHORIZED TO START ngay — chưa bắt đầu (bắt đầu sau housekeeping M01-04) |
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
