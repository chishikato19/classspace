# KẾ HOẠCH PHÁT TRIỂN CHẾ ĐỘ CHƠI "MÊ CUNG TRI THỨC" (MAZE ESCAPE)

*Tài liệu này ghi chú lại toàn bộ ý tưởng thiết kế, luật chơi và hướng giải quyết kỹ thuật cho chế độ chơi Mê cung để chuẩn bị cho việc phát triển trong tương lai.*

## 1. Tổng quan (Overview)
"Mê cung tri thức" là một chế độ chơi kết hợp giữa tư duy không gian và trả lời câu hỏi trắc nghiệm. Học sinh sẽ điều khiển nhân vật tìm đường thoát khỏi một mê cung. Trên đường đi sẽ có các "Cánh cửa" chặn lại, yêu cầu học sinh phải trả lời đúng câu hỏi để đi tiếp. Ai (hoặc đội nào) tìm được đường đến đích (Exit) đầu tiên sẽ chiến thắng.

## 2. Các chế độ chơi (Game Modes)
Chế độ này hỗ trợ sự linh hoạt cao, chia làm 2 hình thức chính:

### A. Chế độ 2 Đội (Chơi chung máy / Bảng tương tác)
- **Mô tả:** Màn hình chia đôi (Split-screen). Đội Xanh bên trái, Đội Đỏ bên phải.
- **Cách điều khiển:** Dùng chung bàn phím (Đội 1 dùng `W A S D`, Đội 2 dùng phím `Mũi tên`) hoặc điều khiển bằng cảm ứng trực tiếp trên bảng tương tác.
- **Thiết kế mê cung:** Hai đội sẽ thi đấu trên 2 mê cung riêng biệt nhưng có cấu trúc giống hệt nhau (để công bằng). Việc tách riêng giúp tránh tình trạng đội đi sau "nhìn lén" và copy đường đi của đội đi trước.

### B. Chế độ Cá nhân (Mỗi người một máy)
- **Mô tả:** Mỗi học sinh tự điều khiển nhân vật trên điện thoại hoặc máy tính cá nhân.
- **Màn hình Giáo viên (Host):** Hiển thị toàn cảnh mê cung (không bị sương mù). Các chấm màu (đại diện cho học sinh) sẽ di chuyển theo thời gian thực, tạo cảm giác như một cuộc đua marathon.

## 3. Trải nghiệm hình ảnh (Visuals & UI)
Cung cấp tùy chọn (Settings) cho giáo viên trước khi tạo phòng:
- **Bật "Sương mù" (Fog of War):** Học sinh chỉ nhìn thấy các ô xung quanh mình trong bán kính giới hạn (2-3 ô). Những khu vực chưa đi tới bị bóng tối che khuất. Tăng độ khó, buộc học sinh phải ghi nhớ đường đi nếu gặp ngõ cụt.
- **Tắt "Sương mù":** Hiển thị toàn bộ mê cung. Phù hợp cho học sinh nhỏ tuổi hoặc khi mê cung có cấu trúc quá phức tạp.

## 4. Xử lý logic Đúng/Sai (Tùy chọn hình phạt)
Khi học sinh chạm vào một cánh cửa và trả lời câu hỏi, nếu trả lời **SAI**, giáo viên có thể cài đặt 1 trong 2 hình phạt sau:

- **Tùy chọn 1: "Đường cùng" (Buộc đổi đường khác)**
  - Cánh cửa đó sẽ bị khóa vĩnh viễn (hiện dấu X đỏ).
  - Học sinh bắt buộc phải quay lại ngã rẽ trước đó để tìm con đường khác.
  - *Yêu cầu kỹ thuật:* Thuật toán tạo mê cung phải đảm bảo luôn có ít nhất 2-3 con đường khác nhau để đến đích.

- **Tùy chọn 2: "Thử thách lại" (Phạt thời gian)**
  - Cánh cửa không bị khóa, nhưng học sinh bị phạt đứng im (Cooldown) trong 5-10 giây.
  - Sau khi hết thời gian phạt, một câu hỏi *khác* sẽ hiện ra tại chính cánh cửa đó để học sinh thử lại.

## 5. Tối ưu hóa Database (Firebase Optimization) - RẤT QUAN TRỌNG
Để tránh việc cạn kiệt Quota đọc/ghi của Firebase khi hàng chục học sinh liên tục di chuyển:

- **KHÔNG đồng bộ từng bước di chuyển:** Không ghi dữ liệu lên Firebase mỗi khi học sinh bấm nút lên/xuống/trái/phải. Việc di chuyển trong các ô trống được xử lý hoàn toàn ở Local (máy khách).
- **CHỈ đồng bộ khi có sự kiện lớn:** Chỉ ghi lên Firebase khi học sinh:
  1. Trả lời xong một câu hỏi (mở khóa thành công một cánh cửa).
  2. Bị khóa một cánh cửa (nếu chọn Tùy chọn 1 ở phần 4).
  3. Chạm đến đích (Win).
- **Hiển thị tiến độ của người khác:** Khi Firebase nhận được tin "Học sinh A vừa mở cửa số 3", máy của các học sinh khác (và máy Host) sẽ tự động chạy hiệu ứng (animation) cho nhân vật của A lướt nhanh đến vị trí cửa số 3.
- *Kết quả:* Số lượt đọc/ghi Firebase sẽ chỉ bằng đúng số lượng câu hỏi mà học sinh trả lời, rẻ và tối ưu như chế độ trắc nghiệm bình thường.

## 6. Yêu cầu Thuật toán (Thuật toán tạo Mê cung)
- Cần viết một thuật toán sinh mê cung ngẫu nhiên (Random Maze Generator) dạng Grid (Lưới).
- Có thể sử dụng thuật toán *Depth-First Search (DFS)* kết hợp đục thêm tường để tạo ra các mê cung có nhiều đường đi (Multiple solutions), phục vụ cho luật chơi "Khóa đường khi trả lời sai".
- Cần có hàm ánh xạ (Mapping) để rải ngẫu nhiên các câu hỏi từ bộ Quiz vào các vị trí "Cửa" trên mê cung. Đảm bảo số lượng câu hỏi đủ nhiều để học sinh không bị cạn câu hỏi giữa chừng.
