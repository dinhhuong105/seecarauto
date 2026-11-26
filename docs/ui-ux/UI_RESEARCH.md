# Nghiên cứu mẫu UI/UX — Website bán phụ tùng ô tô

> **Phạm vi:** tài liệu nghiên cứu cho M01-06. Chỉ ghi quan sát và phân tích; không copy ảnh, logo, nội dung của website tham khảo. Mọi tên sản phẩm/giá trong tài liệu này là **ví dụ minh họa lấy từ trang tham khảo đã đọc thật ngày 26/11/2026, không phải dữ liệu thật của SeeCar Auto** (SeeCar Auto chưa có dữ liệu sản phẩm/giá — D-02/D-03 chờ Henry).
>
> **Ngày nghiên cứu:** 26/11/2026. **Phương pháp:** đọc trực tiếp trang chủ của 5 website tham khảo qua trình duyệt (text crawl); các trang con dùng JavaScript nặng không hiện đủ nội dung trong bản text — ghi rõ giới hạn ở §1.5.

## 1. Tổng quan

### 1.1 Danh sách website tham khảo

| # | Website | Loại | Thị trường | Vai trò trong nghiên cứu |
| --- | --- | --- | --- | --- |
| 1 | `phutungotoquangvu.com` | Shop phụ tùng (WordPress/WooCommerce) | Việt Nam | Mẫu Henry chọn — tham khảo chính cho giao diện/trải nghiệm |
| 2 | `rockauto.com` | Kho phụ tùng online | Mỹ | Chuẩn mực tra cứu theo xe (vehicle-first) |
| 3 | `partsgeek.com` | Siêu thị phụ tùng online | Mỹ | Chuẩn mực tìm kiếm theo năm/hãng/dòng + danh mục A–Z |
| 4 | `autozone.com` | Chuỗi bán lẻ phụ tùng | Mỹ | Chuẩn mực bán lẻ: khuyến mãi, dịch vụ miễn phí, nội dung hướng dẫn |
| 5 | `mast.com.vn` | Nhà phân phối phụ tùng Hàn Quốc (B2B) | Việt Nam | Mẫu đối chứng (B2B): những gì quan sát được trên trang chủ đã đọc không thể hiện là bán lẻ online (tin tức + "Liên hệ" thay vì mua online) — chưa xác minh trên toàn website |

### 1.2 Kết quả truy cập (26/11/2026)

| Website | Trang chủ đọc được | Ghi chú |
| --- | --- | --- |
| phutungotoquangvu.com | Có — đầy đủ | Bản text 275 dòng: hero, danh mục, lưới sản phẩm, thương hiệu, footer |
| rockauto.com | Có — đầy đủ | Bản text 608 dòng: danh sách hãng A–Z chiếm phần lớn trang chủ |
| partsgeek.com | Có — đầy đủ | Bản text 1126 dòng: trust badges, Best Sellers, danh mục A–Z |
| autozone.com | Có — đầy đủ | Bản text 184 dòng: hero carousel, danh mục nổi bật, deals, thương hiệu, hãng/dòng xe phổ biến |
| mast.com.vn | Có — đầy đủ | Bản text 64 dòng: trang chủ chủ yếu là tin tức/thông báo, không thấy danh mục sản phẩm trên trang chủ đã đọc |

### 1.3 Bảng so sánh nhanh

> **Phạm vi của bảng này (FIX-04 — Revision 04):** các ô chỉ phản ánh những gì đọc được trên **trang chủ** (bản text crawl ngày 26/11/2026), trừ khi ghi rõ khác. Nhãn "Không thấy trên trang chủ đã đọc" không có nghĩa là website không có tính năng đó — chỉ là không thấy trên trang đã quan sát; chưa xác minh trên toàn website.

