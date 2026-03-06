# PROJECT DIARY & ARCHITECTURE (Hệ sinh thái Quản lý & Trò chơi hóa Lớp học)

## 1. TỔNG QUAN DỰ ÁN (PROJECT OVERVIEW)
- **Mục tiêu:** Xây dựng một Web App phục vụ giáo dục, khởi đầu là tính năng thi trắc nghiệm trực tiếp (tương tự Quizizz/Kahoot) theo cơ chế "Student-paced" (Học sinh tự chủ tiến độ). Tương lai mở rộng thành hệ sinh thái quản lý lớp học (Gamification, Shop đổi quà, Random Picker, Chiếu Video chung).
- **Tech Stack:** React 19, Vite, Tailwind CSS, TypeScript, Firebase (Firestore, Auth).
- **Đối tượng người dùng:** 
  - `Admin`: Nhập liệu danh sách lớp, học sinh.
  - `Teacher`: Tạo đề thi, tổ chức phòng thi, quản lý công cụ lớp học.
  - `Student`: Tham gia thi (cá nhân/nhóm), tích lũy điểm đổi quà.

## 2. KIẾN TRÚC MÃ NGUỒN (ARCHITECTURE)
Dự án áp dụng mô hình **Feature-based Architecture** (Chia thư mục theo tính năng) kết hợp **Service Layer** (Tách biệt logic gọi Database và UI).

### Cấu trúc thư mục (Directory Structure):
```text
src/
├── components/         # UI Components dùng chung (Layout, SetupRequired...)
├── config/             # Cấu hình hệ thống (firebase.ts - Lazy Initialization)
├── features/           # CÁC TÍNH NĂNG CỐT LÕI
│   ├── admin/          # Quản lý Lớp học & Học sinh (AdminDashboard, adminService)
│   ├── auth/           # Đăng nhập (LoginPage)
│   ├── game/           # Logic thi đấu Real-time (Lobby, PlayerScreen, HostDashboard, gameService)
│   └── quiz/           # Soạn thảo đề thi (QuizDashboard, QuizEditor, quizService)
├── types/              # TypeScript Interfaces (User, Student, Quiz, GameSession, Player)
├── utils/              # Helper functions (cn.ts)
├── App.tsx             # React Router (Định tuyến chính)
└── main.tsx            # Entry point
```

## 3. CẤU TRÚC CƠ SỞ DỮ LIỆU (FIRESTORE SCHEMA)
- **`classes`**: `{ name: string, teacherId: string, createdAt: number }`
- **`students`**: `{ name: string, classId: string, wallet_points: number, createdAt: number }`
- **`quizzes`**: `{ title: string, description: string, teacherId: string, questions: Question[], createdAt: number }`
  - `Question`: `{ id, text, timeLimit, points, options: [{id, text, isCorrect}] }`
- **`sessions`**: `{ pin: string, quizId: string, hostId: string, status: 'WAITING'|'PLAYING'|'FINISHED', players: Player[], createdAt: number }`
  - `Player`: `{ id, name, studentIds: string[], score, streak, progress, answers: Record<questionId, AnswerData> }`

## 4. TIẾN ĐỘ THỰC HIỆN (CHANGELOG)

### ✅ Phase 1: Nền tảng & Khung giao diện (Đã hoàn thành)
1. **Setup Project:** Khởi tạo React + Vite + Tailwind + TypeScript.
2. **Routing:** Thiết lập `react-router-dom` cho các luồng Admin, Teacher, Student.
3. **Firebase Config:** Tạo `firebase.ts` với cơ chế *Lazy Initialization* (chỉ khởi tạo khi có biến môi trường) và trang `SetupRequired` để tránh crash app khi thiếu API Key.
4. **Feature - Admin:** Xây dựng `AdminDashboard` và `adminService` để tạo Lớp và thêm hàng loạt Học sinh (dùng `writeBatch`).
5. **Feature - Quiz:** Xây dựng `QuizEditor` (tạo câu hỏi, đáp án) và `QuizDashboard` (quản lý thư viện đề).
6. **Feature - Game Engine:** 
   - Xây dựng `gameService.ts` xử lý Real-time (tạo mã PIN, join phòng, lắng nghe thay đổi).
   - Sử dụng `runTransaction` khi nộp câu trả lời để đảm bảo tính toán điểm số (Score) và chuỗi đúng (Streak) chính xác khi có nhiều request đồng thời.
   - Xây dựng UI: `GameJoinPage` (Nhập PIN), `GameHostLobby` (Giáo viên chờ), `GamePlayerLobby` (Học sinh chờ), `GamePlayerScreen` (Học sinh làm bài), `GameHostDashboard` (Bảng xếp hạng Live).

