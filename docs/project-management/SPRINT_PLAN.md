# SPRINT PLAN — SEECARAUTO (M00–M09)

Kế hoạch Sprint cho roadmap 16–20 tuần. Nguồn: `MASTER_ROADMAP.md` +
`PRODUCT_BACKLOG.md`.

## 1. Cách chia Sprint (đề xuất của M01-07)

- **Độ dài Sprint: 2 tuần** (đề xuất — roadmap không quy định độ dài
  Sprint; ChatGPT/Henry có thể đổi thành 1 tuần hoặc 3 tuần).
- **10 Sprint × 2 tuần = 20 tuần** — mốc trên của ước tính 16–20 tuần
  trong roadmap. Mốc dưới 16 tuần cần nén (làm song song nhiều luồng
  hơn) và chưa được cam kết.
- **Không ngày cụ thể** (AC-09): chỉ khung tuần theo roadmap (tuần
  1–20). Không giả định ngày bắt đầu dự án hay số người/velocity.
- **Milestone chạy song song:** một milestone có thể trải qua nhiều
  Sprint; một Sprint có thể chứa task của nhiều milestone. Task được
  xếp vào Sprint theo khung tuần của milestone + dependency (task sau
  chỉ bắt đầu khi task chặn nó xong). Xem bảng đối chiếu §12.
- **Sprint 1–2 đã thực thi nén trong ngày 26/11/2026** (M00 +
  M01-01 → M01-06 hoàn thành trong 1 ngày làm việc); khung tuần của
  chúng là vị trí quy hoạch theo roadmap, không phải lịch thực tế.
- **Quy tắc hoàn thành Sprint (FIX-04):** một Sprint chỉ được coi là
  hoàn thành khi các task "đủ điều kiện bắt đầu" trong Sprint đạt điều
  kiện hoàn thành của chúng. Hết 2 tuần mà task chưa đạt thì task đó
  chuyển sang Sprint sau kèm lý do — không được coi Sprint hoàn thành
  chỉ vì hết thời gian hoặc đã làm một phần danh sách.
- **Trạng thái Sprint:** "Đã hết khung tuần" (hết 2 tuần) khác "Đã
  nghiệm thu hoàn thành" (mọi task đủ điều kiện trong Sprint đã đạt
  điều kiện hoàn thành). Một Sprint chỉ ghi DONE khi thỏa mãn quy tắc
  hoàn thành ở trên; Sprint đã hết khung tuần nhưng còn task đủ điều
  kiện chưa xong thì ghi CHƯA HOÀN THÀNH kèm lý do — không tự đánh
  dấu DONE theo số task đã xong.
- **Trạng thái task trong mỗi Sprint** được phân loại rõ (FIX-03):
  - **Đủ điều kiện** — dependency đã DONE (hoặc không có) và không bị
    gate quyết định chặn: được triển khai ngay.
  - **Chờ dependency** — phụ thuộc task khác chưa xong: chỉ được
    chuẩn bị kỹ thuật (đọc spec, thiết kế), chưa triển khai phần phụ
    thuộc.
  - **Chờ gate quyết định** — phụ thuộc D-01 → D-09 / PD-01 → PD-09
    chưa chốt: chỉ được chuẩn bị kỹ thuật; chưa được chốt thiết kế/
    schema và chưa triển khai chức năng phụ thuộc quyết định đó.
  - **Chuyển sang Sprint sau** — task dự kiến nhưng chưa đủ điều kiện
    khi Sprint bắt đầu: ghi rõ lý do + Sprint đích.

## 2. Bảng đối chiếu: khung tuần roadmap ↔ Sprint (FIX-02)