| Tiêu chí | Quang Vũ | RockAuto | PartsGeek | AutoZone | MAST |
| --- | --- | --- | --- | --- | --- |
| Trang chủ = chọn xe ngay | Có (mục "Phụ tùng cho xe của bạn") | Có — toàn bộ trang chủ là danh sách hãng | Có — ô tìm theo năm/hãng/dòng ở đầu trang | Không rõ trong bản text (bộ chọn xe ở header, JS) | Không thấy trên trang chủ đã đọc |
| Tìm theo mã sản phẩm | Có (hero: "Tìm phụ tùng theo mã sản phẩm và dòng xe") | Có (ô Part Number Search) | Có (tìm theo từ khóa/mã) | Có (ô tìm kiếm header) | Không thấy trên trang chủ đã đọc |
| Danh mục theo hệ thống xe | Có — 40+ nhóm (động cơ, gầm, phanh, dầu nhớt…) | Có — cây danh mục theo xe | Có — Best Sellers + danh mục A–Z | Có — Featured Categories | Không thấy trên trang chủ đã đọc |
| Lưới sản phẩm ở trang chủ | Có — tab theo nhóm + thẻ sản phẩm | Không — trang chủ chỉ chọn xe | Có — Best Sellers | Có — deals + danh mục | Không thấy trên trang chủ đã đọc |
| Trạng thái kho | Có — "Hết hàng" trên thẻ | Có — theo từng món trong danh mục | Có | Có (theo cửa hàng) | Không thấy trên trang chủ đã đọc |
| Đã bán / đánh giá | Có — "Đã bán 215+", sao + số lượt | Có — đánh giá theo món | Có | Có | Không thấy trên trang chủ đã đọc |
| Thương hiệu | Có — 14 logo (AISIN, KYB, GSP, Denso…) | Có — theo từng món | Có — theo từng món | Có — Popular Brands | Có — KIA/Hyundai/Mobis… |
| Hotline / liên hệ nổi bật | Có — Hotline & Zalo 097 3333 217 ở footer | Không (chỉ email/form) | Có — "Call To Order" 1-800-541-9352 | Có — cửa hàng + dịch vụ | Có — 1800 1539 |
| Giá công khai | Có — VND trên thẻ | Có — USD theo món | Có — USD theo món | Có — USD theo món | Không thấy trên trang chủ đã đọc ("Liên hệ") |
| Nội dung hướng dẫn/blog | Có — "Tin tức & thư viện" | Không thấy trên trang chủ đã đọc | Không thấy trên trang chủ đã đọc | Có — "Advice and How-To's" | Có — tin tức công ty |

### 1.4 Bảng phân loại mức độ quan sát (FIX-03 — Revision 02)

Bảng này phân biệt bằng chứng quan sát thực tế với suy luận và đề xuất thiết kế. "Đã quan sát" = đọc được trong bản text crawl ngày 26/11/2026. "Quan sát một phần" = chỉ thấy trên trang chủ (thẻ/danh sách), chưa đọc được trang con đầy đủ. "Chưa quan sát" = không thấy trong bản text (thường do JavaScript) — không suy đoán thay. **"Chưa xác minh có/không" = không thấy tính năng đó trên trang đã quan sát; chưa kiểm tra trang con/khu vực đăng nhập/catalogue riêng — không kết luận website có hay không có tính năng đó.** Nhãn "Không có" chỉ dùng khi có bằng chứng đủ để xác nhận website không cung cấp tính năng đó — không dùng trong bảng này (Revision 03, theo yêu cầu của ChatGPT: không suy diễn từ việc thiếu thông tin trên trang chủ).

| Loại trang | Quang Vũ | RockAuto | PartsGeek | AutoZone | MAST |
| --- | --- | --- | --- | --- | --- |
| Trang chủ | Đã quan sát (275 dòng) | Đã quan sát (608 dòng) | Đã quan sát (1126 dòng) | Đã quan sát (184 dòng) | Đã quan sát (64 dòng) |
| Danh mục | Đã quan sát (tab theo hệ thống xe + 40+ nhóm trên trang chủ) | Chưa quan sát trực tiếp (cây danh mục chỉ hiện sau khi chọn xe; suy luận từ luồng chọn xe) | Đã quan sát (Best Sellers + danh mục A–Z) | Đã quan sát (Featured Categories) | Chưa xác minh có/không (không thấy trên trang chủ 64 dòng đã đọc; có thể nằm ở trang con/catalogue riêng) |
| Tìm kiếm | Quan sát một phần (ô tìm theo mã + dòng xe ở hero; chưa đọc trang kết quả) | Quan sát một phần (ô Part Number Search trên trang chủ; chưa đọc trang kết quả) | Quan sát một phần (ô tìm theo năm/hãng/dòng; chưa đọc trang kết quả) | Chưa quan sát trong bản text (ô tìm kiếm ở header, JavaScript) | Chưa xác minh có/không (không thấy trên trang chủ đã đọc) |
| Bộ lọc theo xe | Quan sát một phần (mục "Phụ tùng cho xe của bạn" trên trang chủ; chưa đọc luồng chọn đầy đủ) | Đã quan sát (toàn bộ trang chủ là danh sách hãng → chọn năm/dòng/động cơ) | Quan sát một phần (ô năm/hãng/dòng ở đầu trang; chưa đọc luồng lọc đầy đủ) | Chưa quan sát trong bản text (bộ chọn xe ở header, JavaScript) | Chưa xác minh có/không (không thấy trên trang chủ đã đọc) |
| Chi tiết sản phẩm | Quan sát một phần (thẻ sản phẩm: ảnh, tên, mã, đã bán, kho, sao, giá; chưa đọc trang chi tiết đầy đủ) | Quan sát một phần (mỗi món có nhiều thương hiệu/giá/mã + nút Info — theo cấu trúc danh mục; chưa đọc trang món đầy đủ) | Quan sát một phần (món trong Best Sellers; chưa đọc trang món đầy đủ) | Quan sát một phần (thẻ deals; chưa đọc trang món đầy đủ) | Chưa xác minh có/không (không thấy trên trang chủ đã đọc) |

