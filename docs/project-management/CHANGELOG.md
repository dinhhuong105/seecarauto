# CHANGELOG — SEECARAUTO

Lịch sử thay đổi quyết định và trạng thái dự án. Ghi mới nhất lên đầu.

## 26/11/2026 — M01-01 Revision 03 (theo final review của ChatGPT, IN_REVIEW)

- ChatGPT final review Revision 02 (commit 4ca0a62): 8/9 tiêu chí đạt,
  chưa chấp nhận; yêu cầu Revision 03 rồi mới quyết định ACCEPT cuối
  cùng, sau đó Henry nghiệm thu mới sang M01-02. Vẫn chỉ làm tài liệu,
  không code tính năng.
- 2 điểm sửa: (1) đồng bộ CURRENT_STATE.md với commit Revision 02 —
  ghi commit 4ca0a62 (full 4ca0a6205d16b2b677af98b0c17a93f19a2ab950) đã
  push lên GitHub (remote HEAD đã kiểm chứng), M01-01 vẫn IN_REVIEW,
  M01-02 chưa bắt đầu; (2) traceability NFR-011 → NFR-014 đổi AC-01 →
  AC-19 thành AC-01 → AC-18 (AC-19 là Inventory P1, không thuộc nhóm
  kiểm thử responsive/accessibility/design system); AC-19 vẫn được
  truy vết qua BR-012.
- Vẫn 94 FR, 20 NFR, 16 BR, 7 INT, mã duy nhất, không yêu cầu nào bị mất;
  AC-01 → AC-19 (AC-19 chỉ truy vết qua BR-012, không qua NFR-011 →
  NFR-014); D-01 → D-09 không đổi; M00 DONE và Docker runtime UNVERIFIED
  không đổi; M01-01 vẫn IN_REVIEW.
- commit Revision 03 (SHA trong git log — không ghi SHA của chính commit này vào file để tránh vòng lặp amend)

## 26/11/2026 — M01-01 Revision 02 (theo re-review của ChatGPT, IN_REVIEW)

- ChatGPT re-review Revision 01 (commit 9dab12d): 7/9 tiêu chí đạt, chưa
  chấp nhận; yêu cầu Revision 02 rồi kiểm tra cuối, sau đó Henry nghiệm
  thu mới sang M01-02. Vẫn chỉ làm tài liệu, không code tính năng.
- 3 điểm sửa: (1) đồng bộ CURRENT_STATE.md với Revision 01 — ghi commit
  9dab12d đã push lên GitHub (remote HEAD đã kiểm chứng), M01-01 vẫn
  IN_REVIEW, M01-02 chưa bắt đầu; (2) thêm AC-19 (Tồn kho theo số lượng,
  P1) với 5 kiểm thử — admin cập nhật số lượng, đơn xác nhận cập nhật
  đúng số lượng, không cho tồn kho âm, cảnh báo ngưỡng tồn kho thấp, dữ
  liệu tồn kho phản ánh đúng trên frontend; ngưỡng cảnh báo và thời điểm
  trừ kho do Henry quyết ở milestone Inventory / M05, chưa có số liệu hay
  quy tắc cụ thể; BR-012 phần P1 trỏ AC-19, phần P0 giữ AC-02; (3)
  NFR-015 sao lưu/khôi phục có tiêu chí kiểm thử cụ thể của riêng nó
  (lấy backup, khôi phục ở staging, kiểm tra dữ liệu sau khôi phục;
  RTO/RPO do M02/M09 chốt, chưa có số) và bảng truy vết không còn lấy
  AC-09/AC-12 làm bằng chứng sao lưu/khôi phục.
- Vẫn 94 FR, 20 NFR, 16 BR, 7 INT, mã duy nhất, không yêu cầu nào bị mất;
  AC-01 → AC-19; D-01 → D-09 không đổi; M00 DONE và Docker runtime
  UNVERIFIED không đổi; M01-01 vẫn IN_REVIEW.
