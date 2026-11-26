# ARCHITECTURE DECISIONS — SEECARAUTO

Mọi quyết định dưới đây đều đã được Henry duyệt (ghi rõ nguồn). Nội dung
chưa được Henry duyệt KHÔNG được coi là quyết định chính thức.

## ADR-001 — Xây từ đầu bằng Next.js + NestJS (phương án 2)

- **Ngày:** 25/11/2026. **Người duyệt:** Henry.
- **Quyết định:** Không dùng WordPress + WooCommerce. Xây hệ thống từ đầu.
- **Lý do:** tùy biến tra cứu xe, OEM, giá sỉ nhiều cấp, mở rộng linh hoạt.
- **Tham khảo:** phutungotoquangvu.com (giao diện/danh mục/trải nghiệm,
  không sao chép giao diện).

## ADR-002 — Monorepo, Modular Monolith, API-first

- **Ngày:** 25/11/2026. **Người duyệt:** Henry (qua kế hoạch ChatGPT).
- **Quyết định:** Monorepo `seecarauto/` (pnpm workspace + Turborepo),
  kiến trúc Modular Monolith kết hợp API-first, KHÔNG Microservices ngay
  từ đầu.
- **Cấu trúc:** `frontend/` (Next.js, website khách hàng), `admin/`
  (Next.js, trang quản trị), `backend/` (NestJS API độc lập),
  `packages/`, `infrastructure/`, `docs/`.
- **API:** REST, prefix `/api/v1`, docs Swagger/OpenAPI.

## ADR-003 — Stack

- **Ngày:** 25/11/2026. **Người duyệt:** Henry (qua kế hoạch ChatGPT).
- Frontend: Next.js + TypeScript, Tailwind CSS + shadcn/ui (UI component
  sẽ chốt ở M01).
- Backend: NestJS + TypeScript.
- Database: PostgreSQL, ORM Prisma.
- Cache / queue: Redis (+ BullMQ).
- Search: Meilisearch.
- Storage: S3 / Cloudflare R2.
- Auth: JWT + Refresh Token, mật khẩu Argon2id.
- Deploy: Vercel (frontend + admin), backend Railway / Render / VPS
  (chưa chốt — xem mục "Chưa chốt").
- Hạ tầng: Docker, Cloudflare (DNS/CDN/WAF), CDN, CI/CD GitHub Actions,
  Sentry + log, backup tự động.

## ADR-004 — URL 100% tiếng Anh

- **Ngày:** 25/11/2026. **Người duyệt:** Henry.
- **Quyết định:** Mọi URL cố định tiếng Anh, chữ thường, gạch ngang, không
  dấu tiếng Việt. Nội dung (Title, H1, mô tả) vẫn tiếng Việt.
- **Ví dụ:** `/`, `/parts`, `/parts/engine`,
  `/products/water-pump-aisin`, `/brands/aisin`, `/vehicles/toyota/vios`,
  `/blog`, `/blog/how-to-choose-engine-oil`, `/cart`, `/checkout`,
  `/account`, `/contact`. API: `/api/v1/products`.
- **Quy tắc:** không đổi URL khi đổi tên hiển thị; redirect 301 khi URL đã
  công bố thay đổi; slug không dùng tiếng Việt.

## ADR-005 — Phân quyền động RBAC (không hard-code)

- **Ngày:** 25/11/2026. **Người duyệt:** Henry.
- **Quyết định:** Admin hiển thị toàn bộ ma trận vai trò × module × hành
  động (View/Create/Update/Delete/Export/Cancel/Manage...) với checkbox,
  Select All/None theo module; tick quyền nào thì vai trò đó có quyền đó.
  Không hard-code kiểu `if (user.role === 'ADMIN')`.
- **Bảng:** `users`, `roles`, `permissions`, `role_permissions`,
  `user_roles`, `user_permissions` (ngoại lệ, hạn chế dùng giai đoạn đầu).
- **Permission code:** dạng `products.view`, `products.create`, …
- **Nguyên tắc:** frontend chỉ ẩn nút, backend luôn kiểm tra quyền; thay
  đổi quyền có hiệu lực qua cache invalidation; mọi thay đổi có audit log;
  không cho tài khoản Super Admin cuối cùng tự khóa mình; Super Admin khởi
  tạo an toàn từ bootstrap.

## ADR-006 — Redis cache bắt buộc từ milestone đầu

- **Ngày:** 25/11/2026. **Người duyệt:** Henry.
- **Quyết định:** Hệ thống phải có cache Redis từ M00. Cache-aside, key có
  namespace (`seecarauto:products:detail:{productId}`), versioning,
  invalidation khi Admin cập nhật, xử lý cache stampede, fallback khi Redis
  lỗi, không cache thông tin nhạy cảm.
- **TTL mặc định (giây):** danh mục 3600, thương hiệu 21600, thông tin sản
  phẩm 900, danh sách sản phẩm 300–900, hãng xe/dòng xe 86400, kết quả tìm
  kiếm 60–300, SEO metadata 3600, cấu hình website 3600, quyền người dùng
  300, tồn kho 30–60.
- **Đồng bộ Search Engine và tác vụ nền:** dùng BullMQ trên Redis.