**Kết luận từ bảng:** chỉ có **Trang chủ** là được quan sát đầy đủ ở cả 5 website. Mọi phân tích về trang chi tiết trong tài liệu này đều dựa trên thẻ sản phẩm ở trang chủ + cấu trúc danh mục đã đọc được — không bịa chi tiết trang con chưa đọc. Mọi khuyến nghị thiết kế (R-V/R-S/R-P/R-A) đều ghi rõ căn cứ FR/wireframe, không ghi là "đã quan sát" khi chỉ là suy luận. **Đối với MAST:** các ô "Chưa xác minh có/không" không có nghĩa là website không có các chức năng đó — chỉ là chưa kiểm tra trang con; kết luận "MAST không phù hợp làm mẫu bán lẻ" dựa trên những gì trang chủ đã đọc được (tin tức + "Liên hệ" thay vì mua online), không dựa trên khẳng định website không có danh mục/tìm kiếm.

### 1.5 Giới hạn của nghiên cứu này (ghi rõ)

- **Trang chi tiết sản phẩm đầy đủ:** bản text crawl không mở được trang chi tiết đầy đủ của các trang tham khảo (nội dung dùng JavaScript, liên kết sản phẩm không lộ URL trong bản text). Phân tích trang chi tiết ở §3.3 dựa trên **thẻ sản phẩm ở trang chủ** (Quang Vũ: ảnh, tên kèm xe/đời/thương hiệu/mã, đã bán, trạng thái kho, sao, giá) + cấu trúc danh mục đã đọc được — không bịa chi tiết trang con chưa đọc.
- **Bộ chọn xe của AutoZone:** nằm ở header (JavaScript), không hiện trong bản text — ghi là "chưa quan sát được trong bản text", không khẳng định cấu trúc của nó.
- **Admin Dashboard:** không website tham khảo nào cho xem giao diện quản trị công khai; phân tích admin ở §3.4 dựa trên **mẫu quản trị phổ biến** (bảng/bộ lọc/form) đối chiếu với M01-05, ghi rõ là mẫu chung, không phải quan sát của một trang cụ thể.

## 2. Quan sát theo website

### 2.1 Quang Vũ — `phutungotoquangvu.com` (mẫu Henry chọn)

**Cấu trúc trang chủ (đọc thật 26/11/2026):**

1. **Hero:** tiêu đề "Đồng hành cùng chất lượng — Chinh phục mọi hành trình", lời kêu gọi "Tìm phụ tùng theo mã sản phẩm và dòng xe bạn cần", ảnh xe SUV trắng không logo.
2. **Tra cứu theo xe:** mục "Phụ tùng cho xe của bạn — Tra cứu sản phẩm bạn mong muốn" ngay dưới hero.
3. **Danh mục:** "Hơn 40 nhóm phụ tùng cho xe du lịch và xe thương mại, phân loại theo hệ thống trên xe" — tab lọc: Tất cả / Phụ tùng động cơ / Phụ tùng gầm / Hệ thống phanh / Dầu nhớt / Nước làm mát / Sản phẩm khác.
4. **Lưới sản phẩm:** thẻ gồm ảnh, tên sản phẩm (gắn xe + đời + thương hiệu + mã — ví dụ minh họa từ trang: "Cao Su Chân Máy Toyota Camry ACV40 2007 - AISIN EMTT-0015", "Bơm nước WPT-111V"), trạng thái "Hết hàng" khi hết, "Đã bán 215+" / "Đã bán 1.7k+", sao + số lượt đánh giá, giá VND (ví dụ: 1.485.000₫ / 1 Can 4L).
5. **Giới thiệu:** "Đồng hành cùng chất lượng, chinh phục mọi hành trình" + 3 điểm: thương hiệu đang phân phối, tư vấn theo mẫu xe/đời xe/mã sản phẩm, hỗ trợ garage và đại lý; số liệu: 14 thương hiệu, tư vấn theo mã xe, toàn quốc, giờ làm việc 8:00–17:30 (T2–T7).
6. **Thương hiệu:** 14 logo (AISIN, ADIVICS, KYB, GSP, NISTO, 555, MK, GATES, TOKICO, Denso, NSK, Astemo, Mando, Monroe).
7. **Tin tức & thư viện:** mục blog/hình ảnh.
8. **Footer:** Hotline & Zalo 097 3333 217 ("Bảo hành · Báo giá · Tư vấn kỹ thuật"), địa chỉ 467 An Dương Vương, TP. Hồ Chí Minh, giờ làm việc 8:00–17:30 (T2–T7, Chủ nhật nghỉ).

