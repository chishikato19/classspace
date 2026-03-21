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
