# VSC Academy Learner Portal — Ghi chú kỹ thuật quản trị

Hướng dẫn dùng trang quản trị cho admin: [`HUONG_DAN_QUAN_TRI.md`](HUONG_DAN_QUAN_TRI.md).

Tài liệu này giữ các ghi chú kỹ thuật (cổng học viên, chứng nhận, email).

- Cổng học viên: `http://localhost:4173/hoc-vien` (EN: `/en/student`)
- Admin: `http://localhost:4173/admin`
- Giảng viên: `http://localhost:4173/giang-vien`
- Xác minh công khai: `http://localhost:4173/verify`

Học viên demo: `hoc-vien@vsc.academy` / `VscLearner!2026`

Tài khoản admin dùng mật khẩu tạm từ biến môi trường (xem `CMS_USER_GUIDE.md`). Không gửi mật khẩu học viên dạng plain text qua email.

## 1. Cấp tài khoản học viên

Học viên **không** tự có tài khoản khi nộp form `/dang-ky`.

1. Mở **Đăng ký**.
2. Đổi trạng thái **Đã xác nhận**.
3. CMS tạo học viên (nếu email chưa có) + ghi danh. Học viên xuất hiện ngay trong menu **Học viên**.
4. CMS **không** gửi email kích hoạt. Admin nhận email + mật khẩu tạm một lần trên màn hình, rồi gửi thủ công cho học viên.
5. Học viên đăng nhập cổng học bằng email và mật khẩu tạm, rồi bắt buộc đổi mật khẩu (≥ 8 ký tự).

Tạo tay: **Học viên → + Học viên** → ghi danh vào lớp.

Trạng thái học viên: Đã mời / Đang học / Ngưng / Tạm khóa.

## 2. Ghi danh học viên

- Từ **Học viên → chi tiết → Ghi danh**: chọn lớp → Ghi danh.
- Hoặc xác nhận đăng ký (tự ghi danh).
- Một học viên có thể học nhiều khóa / nhiều lớp.
- Chuyển lớp: đổi lớp trên bản ghi danh.
- **Ghi danh** (`/admin/enrollments`) xem toàn bộ: học viên, khóa, lớp, thanh toán, tiến độ, chứng nhận.

## 3. Tạo / sửa buổi học

Mở **Lớp học → chi tiết lớp → tab Buổi học**.

- Title VI/EN, ngày, giờ bắt đầu/kết thúc, format (online/offline/hybrid), Google Meet URL, recording URL, trạng thái.
- **Sửa** trên dòng buổi để đổi lịch, link họp, bản ghi hoặc trạng thái (`rescheduled` / `cancelled`). Học viên thuộc lớp nhận thông báo in-app.
- Admin / owner có thể **Xóa** buổi. Giảng viên sửa được buổi của lớp mình, không xóa được.

## 4. Thêm Google Meet

Trên buổi học: điền **Meet URL**.  
Link chỉ mở cho học viên đã enroll, khoảng **30 phút trước giờ học** (cấu hình `join_link_open_minutes_before` trên Program).  
Portal không nhúng sẵn URL trong HTML. Nút **VÀO LỚP HỌC** gọi API join.

Lớp offline: không dùng Meet. Học viên thấy venue + địa chỉ + **XEM ĐỊA ĐIỂM** (map từ bản ghi Venue, không nhập lại).

## 5. Đổi lịch

Tab **Buổi học** → **Sửa** → đổi ngày/giờ/status (`rescheduled` / `cancelled`). Portal lịch học cập nhật ngay. Thông báo “Thay đổi lịch học” gửi tới học viên của lớp.

## 6. Upload tài liệu

**Materials** hoặc tab MATERIALS của lớp.

1. Chọn Program → Session → (tuỳ chọn) Meeting.
2. Title/mô tả VI–EN, type (Slide, PDF, Prompt, Template, Worksheet, Video, Recording, Link…).
3. File (lưu private) hoặc URL ngoài.
4. Visibility: program / session / meeting / specific students.
5. Phase: trước buổi / trong buổi / sau buổi / bổ sung.
6. Publish.

Học viên đúng enrollment thấy tài liệu ngay. Không gửi file thủ công.