**Bài học cho SeeCar Auto:**

- **L1 (QUAN TRỌNG):** tên sản phẩm gắn đủ 4 yếu tố — tên món + xe + đời xe + thương hiệu/mã (ví dụ minh họa từ trang: "Cao Su Chân Máy Toyota Camry ACV40 2007 - AISIN EMTT-0015"). Khách tra cứu bằng mắt đã biết món này có hợp xe mình không, trước cả khi bấm vào. SeeCar Auto nên áp dụng đúng quy tắc đặt tên này (khớp FR-010, FR-042 + ADR-010).
- **L2:** "Đã bán N+" và sao đánh giá là tín hiệu tin cậy mạnh trên thẻ sản phẩm — SeeCar Auto ở P0 chưa có dữ liệu đã bán/đánh giá thật (chỉ hiển thị khi có dữ liệu thật — không bịa số).
- **L3:** Hotline & Zalo đặt ở footer với mô tả công dụng ("Bảo hành · Báo giá · Tư vấn kỹ thuật") — SeeCar Auto nên đặt nút Zalo/hotline 0886706338 ở cả header + trang chi tiết + footer (FR-005, FR-045, FR-087).
- **L4:** danh mục phân theo hệ thống trên xe (động cơ, gầm, phanh…) — khớp mô hình danh mục nhiều cấp của SeeCar Auto (FR-015).

### 2.2 RockAuto — `rockauto.com` (chuẩn mực vehicle-first)

**Cấu trúc trang chủ (đọc thật 26/11/2026):**

- Trang chủ **không có hero, không có sản phẩm, không có khuyến mãi** — toàn bộ trang chủ là **danh sách hãng xe A–Z** (hơn 240 hãng, từ ABARTH đến ROVER), mỗi hãng kèm cờ quốc gia áp dụng (Mỹ/Canada/Mexico). Người dùng chọn hãng → chọn năm → chọn dòng xe → chọn động cơ → chọn hệ thống → chọn món.
- Mỗi món hiển thị nhiều lựa chọn thương hiệu + giá + mã phụ tùng (part number) + thông tin tương thích; có nút "Info" xem chi tiết kỹ thuật.

**Bài học cho SeeCar Auto:**

- **L5 (QUAN TRỌNG):** với phụ tùng, **chọn xe là bước đầu tiên, không phải bước phụ** — RockAuto đặt toàn bộ trang chủ cho việc chọn xe. SeeCar Auto nên đặt bộ chọn xe ở vị trí nổi bật nhất trang chủ (hero) và giữ xe đã chọn xuyên suốt phiên (khớp luồng F-01 → F-04 của M01-04 + FR-001, FR-023 → FR-025).
- **L6:** hiển thị nhiều thương hiệu/giá cho cùng một món giúp khách so sánh — SeeCar Auto ở P0 có một giá/món (FR-042), so sánh thương hiệu là hướng mở rộng, không đưa vào P0.
- **L7:** mã phụ tùng (part number) luôn hiển thị kèm món — khớp ADR-010 (tìm theo mã chính xác, không fuzzy mạnh trên OEM).

### 2.3 PartsGeek — `partsgeek.com` (chuẩn mực tìm kiếm + danh mục)

**Cấu trúc trang chủ (đọc thật 26/11/2026):**

