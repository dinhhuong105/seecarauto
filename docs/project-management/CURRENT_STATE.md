# CURRENT STATE — SEECARAUTO

Cập nhật sau mỗi task. Đây là nơi cuộc chat task mới đọc đầu tiên để biết
dự án đang ở đâu.

## Trạng thái hiện tại (sau M00, M01-01 DONE, M01-02 DONE, M01-03 DONE — 26/11/2026)

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
  sao lưu/khôi phục NFR-015). Revision 02 đã commit 4ca0a62 và push lên
  GitHub ngày 26/11/2026 ~10:15 (remote HEAD
  4ca0a6205d16b2b677af98b0c17a93f19a2ab950 đã kiểm chứng, parent 9dab12d,
  4 files, +80/-25). ChatGPT final review Revision 02: 8/9 tiêu chí
  đạt, chưa chấp nhận, yêu cầu Revision 03 (2 điểm: đồng bộ
  CURRENT_STATE với commit Revision 02; traceability NFR-011 → NFR-014
  đổi AC-01 → AC-19 thành AC-01 → AC-18, AC-19 giữ truy vết qua
  BR-012) — Revision 03 đã commit e82cd0e và push lên GitHub ngày
  26/11/2026 ~10:19 (remote HEAD
  e82cd0efb0f12413f6ef8cfdea51e9906788d8fd đã kiểm chứng, parent
  4ca0a62, 3 files, +44/-14). ChatGPT final review Revision 03: 9/9
  tiêu chí đạt, ChatGPT ACCEPT M01-01 lúc ~10:22 ngày 26/11/2026.
  Henry quyết định lúc ~11:55 ngày 26/11/2026: chỉ cần ChatGPT đồng ý
  là được, không cần Henry click duyệt từng task — M01-01 chốt DONE
  theo quyết định này. ChatGPT giao M01-02 ngày 26/11/2026 ~12:06
  (Task Brief đầy đủ, 12 tiêu chí nghiệm thu) — M01-02 bắt đầu.
  Tài liệu: `docs/product/PRD.md`, `docs/product/SRS.md`,
  `docs/project-management/tasks/M01-01.md`.
- **Trạng thái M01-02 (ERD):** DONE — Revision 02 đã commit ad95bd8 và
  push lên GitHub ngày 26/11/2026 ~12:42 (remote HEAD
  ad95bd81ec532f598dfe37fbd5c198e540e2ab59 đã kiểm chứng, parent
  10611a1, 8 files, +120/-24). ChatGPT re-review Revision 02 ngày
  26/11/2026 ~12:50: ACCEPT, 12/12 tiêu chí nghiệm thu PASS, không yêu
  cầu Revision 03. M01-02 chốt DONE theo quyết định của Henry
  26/11/2026 ~11:55 (chỉ cần ChatGPT đồng ý là đủ). 9 Pending Decisions
  PD-01 → PD-09 giữ nguyên, chờ Henry quyết định. Tài liệu:
  `docs/database/ERD.md`,
  `docs/database/diagrams/product-fitment-erd.mmd`,
  `docs/database/DATA_DICTIONARY.md`,
  `docs/project-management/tasks/M01-02.md`. Chỉ làm tài liệu thiết kế
  — không Prisma schema/migration, không code, không seed data.
