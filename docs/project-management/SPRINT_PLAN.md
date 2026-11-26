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
- **Luồng song song:** từ Sprint 5 trở đi, M03/M04/M05/M06 chạy
  chồng lên nhau theo đúng khung tuần của roadmap (M03 tuần 5–8,
  M04 tuần 7–10, M05 tuần 9–12, M06 tuần 10–13, M07 tuần 12–15,
  M08 tuần 14–17, M09 tuần 17–20) — các task trong cùng Sprint phải
  tôn trọng dependency (task sau chỉ bắt đầu khi task chặn nó xong).
- **Trạng thái thực tế:** Sprint 1 DONE (M00); Sprint 2 DONE trừ
  M01-07 IN_PROGRESS. Các Sprint 3–10 là kế hoạch, chưa bắt đầu.
- **Task BLOCKED không vào Sprint triển khai:** M07-05 (AI SEO Layer
  2, BLOCKED_BY_D-04) không nằm trong Sprint nào — chỉ vào Sprint sau
  khi D-04 được quyết (xem Sprint 9, ghi chú).

## 2. Sprint 1 — Tuần 1–2: Nền tảng + PRD/SRS bắt đầu — DONE

| Mục | Nội dung |
| --- | --- |
| Mục tiêu | Dự án chạy được (monorepo + workspace + Docker config) và bắt đầu tài liệu kiến trúc |
| Task | M00-01, M00-02, M00-03, M00-04, M00-05, M00-06, M00-07 (7 task) |
| Deliverables | `seecarauto/` (frontend/admin/backend/packages/infrastructure/docs); `pnpm install` exit 0; typecheck/lint/test/build PASS; `docker compose config` exit 0; Project Handbook |
| Điều kiện hoàn thành | Tiêu chí nghiệm thu M00 đạt (trừ (4) `docker compose up` runtime UNVERIFIED trên máy Muse — chỉ validate config) |
| Dependency | Không có |
| Trạng thái | DONE (commit feea4d4, ChatGPT ACCEPT có điều kiện) |

## 3. Sprint 2 — Tuần 3–4: Kiến trúc + UI/UX — DONE (trừ M01-07)

| Mục | Nội dung |
| --- | --- |
| Mục tiêu | Hoàn thành toàn bộ tài liệu kiến trúc và UI/UX làm cơ sở triển khai M02 |
| Task | M01-01, M01-02, M01-03, M01-04, M01-05, M01-06 (DONE), M01-07 (IN_PROGRESS) |
| Deliverables | PRD/SRS (94 FR); ERD (17 bảng); API Spec (96 operations); Sitemap/Wireframe; Admin Dashboard; UI Research + Design System + UI Proposal; Backlog + Sprint Plan (M01-07) |
| Điều kiện hoàn thành | ChatGPT ACCEPT từng task (M01-01 → M01-06 đã ACCEPT; M01-07 chờ review) |
| Dependency | M00 DONE |
| Trạng thái | DONE 6/7 — M01-07 IN_PROGRESS (task này) |

## 4. Sprint 3 — Tuần 5–6: Hạ tầng dữ liệu + Auth — BACKLOG

| Mục | Nội dung |
| --- | --- |
| Mục tiêu | Database + tìm kiếm + xác thực chạy được — mọi milestone sau xây trên đó |
| Task | M02-01, M02-02, M02-03, M02-04, M02-05 (5 task) |
| Deliverables | Prisma schema + migration (từ ERD); Redis + BullMQ; Meilisearch index; S3/R2 storage; JWT + refresh login admin |
| Điều kiện hoàn thành | Migration chạy; login admin được; Meilisearch trả kết quả tìm kiếm đúng ADR-010; ảnh upload lên được S3/R2 |
| Dependency | M01-02 (ERD), M01-03 (API); PD-01 → PD-06 (schema); D-06 (S3/R2 provider) |
| Trạng thái | BACKLOG — chưa đủ điều kiện bắt đầu nếu PD-01 → PD-06 và D-06 chưa quyết (thiết kế được, chốt schema thì chưa) |

## 5. Sprint 4 — Tuần 7–8: RBAC nền + Catalog bắt đầu — BACKLOG