- commit Revision 02 (SHA trong git log — không ghi SHA của chính commit này vào file để tránh vòng lặp amend)

## 26/11/2026 — M01-01 Revision 01 (theo review của ChatGPT, IN_REVIEW)

- ChatGPT review bản đầu (commit 0ecabf0) chưa chấp nhận; yêu cầu Revision
  01 rồi review lại, sau đó Henry nghiệm thu mới sang M01-02. Vẫn chỉ làm
  tài liệu, không code tính năng.
- 6 điểm sửa: (1) bổ sung tiêu chí kiểm thử cụ thể cho FR-013, FR-014,
  FR-059, FR-079, FR-093, INT-006; FR-094 chuyển sang P1 làm tra cứu đơn
  trong tài khoản; (2) bảng truy vết tách P0/P1, thêm AC-14 → AC-18,
  INT-003/INT-006 và từng BR có liên kết riêng tới FR/AC; (3) thống nhất
  P0 = trạng thái còn hàng, P1 = tồn kho theo số lượng; tra cứu đơn công
  khai P0 (FR-058), xem đơn trong tài khoản P1 (FR-094); (4) FR-058 thêm
  yêu cầu bảo mật tra cứu đơn (mã không đoán được, rate limit, không lộ
  thông tin người khác), phương thức xác minh bổ sung là quyết định mới
  D-09 chờ Henry; (5) FR-011 sửa tham chiếu sang NFR-002, AC-01 thêm
  trạng thái loading/empty/error, AC-04 thêm nhập Excel dữ liệu xe,
  AC-13 thêm kiểm tra form liên hệ; (6) đồng bộ Handbook: CURRENT_STATE
  và CHANGELOG sửa các câu cũ nói M01-01 chưa commit/push.
- Vẫn 94 FR, mã duy nhất, không yêu cầu nào bị mất; M00 DONE và Docker
  runtime UNVERIFIED không đổi; M01-01 vẫn IN_REVIEW.
- commit Revision 01 (SHA trong git log — không ghi SHA của chính commit này vào file để tránh vòng lặp amend)

## 26/11/2026 — M01-01 PRD/SRS đã soạn xong, IN_REVIEW

- Henry duyệt làm M01-01 lúc ~08:59 ("DUYỆT M01-01, làm luôn"); ChatGPT
  đã giao M01-01 về mặt kế hoạch trước đó.
- Tạo `docs/product/PRD.md` (tổng quan, nhóm người dùng, hành trình khách
  hàng + quản trị, 13 module, phân loại P0/P1/P2 theo Charter mục 2, luồng
  nghiệp vụ + ngoại lệ, quyết định mở D-01 → D-08) và
  `docs/product/SRS.md` (94 FR, 20 NFR, 16 BR, 7 INT, AC-01 → AC-13,
  bảng truy vết yêu cầu → module → AC). Task Brief
  `docs/project-management/tasks/M01-01.md`; cập nhật `CURRENT_STATE.md`,
  `TASK_BOARD.md` (M01-01 IN_REVIEW).
- Phạm vi task này chỉ làm tài liệu: không code tính năng, không Prisma
  schema/migration, không API/UI thật, không dữ liệu giả. Quy trình
  checkout chi tiết (D-08) chưa chốt — chỉ chốt khung, đề xuất chi tiết
  trình Henry duyệt ở M01-04/M05.
- M00: commit feea4d4 đã push lên GitHub (remote HEAD khớp); CI #1 chạy
  SUCCESS 1m22s cho commit feea4d4 theo kiểm tra của ChatGPT ngày
  26/11/2026 (Muse chưa tự kiểm chứng độc lập). Docker runtime vẫn
  UNVERIFIED trên máy dev của Muse.
- M01-01 đã commit 0ecabf0 và push lên GitHub ngày 26/11/2026 ~09:37
  (remote HEAD 0ecabf015ea57b3191354afefd4d63f04c01d441 đã kiểm chứng).
  Revision 01 đã commit 9dab12d và push lên GitHub (xem mục mới nhất ở
  đầu file).