## ADR-007 — SEO bài viết tự động + sửa tay không bị ghi đè

- **Ngày:** 25/11/2026. **Người duyệt:** Henry.
- **Quyết định:** Module "AI SEO Assistant": người viết chỉ nhập tiêu đề +
  nội dung, hệ thống phân tích và đề xuất SEO Title, Meta Description,
  Focus Keyword, Secondary Keywords, slug chuẩn SEO, Search Intent,
  Content Topic. Cho phép chỉnh sửa thủ công (Manual override) và hệ thống
  KHÔNG được ghi đè SEO đã sửa tay. Có nút Generate SEO, khôi phục cấu
  hình tự động, Google Search Preview. Bảng `article_seo`.
- **Triển khai 2 lớp:** Lớp 1 SEO Rule Engine (độ dài title/description,
  tần suất từ khóa, slug tiếng Anh); Lớp 2 AI Content Analysis (chủ đề,
  từ khóa, search intent, title/description, FAQ, internal links).
- **Lưu ý:** AI không thể biết chắc lượng tìm kiếm của từ khóa chỉ bằng
  cách đọc bài viết; regenerate theo yêu cầu, tránh gọi AI mỗi lần gõ.

## ADR-008 — Docker là tiêu chuẩn bắt buộc

- **Ngày:** 25/11/2026. **Người duyệt:** Henry.
- **Quyết định:** Hệ thống phải được đóng gói và chạy được bằng Docker;
  có Dockerfile riêng cho từng ứng dụng/dịch vụ, `docker-compose.yml` cho
  môi trường local, cấu hình môi trường mẫu, health check, volume và hướng
  dẫn khởi chạy. Redis, PostgreSQL và các dịch vụ hạ tầng liên quan phải
  được khai báo rõ ràng. Không chỉ tạo file Docker cho có — phải chạy thử
  và báo cáo kết quả thực tế.
- **Giới hạn đã biết (M00):** trên máy dev của Muse, container Docker
  KHÔNG chạy được (cgroup controllers trống). Xem `DOCKER_STANDARDS.md`.

## ADR-009 — UI/UX là yêu cầu chất lượng cốt lõi

- **Ngày:** 25/11/2026. **Người duyệt:** Henry.
- **Quyết định:** Thao tác thêm/sửa mở modal/dialog; thông báo thành công/
  thất bại dùng toast/popup rõ ràng; icon có tooltip khi hover và hỗ trợ
  truy cập bằng bàn phím; có trạng thái loading, empty, error, xác nhận
  xóa, animation chuyển cảnh tinh tế và responsive. Hiệu ứng đẹp nhưng
  không gây rối, không làm chậm giao diện hay ảnh hưởng khả năng sử dụng.
- Chi tiết trong `UI_UX_STANDARDS.md`. Component dùng chung trong
  `packages/ui/` (Modal, Toast, Tooltip, Button).

## ADR-010 — Quy mô và dữ liệu

- **Ngày:** 25/11/2026. **Người duyệt:** Henry (đã tick chọn trong khảo
  sát của ChatGPT).
- Quy mô: 2.000–10.000 SKU.
- Dữ liệu tương thích xe: chưa có, cần xây dựng từ đầu.
- Phân biệt rõ SKU nội bộ / Part Number / OEM Number / mã thay thế; lưu
  snapshot tên, SKU, giá, số lượng tại thời điểm đặt hàng.
- Tìm kiếm ưu tiên: SKU chính xác → OEM chính xác → mã nhà sản xuất →
  tên/thương hiệu → gần đúng; không fuzzy mạnh với mã OEM; hỗ trợ tìm
  ngược phụ tùng → xe tương thích.

## ADR-011 — Font hệ thống, build không phụ thuộc mạng ngoài

- **Ngày:** 26/11/2026. **Người quyết định:** Muse (kỹ thuật, trong phạm vi
  M00 — font tự host là quyết định M01, xem dưới).
- **Vấn đề:** `frontend/` và `admin/` dùng `next/font/google` (Inter);
  `next build` tải font từ fonts.googleapis.com và fail trên máy dev của
  Muse (EPROTO — proxy chặn TLS), nên workspace build không pass.
- **Quyết định:** Bỏ `next/font/google` ở M00. Body dùng font stack hệ
  thống (`"Inter", ui-sans-serif, system-ui, ...` qua Tailwind
  `font-sans` + `globals.css`); build không tải gì từ mạng ngoài.
- **Chưa chốt:** font tự host (vd. `next/font/local` với file font trong
  repo) hay giữ font hệ thống — quyết định ở M01 khi làm UI/UX thật,
  cần Henry/ChatGPT duyệt. Không ảnh hưởng bố cục vì stack đã khai báo
  Inter đầu tiên.

## Chưa chốt (cần Henry quyết định — không chặn M00)

1. Tên miền chính thức: seecarauto.com hay tên miền khác?
2. Nhà cung cấp AI cho AI SEO + ngân sách API dự kiến?
3. Nguồn dữ liệu phụ tùng và dữ liệu tương thích xe lấy từ nhà cung cấp nào?
4. Backend hosting: Railway, Render hay VPS?
5. Nhà cung cấp S3/R2 cụ thể (khi triển khai storage, M02).