| Mục | Nội dung |
| --- | --- |
| Mục tiêu | Phân quyền nền tảng xong; bắt đầu quản lý sản phẩm |
| Task | M02-06, M02-07, M02-08, M03-01, M03-02, M03-03 (6 task) |
| Deliverables | RBAC middleware + bảng roles/permissions; CI/CD chạy trên GitHub; môi trường Dev/Staging/Production + backup; CRUD sản phẩm/danh mục/thương hiệu; SKU + OEM codes |
| Điều kiện hoàn thành | API kiểm tra permission mọi request; CI xanh; backup/restore đã kiểm thử; tạo được sản phẩm có SKU + OEM |
| Dependency | Sprint 3 DONE; D-05 (hosting, cho M02-07/M02-08); PD-02/PD-03/PD-04 (cho M03-03) |
| Trạng thái | BACKLOG |

## 6. Sprint 5 — Tuần 9–10: Catalog + Search + Vehicle bắt đầu — BACKLOG

| Mục | Nội dung |
| --- | --- |
| Mục tiêu | Khách tìm được phụ tùng theo SKU/OEM/tên/thương hiệu; dữ liệu xe bắt đầu có |
| Task | M03-04, M03-05, M03-06, M03-07, M03-08, M03-09, M03-10, M04-01, M04-02, M04-03 (10 task) |
| Deliverables | Ảnh sản phẩm; spec key/value; variants; Import/Export Excel; Search API + Search UI (autocomplete/bộ lọc); reverse lookup; hãng/dòng/đời/biến thể/động cơ xe |
| Điều kiện hoàn thành | Tìm kiếm đúng thứ tự ADR-010; import Excel sản phẩm được; reverse lookup trả đúng xe |
| Dependency | Sprint 4 DONE; M04-05 (cho M03-10 — tra cứu ngược cần dữ liệu fitment, nếu M04-05 chưa xong thì M03-10 dời sang Sprint 6); D-02 (dữ liệu phụ tùng) |
| Trạng thái | BACKLOG |

## 7. Sprint 6 — Tuần 11–12: Fitment + Cart/Checkout bắt đầu — BACKLOG

| Mục | Nội dung |
| --- | --- |
| Mục tiêu | Xe ↔ phụ tùng gắn được với nhau; khách bỏ giỏ và bắt đầu đặt hàng được |
| Task | M04-04, M04-05, M04-06, M04-07, M04-08, M04-09, M05-01, M05-02 (8 task) |
| Deliverables | vehicle_applications; product_vehicle_fitments + change log; Import Fitment Excel; vehicle selector UI; fitment display + cảnh báo; trang hãng/dòng xe; giỏ hàng; checkout khách vãng lai |
| Điều kiện hoàn thành | Gắn/gỡ fitment + log đúng FR-027/FR-033; selector hãng → dòng → đời chạy; checkout tạo được đơn nháp |
| Dependency | Sprint 5 DONE; PD-01/PD-09 (fitment); D-03 (dữ liệu fitment); D-08 (checkout chi tiết) |
| Trạng thái | BACKLOG |

## 8. Sprint 7 — Tuần 13–14: Orders/Payments + RBAC bắt đầu — BACKLOG

| Mục | Nội dung |
| --- | --- |
| Mục tiêu | Đơn hàng chạy đầu-cuối (đặt → thanh toán → quản lý); admin phân quyền bắt đầu |
| Task | M05-03, M05-04, M05-05, M05-06, M05-07, M05-08, M05-09, M05-10, M06-01, M06-02, M06-03 (11 task) |
| Deliverables | Đơn hàng + snapshot; quản lý đơn admin; tra cứu đơn công khai; COD; chuyển khoản; shipments; tồn kho; khuyến mãi (P1); tài khoản admin; roles; ma trận permissions |
| Điều kiện hoàn thành | Đặt hàng COD + chuyển khoản thành công; tra cứu đơn chỉ trả 7 trường an toàn; roles gán được |
| Dependency | Sprint 6 DONE; PD-08 (vòng đời trạng thái đơn); D-09 (xác minh tra cứu đơn) |
| Trạng thái | BACKLOG |

## 9. Sprint 8 — Tuần 15–16: Admin + CMS/SEO Layer 1 — BACKLOG