### ✅ Phase 2: Kết nối dữ liệu thật & Xác thực (Đã hoàn thành)
1. **Cấu hình Firebase:** Đã cấu hình thông qua `set_up_firebase` và `firebase-applet-config.json`.
2. **Authentication:** Tích hợp Firebase Auth cho Admin/Teacher (Email/Password).
3. **Student Login Flow:** Cập nhật `GameJoinPage` -> Sau khi nhập PIN, học sinh không gõ tên thủ công mà sẽ chọn Lớp -> Chọn Tên từ danh sách lấy từ Firestore (Hỗ trợ chọn nhiều tên để tạo Nhóm).

### ✅ Phase 2.5: Hệ thống Avatar & Giao diện Game (Đã hoàn thành)
1. **Avatar Integration:**
   - Tích hợp `StudentAvatar` vào toàn bộ các màn hình Game: Lobby, Player Screen, Dashboard, Results.
   - Cập nhật `Player` interface để hỗ trợ `avatarConfig`.
   - Cập nhật `GameJoinPage` để tạo avatar mặc định hoặc sử dụng avatar của học sinh khi tham gia game.
2. **UI Improvements:**
   - Hiển thị avatar trên bảng xếp hạng (Leaderboard) và bục vinh quang (Podium).
   - Hiển thị avatar trong danh sách người chơi trả lời sai.

### ✅ Phase 2.6: Chế độ Kahoot (Teacher-paced) (Đã hoàn thành)
1. **Game Flow:**
   - Cập nhật `GameStatus` và `GameMode` types để hỗ trợ luồng giáo viên điều khiển.
   - Bổ sung các trạng thái: `STARTING`, `QUESTION`, `LEADERBOARD`.
2. **Teacher Controls:**
   - Giáo viên chọn chế độ "Teacher-paced" khi tạo phòng.
   - Giao diện Dashboard hiển thị câu hỏi, bộ đếm thời gian (Timer) và thống kê câu trả lời theo thời gian thực.
   - Giáo viên chủ động chuyển câu hỏi hoặc xem bảng xếp hạng.
   - Tự động chuyển sang bảng xếp hạng khi hết giờ.
3. **Student Experience:**
   - Học sinh đồng bộ câu hỏi với giáo viên.
   - Hiển thị màn hình chờ khi giáo viên chưa bắt đầu hoặc đang xem bảng xếp hạng.
   - Tắt tính năng xáo trộn câu hỏi trong chế độ này để đảm bảo tính đồng nhất.

### 🚀 Phase 3: Gamification & Mở rộng (Kế hoạch tương lai)
1. **Hệ thống phần thưởng (Rewards):** 
   - Viết logic cập nhật `wallet_points` cho học sinh sau khi kết thúc game.
   - Xây dựng tính năng "Shop" để học sinh dùng điểm đổi avatar, hiệu ứng, hoặc phần thưởng thực tế do giáo viên quy định.
2. **Công cụ lớp học (Classroom Tools):**
   - Tính năng "Vòng quay may mắn" (Random Student Picker) lấy dữ liệu từ danh sách lớp (✅ Đã hoàn thành).
   - Tính năng "Chiếu Video chung" (Youtube Sync Player) - Giáo viên lưu trữ và trình chiếu video YouTube trực tiếp (✅ Đã hoàn thành).
3. **Game Mode Mới: Đường Đua Tri Thức (Knowledge Race):**
   - **Concept:** Hai đội điều khiển xe đua trên màn hình ngang. Trả lời đúng để tiến về đích.
   - **Cơ chế:**
     - *Đồng bộ (Synchronized):* Cả 2 đội cùng trả lời 1 câu hỏi. Ai nhanh hơn được bonus khoảng cách.
     - *Hỗn loạn (Chaos Mode):* Màn hình chia đôi, mỗi đội có bộ câu hỏi riêng. Ai trả lời xong 10 câu trước là thắng.
   - **Tính năng:**
     - Hệ thống Nitro (Boost) khi trả lời đúng liên tiếp.
     - Chướng ngại vật (làm chậm/đứng yên) khi trả lời sai.
     - Hiệu ứng hình ảnh (khói, lửa, vấp ngã) vui nhộn.