| Milestone | Khung tuần roadmap | Sprint bao phủ | Ghi chú |
| --- | --- | --- | --- |
| M00 | Tuần 1 | Sprint 1 (tuần 1–2) | DONE |
| M01 | Tuần 2–3 | Sprint 1 (M01-01) + Sprint 2 (M01-02 → M01-07) | DONE |
| M02 | Tuần 3–5 | Sprint 2 (M02-01/02/03/05) + Sprint 3 (M02-04/06/07/08) | Đuôi (M02-04/06/07/08) sang tuần 6 vì M02-06 phụ thuộc M02-05, M02-07/08 phụ thuộc M02-06 + D-05 |
| M03 | Tuần 5–8 | Sprint 3 (M03-01/02/03) + Sprint 4 (M03-04 → M03-09) + Sprint 5 (M03-10) | NGOẠI LỆ TIẾN ĐỘ: M03-10 sang tuần 9 vì phụ thuộc M04-05 (Sprint 5) — đây là ngoại lệ do dependency, không phải timeline M03 đã được đồng bộ hoàn toàn |
| M04 | Tuần 7–10 | Sprint 4 (M04-01/02/03) + Sprint 5 (M04-04 → M04-09) | Khớp đúng khung |
| M05 | Tuần 9–12 | Sprint 5 (M05-01/02) + Sprint 6 (M05-03 → M05-10) | Khớp đúng khung |
| M06 | Tuần 10–13 | Sprint 5 (M06-01) + Sprint 6 (M06-02/03) + Sprint 7 (M06-04 → M06-09) | Đuôi (M06-04 → M06-09) sang tuần 14 vì phụ thuộc M06-02/03 + M02-06 |
| M07 | Tuần 12–15 | Sprint 6 (M07-01) + Sprint 7 (M07-02/03/04) + Sprint 8 (M07-06 → M07-10) | Đuôi (M07-06 → M07-10) sang tuần 16 vì phụ thuộc M07-01/02; M07-05 BLOCKED ngoài Sprint |
| M08 | Tuần 14–17 | Sprint 7 (M08-01) + Sprint 8 (M08-02/03/04) + Sprint 9 (M08-05 → M08-09) | Đuôi (M08-05 → M08-09) sang tuần 18 vì M08-05 phụ thuộc M08-01, M08-08/09 là bước cuối |
| M09 | Tuần 17–20 | Sprint 9 (M09-01 → M09-04) + Sprint 10 (M09-05 → M09-10) | Khớp đúng khung |

## 3. Sprint 1 — Tuần 1–2: Nền tảng + PRD/SRS — DONE (8/8)

| Mục | Nội dung |
| --- | --- |
| Mục tiêu | Dự án chạy được (monorepo + workspace + Docker config) và bắt đầu tài liệu kiến trúc |
| Task | M00-01, M00-02, M00-03, M00-04, M00-05, M00-06, M00-07, M01-01 (8 task) |
| Trạng thái task | Đủ điều kiện: cả 8 task (không dependency ngoài M00-01) |
| Deliverables | `seecarauto/` (frontend/admin/backend/packages/infrastructure/docs); `pnpm install` exit 0; typecheck/lint/test/build PASS; `docker compose config` exit 0; Project Handbook; PRD/SRS (M01-01) — ChatGPT ACCEPT 9/9 ngày 26/11/2026 |
| Điều kiện hoàn thành | Tiêu chí nghiệm thu M00 đạt (trừ (4) `docker compose up` runtime UNVERIFIED trên máy Muse — chỉ validate config); M01-01 đã được ChatGPT ACCEPT 9/9 trong Sprint này (commit 4a86da0) — M01-01 thuộc Sprint 1 (tuần 2 theo roadmap), KHÔNG chuyển sang Sprint 2 |
| Dependency | Không có |
| Trạng thái | DONE (M00 commit feea4d4, ChatGPT ACCEPT có điều kiện; M01-01 commit 4a86da0, ChatGPT ACCEPT 9/9 — cả 8 task đã nghiệm thu; Sprint 1 là Sprint chịu trách nhiệm nghiệm thu M01-01) |

