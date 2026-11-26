# PROJECT CHARTER — SEECARAUTO

| Mục | Nội dung |
| --- | --- |
| Dự án | SEECARAUTO — Automotive Parts E-commerce Platform |
| Thương hiệu | SeeCar Auto — "Phụ tùng ô tô Chính Hãng - Giá Tốt", chuyên phụ tùng nhiều hãng |
| Liên hệ | SĐT/Zalo 0886706338 |
| Fanpage | https://www.facebook.com/profile.php?id=61597072672914 |
| Mẫu tham khảo | https://phutungotoquangvu.com/ (tham khảo giao diện/danh mục/trải nghiệm, KHÔNG sao chép giao diện) |
| Repository | https://github.com/dinhhuong105/seecarauto.git |
| Ngôn ngữ website | Tiếng Việt (nội dung hiển thị) |
| URL cố định | 100% tiếng Anh, chữ thường, gạch ngang, không dấu |

## 1. Mục tiêu

Xây website thương mại điện tử chuyên ngành phụ tùng ô tô cho SeeCar Auto để
khách hàng:

1. Tìm được phụ tùng theo hãng xe / dòng xe / đời xe / loại phụ tùng.
2. Tìm theo tên, SKU nội bộ, mã OEM, mã nhà sản xuất, thương hiệu.
3. Xem chi tiết sản phẩm, biết phụ tùng đó lắp được cho những xe nào (fitment).
4. Đặt hàng (COD + chuyển khoản ở giai đoạn đầu) và liên hệ Zalo / hotline.
5. Quản trị viên quản lý sản phẩm, đơn hàng, kho, nội dung và phân quyền
   động mà không cần sửa code.

## 2. Phạm vi

### Trong phạm vi (P0 — bản đầu)

Homepage, Product, Category, Brand, Vehicle, Compatibility (fitment),
Search, Cart/Checkout, Order, CMS, SEO.

### Mở rộng sau (P1)

Customer, Wholesale (giá sỉ nhiều cấp), Promotion, Inventory, Analytics.

### Tương lai (P2)

Warranty, ERP Integration.

## 3. Vai trò

| Vai trò | Người | Trách nhiệm |
| --- | --- | --- |
| Product Owner | Henry | Quyết định nghiệp vụ, xác nhận giao diện/tính năng, nghiệm thu từng milestone |
| Project Manager / Business Analyst / Solution Architect / Technical Lead / Reviewer / QA Coordinator | ChatGPT | Chia task, giao task, xét duyệt, phê bình, quản lý roadmap |
| Developer | Muse (Pi Em) | Viết code, xây database, frontend, backend, kiểm thử, triển khai, báo cáo |

**Lưu ý vận hành (ChatGPT đã nêu):** ChatGPT không thể tự chủ động gọi Muse
hay theo dõi tiến trình trong phiên của nó. Phối hợp thực tế: Muse tự vào
dự án ChatGPT đọc nhiệm vụ, làm, rồi báo cáo lại (qua Henry / qua chat mới
trong folder dự án) để ChatGPT review. Project Handbook này là cầu nối giữ
mạch giữa các cuộc chat.

## 4. Quy tắc làm việc (đã duyệt)

1. Mỗi task có mã định danh duy nhất, tiêu chí nghiệm thu và test cases.
2. Mỗi task báo cáo trong **1 đoạn chat mới** trong folder dự án
   "Website Bán Phụ Tùng ÔTÔ"; mỗi task mới bắt đầu bằng việc đọc Project
   Handbook; khi xong task, cập nhật `CURRENT_STATE.md` và `TASK_BOARD.md`.
3. Chỉ làm sau khi Henry đồng ý kế hoạch. Không tự đổi kiến trúc đã duyệt,
   không cài thư viện không cần thiết, không sửa code ngoài phạm vi task,
   không xóa dữ liệu/migration cũ tùy tiện, không commit secret.
4. Mỗi task lớn có branch riêng; mỗi thay đổi phải có test phù hợp.
5. Không tự đánh dấu DONE khi test chưa đạt.
6. Không tự coi nội dung chưa được Henry duyệt là quyết định chính thức.
7. Không bịa giá, sản phẩm, số liệu bán hàng hay thông tin liên hệ. Chỉ dùng
   dữ liệu thật do Henry cung cấp hoặc đã xác minh.
8. Báo cáo mỗi task theo mẫu 9 mục của ChatGPT (xem `tasks/M00-01.md`).

## 5. Quy mô mặc định (đã duyệt)

- Quy mô: **2.000–10.000 SKU**.
- Dữ liệu tương thích xe (fitment): **chưa có, cần xây dựng từ đầu**.
- Thanh toán ban đầu: COD + chuyển khoản.
- Tích hợp sau: VNPay, MoMo; GHN, GHTK, Viettel Post; Zalo/Zalo OA;
  GA4, GTM, Search Console.

## 6. Quyết định còn mở (chưa chốt — xem ARCHITECTURE_DECISIONS.md)

1. Tên miền chính thức: seecarauto.com hay tên miền khác?
2. Nhà cung cấp AI cho AI SEO + ngân sách API dự kiến?
3. Nguồn dữ liệu phụ tùng và dữ liệu tương thích xe lấy từ nhà cung cấp nào?
4. Backend hosting: Railway, Render hay VPS? (chọn khi triển khai hạ tầng)
