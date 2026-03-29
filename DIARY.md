# Nhật ký phát triển

## Ý tưởng: Chế độ chơi Ghế nóng (Hot Seat) / Vòng quay gọi tên

**Mô tả:**
- Giáo viên chọn chế độ chơi "Ghế nóng".
- Hệ thống quay ngẫu nhiên tên học sinh (có tùy chọn loại bỏ người đã trả lời đúng).
- Hiển thị tên học sinh được chọn -> Hiển thị câu hỏi.
- Nếu trả lời đúng: Cộng điểm, chuyển câu tiếp theo.
- Nếu trả lời sai: Giữ nguyên câu hỏi, quay tiếp để tìm người "cứu net".

**Các vấn đề cần giải quyết khi triển khai:**
1. **Phương thức trả lời:** Học sinh trả lời trên thiết bị cá nhân hay trả lời miệng để giáo viên chấm điểm trên màn hình chủ?
2. **Cơ chế tính điểm:** Người "cứu net" có được trọn vẹn điểm không hay bị giảm trừ?
3. **Xử lý danh sách:** Khi quay hết danh sách học sinh mà vẫn còn câu hỏi, cần tự động reset lại danh sách vòng quay.
4. **UI/UX:** Cần hiệu ứng âm thanh hồi hộp, vòng quay dạng Slot Machine hoặc lật thẻ bài để tăng tính hấp dẫn.

## Ý tưởng: Hệ thống Gamification - Tăng Level (EXP) cả năm học

**Mô tả:**
- Áp dụng mô hình tích lũy EXP (Kinh nghiệm) để thăng cấp (Level) thay vì điểm số truyền thống để tạo động lực tích cực (Positive Reinforcement), không bao giờ trừ điểm.
- **Tỷ giá EXP cơ sở:** 100 EXP cho một hành động tốt tiêu chuẩn.

**Chi tiết cộng EXP:**
1. **Kiểm tra miệng / Gọi ngẫu nhiên (Cá nhân):**
   - Đúng hoàn toàn: +100 EXP.
   - Đúng một phần / Có cố gắng: +50 EXP.
   - *Mẹo:* Cho phép "gọi quyền trợ giúp". Người trợ giúp đúng được +50 EXP, người nhờ trợ giúp cũng được +50 EXP.
2. **Trò chơi trực tiếp cả lớp (Cá nhân thi đấu):**
   - Hạng 1: +500 EXP | Hạng 2: +400 EXP | Hạng 3: +300 EXP | Top 4-10: +200 EXP
   - Tham gia hoàn thành: +100 EXP (Điểm tham gia để khuyến khích).
3. **Hoạt động Nhóm:**
   - Nhóm đạt Hạng 1 thì *tất cả* thành viên đều nhận EXP của Hạng 1 (VD: +500 EXP/người) -> Thúc đẩy Peer-mentoring.
   - Bầu chọn MVP nhóm: +100 EXP cho cá nhân xuất sắc nhất nhóm.

**Đường cong Thăng cấp (Leveling Curve):**
- Sử dụng đường cong lũy tiến (Exponential Curve) để tránh việc max level quá nhanh.
- VD: Level 1->2 (500 EXP), Level 2->3 (1000 EXP), Level 10 (20,000 EXP), Level 20 (100,000 EXP).

**Xử lý ngoại lệ (Edge Cases):**
- Học sinh vắng mặt: Có "Nhiệm vụ bù" (làm thêm bài tập gỡ tối đa 300 EXP).
- Phân hóa quá lớn: Sự kiện "Nhân đôi EXP" cho nhóm dưới trung bình, hoặc ghép cặp bạn Level cao kèm bạn Level thấp.
- Lạm phát EXP: Không trừ EXP, chỉ âm thầm kéo giãn mốc EXP của các Level tiếp theo.

## Ý tưởng: Hệ thống Danh hiệu (Achievements / Badges)

**Mô tả:**
Hệ thống thành tựu mở khóa dựa trên các cột mốc (Milestones) cụ thể trong quá trình học tập và tham gia trò chơi. Các danh hiệu này mang tính vui nhộn, khích lệ và ghi nhận sự cố gắng (kể cả khi thất bại). Tạm thời hệ thống này hoạt động độc lập, chưa liên kết với hệ thống điểm số hay EXP.

### Phân loại 1: Danh hiệu Hệ thống tự động trao (Auto-awarded)
Hệ thống tự động theo dõi dữ liệu (số lần gọi, đúng/sai) để trao huy hiệu khi học sinh đạt đủ điều kiện.

