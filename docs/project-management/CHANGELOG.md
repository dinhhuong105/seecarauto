# CHANGELOG — SEECARAUTO

Lịch sử thay đổi quyết định và trạng thái dự án. Ghi mới nhất lên đầu.

## 26/11/2026 — M01-04 Revision 02 (sửa AC-12: wireframe Mobile cho trang 404)

- ChatGPT review bản đầu M01-04 (commit 7a121e3) ngày 26/11/2026 ~16:15:
  14/15 AC PASS, chỉ AC-12 FAIL — mẫu 13b (trang 404) thiếu wireframe
  Mobile (lỗi đếm của Muse: bản đầu ghi 13 khối Mobile nhưng thực tế mẫu
  13b chưa có Mobile). Các AC khác giữ nguyên PASS; D-08/D-09, FR-003,
  FR-046 được ChatGPT đánh giá tốt (không tự quyết nghiệp vụ, không dữ
  liệu giả).
- Revision 02 (commit này): bổ sung wireframe Mobile cho mẫu 13b trong
  WIREFRAMES.md (thông báo 404, ô tìm kiếm, liên kết gợi ý, nút về
  Homepage, hotline/Zalo — xếp dọc, nút full-width, không tràn màn hình)
  + nhãn Desktop cho 13b; cập nhật bằng chứng Task Brief §9.4/§9.8/AC-12
  (13 mẫu / 14 bề mặt, 14 khối Desktop + 14 khối Mobile); kiểm tra lại
  toàn bộ 15 AC — 15/15 PASS. Không sửa nội dung khác; không sửa
  PRD/SRS/ERD/API đã nghiệm thu; không tạo Prisma schema/migration.
- M01-04 vẫn IN_REVIEW — đã báo cáo lại ChatGPT trong cùng chat review,
  đang chờ kiểm tra lại AC-12. M01-05 chỉ bắt đầu sau khi M01-04 được
  ACCEPT.

## 26/11/2026 — M01-04 IN_REVIEW (bản đầu — Sitemap và Wireframe)

- ChatGPT xác minh housekeeping M01-03 (commit f320968) ngày 26/11/2026
  ~15:51: M01-03 chính thức DONE; ChatGPT giao Task Brief M01-04 và ủy
  quyền bắt đầu ngay (không cần chờ Henry duyệt lại kế hoạch).
- Bản đầu M01-04 hoàn thành trên nhánh `feature/M01-04-sitemap-wireframe`
  (base commit f320968): `docs/ui-ux/SITEMAP.md` (19 mục — 18 trang +
  trạng thái lỗi chung; URL theo ADR-004; truy vết FR → trang),
  `docs/ui-ux/diagrams/sitemap.mmd` (Mermaid render OK: 18 node / 25
  cạnh), `docs/ui-ux/WIREFRAMES.md` (13 mẫu trang, desktop + mobile),
  `docs/ui-ux/USER_FLOWS.md` (15 luồng F-01 → F-15, 5 luồng thay thế,
  10 trường hợp lỗi), Task Brief `tasks/M01-04.md` (15 AC).
- Kiểm tra thật: URL 20/20 PASS; đối chiếu API 30/30 PASS; Mermaid
  render (Mermaid 11 + jsdom) 18 node / 25 cạnh PASS; walkthrough 15/15
  PASS; tự đánh giá 15/15 AC (AC-11, AC-12 theo bằng chứng đếm được;
  AC-15 hoàn tất sau khi commit này được push và xác minh remote HEAD).
- D-08/D-09 giữ Pending — chỉ trình bày đề xuất và vị trí/luồng dự kiến,
  không tự chốt; không tạo dữ liệu kinh doanh giả (mọi ví dụ đều ghi
  "ví dụ minh họa, không phải dữ liệu thật"). Không sửa PRD/SRS/ERD/API
  đã nghiệm thu; không tạo Prisma schema/migration; không code frontend.
- M01-04 IN_REVIEW — đã báo cáo ChatGPT trong chat mới của Project, đang
  chờ review. M01-05 (Admin Dashboard) là task tiếp theo sau khi M01-04
  được ACCEPT.

## 26/11/2026 — M01-03 DONE (ChatGPT ACCEPT 15/15, commit b625015)

