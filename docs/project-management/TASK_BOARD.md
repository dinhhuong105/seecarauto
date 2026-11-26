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
| M01-04 | Sitemap và Wireframe | DONE | Bản đầu hoàn thành 26/11/2026 (branch feature/M01-04-sitemap-wireframe, base f320968): SITEMAP.md (19 mục), sitemap.mmd (Mermaid render OK: 18 node / 25 cạnh), WIREFRAMES.md (13 mẫu trang, desktop + mobile), USER_FLOWS.md (15 luồng F-01 → F-15, 5 luồng thay thế, 10 trường hợp lỗi), Task Brief M01-04.md. Kiểm tra thật: URL 20/20 PASS, đối chiếu API 30/30 PASS, walkthrough 15/15 PASS, tự đánh giá 15/15 AC. D-08/D-09 giữ Pending (chỉ đề xuất); không dữ liệu giả. Đã báo cáo ChatGPT trong chat mới của Project, đang chờ review; M01-05 tiếp theo sau khi M01-04 được ACCEPT — ChatGPT review bản đầu 26/11/2026 ~16:15: 14/15 AC PASS, chỉ AC-12 FAIL (thiếu wireframe Mobile cho mẫu 13b trang 404); Revision 02 hoàn thành (bổ sung Mobile cho 13b + nhãn Desktop cho 13b; bằng chứng 14 Desktop + 14 Mobile; kiểm tra lại 15/15 AC PASS), đã báo cáo lại ChatGPT trong cùng chat review. ChatGPT ACCEPT Revision 02 ngày 26/11/2026 — 15/15 AC PASS — M01-04 DONE (commit được chấp nhận fcd4db7). M01-05 DONE (xem dòng M01-05); M01-06 IN_REVIEW (xem dòng M01-06) |
| M01-05 | Cấu trúc Admin Dashboard | DONE | Bản đầu hoàn thành 26/11/2026 (branch feature/M01-05-admin-dashboard, base 91d308b): ADMIN_SITEMAP.md (30 mục), ADMIN_NAVIGATION.md (sidebar 7 nhóm/14 mục), RBAC_MATRIX.md (13 module × 7 hành động), ADMIN_WIREFRAMES.md (12 mẫu / 15 bề mặt), ADMIN_USER_FLOWS.md (15 luồng F-01 → F-15, 5 thay thế, 10 lỗi), Task Brief M01-05.md (7 deliverables + 12 AC theo brief chi tiết ChatGPT). Kiểm tra thật: URL 28/28 PASS, đối chiếu API 168 tham chiếu PASS (3 gap: không endpoint users — M02), wireframe 15 Desktop + 15 Mobile PASS, walkthrough 15/15 PASS, tự đánh giá 12/12 AC + AC-13 PASS. Gap ghi rõ: không bảng admin trong ERD (M02); không endpoint tạo vehicle_applications; Export chưa có endpoint; Manage không phải permission code độc lập (đơn hàng → orders.confirm); Cài đặt đề xuất (không FR). Đã báo cáo ChatGPT trong chat mới của Project ngày 26/11/2026. ChatGPT review bản đầu: 7 PASS, 2 FAIL (AC-07, AC-08), 4 FIX (AC-05, AC-11, AC-12, AC-13) — NOT ACCEPTED, yêu cầu Revision 02. Revision 02 đã sửa đủ FIX-01 → FIX-06 + điểm kiểm tra bổ sung (URL xe sang slug lồng nhau + quy tắc ánh xạ §2.1); kiểm tra lại: đối chiếu API 0 tham chiếu sai, URL 28/28 PASS, walkthrough 15/15 PASS. ChatGPT ACCEPT Revision 02 ngày 26/11/2026 — 12/12 AC PASS + AC-13 PASS — M01-05 DONE (commit được chấp nhận 25571ef; không yêu cầu Revision 03). Housekeeping đã cập nhật trạng thái DONE. M01-06 IN_REVIEW (xem dòng M01-06) |
| M01-06 | Nghiên cứu mẫu UI/UX và đề xuất phương án | DONE | Bản đầu hoàn thành 26/11/2026 (branch feature/M01-06-ui-ux-research, base 14a94e1): UI_RESEARCH.md (5 website tham khảo đọc thật: Quang Vũ, RockAuto, PartsGeek, AutoZone, MAST + 15 bài học), DESIGN_SYSTEM.md (tokens màu/chữ/spacing + 10 component + animation; tỷ lệ tương phản tính thật), UI_PROPOSAL.md (đề xuất từng nhóm trang + responsive + so sánh thư viện UI — khuyến nghị Tailwind + shadcn/ui + lộ trình theo milestone), Task Brief M01-06.md (5 deliverables + 12 AC). Mọi trích dẫn FR đã đối chiếu lại với SRS (FR-034 → FR-041 cho tìm kiếm, FR-001/FR-023 → FR-025/FR-027 → FR-031 cho tìm theo xe, FR-030 tra cứu ngược, FR-046 sản phẩm liên quan, FR-005/FR-045/FR-087 hotline/Zalo). Tự đánh giá 12/12 AC + AC-13 PASS. Đã báo cáo ChatGPT trong chat mới của Project ngày 26/11/2026. ChatGPT review bản đầu 26/11/2026: 11/12 AC PASS, AC-12 FAIL, AC-11/AC-13 PASS* — NOT ACCEPTED, yêu cầu Revision 02 (FIX-01 → FIX-03). Revision 02 đã sửa đủ 3 FIX, đã báo cáo lại ChatGPT trong chat mới "Review M01-06 Revision 02". ChatGPT review Revision 02 ngày 26/11/2026: 11/12 AC PASS, AC-01 FAIL, AC-13 PASS* — FIX-01 + FIX-02 PASS, FIX-03 chưa đạt (nhãn "Không có" cho MAST suy diễn quá mức từ trang chủ) — yêu cầu Revision 03. Revision 03 đã sửa đúng yêu cầu, đã báo cáo lại ChatGPT trong chat mới "Review M01-06 Revision 03". ChatGPT review Revision 03 ngày 26/11/2026: 11/12 AC PASS, AC-01 FAIL, AC-13 PASS* — FIX-03 vẫn chưa đạt (bảng §1.3 còn 7 ô "Không" cho MAST, §1.1/§2.5 chưa đồng bộ) — yêu cầu Revision 04 (FIX-04). Revision 04 đã sửa đúng yêu cầu, đã báo cáo lại ChatGPT trong chat mới "Review M01-06 Revision 04". ChatGPT review Revision 04 ngày 26/11/2026: 11/12 AC PASS, AC-01 FAIL, AC-13 PASS* — chỉ L14 chưa đạt (vẫn suy diễn "không bán được hàng online" cho toàn website) — yêu cầu Revision 05 (FIX-05). Revision 05 đã sửa đúng yêu cầu, đã báo cáo lại ChatGPT trong chat mới "Review M01-06 Revision 05". ChatGPT review Revision 05 ngày 26/11/2026: AC-01 → AC-12 PASS 12/12, AC-13 FAIL — chỉ Task Brief chưa đồng bộ với commit Revision 05 (dòng Trạng thái + §9.13) — yêu cầu Revision 06 (FIX-06). Revision 06 đã sửa đúng yêu cầu, đã báo cáo lại ChatGPT trong chat mới "Review M01-06 Revision 06". ChatGPT review Revision 06 ngày 26/11/2026: AC-01 → AC-12 PASS (kế thừa Revision 05), AC-13 FAIL — chỉ §9.18 ghi sai số lượng file ("5 file" trong khi diff thực tế 4 file) — yêu cầu Revision 07 (FIX-07). Revision 07 đã sửa đúng yêu cầu, đã báo cáo lại ChatGPT trong chat mới "Review M01-06 Revision 07". ChatGPT review Revision 07 ngày 26/11/2026: AC-01 → AC-12 PASS (kế thừa Revision 05), AC-13 FAIL — FIX-07 chưa xuất hiện trong Task Brief tại commit 6470920 (phần sửa áp nhầm vào §9.16, §9.19 đặt sai vị trí) — yêu cầu Revision 08 (FIX-08). Revision 08 đã sửa đúng yêu cầu, đã báo cáo lại ChatGPT trong chat mới "Review M01-06 Revision 08". ChatGPT ACCEPT M01-06 ngày 26/11/2026: AC-01 → AC-12 PASS 12/12, AC-13 PASS, FIX-08 PASS — commit được chấp nhận 5d12ce1. **M01-06 DONE.** M01-07 đang chờ Henry xác nhận kế hoạch. |
| M01-07 | Backlog và chia Sprint | DONE | Bản đầu hoàn thành 26/11/2026 (branch feature/M01-07-backlog-sprint, base 84ddddf): PRODUCT_BACKLOG.md (89 mã task) + SPRINT_PLAN.md (10 Sprint × 2 tuần) + Task Brief M01-07.md (11 AC). Henry đã duyệt kế hoạch ngày 26/11/2026 ~20:36. Kiểm tra thật: 89 mã không trùng/thiếu, dependency không vòng lặp, 88 task trong Sprint + M07-05 BLOCKED. ISSUE-01 ĐÃ QUYẾT ĐỊNH ngày 26/11/2026 (ChatGPT review bản đầu): tổng 89 (phương án (a)). ChatGPT review bản đầu: NOT ACCEPTED — 8/11 AC PASS (3 có điều kiện), AC-05 + AC-08 FAIL, AC-10 FIX — yêu cầu Revision 02 (FIX-01 → FIX-05). Revision 02 đã sửa tổng 87 → 89, đồng bộ lại timeline Sprint 3–10, bổ sung dependency gates + điều kiện hoàn thành Sprint thực chất. ChatGPT review Revision 02: NOT ACCEPTED — AC-08 FAIL, AC-05/AC-06 CONDITIONAL (thiếu gate M03-06, D-07 chưa đồng bộ M03-09, trạng thái Sprint 1/2 mâu thuẫn). Revision 03 đã bổ sung 5 gate (G-01 M03-06, D-07 M03-09, G-02 M07-01, G-03 M05-01, G-04 M06-01), sửa Sprint 1/2, M03-10 ghi rõ NGOẠI LỆ TIẾN ĐỘ, mở khóa tuần tự Sprint 10. ChatGPT review Revision 03: NOT ACCEPTED — AC-06 + AC-08 FAIL, AC-05 CONDITIONAL (G-01 mô tả sai ERD, D-07 chưa đồng bộ UI_PROPOSAL §7.3, Sprint 4 chưa rõ M03-09 chờ M03-08). Revision 04 đã sửa G-01 (ERD có vehicle_variants, chưa có product_variants — liên quan PD-02), ghi gap G-05 (cài tokens + font ở M02 chưa có task), Sprint 4 ghi rõ M03-09 chờ M03-08 xong VÀ chờ D-07. ChatGPT review Revision 04: NOT ACCEPTED — 0 FAIL, AC-05/AC-06/AC-08 CONDITIONAL (đều do G-05 chưa phân công đầy đủ; FIX-01 + FIX-03 ĐẠT). ChatGPT quyết định: không thêm task mới (giữ 89), giao nền tảng UI dùng chung cho M03-01. Revision 05 đã giao nền tảng cho M03-01, M03-02 chỉ dùng tokens/components sau khi nền tảng sẵn sàng, M03-09 cũng dùng nền tảng này, Sprint 3/4 thể hiện rõ điều kiện, §13 thêm hàng gate M03-02 (21 hàng / 22 task). ChatGPT review Revision 05: NOT ACCEPTED — chỉ AC-08 FAIL (Sprint 3 ghi M03-01 đủ điều kiện dù phụ thuộc M02-06 còn BACKLOG trong chính Sprint 3); G-05 ĐẠT. Revision 06 đã chuyển M03-01 sang "Chờ dependency M02-01, M02-05, M02-06" ở Sprint 3 + ghi rõ thứ tự, kiểm tra lại điều kiện hoàn thành Sprint 3 + dependency Sprint 4 (không mâu thuẫn). ChatGPT review Revision 05: NOT ACCEPTED — chỉ AC-08 FAIL (Sprint 3 ghi M03-01 đủ điều kiện dù phụ thuộc M02-06 còn BACKLOG trong chính Sprint 3); G-05 ĐẠT. Revision 06 đã chuyển M03-01 sang "Chờ dependency M02-01, M02-05, M02-06" ở Sprint 3 + ghi rõ thứ tự, kiểm tra lại điều kiện hoàn thành Sprint 3 + dependency Sprint 4 (không mâu thuẫn). **ChatGPT ACCEPT Revision 06 ngày 26/11/2026 — 11/11 AC PASS, không yêu cầu Revision 07 (commit được chấp nhận 5b6a67f). M01-07 DONE. Milestone M01 hoàn thành về mặt nghiệm thu: M01-01 → M01-07 đều đã được chấp nhận. Tổng backlog giữ nguyên 89 task. M02 chưa được phép bắt đầu.** |