### 📚 Phase 4: Bài tập về nhà (Homework Mode)
1. **Tính năng:**
   - Giáo viên giao bài tập với Deadline cụ thể.
   - Học sinh làm bài theo tốc độ cá nhân (Student-paced) bất cứ lúc nào.
   - Báo cáo kết quả không đồng bộ.
2. **Kiểm soát gian lận:**
   - Tùy chọn hiển thị đáp án (Ngay lập tức / Sau khi nộp / Không hiện).
   - Giới hạn số lần làm bài (Attempts).
   - Yêu cầu Mật khẩu cá nhân (Passcode) để tránh mạo danh.
3. **Cập nhật Schema:**
   - `GameSession`: Thêm `mode` ('LIVE' | 'HOMEWORK'), `homeworkConfig` (deadline, classId).
   - `Student`: Thêm `passcode`.

## 5. HƯỚNG DẪN CHO AI (INSTRUCTIONS FOR FUTURE AI)
- Khi được yêu cầu thêm tính năng mới, hãy tuân thủ **Feature-based Architecture**. Tạo thư mục mới trong `src/features/` nếu tính năng đó đủ lớn (VD: `features/shop`, `features/tools`).
- Luôn sử dụng `Tailwind CSS` cho styling.
- Khi tương tác với Firestore, hãy viết các hàm logic trong file `*.service.ts` tương ứng, không gọi trực tiếp Firebase API từ trong UI Components.
- Luôn kiểm tra `isFirebaseConfigured` trước khi thực hiện các thao tác liên quan đến Database.

## 6. THIẾT KẾ HỆ THỐNG CỬA HÀNG (SHOP SYSTEM DESIGN)
### A. Hệ thống Tiền tệ (Currency)
- **EXP (Điểm kinh nghiệm):** Dùng để xếp hạng, lên cấp. Không bị trừ.
- **Coin (Xu):** Dùng để mua vật phẩm. Tỉ lệ quy đổi từ EXP hoặc được giáo viên thưởng nóng.

### B. Vật phẩm (Items)
1. **Avatar (Generative Avatars):**
   - Sử dụng công nghệ **DiceBear API** để tạo avatar tự động từ tên học sinh (Seed).
   - Không cần upload ảnh, tiết kiệm chi phí lưu trữ và băng thông.
   - **Phân loại Style (bán trong Shop):**
     - *Default:* Initials (Chữ cái đầu), Bottts (Robot).
     - *Unlockable (Level):* Fun Emoji, Icons.
     - *Premium (Coins):* Adventurer (Phiêu lưu), Avataaars (Hoạt hình), Lorelei (Nghệ thuật).
2. **Khung Avatar (Frames):** Viền trang trí (Lửa, Băng, v.v.).
3. **Hiệu ứng xuất hiện (Entrance Effects):** Hiệu ứng đặc biệt khi được gọi tên trong Random Selector.

### C. Danh hiệu (Titles)
- **Thành tích (Achievements):** Tự động mở khóa (VD: "Cú Đêm", "Chăm Chỉ").
- **Phong tặng:** Giáo viên trao tặng thủ công.

### D. Cấu trúc dữ liệu Avatar (New Schema)
- **`students` collection:**
  ```typescript
  avatarConfig: {
    style: string;       // VD: 'adventurer', 'bottts'
    seed: string;        // VD: 'student-123'
    backgroundColor?: string;
  }
  inventory: {
    unlockedStyles: string[]; // VD: ['initials', 'bottts', 'adventurer']
  }
  ```
- **`shop_items` collection:**
  ```typescript
  {
    id: string,
    type: 'avatar_style' | 'frame' | 'effect',
    name: string,
    price: number,
    config: { style: string }, // Cấu hình áp dụng khi mua
    requiredLevel: number
  }
  ```

### E. Lộ trình phát triển (Roadmap)
1. **Database:** Thêm `coins`, `avatarConfig`, `inventory` vào `students`. Tạo bảng `shop_items`.
2. **UI:** Xây dựng giao diện Shop, Inventory, Profile.
3. **Integration:** Tích hợp hiển thị Avatar/Title vào Leaderboard và Random Selector (✅ Đã hoàn thành).
