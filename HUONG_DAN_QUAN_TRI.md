# Hướng dẫn sử dụng trang Quản trị VSC Academy

Tài liệu này dành cho người vận hành Academy: nhận đăng ký, mở lớp, quản lý học viên, gửi tài liệu, cấp chứng nhận và cập nhật nội dung website.

Mọi thao tác dưới đây đều làm trên **trang Quản trị**. Không cần kiến thức lập trình.

---

## Mục lục

1. [Bắt đầu](#1-bắt-đầu)
2. [Ai được làm gì](#2-ai-được-làm-gì)
3. [Quy trình làm việc hằng ngày](#3-quy-trình-làm-việc-hằng-ngày)
4. [Tổng quan](#4-tổng-quan)
5. [Khóa học](#5-khóa-học)
6. [Lớp học](#6-lớp-học)
7. [Đăng ký](#7-đăng-ký)
8. [Học viên](#8-học-viên)
9. [Ghi danh](#9-ghi-danh)
10. [Tài liệu học tập](#10-tài-liệu-học-tập)
11. [Thông báo](#11-thông-báo)
12. [Chứng nhận](#12-chứng-nhận)
13. [Mẫu chứng nhận](#13-mẫu-chứng-nhận)
14. [Giảng viên](#14-giảng-viên)
15. [Góc chia sẻ](#15-góc-chia-sẻ)
16. [Tài liệu chuyên môn](#16-tài-liệu-chuyên-môn)
17. [Thư viện ảnh](#17-thư-viện-ảnh)
18. [Địa điểm](#18-địa-điểm)
19. [Cài đặt](#19-cài-đặt)
20. [Học viên nhìn thấy gì](#20-học-viên-nhìn-thấy-gì)
21. [Tình huống thường gặp](#21-tình-huống-thường-gặp)

---

## 1. Bắt đầu

### Mở trang Quản trị

Vào địa chỉ quản trị của website, ví dụ: `https://vscacademy.vn/admin`

Đăng nhập bằng **email** và **mật khẩu** đã được cấp.

### Lần đăng nhập đầu

Hệ thống sẽ yêu cầu **đổi mật khẩu tạm**. Đặt mật khẩu mới (tối thiểu 12 ký tự), xác nhận lại, rồi bấm **Lưu mật khẩu mới**.

Nếu quên mật khẩu, dùng luồng đặt lại mật khẩu trên màn hình đăng nhập. Link trong email **hết hạn sau 1 giờ**.

### Giao diện

- **Cột trái:** menu các mục làm việc.
- **Phía trên:** tên trang hiện tại, tên người đang đăng nhập, nút **Đăng xuất**.
- **Giữa trang:** danh sách hoặc form. Sau khi lưu, góc màn hình hiện thông báo ngắn (ví dụ “Đã lưu”).

> **Lưu ý:** Hãy **Lưu** trước khi rời trang. Đổi tab trong một form (ví dụ tab tiếng Việt / tiếng Anh) chưa tự lưu.

---

## 2. Ai được làm gì

| Vai trò trên trang | Việc chính |
|---|---|
| **Chủ sở hữu** | Toàn bộ thao tác, kể cả **Cài đặt** website |
| **Quản trị** | Vận hành khóa học, lớp, đăng ký, học viên, chứng nhận, nội dung |
| **Biên tập** | Xem và sửa nội dung; không tạo/xóa học viên, không cấp chứng nhận |
| **Giảng viên** | Dùng cổng riêng `/giang-vien`: lớp phụ trách, điểm danh, tài liệu, thông báo. Không đổi giá, không xóa khóa, không cấp chứng nhận |

Giảng viên **không** dùng trang `/admin`. Nếu tài khoản quản trị mở nhầm cổng giảng viên, hệ thống sẽ đưa về trang quản trị.

---

## 3. Quy trình làm việc hằng ngày

Đây là luồng chuẩn từ lúc người học nộp form đến lúc nhận chứng nhận.

```
Người học nộp form Đăng ký
        ↓
Admin liên hệ → thu học phí → đổi trạng thái Đã xác nhận
        ↓
Hệ thống tạo hồ sơ học viên và ghi danh vào lớp
        ↓
Học viên nhận email, đặt mật khẩu, vào cổng học viên
        ↓
Admin / giảng viên tạo buổi học, điểm danh, gửi tài liệu
        ↓
Đánh dấu hoàn thành khi học viên xong khóa
        ↓
Cấp chứng nhận (bản tiếng Việt và tiếng Anh)
```

Chi tiết từng bước nằm ở các mục dưới.

---

## 4. Tổng quan

Trang đầu tiên sau khi đăng nhập.

Bạn thấy số liệu nhanh: số chương trình, lớp sắp khai giảng, lớp đang mở đăng ký, tổng đăng ký, đăng ký mới, số học viên, bài viết còn nháp, bản tiếng Anh chưa xong.

Hai bảng hỗ trợ:

- **Lớp sắp khai giảng** — bấm tên lớp để mở chi tiết.
- **Đăng ký mới nhất** — bấm tên người đăng ký để xử lý hồ sơ.

Nên xem **Tổng quan** mỗi buổi sáng để không bỏ sót đăng ký mới.

---

## 5. Khóa học

Khóa học là **chương trình** trên website (AI Starter, AI Ứng dụng cho công việc, AI Agent Automation…). Giá, mô tả, chương trình học, FAQ đều nằm ở đây.

Lớp cụ thể (tháng 10, tháng 11…) nằm ở mục **Lớp học**, không nhập lại giá trên từng trang HTML.

### Danh sách

Menu **Khóa học**. Có ô tìm kiếm. Cột **Tiếng Việt** / **Tiếng Anh** cho biết bản đó đã lên website chưa.

Bấm **+ Khóa mới** để tạo, hoặc bấm **Sửa** / tên khóa để chỉnh.

### Các tab trong chi tiết khóa

| Tab | Dùng để |
|---|---|
| **Tổng quan** | Mã khóa, đường dẫn trang, giá, hình thức, sĩ số, trạng thái, quy tắc chứng nhận |
| **Nội dung tiếng Việt** | Tên khóa, tiêu đề lớn, mô tả, nhãn nút trên website |
| **Nội dung tiếng Anh** | Bản tiếng Anh tương ứng |
| **Chương trình** | Các buổi / bước học (thêm bằng **+ Thêm**, đổi thứ tự bằng ↑ ↓) |
| **Kết quả** | Học viên nhận được gì sau khóa |
| **Câu hỏi thường gặp** | FAQ tiếng Việt và tiếng Anh |
| **Giảng viên** | Chọn giảng viên phụ trách khóa |
| **Lịch học** | Các lớp đã mở của khóa này |
| **SEO** | Tiêu đề và mô tả khi chia sẻ link trên Google / mạng xã hội |

Bấm **Lưu** ở cuối trang sau khi sửa.

### Để khóa hiện trên website

1. Tab **Tổng quan**: **Trạng thái khóa** = **Đã xuất bản**.
2. **Trạng thái tiếng Việt** = **Đã xuất bản** nếu muốn hiện bản Việt.
3. **Trạng thái tiếng Anh** = **Đã xuất bản** nếu muốn hiện bản Anh.

Trạng thái ngôn ngữ thường gặp:

| Trạng thái | Ý nghĩa |
|---|---|
| Chưa tạo | Chưa có nội dung |
| Nháp / Nháp AI | Đang soạn, website chưa hiện |
| Chờ duyệt | Đã soạn xong, chờ người phụ trách duyệt |
| Đã xuất bản | Đã lên website |
| Đã ẩn | Cố ý không hiện |

### Bản tiếng Anh

Trong tab **Nội dung tiếng Anh**:

1. **Tạo bản nháp tiếng Anh** — sao cấu trúc từ bản Việt để biên tập. **Không tự lên website.**
2. Sửa lời cho tự nhiên, không dịch máy nguyên văn trang chính.
3. **Đánh dấu đã duyệt** rồi **Xuất bản bản Anh**.
4. Bấm **Lưu**.

Website tiếng Anh chỉ hiện khóa khi trạng thái tiếng Anh là **Đã xuất bản**.

### Đổi giá

Mở khóa → tab **Tổng quan** → **Giá (VND)** → nhập số không dấu chấm (ví dụ `999000`) → **Lưu**.

Mọi lớp dùng giá của khóa. Đổi giá ở **Khóa học → Tổng quan → Giá (VND)**.

### Quy tắc chứng nhận (tab Tổng quan)

| Trường | Nên hiểu như thế nào |
|---|---|
| **Bật chứng nhận** | Có = khóa này được cấp chứng nhận |
| **Điểm danh tối thiểu (%)** | Mặc định 75. Thấp hơn thì chưa đủ điều kiện |
| **Yêu cầu hoàn thành khóa** | Có = phải đánh dấu hoàn thành trước khi cấp |
| **Yêu cầu thanh toán** | Có = phải ở trạng thái Đã thanh toán |
| **Quản trị duyệt chứng nhận** | Có = không tự cấp, admin bấm cấp tay |

### Xóa khóa

Nút **Xóa** ở cuối form. Không xóa được nếu khóa còn lớp gắn kèm — hãy xử lý lớp trước.

---

## 6. Lớp học

Một khóa có thể có nhiều lớp (nhiều lịch). Website, trang khóa, lịch học và form đăng ký **đọc chung một lớp** — chỉ cần sửa ở đây.

### Tạo lớp mới

**Lớp học** → **+ Lớp mới** (hoặc từ tab **Lịch học** của khóa → **+ Tạo lớp**).

Điền:

- **Khóa học** — chọn chương trình
- **Mã lớp (đường dẫn)** — ví dụ `ai-starter-thang-10`
- **Tên lớp** — tên hiện trên danh sách
- Ngày bắt đầu / kết thúc, giờ học, thứ trong tuần (ví dụ `T3, T5`)
- **Hình thức** — để trống thì theo khóa; hoặc chọn Online trực tiếp / Offline tại chỗ / Kết hợp
- **Địa điểm** — chọn từ mục Địa điểm (lớp offline)
- **Link họp trực tuyến** — nếu học online
- **Mở đăng ký** / **Đóng đăng ký**
- **Trạng thái** — xem bảng dưới

Bấm **Lưu lớp**. Website cập nhật lịch, trang khóa và form đăng ký.

### Trạng thái lớp

| Trạng thái | Website hiểu như thế nào |
|---|---|
| **Đang mở đăng ký** | Đang nhận học viên |
| **Đã đầy** | Ngừng nhận đăng ký |
| **Đã hoàn thành** | Lớp đã xong |
| **Đã hủy** | Không mở lớp này |

Muốn đóng đăng ký: đổi sang **Đã đầy** hoặc **Đã hoàn thành**, hoặc đặt ngày **Đóng đăng ký**.

### Các tab sau khi lớp đã lưu

Kéo xuống dưới form lớp:

| Tab | Việc làm |
|---|---|
| **Tổng quan** | Số học viên, bao nhiêu người đủ điều kiện chứng nhận |
| **Học viên** | Danh sách trong lớp, thanh toán, tiến độ. **Đề xuất hoàn thành** khi giảng viên thấy học viên đã xong |
| **Buổi học** | Từng buổi: tiêu đề, ngày, giờ, link họp, link bản ghi. **Sửa** / **Xóa** trên từng dòng |
| **Điểm danh** | Có mặt / Vắng / Có phép / Chưa ghi |
| **Tài liệu** | Tài liệu gắn lớp này |
| **Thông báo** | Thông báo gửi học viên lớp |
| **Chứng nhận** | Chọn học viên và cấp chứng nhận |

### Thêm / sửa buổi học

Tab **Buổi học** → hệ thống tự tạo buổi từ ngày/giờ của lớp nếu chưa có. Có thể thêm buổi, sửa giờ, hoặc dán link họp.

Muốn sửa buổi đã tạo: bấm **Sửa** trên dòng đó, form bên dưới đổi thành **Sửa buổi học**, chỉnh rồi **Lưu buổi**. Đổi ngày/giờ hoặc chuyển trạng thái **Đổi lịch** / **Đã hủy** sẽ gửi thông báo in-app cho học viên của lớp. Admin / chủ sở hữu có thể **Xóa** buổi.

Học viên chỉ thấy nút vào lớp khoảng **30 phút trước giờ học** (có thể đổi trên khóa học). Link họp không hiện sẵn trên trang công khai.

Lớp offline: không cần link họp. Học viên thấy địa điểm và nút xem bản đồ (lấy từ **Địa điểm**).

---

## 7. Đăng ký

Đây là hồ sơ người học gửi từ form **Đăng ký** trên website.

### Danh sách

Lọc theo khóa, lớp, trạng thái. Ô tìm: tên, email, số điện thoại, mã.

- **Tải CSV** — xuất danh sách ra file bảng tính.
- **+ Thêm đăng ký** — nhập tay khi nhận đăng ký ngoài website.

### Xử lý một đăng ký

Mở dòng → sửa thông tin nếu cần → đổi **Trạng thái**:

| Trạng thái | Khi nào dùng |
|---|---|
| **Chờ thanh toán** | Form mới nộp, hoặc đã liên hệ / chờ chuyển khoản |
| **Đã xác nhận** | Chốt chỗ — hệ thống tạo học viên và ghi danh vào lớp |
| **Đã hủy** | Không học |

> **Quan trọng:** Chỉ khi chuyển sang **Đã xác nhận**, học viên mới có tài khoản cổng học và được ghi danh. Nếu email chưa từng học, hệ thống tạo tài khoản ngay và hiện **email + mật khẩu tạm** một lần cho admin. **Chưa gửi email kích hoạt tự động** — admin gửi thông tin đăng nhập thủ công. Học viên đăng nhập rồi bắt buộc đổi mật khẩu (tối thiểu 8 ký tự).

Có thể ghi chú, đổi lớp, sửa số tiền ngay trên form. Bấm **Lưu thay đổi**.

---

## 8. Học viên

Hồ sơ người đã (hoặc sắp) học. Khác với **Đăng ký**: đăng ký là form bán hàng; học viên là tài khoản học tập. Chỗ trong lớp (ghi danh) nằm ngay trên hồ sơ này — không còn menu Ghi danh riêng.

Danh sách: tên, email, SĐT, **lớp đang học**, trạng thái tài khoản. Lọc theo lớp nếu cần xem một lớp. Roster theo lớp vẫn ở **Lớp học → tab Học viên**.

### Tạo học viên tay

**Học viên** → **+ Học viên**:

1. Họ tên, email đăng nhập, mật khẩu tạm, điện thoại.
2. Chọn **Lớp** nếu đã biết lớp (không bắt buộc).
3. Bấm **Tạo**.
4. Nhắn mật khẩu tạm cho học viên. Lần đăng nhập đầu, học viên **bắt buộc đổi mật khẩu**.

Nếu chưa chọn lớp lúc tạo: vào chi tiết → tab **Ghi danh** → chọn lớp → **Ghi danh**.

### Tab chi tiết học viên

| Tab | Việc làm |
|---|---|
| **Hồ sơ** | Tên, điện thoại, trạng thái tài khoản. **Reset mật khẩu** gửi link vào email. **Xóa** vô hiệu tài khoản và hủy các lớp đang học |
| **Ghi danh** | Cho vào lớp, đổi trạng thái học, đổi thanh toán, **chuyển lớp**, **gỡ khỏi lớp**. Tiến độ và chứng nhận hiện trên từng hàng |
| **Điểm danh** | Xem / sửa điểm danh từng buổi |
| **Ghi chú** | Ghi chú nội bộ (học viên không thấy) |
| **Chứng nhận** | Xem PDF, **Cấp lại**, **Thu hồi** |
| **Hoạt động** | Ngày tạo tài khoản, lần đăng nhập gần nhất |

### Trạng thái tài khoản học viên

| Trạng thái | Ý nghĩa |
|---|---|
| **Đã mời** | Đã tạo, chưa kích hoạt / chưa vào học |
| **Đang học** | Đang dùng cổng học viên |
| **Ngưng** | Không còn học |
| **Tạm khóa** | Không cho đăng nhập |

### Trạng thái trong một lớp

| Học tập | Thanh toán |
|---|---|
| Đang học | Chưa thanh toán |
| Đã hoàn thành | Chờ thanh toán |
| Tạm dừng | Đã thanh toán |
| Đã hủy | Đã hoàn tiền |

Đổi thanh toán sang **Đã thanh toán** khi đã đối soát tiền — điều này ảnh hưởng điều kiện cấp chứng nhận.

---

## 9. Ghi danh

Không còn menu riêng. Một người có thể học nhiều khóa / nhiều lớp:

- Theo người: menu **Học viên** → cột Lớp, hoặc chi tiết → tab **Ghi danh**.
- Theo lớp: **Lớp học** → tab **Học viên** (thanh toán, tiến độ, đề xuất hoàn thành, chứng nhận).

URL cũ `/admin/enrollments` chuyển về **Học viên**.

---

## 10. Tài liệu học tập

Tài liệu **trong cổng học viên** (slide, PDF, prompt, bài tập, bản ghi buổi học…). Khác với **Tài liệu chuyên môn** trên website công khai.

**Tài liệu** → **+ Tài liệu lớp**:

1. Tiêu đề / mô tả tiếng Việt (và tiếng Anh nếu có).
2. **Loại:** bài trình chiếu, PDF, mẫu, prompt, bài tập, video, bản ghi, liên kết…
3. **Giai đoạn:** trước buổi / trong khóa / sau buổi.
4. **Phạm vi hiển thị:**
   - **Theo khóa** — mọi lớp của khóa đó
   - **Theo lớp** — chỉ một lớp
   - **Theo buổi** — chỉ một buổi
   - **Học viên cụ thể** — chỉ người được chọn
5. Chọn khóa / lớp tương ứng.
6. Dán **link ngoài** hoặc **tải file lên**.
7. **Lưu**.

Học viên đúng lớp sẽ thấy tài liệu ngay. Không cần gửi file qua Zalo / email.

---

## 11. Thông báo

Gửi tin trong cổng học viên (học viên thấy mục Thông báo, có số tin chưa đọc).

**Thông báo** → **+ Thông báo**:

- Tiêu đề và nội dung (Việt / Anh).
- **Đối tượng:** tất cả / theo khóa / theo lớp / một học viên / một buổi.
- **Mức ưu tiên:** Thường / Quan trọng / Khẩn.
- Chọn khóa hoặc lớp cho đúng đối tượng.
- Bấm **Đăng**.

Chỉ gửi cho người cần nhận. Tránh “Tất cả” khi tin chỉ liên quan một lớp.

---

## 12. Chứng nhận

### Khi nào được cấp

Học viên **đủ điều kiện** khi (tùy quy tắc trên khóa):

- Điểm danh đạt mức tối thiểu
- Đã được đánh dấu hoàn thành (nếu khóa yêu cầu)
- Đã thanh toán (nếu khóa yêu cầu)
- Khóa đang bật chứng nhận
- Ghi danh không bị hủy

Trên tab **Chứng nhận** của lớp, hệ thống ghi rõ: đủ điều kiện / thiếu điểm danh / chưa hoàn thành.

Có thể cấp cho người chưa đủ điều kiện, nhưng hệ thống sẽ **hỏi xác nhận** trước.

### Cách cấp (nên dùng)

1. **Lớp học** → mở lớp → tab **Chứng nhận**.
2. Chọn **Mẫu chứng nhận:** **Chứng nhận hoàn thành khóa học (VI + EN)**.
3. Đánh dấu học viên cần cấp.
4. Bấm **Cấp chứng nhận đã chọn**.

Mỗi lần cấp tạo **hai file PDF**: tiếng Việt và tiếng Anh. Tên trên bản Anh **không dấu** (ví dụ Nguyễn → Nguyen). Tên trên bản Việt giữ nguyên dấu.

Mã chứng nhận dạng `VSC-2026-AIS-XXXXXX`. Người ngoài kiểm tra tại trang xác minh công khai, không cần đăng nhập.

### Xem, cấp lại, thu hồi

**Chứng nhận** trên menu, hoặc tab **Chứng nhận** trong hồ sơ học viên.

Với chứng nhận đang **Đã cấp**:

- **PDF** / **PDF VI** / **PDF EN** — xem file
- **Cấp lại** — dùng khi đổi tên khóa, sửa lỗi chính tả tên, hoặc cần file mới. Bản cũ thành **Đã cấp lại**, bản mới giữ artwork chính thức
- **Thu hồi** — bắt buộc nhập lý do. Trang xác minh sẽ báo đã thu hồi. Không xóa lịch sử

> **Cấp lại** luôn bấm trên dòng đang **Đã cấp**, không bấm trên dòng **Đã cấp lại**. File PDF đã cấp không tự đổi — phải cấp lại mới ra bản mới.

### Trạng thái chứng nhận

| Trạng thái | Ý nghĩa |
|---|---|
| Chưa có | Chưa cấp |
| Đủ điều kiện | Đủ điều kiện, chờ admin cấp |
| Đã cấp | Đang có hiệu lực |
| Đã cấp lại | Bản cũ, đã thay bằng bản mới |
| Đã thu hồi | Không còn giá trị |
| Chờ duyệt | Đang chờ bước duyệt (nếu khóa yêu cầu) |

---

## 13. Mẫu chứng nhận

Menu **Mẫu chứng nhận**.

VSC Academy có mẫu chính thức **không xóa được**:

- Mẫu nền navy (dự phòng)
- **Chứng nhận hoàn thành khóa học** tiếng Việt
- **Chứng nhận hoàn thành khóa học** tiếng Anh

Khi cấp, hãy chọn cặp **VI + EN** để học viên nhận đủ hai ngôn ngữ.

Có thể tạo mẫu khác nếu cần sự kiện đặc biệt. Mẫu chính thức nên để **Đã xuất bản**.

---

## 14. Giảng viên

Danh sách giảng viên hiện trên website và dùng để đăng nhập cổng giảng viên.

Khi tạo mới:

- Tên, **email đăng nhập**, mật khẩu tạm (giảng viên đổi ở lần đầu)
- Học hàm, vai trò, ảnh, tiểu sử Việt / Anh, chuyên môn, website

**Reset mật khẩu** gửi link đặt lại vào email giảng viên.

Gắn giảng viên vào khóa ở tab **Giảng viên** của khóa học (Phụ trách / Giảng viên / Khách mời).

---

## 15. Góc chia sẻ

Bài viết trên website (mục Góc chia sẻ / Insights).

**+ Bài viết:** tiêu đề, đường dẫn trang, chuyên mục, tóm tắt, nội dung — bản Việt và bản Anh.

- Bản Việt lên site khi **Trạng thái tiếng Việt** = **Đã xuất bản**.
- Bản Anh **chỉ hiện** khi có tiêu đề tiếng Anh và trạng thái tiếng Anh = **Đã xuất bản**. Thiếu tiêu đề Anh thì bài đó ẩn trên site tiếng Anh.

Nút **Tạo bản nháp tiếng Anh** sao cấu trúc từ bản Việt để biên tập. Nhớ **Lưu**.

---

## 16. Tài liệu chuyên môn

Tài liệu trên website công khai (thư viện tri thức), không phải file trong cổng học viên.

Điền tiêu đề, đường dẫn, chuyên mục, mô tả, file hoặc link ngoài.

**Quyền xem:**

| Quyền | Ai thấy |
|---|---|
| **Công khai** | Mọi người |
| **Cần đăng ký** | Người đã đăng ký / đã có tài khoản theo quy định trang |
| **Nội bộ** | Không hiện công khai |

**Trạng thái:** Nháp / Đã xuất bản / Đã ẩn.

---

## 17. Thư viện ảnh

Tải ảnh dùng cho website hoặc nội dung khác.

1. Chọn file, ghi mô tả ảnh tiếng Việt / tiếng Anh.
2. **Tải lên**.
3. **Sao chép đường dẫn** nếu cần dán vào chỗ khác.
4. **Xóa** khi không dùng nữa.

---

## 18. Địa điểm

Địa chỉ học trực tiếp (ví dụ quán cà phê, văn phòng).

Sửa **một lần** tên, thành phố, địa chỉ Việt / Anh, link bản đồ. Mọi lớp chọn địa điểm này sẽ **tự cập nhật** — không gõ lại địa chỉ trên từng lớp.

---

## 19. Cài đặt

Chỉ **Chủ sở hữu** sửa được.

- **Liên hệ:** email, điện thoại, Zalo, website, địa chỉ
- **SEO:** tiêu đề và mô tả mặc định của website
- **Chân trang:** dòng chữ cuối trang Việt / Anh
- **Đăng ký:** lời cảm ơn sau khi nộp form, thông tin hỗ trợ

Bấm **Lưu cài đặt**.

---

## 20. Học viên nhìn thấy gì

Cổng học viên (tiếng Việt: `/hoc-vien`, tiếng Anh: `/en/student`) chỉ hiện **khóa đã ghi danh**.

Học viên có thể:

- Xem lịch buổi học và vào lớp đúng giờ
- Tải tài liệu đúng phạm vi
- Đọc thông báo, đánh dấu đã đọc
- Xem điểm danh của mình
- Xem / tải chứng nhận tiếng Việt và tiếng Anh

Học viên **không** thấy ghi chú nội bộ, không tự cấp chứng nhận, không xem hồ sơ người khác.

Trang xác minh chứng nhận (`/verify/…`) là trang công khai: hiện tên, chương trình, ngày cấp, mã. Không hiện email hay số điện thoại.

---

## 21. Tình huống thường gặp

**Đăng ký rồi mà học viên chưa vào được cổng?**  
Chưa chuyển sang **Đã xác nhận**, hoặc chưa gửi mật khẩu tạm cho học viên. Mở menu **Học viên** để kiểm tra tài khoản; nếu vừa xác nhận thì mật khẩu tạm chỉ hiện một lần trên màn hình xác nhận.

**Đổi tên khóa trên website, chứng nhận vẫn tên cũ?**  
File PDF đã cấp không tự đổi. Mở chứng nhận đang **Đã cấp** → **Cấp lại**. Chọn mẫu **Chứng nhận hoàn thành khóa học (VI + EN)** nếu đang cấp từ tab lớp.

**Cấp lại xong PDF thành bản nền tối, mất hình chứng nhận?**  
Lần cấp lại đã lấy nhầm mẫu dự phòng. Cấp lại lần nữa từ tab **Chứng nhận của lớp**, chọn đúng mẫu **VI + EN**.

**Website chưa hiện khóa / bài viết?**  
Kiểm tra trạng thái **Đã xuất bản** (cả khóa và từng ngôn ngữ). Bản Anh cần có tiêu đề tiếng Anh.

**Đóng nhận học viên?**  
Đổi trạng thái lớp thành **Đã đầy** hoặc **Đã hoàn thành**, hoặc đặt ngày đóng đăng ký.

**Học viên đóng nhầm lớp?**  
Hồ sơ học viên → tab **Ghi danh** → chọn lớp mới ở cột **Chuyển lớp**.

**Cần sửa chính tả tên trên chứng nhận?**  
Sửa họ tên trên hồ sơ học viên, rồi **Cấp lại**. Bản Anh sẽ bỏ dấu tự động.

**Giảng viên không thấy menu Khóa học / Chứng nhận?**  
Đúng thiết kế. Giảng viên dùng cổng `/giang-vien`, chỉ thao tác lớp được phân công.

**Xóa nhầm?**  
Nhiều mục hỏi xác nhận trước khi xóa. Học viên bị xóa thì tài khoản ngưng và các lớp đang học bị hủy ghi danh — cân nhắc **Tạm khóa** nếu chỉ muốn ngừng đăng nhập.

---

## Nguyên tắc vận hành ngắn

1. Sửa giá, lịch, địa điểm **trên trang Quản trị**, không sửa tay trên từng trang website.
2. Form đăng ký → xử lý đến **Đã xác nhận** mới thành học viên.
3. Tài liệu và thông báo gửi trong hệ thống, đúng lớp, đúng người.
4. Chứng nhận cấp bằng mẫu **VI + EN**; cấp lại khi nội dung trên giấy cần đổi.
5. Bản tiếng Anh do người viết, không đưa bản dịch máy lên trang chính.
6. Không chia sẻ mật khẩu tạm qua nhóm chat công khai; dùng email hoặc kênh riêng, nhắc đổi mật khẩu ngay.

---

*Tài liệu dành cho đội vận hành VSC Academy. Khi giao diện đổi tên nút, ưu tiên làm theo chữ trên màn hình.*