## 4. Sprint 2 — Tuần 3–4: Kiến trúc + Hạ tầng dữ liệu bắt đầu — CHƯA HOÀN THÀNH (đã hết khung tuần; 6/10 DONE)

| Mục | Nội dung |
| --- | --- |
| Mục tiêu | Hoàn thành toàn bộ tài liệu kiến trúc và UI/UX; bắt đầu schema + auth (M02 mở đầu tuần 3 theo roadmap) |
| Task | M01-02, M01-03, M01-04, M01-05, M01-06, M01-07, M02-01, M02-02, M02-03, M02-05 (10 task) |
| Trạng thái task | Đủ điều kiện: M01-02 → M01-07 (DONE); M02-01 (PD-01 → PD-06 đã được ChatGPT quyết định trong `M02_IMPLEMENTATION_DECISIONS.md`, task IN_PROGRESS). Chờ dependency: M02-02/M02-03/M02-05 (sau M02-01). Không còn gate PD-01 → PD-06 cho M02-01 |
| Deliverables | ERD (17 bảng); API Spec (96 operations); Sitemap/Wireframe; Admin Dashboard; UI Research + Design System + UI Proposal; Backlog + Sprint Plan (M01-07); Prisma schema nháp; Redis + BullMQ; Meilisearch index; JWT login admin |
| Điều kiện hoàn thành | ChatGPT ACCEPT M01-02 → M01-07; migration chạy (phần không phụ thuộc PD); login admin được; Meilisearch trả kết quả đúng ADR-010 |
| Dependency | M00 DONE; PD-01 → PD-06 (gate M02-01) |
| Trạng thái | CHƯA HOÀN THÀNH — đã hết khung tuần (tuần 3–4) nhưng chưa thỏa quy tắc hoàn thành §1: M02-01 IN_PROGRESS; M02-02/03/05 còn BACKLOG. 6/10 task DONE (M01-02 → M01-07). Sprint chỉ ghi DONE khi các task M02 đủ điều kiện đạt điều kiện hoàn thành. |

## 5. Sprint 3 — Tuần 5–6: RBAC nền + Catalog bắt đầu — BACKLOG

| Mục | Nội dung |
| --- | --- |
| Mục tiêu | Phân quyền nền tảng + CI/CD + môi trường xong; bắt đầu quản lý sản phẩm (M03 mở đầu tuần 5 theo roadmap) |
| Task | M02-04, M02-06, M02-07, M02-08, M03-01, M03-02, M03-03 (7 task) |
| Trạng thái task | Đủ điều kiện: M02-06 (sau M02-05). Chờ dependency: M03-01 (chờ M02-01, M02-05, M02-06 — M02-01/M02-05 hoàn thành theo Sprint 2, M02-06 hoàn thành sau M02-05; M03-01 bắt đầu sau khi các dependency trên hoàn thành; trong M03-01, dựng nền tảng UI trước, sau đó mới triển khai UI CRUD). Chờ gate: M02-04 (D-06 — chỉ chuẩn bị abstraction storage, chưa triển khai provider cho tới khi D-06 chốt); M02-07/M02-08 (D-05 — chỉ chuẩn bị pipeline/môi trường, chưa chốt hosting); M03-02 (G-05 — phần UI chờ nền tảng M03-01 xong; phần backend/API không phụ thuộc nền tảng vẫn làm được); M03-03 (PD-02/PD-03/PD-04 — chỉ chuẩn bị theo ERD, chưa chốt quy tắc issuer cho tới khi PD quyết) |
| Deliverables | RBAC middleware + bảng roles/permissions; CI/CD chạy trên GitHub; môi trường Dev/Staging/Production + backup; Nền tảng UI dùng chung (Tailwind config + tokens M01-06, @seecarauto/ui, Button/Input/Modal/Toast/Tooltip — system font fallback); CRUD sản phẩm/danh mục/thương hiệu; SKU + OEM codes |
| Điều kiện hoàn thành | API kiểm tra permission mọi request; CI xanh; backup/restore đã kiểm thử; nền tảng UI (M03-01) hoàn thành trước khi M03-02 triển khai phần UI; tạo được sản phẩm có SKU + OEM (phần không phụ thuộc PD) |
| Dependency | Sprint 2 DONE (M02-01/05); D-05, D-06, PD-02/PD-03/PD-04 (gates) |
| Trạng thái | BACKLOG |