- ChatGPT ACCEPT M01-03 ngày 26/11/2026 ~15:22: 15/15 tiêu chí nghiệm thu
  đạt (AC-01 → AC-14 đạt, AC-11 và AC-12 PASS* có điều kiện; AC-15 PASS
  sau Revision 06). Commit được chấp nhận: b625015 (Revision 06).
  M01-03 chốt DONE theo quyết định của Henry (chỉ cần ChatGPT đồng ý là
  đủ, Henry không cần click duyệt từng task).
- Housekeeping (commit này): trạng thái M01-03 thành DONE trong Task
  Brief, CURRENT_STATE và TASK_BOARD; hiệu chỉnh giờ báo cáo Revision 06
  từ ~15:23 (ước tính lúc commit) thành ~15:21 (giờ đăng thực tế theo
  ChatGPT); checklist Git ghi commit mới nhất là housekeeping này (SHA
  trong git log). Không sửa nội dung API đã nghiệm thu, không sửa
  PRD/SRS/ERD, không tạo Prisma schema/migration.
- M01-04 (Sitemap và Wireframe) là task tiếp theo, chưa bắt đầu — chỉ bắt
  đầu sau khi ChatGPT giao Task Brief.

## 26/11/2026 — M01-03 IN_REVIEW (Revision 06 hoàn thành — cập nhật AC-15; chờ kiểm tra lại)

- Revision 06 hoàn thành (commit — SHA trong git log, không ghi SHA của
  chính commit này vào file): cập nhật 6 điểm AC-15 ở cả 4 file Handbook —
  Task Brief bổ sung ngày báo cáo Revision 05 (~15:15) và Revision 06
  (~15:21 — hiệu chỉnh từ ~15:23 ước tính lúc commit), checklist Handbook xác nhận cả 4 file đã đồng bộ trạng thái
  Revision 05, checklist Git ghi commit mới nhất là Revision 06; CHANGELOG
  thêm mục Revision 05 hoàn thành; TASK_BOARD và CURRENT_STATE ghi nhận
  Revision 05 hoàn thành (commit 6a7301b, đã push, remote HEAD khớp).
  Không sửa tài liệu API, không sửa PRD/SRS/ERD, không tạo Prisma
  schema/migration. Bài học tinh chỉnh: tài liệu đã commit mô tả revision
  của chính nó ở thì hoàn thành (lúc đọc thì nó đã hoàn thành), không mô
  tả là "đang làm"; SHA của chính commit được ghi bằng "SHA trong git log"
  vì SHA chưa tồn tại lúc viết. Đang chờ ChatGPT kiểm tra lại AC-15.

## 26/11/2026 — M01-03 IN_REVIEW (Revision 05 hoàn thành — ghi nhận trạng thái; AC-15 kiểm tra lại: vẫn FAIL)

- Revision 05 hoàn thành: commit 6a7301b đã push lên GitHub (remote HEAD
  6a7301b77795a4c4dd70d15622ada0f8ee311baa đã kiểm chứng khớp local HEAD),
  báo cáo ChatGPT trong chat "Review M01-03 API Specification" ngày
  26/11/2026 ~15:15. ChatGPT kiểm tra lại AC-15 ~15:16: vẫn FAIL —
  checklist Git còn ghi lần kiểm chứng gần nhất là Revision 04 (b593e98)
  thay vì commit mới nhất 6a7301b; CHANGELOG chưa ghi Revision 05 hoàn
  thành (tiêu đề mục mới nhất vẫn là Revision 04 trong khi nội dung đã
  nói đến Revision 05); checklist Handbook chưa xác nhận trạng thái sau
  Revision 05; ngày báo cáo chưa ghi lần báo cáo Revision 05. Giao
  Revision 06 cập nhật các điểm trên ở cả 4 file Handbook.

## 26/11/2026 — M01-03 IN_REVIEW (Revision 04 hoàn thành — ghi nhận trạng thái; AC-15 kiểm tra lại: vẫn FAIL)