- **Ô tìm theo năm/hãng/dòng** ở đầu trang; trang tự ghi "Best option is to search above by year, make and model" — tìm theo xe là cách tốt nhất.
- **Trust badges:** Buy With Confidence (từ 2008), 30 Day Returns, Call To Order (1-800-541-9352), Fast Delivery, Huge Selection (10 triệu+ món), Competitive Prices (tiết kiệm tới 80%).
- **Best Sellers:** danh sách món bán chạy theo bảng chữ cái (AC Compressor, Brake Pads, Water Pump, Wheel Hub…) + "Shop More Parts" mở rộng.
- **Danh mục A–Z:** danh sách dài các loại món (ABS Speed Sensor → Windshield Wiper Switch) để khách duyệt khi không biết tên chính xác.

**Bài học cho SeeCar Auto:**

- **L8:** trust badges ngay dưới ô tìm kiếm (đổi trả 30 ngày, gọi đặt hàng, giao nhanh, lựa chọn lớn, giá cạnh tranh) — SeeCar Auto nên có dải tin cậy tương tự (COD + chuyển khoản, tra cứu đơn công khai, hotline/Zalo) nhưng chỉ ghi những gì thật sự có ở P0 (không bịa chính sách đổi trả — D-08 chờ Henry).
- **L9:** danh mục A–Z giúp khách không biết tên món vẫn tìm được — SeeCar Auto có trang `/parts` + `/brands` (M01-04); nên thêm duyệt theo hệ thống xe khi danh mục đủ lớn.
- **L10:** "Best option is to search by year, make and model" — khẳng định lại L5: tìm theo xe là luồng chính, tìm theo tên/mã là luồng phụ.

### 2.4 AutoZone — `autozone.com` (chuẩn mực bán lẻ + dịch vụ)

**Cấu trúc trang chủ (đọc thật 26/11/2026):**

- **Hero carousel** 4 slide khuyến mãi (deals online-only, giảm giá theo món).
- **Dải dịch vụ miễn phí:** Check Engine Light Testing, Battery Testing & Charging, Loan-A-Tool, Recycling — dịch vụ là điểm khác biệt của bán lẻ.
- **Featured Categories:** Batteries, Lighting, Wipers, Brake Pads, Brake Rotors, Brake Kits, Engine Oil, Oil Filters, Antifreeze, Spark Plugs, Alternators, Tire Repair.
- **Khối deals:** "Save $70…", "Save up to $35…", "Earn a $15 Reward…" — khuyến mãi gắn với món cụ thể.
- **Popular Brands / Popular Makes / Popular Models:** Ford, Chevy, Honda, Toyota, Dodge, Jeep, Hyundai, Kia, Subaru; Honda Accord/Civic, Ford F150, Toyota Camry/Corolla…
- **Advice and How-To's:** bài hướng dẫn ("What Does the Battery Light Mean?", "How to Replace Brakes", "How to Change Your Oil"…).

**Bài học cho SeeCar Auto:**

- **L11:** trang chủ bán lẻ = hero khuyến mãi + danh mục nổi bật + deals + thương hiệu/hãng/dòng phổ biến + nội dung hướng dẫn — SeeCar Auto ở P0 chưa có khuyến mãi (P1 — FR-093/FR-094), nên hero P0 tập trung vào **tìm phụ tùng theo xe + theo mã**, không phải deals.
- **L12:** "Advice and How-To's" (blog hướng dẫn) là kênh SEO + tin cậy — SeeCar Auto đã có module bài viết + SEO (FR-067 → FR-074, AI SEO Layer 1); nên dùng blog để giải thích "món này dùng cho xe nào, dấu hiệu hỏng là gì".
- **L13:** Popular Makes/Models là shortcut vào xe phổ biến — SeeCar Auto nên có "Xe phổ biến" trên trang chủ khi có dữ liệu thật (không bịa lượt xem).

### 2.5 MAST — `mast.com.vn` (mẫu đối chứng — B2B; trên trang chủ đã đọc không thấy mua online — chưa xác minh trên toàn website)

**Cấu trúc trang chủ (đọc thật 26/11/2026):**

- Trang chủ chủ yếu là **tin tức/thông báo công ty** (lịch nghỉ lễ, tri ân, ký kết hợp tác, hội nghị đối tác).
- Không thấy trên trang chủ đã đọc: danh mục sản phẩm, ô tìm kiếm, giá ("Price Range: Liên hệ"), đặt hàng online.
- Điểm mạnh duy nhất: uy tín thương hiệu (21 năm, phân phối KIA/Hyundai/Mobis/GM/SsangYong…), hotline miễn cước 1800 1539, giờ làm việc 07:30–17:30.

