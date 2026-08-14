# VSC Academy Admin — Hướng dẫn vận hành

Đăng nhập: `http://localhost:4173/admin`
Tài khoản vận hành: `vutrananh97@gmail.com` (OWNER), `nnqbao@gmail.com` (ADMIN) — dùng hai mật khẩu tạm riêng từ `VSC_OWNER_TEMP_PASSWORD` và `VSC_ADMIN_TEMP_PASSWORD`, **bắt buộc đổi ở lần đăng nhập đầu**.
Đổi mật khẩu ngay trên môi trường thật. Nếu Convex đã có dữ liệu, đặt hai biến mật khẩu khác nhau (mỗi biến tối thiểu 12 ký tự) rồi chạy `npm run seed:admin`. Lệnh chỉ tạo tài khoản còn thiếu, không đặt lại mật khẩu hay quyền của tài khoản đã tồn tại. Không ghi mật khẩu vào repository hoặc tài liệu.

## Tạo khóa học

1. Vào **Programs** → **Khóa mới**.
2. Điền Program ID (`ai-starter`), slug VI/EN, giá (số VND: `999000`), hình thức, sĩ số.
3. Tab **Nội dung VI**: tên, headline, mô tả, CTA.
4. Tab **Chương trình / Kết quả / FAQ**: thêm bước bằng **+ Thêm**, kéo thứ tự bằng ↑ ↓.
5. Tab **Content EN**: viết bản tiếng Anh, hoặc bấm **Tạo English Draft** (sao cấu trúc từ VI, **không tự publish**).
6. **Mark as Reviewed** rồi đổi Status EN thành `published` và **Lưu**.
7. Status khóa = `published` thì website mới hiện.

## Mở lớp

1. **Sessions** → **Lớp mới** (hoặc từ tab Lịch học của khóa).
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

**Registrations**: lọc theo khóa / lớp / trạng thái, tìm tên-email-SĐT.  
Mở chi tiết để đổi New → Contacted → Pending Payment → Paid → Confirmed, thêm ghi chú, chuyển lớp.  
**Export CSV** tải danh sách.

## Publish VI / EN

Mỗi ngôn ngữ có status riêng: Not created → AI Draft → Ready for review → Published.  
Website EN chỉ hiện copy khi Status EN = Published. Insights không có `titleEn` thì vẫn ẩn trên bản EN như hiện tại.

## Tạo bài viết

**Insights** → bài mới → Title/Slug/Excerpt VI. Bấm **Tạo English Draft** nếu cần bản EN để biên tập. Đổi status `published` để lên Góc chia sẻ.

## Venue

**Venues** sửa địa chỉ VI/EN một lần. Session chỉ lưu `venueId` — đổi venue là mọi lớp gắn venue đó cập nhật.

## Cổng học viên

- VI: `http://localhost:4173/hoc-vien`
- EN: `http://localhost:4173/en/student`

Tài khoản demo: `hoc-vien@vsc.academy` / `VscLearner!2026`

### Từ đăng ký → vào học

1. Học viên nộp form `/dang-ky`.
2. Admin mở **Registrations** → đổi trạng thái **Confirmed**.
3. CMS tạo Student + Enrollment (nếu email chưa có tài khoản thì hiện **link kích hoạt**).
4. Học viên mở `/hoc-vien/kich-hoat?token=...`, đặt mật khẩu, vào dashboard.

### Admin vận hành lớp

- **Students** — hồ sơ, enroll, chuyển lớp, đánh dấu completed, reset access.
- **Sessions** — thêm **buổi học** (Class meeting) với ngày/giờ/Meet URL.
- **Materials** — tài liệu trước / trong / sau buổi, gắn program hoặc session.
- **Announcements** — gửi all / program / session / student, priority normal/important/urgent.

Học viên chỉ thấy khóa đã enroll, tài liệu và thông báo đúng phạm vi.

Chi tiết vận hành LMS (chứng nhận, QR, điểm danh, instructor): xem `LMS_ADMIN_GUIDE.md` và `LMS_ARCHITECTURE.md`.

## Khi CMS không chạy

Website tĩnh vẫn dùng `schedule-data.js` / `course-data.js` gốc. Form đăng ký ghi `localStorage` nếu API không tới được.