- Revision 04 hoàn thành: commit b593e98 đã push lên GitHub (remote HEAD
  b593e989a217a7ec5a6fb890c2944c1c743b07d6 đã kiểm chứng khớp local HEAD),
  báo cáo ChatGPT trong chat "Review M01-03 API Specification" ngày
  26/11/2026 ~15:11. ChatGPT kiểm tra lại AC-15 ~15:12: vẫn FAIL — lỗi
  diễn đạt chính của Revision 03 đã sửa xong (cả 4 file đều ghi Revision
  03 đã hoàn thành), nhưng Task Brief còn thông tin cũ: chưa ghi ngày báo
  cáo Revision 04; checklist Handbook còn ghi Revision 03 cập nhật
  Revision 02; checklist Git còn ghi remote HEAD khớp b491055 (không phải
  b593e98); CURRENT_STATE chưa ghi rõ commit b593e98 đã push và gửi review.
- Bản ghi này (Revision 05) cập nhật các điểm đó ở cả 4 file Handbook:
  Task Brief bổ sung ngày báo cáo Revision 04 (~15:11) và commit b593e98;
  checklist Handbook xác nhận cả 4 file đã đồng bộ trạng thái Revision 03
  sau Revision 04; checklist Git ghi lần kiểm chứng gần nhất là Revision
  04 (b593e98); CURRENT_STATE ghi nhận Revision 04 hoàn thành, đã push,
  đang chờ kiểm tra lại AC-15. Không sửa tài liệu API, không sửa
  PRD/SRS/ERD, không tạo Prisma schema/migration. ChatGPT kiểm tra lại
  AC-15 ~15:16: vẫn FAIL (xem mục Revision 05 ở trên).

## 26/11/2026 — M01-03 IN_REVIEW (Revision 03 hoàn thành — ghi nhận trạng thái; AC-15 kiểm tra lại: vẫn FAIL)

- Revision 03 hoàn thành: commit c4c5153 đã push lên GitHub (remote HEAD
  c4c5153753597e8b13f93f9782d402474a1d1518 đã kiểm chứng khớp local HEAD),
  báo cáo ChatGPT trong chat "Review M01-03 API Specification" ngày
  26/11/2026 ~15:06. ChatGPT kiểm tra lại AC-15 ~15:08: vẫn FAIL — các
  file mô tả Revision 03 là "đang làm" thay vì "đã hoàn thành", mâu thuẫn
  với checklist đã đánh dấu Handbook đồng bộ bằng chính commit đó.
- Bản ghi này (Revision 04) sửa cách diễn đạt ở cả 4 file Handbook:
  mọi trạng thái Revision 03 đều là "đã hoàn thành (commit c4c5153, đã
  push, đã báo cáo ChatGPT ~15:06, đang chờ kiểm tra lại AC-15)"; không
  mô tả Revision 04 là "đang làm" (bài học: tài liệu đã commit không được
  mô tả chính revision của nó là đang thực hiện — chỉ mô tả các revision
  trước là đã hoàn thành). Không sửa tài liệu API, không sửa PRD/SRS/ERD,
  không tạo Prisma schema/migration. ChatGPT kiểm tra lại AC-15 ~15:12:
  vẫn FAIL — Task Brief còn thông tin cũ (chưa ghi ngày báo cáo Revision
  04; checklist Handbook còn ghi Revision 03 cập nhật Revision 02;
  checklist Git còn ghi b491055) và CURRENT_STATE chưa ghi rõ commit
  b593e98 đã push và gửi review. Giao Revision 05 cập nhật các điểm này.

## 26/11/2026 — M01-03 IN_REVIEW (ChatGPT review Revision 02: 14/15 PASS; Revision 03 đã hoàn thành, chờ kiểm tra lại AC-15)

- ChatGPT đọc trực tiếp commit b491055 trên GitHub và review ngày 26/11/2026
  ~15:00: AC-01 → AC-14 PASS (AC-11, AC-12 PASS* có điều kiện — chấp nhận
  dựa trên bằng chứng, chưa tự chạy lại công cụ); AC-15 FAIL duy nhất vì
  Project Handbook chưa cập nhật đúng Revision 02 (CURRENT_STATE còn mô tả
  bản đầu/16 provisional/test cũ; TASK_BOARD còn ghi 11/15 và Revision 02
  đang làm; Task Brief còn ghi Revision 02 đang làm; CHANGELOG chưa ghi
  nhận commit b491055 đã hoàn thành).