**Bài học cho SeeCar Auto:**

- **L14 (ĐỐI CHỨNG):** một trang chủ chỉ có tin tức + "liên hệ báo giá" (không thấy mua online trên trang đã đọc) không bán được hàng online — SeeCar Auto phải tránh mẫu này: trang chủ phải cho khách **tìm và mua được ngay** (tìm theo xe/mã → xem món → giỏ hàng → đặt hàng COD/chuyển khoản), không bắt khách gọi điện mới biết giá.
- **L15:** uy tín nhà phân phối (số năm, thương hiệu phân phối, hotline miễn cước) vẫn đáng học cho mục "Về chúng tôi" + dải tin cậy — nhưng đặt sau luồng mua hàng, không thay luồng mua hàng.

## 3. Phân tích theo loại trang

### 3.1 Tìm phụ tùng theo xe (vehicle selector + kiểm tra tương thích)

| Website | Cách chọn xe | Kiểm tra tương thích | Đánh giá |
| --- | --- | --- | --- |
| Quang Vũ | Mục "Phụ tùng cho xe của bạn" dưới hero | Tên món gắn xe/đời — xem bằng mắt | Tốt cho shop VN nhỏ; chưa có bộ chọn hãng/dòng/đời đầy đủ |
| RockAuto | Toàn bộ trang chủ = chọn hãng → năm → dòng → động cơ | Lọc cứng: chỉ hiện món hợp xe đã chọn | **Chuẩn mực** — vehicle-first triệt để |
| PartsGeek | Ô năm/hãng/dòng ở đầu trang | Lọc theo xe đã chọn | Tốt — nhưng ô tìm kiếm vẫn là điểm vào chính |
| AutoZone | Bộ chọn xe ở header (JS — chưa quan sát được trong bản text) | Lọc theo xe đã chọn | Không đánh giá được từ bản text |
| MAST | Chưa xác minh có/không (không thấy trên trang chủ đã đọc) | Chưa xác minh có/không | Không áp dụng |

**Khuyến nghị cho SeeCar Auto (đối chiếu FR-001, FR-023 → FR-025, FR-027 → FR-031 + luồng F-01 → F-04 M01-04):**

- **R-V1:** bộ chọn xe (hãng → dòng → đời → phiên bản) đặt ở **hero trang chủ** + sticky ở header sau khi đã chọn; xe đã chọn hiển thị xuyên suốt phiên ("Đang xem phụ tùng cho: Toyota Vios 2018") với nút đổi xe một chạm.
- **R-V2:** kết quả tìm kiếm/danh mục **mặc định lọc theo xe đã chọn** (chỉ hiện món tương thích); có nút "Xem tất cả (kể cả không hợp xe)" để khách đối chiếu — không giấu hẳn.
- **R-V3:** trên thẻ sản phẩm và trang chi tiết, dòng tương thích hiển thị rõ ("Tương thích: Toyota Vios 2014–2022" — dữ liệu thật từ fitment; chưa có dữ liệu thì ghi "Chưa có thông tin tương thích — liên hệ để được tư vấn" theo FR-031, không đoán xe tương thích).
- **R-V4:** tra cứu ngược (từ món → các xe tương thích, FR-030) như M01-02 đã thiết kế (fitment 2 chiều) — hiển thị danh sách xe tương thích ở trang chi tiết (FR-028).

### 3.2 Tìm kiếm (SKU/OEM/tên, bộ lọc, sắp xếp, không có kết quả)

| Website | Ô tìm kiếm | Tìm theo mã | Bộ lọc | Không có kết quả |
| --- | --- | --- | --- | --- |
| Quang Vũ | Hero: tìm theo mã + dòng xe | Có — mã là điểm vào chính | Tab theo nhóm hệ thống xe | Chưa quan sát được |
| RockAuto | Part Number Search riêng | Có — tìm chính xác theo mã | Theo xe đã chọn + thương hiệu + giá | Chưa quan sát được |
| PartsGeek | Ô tìm kiếm header + tìm theo xe | Có | Theo xe + danh mục + thương hiệu | Chưa quan sát được |
| AutoZone | Ô tìm kiếm header | Có | Theo xe + danh mục + thương hiệu | Chưa quan sát được |
| MAST | Chưa xác minh có/không (không thấy trên trang chủ đã đọc) | Chưa xác minh có/không | Chưa xác minh có/không | Không áp dụng |

**Khuyến nghị cho SeeCar Auto (đối chiếu ADR-010 + FR-034 → FR-041 + luồng F-05 M01-04):**

