# M02 Implementation Decisions — SeeCar Auto

**Ngày:** 26/11/2026  
**Người quyết định thực thi kỹ thuật:** ChatGPT (được Henry ủy quyền toàn quyền điều phối dự án)  
**Phạm vi:** các quyết định cần để triển khai M02-01 và dependency kỹ thuật trực tiếp.  
**Nguyên tắc:** đây là quyết định thực thi trong phạm vi ủy quyền; không giả mạo thành xác nhận riêng của Henry. Không sửa ngược các tài liệu M01 đã ACCEPT. Quyết định có thể thay đổi sau này bằng ADR/migration có kiểm soát, không rewrite lịch sử.

## 1. PD-01 — Mức chi tiết Vehicle Fitment

**Quyết định:** mức tối thiểu cho một fitment được nhập mới là Model + Year. Generation là tùy chọn; Variant chỉ được phép khi Generation đã được chọn. Nếu generation được cung cấp, năm phải nằm trong khoảng generation. Không tự suy diễn fitment từ tên model hoặc đời xe.

**Lý do:** bảo đảm khách không bị gợi ý phụ tùng thiếu căn cứ; cho phép dữ liệu ban đầu thiếu generation/variant nhưng vẫn có model + năm. Dữ liệu chi tiết hơn được thêm khi nguồn đáng tin cậy có sẵn.

**Ảnh hưởng:** giữ `vehicle_applications` như ERD; service validation enforce minimum Model + Year cho thao tác tạo fitment mới. Schema giữ nullable fields như ERD để tương thích bản ghi/mở rộng, không tự biến cột year thành NOT NULL nếu ERD không yêu cầu.

## 2. PD-02 — SKU nội bộ

**Quyết định:** một Product có đúng một SKU nội bộ do SeeCar Auto cấp. SKU là `products.sku`, unique và normalized; không tạo `product_variants` hay nhiều SKU cho một Product trong P0.

**Lý do:** phù hợp mô hình ERD đã ACCEPT và phân biệt product với mã tham chiếu. Nếu sau này biến thể bán độc lập cần SKU riêng, mở task/decision mới và migration rõ ràng.

**Ảnh hưởng:** đóng gap G-01 trong phạm vi M02-01; không nhầm `vehicle_variants` (biến thể xe) với product variants.

## 3. PD-03 — OEM Number có thể map nhiều Product

**Quyết định:** cùng một OEM Number có thể tham chiếu nhiều Product aftermarket khác nhau. Không tạo unique index toàn cục cho OEM. Chống duplicate trong cùng Product/type/normalized value; MPN giữ unique theo issuer như ERD.

**Lý do:** một mã OEM có thể được dùng làm tham chiếu cho nhiều sản phẩm thay thế từ các brand khác nhau; chặn global sẽ loại dữ liệu tương đương hợp lệ.

**Ảnh hưởng:** truy vấn OEM có thể trả nhiều sản phẩm; API phải giữ chính xác match, không fuzzy mạnh.

## 4. PD-04 — Manufacturer và Brand issuer

**Quyết định:** giữ hai FK issuer tách biệt. OEM Number bắt buộc `issuing_make_id` và cấm `issuing_brand_id`; Manufacturer Part Number bắt buộc `issuing_brand_id` và cấm `issuing_make_id`; Part Number có brand issuer tùy chọn nhưng không make issuer; Alternate Number không có issuer.

**Lý do:** giữ FK thật và tránh polymorphic reference không toàn vẹn.

## 5. PD-05 — Xóa Product / Vehicle / Category / Brand

**Quyết định:** Product đã xuất hiện trong order/order_items không được hard delete; chỉ soft delete/ẩn. Category, Brand, Make/Model/Generation/Variant còn dữ liệu con hoặc tham chiếu thì RESTRICT, phải chuyển dữ liệu hoặc ẩn trước. CASCADE chỉ cho các child record không có giá trị lịch sử độc lập đúng như ERD. Không có endpoint/code hard-delete vượt qua policy.

**Lý do:** bảo toàn lịch sử đơn và fitment; tránh xóa dây chuyền ngoài ý muốn.

## 6. PD-06 — Năm và tháng sản xuất

**Quyết định:** năm hợp lệ 1900–2100; P0 chỉ lưu năm, không lưu tháng sản xuất. Giữ khoảng năm generation và năm cụ thể application theo ERD.

**Lý do:** đúng phạm vi xe ô tô thương mại P0; tránh độ phức tạp không có yêu cầu.

## 7. G-01 — Product variants

Đóng gap cho M02-01 bằng quyết định PD-02: P0 một Product = một SKU, không cần `product_variants`. Không tạo bảng product variants. Nếu yêu cầu biến thể bán độc lập xuất hiện sau này, mở decision/task và migration riêng.

## 8. G-02 — Articles / ArticleSEO