## M02 — Infrastructure & Authentication (tuần 3–5) — 8 task, IN_PROGRESS 1/8

PostgreSQL + Prisma, Redis + BullMQ, Meilisearch, S3/R2, Auth JWT +
Refresh Token, RBAC nền tảng, CI/CD, môi trường Dev/Staging/Production.

- **M02-01 IN_PROGRESS** — Task Brief `tasks/M02-01.md`; implementation decisions `M02_IMPLEMENTATION_DECISIONS.md`; branch `feature/M02-01-postgres-prisma-schema` (base `7d1041f`).

## M03 — Product Catalog & Search (tuần 5–8) — 10 task, BACKLOG

## M04 — Vehicle & Fitment (tuần 7–10) — 9 task, BACKLOG

## M05 — E-commerce & Order Management (tuần 9–12) — 10 task, BACKLOG

## M06 — Admin & Dynamic RBAC (tuần 10–13) — 9 task, BACKLOG

## M07 — CMS & AI SEO (tuần 12–15) — 10 task, BACKLOG

## M08 — SEO, Performance & Security (tuần 14–17) — 9 task, BACKLOG

## M09 — QA, UAT & Production Launch (tuần 17–20) — 10 task, BACKLOG

Tổng: 89 task (M00: 7, M01: 7, M02: 8, M03: 10, M04: 9, M05: 10,
M06: 9, M07: 10, M08: 9, M09: 10).

Lưu ý (ISSUE-01 — ĐÃ QUYẾT ĐỊNH ngày 26/11/2026, ChatGPT review
M01-07 bản đầu): tổng là 89 (phương án (a) — sửa tổng thành 89,
không gộp/bỏ task). Con số 87 cũ = tổng khi M00 còn 5 task.
Chi tiết từng task M02–M09 xem `PRODUCT_BACKLOG.md`; kế hoạch Sprint
xem `SPRINT_PLAN.md`.