## 6. Sprint 4 — Tuần 7–8: Catalog + Search + Vehicle bắt đầu — BACKLOG

| Mục | Nội dung |
| --- | --- |
| Mục tiêu | Khách tìm được phụ tùng theo SKU/OEM/tên/thương hiệu; dữ liệu xe bắt đầu có (M04 mở đầu tuần 7 theo roadmap) |
| Task | M03-04, M03-05, M03-06, M03-07, M03-08, M03-09, M04-01, M04-02, M04-03 (9 task) |
| Trạng thái task | Đủ điều kiện: M03-04, M03-05, M03-08, M04-01, M04-02, M04-03. Chờ gate: M03-06 (G-01 + PD-02 — ERD có vehicle_variants nhưng chưa có product_variants; chỉ chuẩn bị kỹ thuật, chưa chốt schema/triển khai variants); M03-07 (D-02 — chỉ chuẩn bị import, chưa triển khai vì chưa có dữ liệu thật); M03-09 (D-07 + G-05 — dùng nền tảng UI M03-01; chờ M03-08 hoàn thành trước (triển khai sau M03-08 trong cùng Sprint 4) VÀ chờ D-07 đối với phần typography phụ thuộc quyết định — chỉ xây khung UI với system font fallback cho tới khi D-07 được xử lý). Chuyển sang Sprint sau: M03-10 (Reverse lookup — phụ thuộc M04-05 ở Sprint 5, chuyển sang Sprint 5) |
| Deliverables | Ảnh sản phẩm; spec key/value; variants (chuẩn bị kỹ thuật — chưa triển khai; chờ PD-02 + schema product_variants); Search API + Search UI khung (autocomplete/bộ lọc — sau M03-08, trên nền tảng UI M03-01, chưa chốt font); hãng/dòng/đời/biến thể/động cơ xe |
| Điều kiện hoàn thành | Tìm kiếm đúng thứ tự ADR-010 (phần search UI không phụ thuộc D-07); import Excel sản phẩm được (phần không phụ thuộc D-02); hãng/dòng/đời xe CRUD được |
| Dependency | Sprint 3 DONE; D-02 (gate M03-07); M04-05 (M03-10 — đã chuyển Sprint 5) |
| Trạng thái | BACKLOG |

## 7. Sprint 5 — Tuần 9–10: Fitment + Cart/Checkout bắt đầu — BACKLOG

| Mục | Nội dung |
| --- | --- |
| Mục tiêu | Xe ↔ phụ tùng gắn được với nhau; khách bỏ giỏ và bắt đầu đặt hàng được (M05 mở đầu tuần 9 theo roadmap); RBAC admin bắt đầu (M06 mở đầu tuần 10) |
| Task | M04-04, M04-05, M04-06, M04-07, M04-08, M04-09, M03-10, M05-01, M05-02, M06-01 (10 task) |
| Trạng thái task | Đủ điều kiện: M04-04, M04-07, M04-08, M04-09, M03-10 (sau M04-05 trong cùng Sprint — làm sau M04-05). Chờ gate: M04-05 (PD-09 — chỉ gắn/gỡ fitment theo ERD, chưa thêm cột source/verification cho tới khi PD-09 quyết); M04-06 (D-03 — chỉ chuẩn bị import, chưa triển khai vì chưa có dữ liệu fitment thật); M05-01 (G-03 — chỉ thiết kế API/UI giỏ, chưa chốt nơi lưu); M05-02 (D-08 — chỉ chuẩn bị checkout theo đề xuất M01-04, chưa chốt luồng cho tới khi D-08 quyết); M06-01 (G-04 — chỉ thiết kế luồng bootstrap, chưa chốt schema bảng users) |
| Deliverables | vehicle_applications; product_vehicle_fitments + change log; Import Fitment Excel (chuẩn bị); vehicle selector UI; fitment display + cảnh báo; trang hãng/dòng xe; reverse lookup; giỏ hàng (thiết kế — chưa chốt nơi lưu); checkout (chuẩn bị); tài khoản admin (thiết kế luồng bootstrap — chưa tạo thật) |
| Điều kiện hoàn thành | Gắn/gỡ fitment + log đúng FR-027/FR-033; selector hãng → dòng → đời chạy; reverse lookup trả đúng xe; giỏ hàng API/UI khung xong (phần không phụ thuộc G-03); checkout tạo được đơn nháp (phần không phụ thuộc D-08) |
| Dependency | Sprint 4 DONE; PD-01/PD-09, D-03, D-08 (gates) |
| Trạng thái | BACKLOG |