| Mục | Nội dung |
| --- | --- |
| Mục tiêu | Admin vận hành được (dashboard + RBAC đầy đủ); bài viết + SEO gợi ý chạy |
| Task | M06-04, M06-05, M06-06, M06-07, M06-08, M06-09, M07-01, M07-02, M07-03, M07-04 (10 task) |
| Deliverables | user_roles/user_permissions; RBAC middleware; admin dashboard; audit log; last-Super-Admin guard; admin UI; articles CRUD; trang bài viết; slug + redirect; AI SEO Layer 1 Rule Engine |
| Điều kiện hoàn thành | Menu admin hiện/ẩn đúng quyền; dashboard số liệu thật; rule engine sinh được gợi ý SEO |
| Dependency | Sprint 7 DONE (M06-01 → M06-03); M02-06 (RBAC nền) |
| Trạng thái | BACKLOG |

## 10. Sprint 9 — Tuần 17–18: SEO fields + Technical SEO + Vitals — BACKLOG

| Mục | Nội dung |
| --- | --- |
| Mục tiêu | SEO hoàn thiện (trừ AI Layer 2 đang BLOCKED); trang nhanh đạt chuẩn Core Web Vitals |
| Task | M07-06, M07-07, M07-08, M07-09, M07-10, M08-01, M08-02, M08-03, M08-04, M08-05, M08-06, M08-07 (12 task) |
| Deliverables | SEO fields; manual override; Google Search Preview; ảnh bài viết; blog homepage; SSR/SSG; meta/canonical/robots/sitemap; JSON-LD + breadcrumb; faceted SEO; Core Web Vitals; Argon2id + lockout; rate limit + SQLi/XSS/CSRF |
| Điều kiện hoàn thành | Override thủ công không bị AI ghi đè; sitemap sinh đúng; LCP ≤ 2,5s, INP ≤ 200ms, CLS ≤ 0,1 |
| Dependency | Sprint 8 DONE; D-01 (domain, cho sitemap); D-07 (font, cho vitals) |
| Ghi chú | **M07-05 (AI SEO Layer 2) KHÔNG nằm trong Sprint này** — BLOCKED_BY_D-04; chỉ đưa vào Sprint sau khi D-04 được quyết (AI provider + ngân sách) |
| Trạng thái | BACKLOG |

## 11. Sprint 10 — Tuần 19–20: Security + QA/UAT/Launch — BACKLOG

| Mục | Nội dung |
| --- | --- |
| Mục tiêu | Hệ thống được kiểm thử toàn diện, Henry nghiệm thu, launch Production |
| Task | M08-08, M08-09, M09-01, M09-02, M09-03, M09-04, M09-05, M09-06, M09-07, M09-08, M09-09, M09-10 (12 task) |
| Deliverables | Backup tự động + restore; security audit; test plan + unit/integration; E2E; performance test; security test; UAT với Henry; bug fix; readiness checklist; launch; monitoring; tối ưu sau launch |
| Điều kiện hoàn thành | UAT Henry PASS; readiness checklist đủ; launch có Henry chấp thuận (M09-08 không tự deploy) |
| Dependency | Sprint 9 DONE; toàn bộ M03 → M08 |
| Trạng thái | BACKLOG |

## 12. Tổng kết

| Sprint | Tuần | Số task | Trạng thái |
| --- | --- | --- | --- |
| Sprint 1 | 1–2 | 7 (M00) | DONE |
| Sprint 2 | 3–4 | 7 (M01) | DONE 6/7 — M01-07 IN_PROGRESS |
| Sprint 3 | 5–6 | 5 (M02) | BACKLOG |
| Sprint 4 | 7–8 | 6 (M02–M03) | BACKLOG |
| Sprint 5 | 9–10 | 10 (M03–M04) | BACKLOG |
| Sprint 6 | 11–12 | 8 (M04–M05) | BACKLOG |
| Sprint 7 | 13–14 | 11 (M05–M06) | BACKLOG |
| Sprint 8 | 15–16 | 10 (M06–M07) | BACKLOG |
| Sprint 9 | 17–18 | 12 (M07–M08) | BACKLOG |
| Sprint 10 | 19–20 | 12 (M08–M09) | BACKLOG |
| **Tổng** | **1–20** | **88** | **+ M07-05 BLOCKED (ngoài Sprint) = 89 mã task** |

- 88 task trong Sprint + 1 task BLOCKED (M07-05) = 89 mã task trong
  `PRODUCT_BACKLOG.md` (xem ISSUE-01: tổng 87 trong tiêu đề
  MASTER_ROADMAP mâu thuẫn với phép cộng 89).
- Sprint 3 trở đi chỉ chứa task có dependency đã DONE hoặc không bị
  BLOCKED (AC-08); M07-05 chỉ vào Sprint sau khi D-04 được quyết.