**1. Chuỗi Danh hiệu "Sự chú ý của Vũ trụ" (Số lần được gọi tên ngẫu nhiên):**
- **"Người được chọn" (The Chosen One):** Lần đầu tiên bị vòng quay gọi tên.
- **"Nam châm gọi tên" (Magnet):** Bị gọi trúng N lần (Mặc định N=3).
- **"Con cưng của RNG" (RNG's Favorite):** Bị gọi trúng N lần (Mặc định N=10).
- **"Định mệnh an bài" (Destiny):** Bị gọi trúng 2 lần liên tiếp trong cùng một buổi học.

**2. Chuỗi Danh hiệu "Tri thức" (Số lần trả lời đúng):**
- **"Phát súng đầu tiên" (First Blood):** Trả lời đúng câu hỏi đầu tiên của mình.
- **"Phong độ ổn định" (Consistent):** Trả lời đúng N lần tổng cộng (Mặc định N=5).
- **"Bách khoa toàn thư" (Encyclopedia):** Trả lời đúng N lần tổng cộng (Mặc định N=20).
- **"Chuỗi thăng hoa" (On Fire):** Trả lời đúng N lần *liên tiếp* (Mặc định N=3).
- **"Bách phát bách trúng" (Sharpshooter):** Trả lời đúng N lần *liên tiếp* (Mặc định N=10).

**3. Chuỗi Danh hiệu "Kiên cường" (Số lần trả lời sai - Khuyến khích không bỏ cuộc):**
- **"Vạn sự khởi đầu nan" (First Stumble):** Trả lời sai lần đầu tiên (Thông điệp: Sai lầm là để học hỏi).
- **"Không bao giờ bỏ cuộc" (Never Give Up):** Trả lời sai N lần tổng cộng (Mặc định N=5).
- **"Phượng hoàng tái sinh" (Phoenix):** Trả lời đúng ngay sau khi vừa trả lời sai ở câu trước đó.
- **"Pha cứu thua ngoạn mục" (Clutch Save):** Được bạn bè "cứu net" thành công khi mình trả lời sai.

**4. Chuỗi Danh hiệu "Đồng đội & Tốc độ":**
- **"Người hùng thầm lặng" (Unsung Hero):** "Cứu net" (trợ giúp) thành công cho bạn khác N lần (Mặc định N=1).
- **"Tia chớp" (The Flash):** Trả lời đúng và nhanh nhất lớp trong 1 câu hỏi (Kahoot style).

### Phân loại 2: Danh hiệu Giáo viên trao thủ công (Manual-awarded)
Dành cho những hành vi định tính mà hệ thống không thể tự đo lường được. Giáo viên có thể click vào tên học sinh để trao tặng.
- **"Nhà hùng biện" (Orator):** Có câu trả lời xuất sắc, thuyết trình hay hoặc đặt câu hỏi thông minh.
- **"Trái tim ấm áp" (Warm Heart):** Giúp đỡ bạn bè nhiệt tình ngoài giờ học hoặc trong các hoạt động nhóm.
- **"Ý tưởng đột phá" (Innovator):** Có cách giải bài độc đáo, sáng tạo.
- **"Tiến bộ vượt bậc" (Rising Star):** Có thái độ học tập thay đổi tích cực rõ rệt.

### Cài đặt Hệ thống Danh hiệu (Badge Customization)
Giáo viên có toàn quyền kiểm soát hệ thống danh hiệu thông qua bảng Cài đặt (Settings):
1. **Tùy chỉnh Điều kiện (Thresholds):** Giáo viên có thể thay đổi biến số `N` cho các danh hiệu tự động. 
   - *Ví dụ:* Giáo viên thấy lớp học quá giỏi, có thể tăng điều kiện "Chuỗi thăng hoa" từ 3 câu lên 5 câu trả lời đúng liên tiếp mới được nhận.
2. **Đổi tên Danh hiệu (Renaming):** Giáo viên có thể đổi tên danh hiệu cho phù hợp với môn học hoặc độ tuổi học sinh.
   - *Ví dụ:* Môn Hóa học có thể đổi "Bách khoa toàn thư" thành "Nhà giả kim", môn Lịch sử đổi thành "Sử gia".
3. **Bật/Tắt Danh hiệu (Toggle):** Nếu giáo viên cảm thấy danh hiệu "Trả lời sai N lần" không phù hợp với lớp mình, có thể tắt (disable) danh hiệu đó đi.

**Cơ chế hiển thị:**
- Mỗi danh hiệu đi kèm một Icon/Huy hiệu đẹp mắt.
- Học sinh được chọn 1 danh hiệu yêu thích nhất để "Trang bị" (Equip). Danh hiệu này sẽ hiển thị cạnh tên mình trên Bảng xếp hạng và trên màn hình máy chiếu khi được gọi.