## 8. Sprint 6 — Tuần 11–12: Orders/Payments + RBAC + CMS bắt đầu — BACKLOG

| Mục | Nội dung |
| --- | --- |
| Mục tiêu | Đơn hàng chạy đầu-cuối (đặt → thanh toán → quản lý); phân quyền đầy đủ bắt đầu; bài viết bắt đầu (M07 mở đầu tuần 12 theo roadmap) |
| Task | M05-03, M05-04, M05-05, M05-06, M05-07, M05-08, M05-09, M05-10, M06-02, M06-03, M07-01 (11 task) |
| Trạng thái task | Đủ điều kiện: M05-03, M05-06, M05-07, M05-08, M05-09, M05-10, M06-02, M06-03. Chờ gate: M05-04 (PD-08 — chỉ quản lý đơn theo tên trạng thái PROVISIONAL, chưa chốt tên vòng đời cho tới khi PD-08 quyết); M05-05 (D-09 — chỉ tra cứu theo mã đơn, chưa thêm bước xác minh bổ sung cho tới khi D-09 quyết); M07-01 (G-02 — chỉ thiết kế API/UI bài viết, chưa chốt schema bảng articles) |
| Deliverables | Đơn hàng + snapshot; quản lý đơn admin; tra cứu đơn công khai; COD; chuyển khoản; shipments; tồn kho; khuyến mãi (P1); roles; ma trận permissions; articles CRUD (thiết kế — chưa triển khai cho tới khi G-02 được quyết ở M02) |
| Điều kiện hoàn thành | Đặt hàng COD + chuyển khoản thành công; tra cứu đơn chỉ trả 7 trường an toàn; roles gán được; tạo/sửa bài viết được |
| Dependency | Sprint 5 DONE; PD-08, D-09 (gates) |
| Trạng thái | BACKLOG |

## 9. Sprint 7 — Tuần 13–14: Admin + CMS/SEO Layer 1 + SSR bắt đầu — BACKLOG

| Mục | Nội dung |
| --- | --- |
| Mục tiêu | Admin vận hành được (dashboard + RBAC đầy đủ); bài viết + SEO gợi ý chạy; SSR bắt đầu (M08 mở đầu tuần 14 theo roadmap) |
| Task | M06-04, M06-05, M06-06, M06-07, M06-08, M06-09, M07-02, M07-03, M07-04, M08-01 (10 task) |
| Trạng thái task | Đủ điều kiện: cả 10 task (dependency M06-02/03, M02-06, M07-01 đã DONE ở Sprint trước) |
| Deliverables | user_roles/user_permissions; RBAC middleware; admin dashboard; audit log; last-Super-Admin guard; admin UI; trang bài viết; slug + redirect; AI SEO Layer 1 Rule Engine; SSR/SSG |
| Điều kiện hoàn thành | Menu admin hiện/ẩn đúng quyền; dashboard số liệu thật; rule engine sinh được gợi ý SEO; trang danh mục/sản phẩm render SSR |
| Dependency | Sprint 6 DONE (M06-02/03, M07-01); M02-06 (RBAC nền) |
| Trạng thái | BACKLOG |