Bổ sung schema Article và ArticleSEO theo API_SPEC M01-03. Tách nội dung bài viết và SEO metadata để quản lý manual override rõ ràng; lưu flags/field ownership cần thiết để Rule Engine/AI không ghi đè trường đã chỉnh tay. D-04 chỉ chặn AI provider/AI analysis, không chặn bảng dữ liệu hoặc Rule Engine. Không thêm AI provider/key/budget.

## 9. G-03 — Cart storage

**Quyết định:** giỏ hàng guest lưu server-side trong Redis, key theo opaque random cart token do server cấp và cookie HttpOnly; Redis TTL phải cấu hình, không hard-code thời hạn nghiệp vụ trong M02-01. Không tạo bảng carts/cart_items trong PostgreSQL. Token phải có entropy đủ cao, không dùng user ID, email hoặc thông tin đoán được làm key; cookie Secure ở HTTPS, SameSite phù hợp, Path giới hạn; rotate khi cần và không ghi token vào log.

**Lý do:** API_SPEC mô tả cart token session-based và Redis đã là hạ tầng bắt buộc; Redis phù hợp dữ liệu tạm, tránh migration bảng cart khi chưa có yêu cầu lịch sử giỏ hàng. Triển khai thuộc M02-02/M05-01, không thuộc code M02-01.

## 10. G-04 — Admin/RBAC schema

Bổ sung schema cần thiết cho Users, Roles, Permissions, RolePermissions, UserRoles, UserPermissions và AuditLogs theo ADR-005, M01-05 RBAC Matrix, API_SPEC và Security. Thêm admin refresh sessions để hỗ trợ token rotation/revocation/reuse detection. Không tạo Super Admin hoặc tài khoản/mật khẩu mẫu; bootstrap an toàn là M06-01. Password chỉ lưu Argon2id encoded hash.

## 11. Những quyết định vẫn Pending

Không tự chốt:
- PD-07: cấu trúc spec fields.
- PD-08: order status lifecycle.
- PD-09: fitment source / verification.
- D-01: domain.
- D-02: nguồn dữ liệu sản phẩm.
- D-03: nguồn/dữ liệu variant xe.
- D-04: AI provider và ngân sách.
- D-05: backend hosting.
- D-06: S3/R2 provider.
- D-07: font.
- D-08: checkout details.
- D-09: phương thức xác minh order lookup.

Các quyết định trên không chặn M02-01 nếu implementation không phụ thuộc chúng. Nếu phát sinh dependency trực tiếp, dừng đúng phần đó, không tự giả định.

## 12. Ghi chú triển khai (M02-01, 26/11/2026)

Các ghi chú dưới đây là chi tiết triển khai phát hiện khi làm M02-01 — không phải quyết định nghiệp vụ, không thay đổi PD-01 → PD-06 hay bất kỳ quyết định nào ở trên.

- **Prisma 6.19.3 không hỗ trợ `@@check`**: ERD §12 ghi chú 4 viết "`@@check` (Prisma 6 hỗ trợ)" — đã kiểm chứng sai với 6.19.3 (`prisma validate` trả P1012 "Attribute not known: @check"). Mọi CHECK constraint nằm trong migration SQL dưới dạng raw SQL (xem `docs/database/PRISMA_MAPPING.md` §5). Nếu sau này nâng lên Prisma 7.x, có thể cân nhắc chuyển CHECK vào schema — quyết định riêng, không làm trong M02-01.
- **`prisma migrate dev` (kèm generate) bị treo trên máy Muse**: lệnh apply migration xong nhưng không thoát sau 5 phút (schema-engine idle, không lỗi). Cách làm đã kiểm chứng: `migrate dev --skip-generate` (hoặc `migrate deploy` cho test DB) rồi chạy `prisma generate` riêng (396ms). Nguyên nhân treo chưa xác định.
- **CHECK violation qua Prisma Client 6.19.3**: lỗi PostgreSQL 23514 hiện ra dưới dạng `PrismaClientUnknownRequestError` không có code (không phải P2004 như tài liệu Prisma mô tả chung) — test tự động assert theo tên constraint trong message.
- **Engines trên máy Muse**: postinstall của `@prisma/engines` không tải được engine (proxy chặn fetch của Node). Engine đã có sẵn trong cache (`~/.cache/prisma/master/c2990dca.../debian-openssl-3.0.x/`); đã copy từ cache vào thư mục package của pnpm store để CLI chạy được. Sau `pnpm install` mới cần copy lại — xem `~/AGENTS.md`.
- **Least privilege (brief §5)**: ở môi trường local hiện tại, cùng một role `seecarauto` làm cả migration owner lẫn runtime user (PostgreSQL cluster local, dev-only). Tách role migration/runtime là việc của M02-08 (môi trường) khi có staging/production — không ép tách ở local dev.