- **Trạng thái M01-03 (API Specification):** DONE — Revision 02 đã
  hoàn thành ngày 26/11/2026 (commit b491055 trên nhánh
  `feature/M01-03-api-spec`, remote HEAD đã kiểm chứng khớp local HEAD)
  và đã báo cáo ChatGPT review trong chat "Review M01-03 API Specification".
  Deliverables: `docs/api/API_SPEC.md` (24 mục), `docs/api/openapi.yaml`
  (OpenAPI 3.1.0, 68 paths, 96 operations, 37 schemas), `docs/api/API_ERROR_CATALOG.md`
  (11 nhóm lỗi, 44 mã lỗi duy nhất), `docs/api/API_SCENARIOS.md` (S-01 → S-17),
  `docs/api/API_SECURITY.md`, `docs/project-management/tasks/M01-03.md`.
  Kiểm thử thực tế (Revision 02): Redocly CLI 2.83.0 lint 0 errors
  (4 warnings đã ghi rõ lý do chấp nhận); script đối chiếu liên tài liệu
  `/tmp/m0103_check2.py` ALL CHECKS PASS (96 endpoint §10 khớp 96 operation
  OpenAPI — 66 P0 + 30 P0-PROVISIONAL; 14 endpoint phụ thuộc PD-02/03/04/05/06
  đã đánh dấu provisional ở cả §10 và OpenAPI; If-Match required: true ở 2
  operation; mọi cặp `NNN CODE` khớp Error Catalog; 37 $ref schema đều
  resolve; 97 requirement ID trong §20 đều tồn tại trong PRD/SRS; 9/9 PD
  được tham chiếu, không PD nào bị tự quyết; 135 field schema đối chiếu
  Data Dictionary — 84 field API-only đã review; 88/88 FR P0 đều được map,
  6/6 FR P1 liệt kê ở §22); scenario walkthrough S-01 → S-17 PASS (23
  endpoint tham chiếu đều có trong OpenAPI, mã lỗi đều có trong Error
  Catalog); preview OpenAPI render bằng Redocly build-docs, 96/96
  operationId hiển thị; git diff --check sạch, secret scan sạch, không
  Prisma schema/migration, không sửa PRD/SRS/ERD. 30 endpoint
  P0-PROVISIONAL (16 cũ: giỏ hàng chờ M02 quyết bảng lưu trữ; import Excel
  chờ M04; checkout chi tiết chờ D-08; tra cứu đơn bổ sung chờ D-09; AI SEO
  Lớp 2 chờ D-04; vòng đời trạng thái đơn chờ PD-08; + 14 mới phụ thuộc
  PD-02/03/04/05/06). PD-01 → PD-09 và D-01 → D-09 giữ nguyên, chờ Henry
  quyết định. ChatGPT review Revision 02 ngày 26/11/2026 ~15:00: 14/15 tiêu
  chí PASS (AC-11, AC-12 PASS* có điều kiện), chỉ AC-15 FAIL (Project
  Handbook chưa cập nhật đúng Revision 02) — giao Revision 03 chỉ sửa 4
  file Handbook, không sửa tài liệu API. Revision 03 hoàn thành (commit
  c4c5153, đã push, remote HEAD khớp, đã báo cáo ChatGPT ~15:06); ChatGPT
  kiểm tra lại AC-15 ~15:08: vẫn FAIL — các file mô tả Revision 03 là
  "đang làm" thay vì "đã hoàn thành", mâu thuẫn với checklist đã đánh dấu
  Handbook đồng bộ. Bản ghi này (Revision 04) sửa cách diễn đạt thành "đã
  hoàn thành" ở cả 4 file Handbook. Revision 04 hoàn thành (commit
  b593e98, đã push, remote HEAD khớp, đã báo cáo ChatGPT ~15:11); ChatGPT
  kiểm tra lại AC-15 ~15:12: vẫn FAIL — Task Brief còn thông tin cũ (chưa
  ghi ngày báo cáo Revision 04; checklist Handbook còn ghi Revision 03 cập
  nhật Revision 02; checklist Git còn ghi b491055) và CURRENT_STATE chưa
  ghi rõ commit b593e98. Revision 05 hoàn thành (commit 6a7301b, đã push,
  remote HEAD khớp, đã báo cáo ChatGPT ~15:15); ChatGPT kiểm tra lại AC-15
  ~15:16: vẫn FAIL — checklist Git còn ghi b593e98, CHANGELOG chưa ghi
  Revision 05 hoàn thành, checklist Handbook chưa xác nhận trạng thái sau
  Revision 05, ngày báo cáo chưa ghi Revision 05. Revision 06 hoàn thành, đã cập nhật các điểm này ở cả 4 file. ChatGPT
  ACCEPT M01-03 ngày 26/11/2026 ~15:22: 15/15 tiêu chí đạt (AC-11, AC-12
  PASS* có điều kiện); commit được chấp nhận b625015 (Revision 06). M01-03
  chốt DONE theo quyết định của Henry (chỉ cần ChatGPT đồng ý là đủ).
- **Việc kế tiếp:** báo cáo housekeeping cho ChatGPT trong cùng chat
  review để ChatGPT xác minh commit, rồi nhờ ChatGPT giao brief M01-04
  (Sitemap và Wireframe). M01-04 chưa bắt đầu — chỉ bắt đầu sau khi
  ChatGPT giao brief. M02 (Prisma schema/migration) chưa được phép bắt đầu
  cho tới khi các điều kiện và nhiệm vụ phụ thuộc được chấp nhận.