- Revision 03 (đã hoàn thành, commit c4c5153): chỉ sửa 4 file Handbook —
  CURRENT_STATE (ghi Revision 02 hoàn thành, commit b491055, 30 provisional
  / 66 P0, kết quả kiểm thử mới, trạng thái chờ review), TASK_BOARD (dòng
  M01-03), CHANGELOG (bản ghi Revision 02 hoàn thành + kết quả review),
  Task Brief (metadata + checklist). Không sửa API_SPEC/OpenAPI/Error
  Catalog/Scenarios/Security, không sửa PRD/SRS/ERD, không tạo Prisma
  schema/migration. Commit c4c5153 đã push (remote HEAD đã kiểm chứng),
  báo cáo ChatGPT ~15:06. ChatGPT kiểm tra lại AC-15 ~15:08: vẫn FAIL —
  các file mô tả Revision 03 là "đang làm" thay vì "đã hoàn thành", mâu
  thuẫn với checklist đã đánh dấu Handbook đồng bộ. Bản ghi này (Revision
  04) sửa cách diễn đạt thành "đã hoàn thành" ở cả 4 file; đang chờ ChatGPT
  kiểm tra lại AC-15; nếu đạt sẽ ACCEPT M01-03.

## 26/11/2026 — M01-03 IN_REVIEW (Revision 02 hoàn thành, đã báo cáo ChatGPT)

- ChatGPT review trực tiếp trên GitHub ngày 26/11/2026 ~14:38 (sau khi Henry cấp
  quyền truy cập GitHub cho ChatGPT, chỉ repo seecarauto; đọc đúng commit
  5cfcd3f): 11/15 tiêu chí PASS (AC-11, AC-12 PASS* có điều kiện), 4 FAIL
  (AC-10, AC-13, AC-14, AC-15) — yêu cầu Revision 02, M01-03 giữ IN_REVIEW.
- Revision 02 sửa: đồng bộ HTTP status (PAYMENT_NOT_CONFIRMED 409 → 422,
  PRODUCT_UNAVAILABLE 409 → 422, PRECONDITION_FAILED sang nhóm 412,
  ACCOUNT_LOCKED sang nhóm 423, bỏ dòng mập mờ 400/409 của
  INVALID_STATUS_TRANSITION, SKU_DUPLICATE/CART_CHANGED sang nhóm Conflict
  409 — Error Catalog nay 11 nhóm, 44 mã lỗi); If-Match bắt buộc ở PATCH
  /orders/{id}/status và PUT /roles/{id}/permissions; đánh dấu P0-PROVISIONAL
  cho 14 endpoint phụ thuộc PD-02/03/04/05/06 (tổng 30 P0-PROVISIONAL, 66 P0);
  S-03/S-14 ghi rõ OEM nhiều-sản-phẩm là thiết kế dự kiến; CURRENT_STATE cập
  nhật (M01-03 IN_REVIEW, M01-04 chưa bắt đầu). Không sửa PRD/SRS/ERD, không
  tạo Prisma schema/migration, không tự quyết PD-01 → PD-09.
- Revision 02 hoàn thành: commit b491055 đã push lên GitHub (remote HEAD
  b491055916c650a46703a79736f700f6a98f0921 đã kiểm chứng khớp local HEAD),
  báo cáo ChatGPT trong chat "Review M01-03 API Specification" ngày
  26/11/2026 ~14:56. ChatGPT review Revision 02 ~15:00: 14/15 tiêu chí
  PASS (AC-11, AC-12 PASS* có điều kiện), chỉ AC-15 FAIL — Project
  Handbook (CURRENT_STATE, TASK_BOARD, CHANGELOG, Task Brief) chưa cập nhật
  đúng trạng thái Revision 02 / commit b491055. Giao Revision 03: chỉ sửa
  4 file Handbook, không sửa tài liệu API, không cần chạy lại test API.

## 26/11/2026 — M01-03 IN_REVIEW (bản đầu, chờ ChatGPT review)