## 10. Sprint 8 — Tuần 15–16: SEO fields + Technical SEO — BACKLOG

| Mục | Nội dung |
| --- | --- |
| Mục tiêu | SEO hoàn thiện (trừ AI Layer 2 đang BLOCKED); trang nhanh đạt chuẩn Core Web Vitals (M07 kết thúc tuần 15, M08 tiếp tục) |
| Task | M07-06, M07-07, M07-08, M07-09, M07-10, M08-02, M08-03, M08-04 (8 task) |
| Trạng thái task | Đủ điều kiện: M07-06, M07-07, M07-08, M07-09, M07-10, M08-03, M08-04. Chờ gate: M08-02 (D-01 — chỉ chuẩn bị meta/canonical/robots, chưa sinh sitemap chính thức cho tới khi có domain thật) |
| Deliverables | SEO fields; manual override; Google Search Preview; ảnh bài viết; blog homepage; meta/canonical/robots (chuẩn bị sitemap); JSON-LD + breadcrumb; faceted SEO |
| Điều kiện hoàn thành | Override thủ công không bị AI ghi đè; JSON-LD + breadcrumb đúng; trang lọc không sinh trùng lặp nội dung |
| Dependency | Sprint 7 DONE; D-01 (gate M08-02) |
| Ghi chú | **M07-05 (AI SEO Layer 2) KHÔNG nằm trong Sprint này** — BLOCKED_BY_D-04; chỉ đưa vào Sprint sau khi D-04 được quyết (AI provider + ngân sách) |
| Trạng thái | BACKLOG |

## 11. Sprint 9 — Tuần 17–18: Vitals + Security + QA bắt đầu — BACKLOG

| Mục | Nội dung |
| --- | --- |
| Mục tiêu | Trang nhanh đạt chuẩn; bảo mật hoàn thiện; kiểm thử bắt đầu (M09 mở đầu tuần 17 theo roadmap) |
| Task | M08-05, M08-06, M08-07, M08-08, M08-09, M09-01, M09-02, M09-03, M09-04 (9 task) |
| Trạng thái task | Đủ điều kiện: M08-06, M08-07, M08-08, M08-09, M09-01, M09-02, M09-03, M09-04. Chờ gate: M08-05 (D-07 — chỉ tối ưu vitals theo system font, chưa chốt font tự host cho tới khi D-07 quyết) |
| Deliverables | Core Web Vitals; Argon2id + lockout; rate limit + SQLi/XSS/CSRF; backup tự động + restore; security audit; test plan + unit/integration; E2E; performance test; security test |
| Điều kiện hoàn thành | LCP ≤ 2,5s, INP ≤ 200ms, CLS ≤ 0,1 (phần không phụ thuộc D-07); backup/restore đã kiểm thử; E2E luồng chính PASS |
| Dependency | Sprint 8 DONE; D-07 (gate M08-05) |
| Trạng thái | BACKLOG |

## 12. Sprint 10 — Tuần 19–20: UAT + Launch — BACKLOG (3 giai đoạn, tiêu chí độc lập)