## 7. Đăng thông báo

**Announcements**: title/nội dung VI–EN, target All / Program / Session / Student, priority Normal / Important / Urgent, ngày hết hạn.

Học viên thấy ở **Thông báo**, badge số chưa đọc trên menu. Có Mark as read / Mark all as read.

## 8. Điểm danh

Tab ATTENDANCE của lớp, hoặc Student → ATTENDANCE.

Status: Present / Absent / Excused / Not recorded.  
Chỉ ADMIN / OWNER / INSTRUCTOR (được phân quyền) cập nhật. Học viên chỉ xem điểm danh của mình.

Tiến độ = buổi hoàn thành / tổng buổi (không gamification).

## 9. Mark Completed

Student → ENROLLMENTS → status `completed`, hoặc PUT enrollment `completionStatus=completed`.

Nếu program bật `requireAdminApproval`, chứng nhận **không** tự cấp. Trạng thái chứng nhận chuyển **Eligible** khi đủ:

- Điểm danh ≥ `minimumAttendancePercent` (mặc định 75%)
- Đã completed (nếu `requireCompletion`)
- Thanh toán `paid` (nếu `requirePayment`)
- Program `certificateEnabled`

## 10. Cấp chứng nhận

Tab **CERTIFICATES** của lớp:

- Danh sách học viên + attendance % + completion + payment + eligibility
- Ví dụ: 12 Eligible · 2 Missing Attendance · 1 Incomplete
- Chọn nhiều → **ISSUE SELECTED**

Hoặc **Certificates** (`/admin/certificates`) / chi tiết học viên → CERTIFICATES.

Hệ thống tạo mã `VSC-2026-AIA-8F32K9`, PDF A4 ngang, QR trỏ `/verify/{code}`, snapshot tên học viên và tên chương trình. Học viên nhận thông báo in-app.

## 11. Thu hồi / cấp lại

- **Revoke**: bắt buộc nhập lý do. Trang xác minh hiện **REVOKED**. Không xóa record.
- **Reissue**: bản cũ `reissued`, bản mới `issued`, lưu `replacesCertificateId`. Không ghi đè im lặng.

Chỉ OWNER / ADMIN.

## 12. Certificate template

`/admin/certificate-templates`

Name, language, title, body, footer, signer 1, signer 2 (tuỳ chọn), status, version.  
Không hard-code nội dung chứng nhận. PDF dùng template đã publish (mặc định `tpl-vsc-default`).

## 13. QR verification

QR chỉ encode URL: `https://[DOMAIN]/verify/VSC-2026-AIA-8F32K9`  
Không encode email/SĐT.

Trang `/verify` không cần đăng nhập. Hợp lệ: tên, chương trình, ngày hoàn thành, ngày cấp, Certificate ID, issuer VSC Academy, status VALID.  
Không tồn tại / đã thu hồi: thông báo tương ứng, không lộ dữ liệu nội bộ.

Đặt `PUBLIC_SITE_URL=https://vscacademy.edu.vn` khi deploy để QR và email trỏ đúng domain.

## Giảng viên

Role `INSTRUCTOR` đăng nhập tại `/giang-vien` (không dùng chung `/admin`).

Menu: Tổng quan, Lớp học (lớp phụ trách), Học viên, Tài liệu, Thông báo. Điểm danh và đề xuất hoàn thành nằm trong chi tiết lớp.

Không xóa khóa, không đổi giá, không cấp/thu hồi chứng nhận. Tài khoản quản trị vào nhầm `/giang-vien` sẽ được chuyển về `/admin`.

## Quên mật khẩu

Học viên dùng `/hoc-vien/quen-mat-khau`. Admin bấm **Reset mật khẩu** trên trang Học viên hoặc Giảng viên để gửi link vào email. Token hết hạn 1 giờ, lưu hash. SMTP dùng `SMTP_USER` / `SMTP_PASS` (không commit). Thiếu SMTP hoặc `PUBLIC_SITE_URL` thì API trả 503 — không xếp hàng gửi sau. `mail_outbox` chỉ là nhật ký đã gửi/thất bại, không chứa token.