- ChatGPT giao M01-03 (API Specification) ngày 26/11/2026 ~12:54 trong
  chat "Review M01-02 Revision 02" (AUTHORIZED TO START, không cần chờ
  Henry duyệt lại kế hoạch; 15 tiêu chí nghiệm thu AC-01 → AC-15; 6
  deliverables; tuyệt đối cấm Prisma schema/migration, backend/frontend
  thật, seed data, tự quyết Pending Decisions).
- Bản đầu soạn xong cùng ngày trên nhánh `feature/M01-03-api-spec`
  (từ main cecd37e): `docs/api/API_SPEC.md` (24 mục, 96 endpoint: 80 P0
  + 16 P0-PROVISIONAL), `docs/api/openapi.yaml` (OpenAPI 3.1.0, 68
  paths, 96 operations, 37 schemas), `docs/api/API_ERROR_CATALOG.md`
  (11 nhóm lỗi), `docs/api/API_SCENARIOS.md` (S-01 → S-17),
  `docs/api/API_SECURITY.md`, `docs/project-management/tasks/M01-03.md`.
- Kiểm thử thực tế: Redocly CLI 2.83.0 lint 0 errors (4 warnings đã ghi
  rõ lý do chấp nhận — URL localhost là dev server thật, 3 GET danh sách
  không tham số không có lỗi 4xx); script đối chiếu liên tài liệu
  `/tmp/m0103_check.py` ALL CHECKS PASS (96 endpoint §10 khớp 96
  operation OpenAPI; 96 operationId duy nhất — 61 admin, 35 public;
  41 $ref đều resolve; 121 requirement ID trong §20 đều tồn tại trong
  PRD/SRS; 9/9 PD được tham chiếu, không PD nào bị tự quyết; 176 field
  schema đối chiếu Data Dictionary; 88/88 FR P0 đều được map); scenario
  walkthrough S-01 → S-17 PASS; preview OpenAPI render bằng Redocly
  build-docs (96/96 operationId hiển thị); `git diff --check` sạch,
  secret scan sạch, không sửa PRD/SRS/ERD. Hai lỗi thiết kế phát hiện
  qua kiểm thử đã sửa ngay trong bản đầu: `GET /vehicles/import/{importId}`
  và `GET /fitments/import/{importId}` (theo dõi import bất đồng bộ —
  thiếu trong §10 và OpenAPI, đã bổ sung cả hai nơi + Error Catalog
  `IMPORT_NOT_FOUND`); `x-required-permission` của logout/me sửa từ
  null thành `*` (mọi admin đã đăng nhập — khớp bảng §10 và mục 6).
- PD-01 → PD-09 và D-01 → D-09 giữ nguyên, chờ Henry quyết định.
  M01-03 chỉ chuyển DONE khi ChatGPT ACCEPT (15 tiêu chí).
- Báo cáo trong chat mới của project; trạng thái IN_REVIEW (không tự DONE).
- commit bản đầu (SHA trong git log — không ghi SHA của chính commit này vào file để tránh vòng lặp amend)

## 26/11/2026 — M01-02 DONE (ChatGPT ACCEPT Revision 02, 12/12)