- **R-S1:** một ô tìm kiếm duy nhất ở header, chấp nhận cả 4 loại mã (SKU, Part Number, OEM, Manufacturer Part Number) + tên + thương hiệu (FR-034); thứ tự ưu tiên theo ADR-010 + FR-035 (SKU chính xác → OEM chính xác → mã hãng → tên/thương hiệu → gần đúng; FR-036: không fuzzy mạnh trên OEM).
- **R-S2:** gợi ý khi gõ (autocomplete, FR-037) hiện mã + tên + thương hiệu + xe tương thích — giúp khách xác nhận đúng món trước khi bấm.
- **R-S3:** trang kết quả có bộ lọc (danh mục, thương hiệu, tương thích xe — FR-038) + sắp xếp (FR-009) + phân trang; số lượng kết quả hiển thị rõ.
- **R-S4:** không có kết quả → trang empty state hữu ích theo FR-040: ghi rõ đã tìm gì, gợi ý kiểm tra lại mã (bỏ dấu gạch ngang/khoảng trắng — chuẩn hóa mã theo M01-02), thử tìm theo tên, liên hệ Zalo/hotline kèm mã cần tìm — không để trang trắng. (Mẫu tương tự FR-012 cho xe không có món tương thích.)

### 3.3 Trang chi tiết sản phẩm

**Quan sát thật (thẻ sản phẩm Quang Vũ + cấu trúc danh mục PartsGeek/RockAuto):**

- Quang Vũ — thẻ sản phẩm gồm: ảnh, tên món gắn xe/đời/thương hiệu/mã, trạng thái kho ("Hết hàng"), "Đã bán N+", sao + số lượt đánh giá, giá VND + đơn vị ("1 Can 4L").
- RockAuto/PartsGeek — mỗi món có nhiều lựa chọn thương hiệu + giá + mã + nút "Info" xem thông số kỹ thuật.

**Khuyến nghị cho SeeCar Auto (đối chiếu FR-042 → FR-049 + wireframe mẫu 6 M01-04):**

- **R-P1:** ảnh lớn + thumbnail nhiều góc (khi có ảnh thật); tên món theo quy tắc L1 (tên + xe + đời + thương hiệu/mã).
- **R-P2:** khối giá + tình trạng kho (P0 chỉ trạng thái IN_STOCK/OUT_OF_STOCK — không hiển thị số lượng tồn, theo BR-012) + nút "Thêm vào giỏ" / "Mua ngay" + nút Zalo/hotline.
- **R-P3:** khối tương thích xe (R-V3/R-V4) + khối mã định danh (SKU, Part Number, OEM, mã hãng — tra cứu chéo theo ADR-010).
- **R-P4:** khối "Sản phẩm liên quan" (FR-046; tiêu chí do M01-04/M03 chốt, Henry duyệt — đề xuất M01-04 đang chờ Henry) + khối "Khách cũng xem" (chỉ khi có dữ liệu thật).
- **R-P5:** "Đã bán"/đánh giá chỉ hiển thị khi có dữ liệu thật; chưa có thì không hiển thị mục đó (không bịa số, không hiển thị "0 đã bán" gây mất tin cậy).

### 3.4 Giao diện Admin Dashboard

**Giới hạn:** không website tham khảo nào cho xem giao diện quản trị công khai (ghi rõ ở §1.5). Phân tích dưới đây dựa trên **mẫu quản trị phổ biến** (bảng/bộ lọc/form/modal) đối chiếu với cấu trúc admin đã nghiệm thu ở M01-05 — không phải quan sát của một trang cụ thể.

**Khuyến nghị cho SeeCar Auto (đối chiếu M01-05):**