- **Repository:** https://github.com/dinhhuong105/seecarauto.git
  (nhánh `main`; commit M00 feea4d4, commit M01-01 0ecabf0, commit
  Revision 01 9dab12d, commit Revision 02 4ca0a62 và commit Revision 03
  e82cd0e đã push — xem `git log`). M01-03 làm trên nhánh
  `feature/M01-03-api-spec` (commit + push — xem `git log` trên nhánh).
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
- M01-01 (PRD/SRS) đã soạn xong 26/11/2026, DONE (ChatGPT ACCEPT 26/11/2026 ~10:22, commit e82cd0e đã push): `docs/product/
  PRD.md` (13 module, luồng nghiệp vụ + ngoại lệ, quyết định mở D-01 →
  D-09), `docs/product/SRS.md` (94 FR, 20 NFR, 16 BR, 7 INT, AC-01 →
  AC-19, bảng truy vết tách P0/P1), Task Brief `tasks/M01-01.md`. Commit
  0ecabf0 đã push lên GitHub ngày 26/11/2026 ~09:37 (remote HEAD đã kiểm
  chứng). Revision 01 đã commit 9dab12d và push lên GitHub (remote HEAD
  đã kiểm chứng); Revision 02 đã commit 4ca0a62 và push lên GitHub
  (remote HEAD 4ca0a6205d16b2b677af98b0c17a93f19a2ab950 đã kiểm chứng);
  Revision 03 đã commit e82cd0e và push lên GitHub (remote HEAD
  e82cd0efb0f12413f6ef8cfdea51e9906788d8fd đã kiểm chứng). ChatGPT final
  review Revision 03: 9/9 tiêu chí đạt, ACCEPT M01-01 lúc ~10:22 ngày
  26/11/2026; theo quyết định của Henry lúc ~11:55 cùng ngày (chỉ cần
  ChatGPT đồng ý là đủ), M01-01 chốt DONE. Chỉ làm tài liệu — không
  code tính năng, không Prisma schema/migration, không dữ liệu giả.
  Henry duyệt làm lúc ~08:59 ngày 26/11/2026.

## Đang làm

- M01-02 (ERD) DONE: Revision 02 đã commit ad95bd8 và push lên GitHub
  (remote HEAD ad95bd81ec532f598dfe37fbd5c198e540e2ab59 đã kiểm chứng).
  ChatGPT ACCEPT Revision 02 ngày 26/11/2026 ~12:50 (12/12 tiêu chí);
  M01-02 chốt DONE theo quyết định của Henry 26/11/2026 ~11:55 (chỉ
  cần ChatGPT đồng ý là đủ). PD-01 → PD-09 giữ nguyên, chờ Henry
  quyết định.
- M01-03 (API Specification) DONE: bản đầu commit 5cfcd3f đã push lên GitHub
  (branch feature/M01-03-api-spec, remote HEAD đã kiểm chứng); ChatGPT review
  trực tiếp trên GitHub ngày 26/11/2026 ~14:38 sau khi Henry cấp quyền truy cập
  GitHub cho ChatGPT (chỉ repo seecarauto): 11/15 tiêu chí PASS (AC-11, AC-12
  PASS* có điều kiện), 4 FAIL (AC-10, AC-13, AC-14, AC-15) — yêu cầu
  Revision 02 (đồng bộ HTTP status, If-Match bắt buộc, đánh dấu P0-PROVISIONAL
  cho endpoint phụ thuộc PD-02/03/04/05/06, cập nhật CURRENT_STATE). Revision
  02 hoàn thành (commit b491055, đã push, remote HEAD khớp), đã báo cáo
  ChatGPT; ChatGPT review 26/11 ~15:00: 14/15 PASS, chỉ AC-15 FAIL
  (Handbook chưa cập nhật đúng Revision 02). Revision 03 hoàn thành (commit
  c4c5153, đã push, remote HEAD khớp), đã báo cáo ChatGPT ~15:06; ChatGPT
  kiểm tra lại AC-15 ~15:08: vẫn FAIL vì các file mô tả Revision 03 là
  "đang làm". Revision 04 hoàn thành (commit b593e98, đã push, remote HEAD
  khớp), đã báo cáo ChatGPT ~15:11; ChatGPT kiểm tra lại AC-15 ~15:12: vẫn
  FAIL vì Task Brief còn thông tin cũ (ngày báo cáo, checklist
  Handbook/Git) và CURRENT_STATE chưa ghi rõ commit b593e98. Revision 05
  hoàn thành (commit 6a7301b, đã push, remote HEAD khớp), đã báo cáo
  ChatGPT ~15:15; ChatGPT kiểm tra lại AC-15 ~15:16: vẫn FAIL vì checklist
  Git còn ghi b593e98, CHANGELOG chưa ghi Revision 05 hoàn thành và
  checklist Handbook chưa xác nhận trạng thái sau Revision 05. M01-03 đang
  chờ ChatGPT kiểm tra lại AC-15 sau bản ghi này (Revision 06 cập nhật các
  điểm trên). ChatGPT ACCEPT M01-03 ngày 26/11/2026 ~15:22 (15/15 AC đạt,
  commit được chấp nhận b625015). M01-03 chốt DONE (housekeeping commit —
  xem git log); M01-04 chưa bắt đầu — chỉ bắt đầu sau khi ChatGPT giao
  brief.

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