## 26/11/2026 — Sửa lỗi lint backend M00 (trước khi nghiệm thu)

- `backend/.prettierrc` đổi `singleQuote: true` → `false` cho đúng chuẩn
  monorepo (double quotes, theo CODING_STANDARDS.md). File scaffold của
  NestJS dùng single quotes nên 35 lỗi prettier.
- Tạo `backend/tsconfig.eslint.json` (chỉ dùng cho eslint, include cả
  `src/**/*` và `test/**/*`, `rootDir: ./`) và trỏ
  `parserOptions.project` trong `backend/.eslintrc.js` sang file này —
  sửa lỗi parsing `test/app.e2e-spec.ts` không thuộc project TS. Cách
  thử trước (thêm `test/**/*` vào `tsconfig.json`) đã bị loại vì vi phạm
  `rootDir: ./src` (TS6059).
- Sửa expectation cũ `Hello World!` trong `test/app.e2e-spec.ts` theo
  greeting mới của API (đồng bộ với unit spec đã sửa trước đó).
- Đính chính: mục 25/11 ghi "M00 DONE" là chưa đúng — M00 lúc đó mới
  IN_REVIEW, chưa qua nghiệm thu đầy đủ và chưa commit/push.
- Bỏ `next/font/google` (Inter) ở frontend/admin: `next build` tải font
  từ fonts.googleapis.com và fail trên máy dev (EPROTO, proxy chặn TLS).
  Body dùng font stack hệ thống (Inter đầu tiên khi máy người dùng có
  sẵn). Ghi ADR-011; font tự host để M01 quyết định.

## 25/11/2026 — M00 IN_REVIEW (M00-01 → M00-07)

- Dựng xong monorepo, pnpm + Turborepo, TypeScript, Git conventions,
  README/docs, Docker + compose, Project Handbook.
- `pnpm install` + workspace build thành công trên máy dev của Muse.
- Docker runtime UNVERIFIED trên máy Muse (containers không chạy được) —
  chỉ validate bằng `docker compose config`.
- Henry đồng ý tiếp tục làm M00 lúc ~23:50 sau khi M00 dừng giữa chừng
  (~22:10) vì bước clone bị gắn cờ kiểm tra rủi ro thực thi.

## 25/11/2026 — Cập nhật kickoff M00 (ChatGPT)

- Henry thêm 3 yêu cầu: (1) Docker bắt buộc, phải chạy thử + báo cáo thật;
  (2) mỗi task báo cáo trong 1 chat mới, giữ mạch qua Project Handbook;
  (3) UI/UX cốt lõi: popup/modal, toast/popup, tooltip, animation, design
  system.
- ChatGPT cập nhật M00 thành 7 task (thêm M00-06 Docker, M00-07 Project
  Handbook). Tiêu chí nghiệm thu M00 còn 5 mục.

## 25/11/2026 — Baseline dự án chốt (ChatGPT)

- Mẫu tham khảo phutungotoquangvu.com; Henry chọn phương án 2 (xây từ đầu,
  không WordPress).
- Stack: monorepo seecarauto/ (frontend Next.js + admin + backend NestJS +
  packages + infrastructure + docs), TypeScript, PostgreSQL + Prisma,
  Redis, Meilisearch, S3/R2, REST + Swagger, pnpm + Turborepo, deploy
  Vercel + backend Railway/Render/VPS.
- URL 100% tiếng Anh; phân quyền động RBAC; SEO bài viết tự động + sửa
  tay không bị ghi đè; quy mô 2.000–10.000 SKU; fitment xây từ đầu.
- Roadmap M00–M09, 87 task, 16–20 tuần.
- Henry giao yêu cầu cho ChatGPT; ChatGPT làm Project Manager, Muse làm
  Developer, Henry là Product Owner.
- Repo GitHub: https://github.com/dinhhuong105/seecarauto.git (lúc tạo
  trống, 0 commit).