| Mục | Nội dung |
| --- | --- |
| Mục tiêu | Hệ thống được Henry nghiệm thu và launch Production (chỉ khi Henry chấp thuận) |
| Task | M09-05, M09-06, M09-07, M09-08, M09-09, M09-10 (6 task) |
| Trạng thái task | Đủ điều kiện ngay từ đầu Sprint: M09-05 (sau M09-01/M09-02 ở Sprint 9), M09-07 (sau M02-08/M08-08). Chờ dependency (mở khóa tuần tự trong Sprint): M09-06 (sau M09-05 — sửa bug theo kết quả UAT), M09-08 (sau M09-05 + M09-07 + Henry duyệt launch). Sau Sprint 10 (không tính là deliverable nghiệm thu Sprint 10): M09-09 (chỉ sau launch), M09-10 (chỉ sau khi có số liệu thực tế sau launch) |
| Giai đoạn A — UAT (M09-05, M09-06) | Henry nghiệm thu theo kịch bản UAT; bug phân loại + sửa. Tiêu chí độc lập: biên bản UAT thực tế PASS, Henry ký nhận; không còn bug chặn (blocker) |
| Giai đoạn B — Readiness + Launch (M09-07, M09-08) | Checklist sẵn sàng Production; launch. Tiêu chí độc lập: readiness checklist đủ (môi trường, secret, monitoring, backup); **launch CHỈ khi Henry chấp thuận — không cam kết launch trong Sprint này nếu Henry chưa duyệt** |
| Giai đoạn C — Sau launch (M09-09, M09-10) | Giám sát + tối ưu đợt đầu. Tiêu chí độc lập: monitoring chạy; tối ưu đo bằng số liệu thật sau launch — **không đo trong 2 tuần của Sprint này**, mà đo sau khi launch (kéo dài ngoài Sprint 10). **M09-09/M09-10 không tính vào nghiệm thu Sprint 10 nếu launch chưa diễn ra.** |
| Phân biệt | Kiểm thử liên tục (M09-01 → M09-04, Sprint 9) khác nghiệm thu cuối (M09-05, Sprint 10): kiểm thử liên tục chạy trong quá trình xây; nghiệm thu cuối chỉ chạy khi toàn bộ M03 → M08 đã xong |
| Dependency | Sprint 9 DONE; toàn bộ M03 → M08; launch cần Henry duyệt |
| Trạng thái | BACKLOG |

## 13. Tổng kết

| Sprint | Tuần | Số task | Trạng thái |
| --- | --- | --- | --- |
| Sprint 1 | 1–2 | 8 (M00 7 + M01-01) | DONE |
| Sprint 2 | 3–4 | 10 (M01 6 + M02 4) | CHƯA HOÀN THÀNH — 6/10 DONE (M01-02 → M01-07); M02-01 IN_PROGRESS, các task M02 còn lại BACKLOG |
| Sprint 3 | 5–6 | 7 (M02 4 + M03 3) | BACKLOG |
| Sprint 4 | 7–8 | 9 (M03 6 + M04 3) | BACKLOG |
| Sprint 5 | 9–10 | 10 (M04 6 + M03-10 + M05 2 + M06-01) | BACKLOG |
| Sprint 6 | 11–12 | 11 (M05 8 + M06 2 + M07-01) | BACKLOG |
| Sprint 7 | 13–14 | 10 (M06 6 + M07 3 + M08-01) | BACKLOG |
| Sprint 8 | 15–16 | 8 (M07 5 + M08 3) | BACKLOG |
| Sprint 9 | 17–18 | 9 (M08 5 + M09 4) | BACKLOG |
| Sprint 10 | 19–20 | 6 (M09 6: 4 trong Sprint + 2 sau launch — M09-09/M09-10 không tính nghiệm thu Sprint 10) | BACKLOG |
| **Tổng** | **1–20** | **88** | **+ M07-05 BLOCKED (ngoài Sprint) = 89 mã task** |

- 88 task trong Sprint + 1 task BLOCKED (M07-05) = 89 mã task trong
  `PRODUCT_BACKLOG.md` (tổng 89 đã được ChatGPT quyết định ngày
  26/11/2026 — ISSUE-01, xem `PRODUCT_BACKLOG.md` §1).
- Sprint 3 trở đi chỉ chứa task có dependency đã DONE hoặc không bị
  BLOCKED (AC-08); task chờ gate chỉ được chuẩn bị kỹ thuật, chưa
  triển khai phần phụ thuộc quyết định (FIX-03).