- ChatGPT re-review Revision 02 (commit ad95bd8, chat "Review M01-02
  Revision 02"): ACCEPT lúc ~12:50 ngày 26/11/2026, 12/12 tiêu chí
  nghiệm thu PASS; ChatGPT tự mở commit trên GitHub để đối chiếu
  (parent 10611a1, 8 files, +120/-24, FIX-01 → FIX-04 đúng trong
  diff). Không yêu cầu Revision 03. M01-02 chốt DONE theo quyết định
  của Henry 26/11/2026 ~11:55 (chỉ cần ChatGPT đồng ý là đủ).
- PD-01 → PD-09 giữ nguyên, chờ Henry quyết định (chấp nhận kỹ thuật
  không thay quyết định nghiệp vụ của Henry).
- Việc kế tiếp: nhờ ChatGPT giao brief M01-03 (API Specification); sau
  khi có brief thì bắt đầu M01-03, báo cáo trong chat mới của project.
  M02 (Prisma schema/migration) chưa được phép bắt đầu cho tới khi các
  điều kiện và nhiệm vụ phụ thuộc được chấp nhận.
- commit housekeeping chốt DONE (SHA trong git log — không ghi SHA của chính commit này vào file để tránh vòng lặp amend)

## 26/11/2026 — M01-02 Revision 02 (theo review của ChatGPT, IN_REVIEW)

- ChatGPT review bản đầu (commit 10611a1, chat "Review M01-02 ERD"):
  NOT ACCEPTED; yêu cầu Revision 02 rồi review lại. Thiết kế tổng thể
  được đánh giá tốt, không yêu cầu thiết kế lại 17 bảng hay thay đổi
  kiến trúc fitment. Vẫn chỉ làm tài liệu thiết kế, không Prisma
  schema/migration, không code, không seed data.
- 4 điểm sửa: (1) FIX-01 CHECK issuer đầy đủ cho `product_identifiers`
  — ma trận 4 loại mã, chặn cả thiếu issuer và gắn nhầm issuer sai
  loại; (2) FIX-02 Mermaid phản ánh đúng Data Dictionary — bỏ UK khỏi
  slug theo phạm vi cha, ghi chú composite unique + `year_to` nullable,
  kiểm tra lại toàn bộ PK/FK/UK/cardinality bằng script (đã mở rộng
  assertion); (3) FIX-03 mã chỉ gồm ký tự phân cách chuẩn hóa thành
  rỗng thì bị từ chối — validation application + CHECK database, bổ
  sung test; (4) FIX-04 đồng bộ Handbook — M01-01 DONE ở mọi nơi (kể
  cả header PRD.md), M01-02 IN_REVIEW; không ghi M01-02 DONE trước khi
  ChatGPT ACCEPT.
- M01-01 giữ nguyên DONE; M01-02 vẫn IN_REVIEW.
- commit Revision 02 (SHA trong git log — không ghi SHA của chính commit này vào file để tránh vòng lặp amend)

## 26/11/2026 — M01-02 bắt đầu (ERD, IN_PROGRESS)

- ChatGPT giao M01-02 (ERD — Product, SKU, OEM, Vehicle Fitment) lúc
  ~12:06 ngày 26/11/2026, kèm Task Brief đầy đủ (12 tiêu chí nghiệm
  thu, 12 ràng buộc dữ liệu, 5 nhóm deliverables). M01-02 là DATABASE
  DESIGN DOCUMENTATION ONLY: không Prisma schema/migration, không code,
  không seed data, không dữ liệu thật.
- Deliverables đang soạn: `docs/database/ERD.md` (17 bảng; khuyến nghị:
  SKU là cột `products.sku` + bảng `product_identifiers` cho 4 loại mã
  còn lại; fitment dùng mô hình `vehicle_applications` thống nhất;
  không có bảng `vehicle_years` riêng; 9 Pending Decisions PD-01 →
  PD-09), `docs/database/diagrams/product-fitment-erd.mmd` (Mermaid),
  `docs/database/DATA_DICTIONARY.md`, `docs/project-management/tasks/M01-02.md`.
- M01-01 giữ nguyên DONE. Sau khi xong M01-02: báo cáo ChatGPT trong
  chat mới của project; ChatGPT ACCEPT mới sang M01-03 (API Specification).

## 26/11/2026 — M01-01 DONE (ChatGPT ACCEPT Revision 03; quyết định nghiệm thu của Henry)

- ChatGPT final review Revision 03 (commit e82cd0e): 9/9 tiêu chí đạt,
  ChatGPT ACCEPT M01-01 lúc ~10:22 ngày 26/11/2026. "Không còn yêu cầu
  sửa PRD/SRS trước khi Henry nghiệm thu."
- Henry quyết định lúc ~11:55 ngày 26/11/2026: chỉ cần ChatGPT đồng ý
  là được, không cần Henry click duyệt từng task — áp dụng từ M01-01
  trở đi (quyết định nghiệp vụ D-01 → D-09 vẫn do Henry chốt). M01-01
  chốt DONE theo quyết định này; CURRENT_STATE, TASK_BOARD và
  tasks/M01-01.md đã cập nhật DONE (commit e82cd0e).
- Việc kế tiếp: chờ ChatGPT giao brief M01-02 (ERD: Product, SKU, OEM,
  Vehicle Fitment) rồi mới bắt đầu M01-02.

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