- **R-A1:** danh sách dạng bảng: cột chính + cột trạng thái + thao tác (Xem/Sửa/Xóa) + checkbox chọn nhiều; bộ lọc bên trái/trên cùng; phân trang; tìm kiếm theo tên/mã — khớp wireframe mẫu 3/8 (M01-05); quyền thao tác theo API `*.create/update/delete` + PRD §6.5 (không có một FR duy nhất cho "admin tạo sản phẩm" — xem ADMIN_SITEMAP.md §8).
- **R-A2:** form tạo/sửa dạng modal hoặc trang riêng với tab (Thông tin/Identifiers/Hình ảnh/Fitment — mẫu 4 M01-05, API products/identifiers/images/fitments); lỗi nhập liệu hiển thị ngay dưới trường (inline), không chỉ toast chung.
- **R-A3:** trạng thái theo quyền: nút bị ẩn (không disable mờ) khi thiếu quyền; truy cập URL không quyền → trang 403 — khớp ADMIN_NAVIGATION.md §4 (M01-05).
- **R-A4:** Dashboard tổng quan: thẻ số liệu (đơn chờ xử lý, đơn hôm nay, sản phẩm đã xuất bản/nháp, bài viết) + bảng đơn mới nhất — khớp `GET /admin/dashboard/summary` (M01-03) + wireframe mẫu 2 (M01-05); số liệu không có quyền xem → ẩn (FR-077), không hiện số 0 giả.
- **R-A5:** mọi thao tác nguy hiểm (xóa, hủy đơn, đổi quyền) có ConfirmDialog — truy vết FR-064 (hủy đơn có xác nhận + lý do), FR-085 (chặn tự khóa Super Admin cuối cùng — E-04 M01-05), wireframe M01-05 mẫu 9 (hủy đơn) + mẫu 11 (đổi quyền) + DESIGN_SYSTEM §5.9.
- **R-A6:** audit log / lịch sử chỉ ở những nơi có FR quy định — FR-066 (mọi thay đổi trạng thái đơn; hủy đơn là một thay đổi trạng thái nên được ghi lịch sử đơn), FR-084 (thay đổi quyền), FR-033 (thay đổi fitment); xem qua `GET /audit-logs` (M01-03). **Gap:** xóa sản phẩm chưa có FR nào quy định audit log — không khẳng định mọi thao tác xóa/hủy đều có audit log; phạm vi sự kiện ghi log do M02 chốt.

## 4. Bài học tổng hợp (áp dụng cho SeeCar Auto)

| # | Bài học | Nguồn | Áp dụng ở |
| --- | --- | --- | --- |
| L1 | Tên món gắn đủ: tên + xe + đời + thương hiệu/mã | Quang Vũ | UI_PROPOSAL §2, §4 |
| L2 | "Đã bán N+" + sao là tín hiệu tin cậy — chỉ khi có dữ liệu thật | Quang Vũ | R-P5 |
| L3 | Hotline & Zalo kèm mô tả công dụng, đặt ở header + chi tiết + footer | Quang Vũ | UI_PROPOSAL §2 |
| L4 | Danh mục phân theo hệ thống trên xe | Quang Vũ | Sitemap M01-04 |
| L5 | Chọn xe là bước đầu tiên — đặt ở hero, giữ xuyên suốt phiên | RockAuto | R-V1 |
| L6 | Nhiều thương hiệu/giá cho cùng món (hướng mở rộng, không P0) | RockAuto | UI_PROPOSAL §8 |
| L7 | Mã phụ tùng luôn hiển thị kèm món | RockAuto | ADR-010, R-S1 |
| L8 | Trust badges dưới ô tìm kiếm — chỉ ghi những gì thật sự có ở P0 | PartsGeek | UI_PROPOSAL §2 |
| L9 | Danh mục A–Z giúp khách không biết tên món vẫn tìm được | PartsGeek | UI_PROPOSAL §3 |
| L10 | Tìm theo xe là luồng chính, tìm theo tên/mã là luồng phụ | PartsGeek | R-V1, R-S1 |
| L11 | Hero P0 tập trung tìm phụ tùng (chưa có khuyến mãi ở P0) | AutoZone | UI_PROPOSAL §2 |
| L12 | Blog hướng dẫn là kênh SEO + tin cậy | AutoZone, Quang Vũ | FR-067 → FR-074 |
| L13 | "Xe phổ biến" là shortcut — chỉ khi có dữ liệu thật | AutoZone | UI_PROPOSAL §2 |
| L14 | Trang chủ chỉ có tin tức + "liên hệ báo giá" (không thấy mua online trên trang đã đọc) không bán được hàng online | MAST (đối chứng) | UI_PROPOSAL §2 |
| L15 | Uy tín nhà phân phối đặt sau luồng mua hàng, không thay luồng mua | MAST | UI_PROPOSAL §2 |

## 5. Lịch sử revision

| Phiên bản | Ngày | Nội dung |
| --- | --- | --- |
| v0.1 (bản đầu) | 26/11/2026 | Bản đầu M01-06: nghiên cứu 5 website tham khảo đọc thật ngày 26/11/2026 (Quang Vũ, RockAuto, PartsGeek, AutoZone, MAST) + phân tích theo loại trang + 15 bài học. |
