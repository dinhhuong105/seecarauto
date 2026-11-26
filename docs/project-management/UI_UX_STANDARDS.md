# UI/UX STANDARDS — SEECARAUTO

UI/UX là yêu cầu chất lượng cốt lõi (Henry, 25/11/2026). Hiệu ứng phải đẹp
nhưng không gây rối, không làm chậm giao diện hay ảnh hưởng khả năng sử dụng.

Component dùng chung nằm trong `packages/ui/` — mọi màn hình dùng chung một
bộ component, không tự thiết kế mỗi màn hình một kiểu.

## 1. Quy tắc bắt buộc

### 1.1 Modal / dialog

- Thao tác tạo mới, chỉnh sửa và xem chi tiết mở **modal/dialog** khi phù hợp.
- Form trong modal có validation và cảnh báo khi có dữ liệu chưa lưu.
- Modal đóng được bằng phím Esc, nút Đóng, và click ra ngoài (trừ form có
  dữ liệu chưa lưu — phải hỏi xác nhận trước khi đóng).
- Focus được đưa vào modal khi mở, trả lại nút đã mở khi đóng.
- Component: `Modal` trong `@seecarauto/ui`.

### 1.2 Toast / popup

- Thông báo thành công, thất bại và cảnh báo dùng **toast/popup** rõ ràng,
  KHÔNG dùng `alert()` của trình duyệt.
- Thao tác nguy hiểm (xóa, hủy đơn, khóa tài khoản) phải có **bước xác nhận**
  trước khi thực hiện.
- Toast success/info dùng `role="status"`, toast error dùng `role="alert"`.
- Component: `Toast`, `ToastContainer` trong `@seecarauto/ui`.

### 1.3 Tooltip

- Icon và nút chỉ có biểu tượng **phải có tooltip**.
- Tooltip hiển thị khi hover chuột VÀ khi focus bằng bàn phím
  (keyboard accessible) — không chỉ hover chuột.
- Component: `Tooltip` trong `@seecarauto/ui`.

### 1.4 Animation

- Animation có chủ đích cho modal, dropdown, tab, menu, loading và chuyển
  trạng thái. Ưu tiên mượt, tinh tế, tránh hiệu ứng phô trương.
- Thời gian chuyển cảnh ngắn (khoảng 150ms cho micro-interaction).
- **Hỗ trợ `prefers-reduced-motion`**: tắt/bớt animation khi người dùng
  bật giảm chuyển động (dùng class `motion-reduce:transition-none` của
  Tailwind và media query tương ứng).

### 1.5 Trạng thái

Mọi danh sách / trang dữ liệu phải có đủ:

- **Loading:** skeleton loading (không để trang trắng).
- **Empty:** empty state với hướng dẫn hành động tiếp theo.
- **Error:** error state với thông báo rõ ràng và nút thử lại.
- **Responsive:** desktop / tablet / mobile. Kiểm tra ở 3 chiều rộng
  (điện thoại hẹp, ~1024px, desktop rộng) trước khi giao.

### 1.6 Truy cập (accessibility)

- Focus rõ ràng trên mọi phần tử tương tác (focus ring).
- Tương phản màu đạt chuẩn đọc được; không truyền tải thông tin chỉ bằng màu.
- Dùng được hoàn toàn bằng bàn phím: Tab di chuyển, Enter/Space kích hoạt,
  Esc đóng modal/dropdown.
- Ảnh có `alt`; nút icon-only có `aria-label`; form có label.

## 2. Design system thống nhất

Một design system duy nhất cho toàn hệ thống:

- **Màu sắc:** primary xanh dương (thương hiệu SeeCar Auto — ocean blue),
  accent vàng (đường kẻ dưới logo), trạng thái success/error/warning/info.
- **Typography:** một font chính cho toàn hệ thống (Inter ở M00), phân cấp
  H1/H2/H3/body/small rõ ràng.
- **Spacing / radius / shadow:** dùng scale thống nhất của Tailwind, không
  đặt giá trị tùy tiện từng màn hình.
- **Animation tokens:** duration và easing thống nhất (150ms cho
  micro-interaction).
- **Component dùng chung:** Button, Modal, Toast, Tooltip trong
  `@seecarauto/ui`; mở rộng thêm Input, Select, Table, Pagination,
  ConfirmDialog ở các milestone sau.

## 3. Nghiên cứu trước khi triển khai

Trước khi triển khai một màn hình mới, Muse phải khảo sát các mẫu UI/UX
phù hợp với website thương mại điện tử và dashboard quản trị hiện đại, đưa
ra phương án tham khảo trước cho Henry/ChatGPT duyệt; không sao chép máy móc
hiệu ứng hoặc thiết kế của website khác (kể cả website mẫu
phutungotoquangvu.com).

## 4. Quy tắc với icon

- Icon ~30px trong admin, glyph rõ, tooltip có mũi tên, chuyên nghiệp.
- Thêm/sửa mở popup căn giữa màn hình; thao tác nguy hiểm có xác nhận.
- Không dùng emoji làm icon UI.
