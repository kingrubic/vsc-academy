# VSC Academy Admin — Ghi chú kỹ thuật vận hành

Hướng dẫn dùng trang quản trị cho admin (ngôn ngữ thường, đủ menu): xem [`HUONG_DAN_QUAN_TRI.md`](HUONG_DAN_QUAN_TRI.md).

Tài liệu này giữ các ghi chú kỹ thuật khi triển khai.

- Admin: `http://localhost:4173/admin`
- Giảng viên: `http://localhost:4173/giang-vien`

Tài khoản vận hành: `vutrananh97@gmail.com` (OWNER), `nnqbao@gmail.com` (ADMIN) — dùng hai mật khẩu tạm riêng từ `VSC_OWNER_TEMP_PASSWORD` và `VSC_ADMIN_TEMP_PASSWORD`, **bắt buộc đổi ở lần đăng nhập đầu**.
Đổi mật khẩu ngay trên môi trường thật. Nếu Convex đã có dữ liệu, đặt hai biến mật khẩu khác nhau (mỗi biến tối thiểu 12 ký tự) rồi chạy `npm run seed:admin`. Lệnh chỉ tạo tài khoản còn thiếu, không đặt lại mật khẩu hay quyền của tài khoản đã tồn tại. Không ghi mật khẩu vào repository hoặc tài liệu.

## Tạo khóa học

1. Vào **Khóa học** → **Khóa mới**.
2. Điền Program ID (`ai-starter`), slug VI/EN, giá (số VND: `999000`), hình thức, sĩ số.
3. Tab **Nội dung VI**: tên, headline, mô tả, CTA.
4. Tab **Chương trình / Kết quả / FAQ**: thêm bước bằng **+ Thêm**, kéo thứ tự bằng ↑ ↓.
5. Tab **Nội dung tiếng Anh**: viết bản tiếng Anh, hoặc bấm **Tạo bản nháp tiếng Anh** (sao cấu trúc từ bản Việt, **không tự xuất bản**).
6. **Đánh dấu đã duyệt** rồi đổi trạng thái tiếng Anh thành `published` và **Lưu**.
7. Status khóa = `published` thì website mới hiện.

## Mở lớp

1. **Lớp học** → **Lớp mới** (hoặc từ tab Lịch học của khóa).
2. Chọn program, slug (`ai-starter-thang-10`), ngày, giờ, sĩ số, venue.
3. Trạng thái:
   - Draft — ẩn
   - Opening Soon — sắp mở
   - Registration Open — đang nhận
   - Limited Seats — sắp hết chỗ
   - Full / Completed / Cancelled
4. **Lưu lớp**. Homepage, trang khóa, Lịch học, form Đăng ký (VI và EN) đọc cùng bản ghi này. Không nhập lại giá/ngày ở HTML.

## Cập nhật giá

Mở khóa → Tổng quan → **Giá (VND)** → Lưu. Mọi lớp không có price override sẽ dùng giá mới.

## Đóng đăng ký

Mở lớp → đổi trạng thái **Full** hoặc **Completed**, hoặc đặt ngày **Đóng ĐK**. Website ẩn/chuyển CTA theo status hiện có.

## Xem học viên

**Đăng ký**: lọc theo khóa / lớp / trạng thái, tìm tên-email-SĐT.

Mở chi tiết để đổi Chờ thanh toán → Đã xác nhận (tạo tài khoản học viên) hoặc Đã hủy, thêm ghi chú, chuyển lớp.

**Tải CSV** tải danh sách.

## Publish VI / EN

Mỗi ngôn ngữ có trạng thái riêng: Chưa tạo → Nháp AI → Chờ duyệt → Đã xuất bản.

Website EN chỉ hiện copy khi Status EN = Published. Insights không có `titleEn` thì vẫn ẩn trên bản EN như hiện tại.

## Tạo bài viết

**Góc chia sẻ** → bài mới → tiêu đề/đường dẫn/tóm tắt tiếng Việt. Bấm **Tạo bản nháp tiếng Anh** nếu cần bản Anh để biên tập. Đổi trạng thái `published` để lên Góc chia sẻ.

## Venue

**Địa điểm** sửa địa chỉ tiếng Việt/tiếng Anh một lần. Lớp chỉ lưu `venueId` — đổi địa điểm là mọi lớp gắn địa điểm đó cập nhật.

## Cổng học viên

- VI: `http://localhost:4173/hoc-vien`
- EN: `http://localhost:4173/en/student`

Tài khoản demo: `hoc-vien@vsc.academy` / `VscLearner!2026`

### Từ đăng ký → vào học

1. Học viên nộp form `/dang-ky`.
2. Admin mở **Đăng ký** → đổi trạng thái **Đã xác nhận**.
3. CMS tạo Student + Enrollment (nếu email chưa có tài khoản thì hiện **link kích hoạt**).
4. Học viên mở `/hoc-vien/kich-hoat?token=...`, đặt mật khẩu, vào dashboard.

### Admin vận hành lớp

- **Học viên** — hồ sơ, ghi danh, chuyển lớp, đánh dấu hoàn thành. Tạo mới: nhập mật khẩu tạm (học viên phải đổi khi đăng nhập lần đầu). **Reset mật khẩu** gửi link vào email.
- **Giảng viên** — hồ sơ + email đăng nhập. Tạo mới: nhập mật khẩu tạm (bắt buộc đổi lần đầu). **Reset mật khẩu** gửi link `/giang-vien/dat-lai-mat-khau`.
- **Lớp học** — thêm / sửa **buổi học** với ngày/giờ/link họp.
- **Tài liệu** — tài liệu trước / trong / sau buổi, gắn khóa hoặc lớp.
- **Thông báo** — gửi tất cả / khóa / lớp / học viên, mức thường/quan trọng/khẩn.

Học viên chỉ thấy khóa đã enroll, tài liệu và thông báo đúng phạm vi.

Chi tiết vận hành LMS (chứng nhận, QR, điểm danh, instructor): xem `LMS_ADMIN_GUIDE.md` và `LMS_ARCHITECTURE.md`.

## Khi CMS không chạy

Website tĩnh vẫn dùng `schedule-data.js` / `course-data.js` gốc. Form đăng ký ghi `localStorage` nếu API không tới được.
