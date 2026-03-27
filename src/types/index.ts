export type Role = 'admin' | 'teacher' | 'student';

export interface User {
  uid: string;
  email: string;
  role: Role;
  displayName?: string;
}

export interface AvatarConfig {
  style: string;
  seed: string;
  backgroundColor?: string;
}

export interface Inventory {
  unlockedStyles: string[];
}

export interface ShopItem {
  id: string;
  type: 'avatar_style' | 'frame' | 'effect';
  name: string;
  price: number;
  config: { style: string };
  requiredLevel: number;
  imageUrl?: string;
}

export interface StudentGroup {
  id: string;
  name: string;
  classId: string;
  studentIds: string[];
  points: number;
  teacherId: string;
  createdAt: number;
}

export interface Student {
  id: string;
  name: string;
  classId: string;
  wallet_points?: number; // Điểm tích lũy đổi quà
  avatarConfig?: AvatarConfig;
  inventory?: Inventory;
  passcode?: string; // Mật khẩu cá nhân để chống gian lận
  order?: number; // Thứ tự sắp xếp
}

export interface ClassGroup {
  id: string;
  name: string; // Tên lớp, ví dụ: "12A1"
  teacherId: string; // ID giáo viên quản lý (nếu có)
}

export interface Folder {
  id: string;
  name: string;
  teacherId: string;
  createdAt: number;
}

export type QuestionType = 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER' | 'SURVEY';

export interface Question {
  id: string;
  type: QuestionType;
  text: string;
  imageUrl?: string;
  options: {
    id: string;
    text: string;
    imageUrl?: string;
    isCorrect: boolean;
  }[];
  timeLimit: number; // giây
  points: number;
}

export interface Quiz {
  id: string;
  title: string;
  description?: string;
  teacherId: string;
  folderId?: string;
  questions: Question[];
  createdAt: number;
}

export type GameStatus = 'WAITING' | 'STARTING' | 'QUESTION' | 'LEADERBOARD' | 'PLAYING' | 'FINISHED' | 'EXPIRED';
export type GameMode = 'STUDENT_PACED' | 'TEACHER_PACED' | 'HOMEWORK' | 'BATTLE' | 'PLICKERS' | 'ORAL_QUIZ';

export interface GameSettings {
  shuffleQuestions: boolean;
  shuffleAnswers: boolean;
  equalPoints: boolean;
  timeBasedPoints: boolean;
  streakBonus: boolean;
  // Anti-cheating & Homework settings
  showCorrectAnswers: 'IMMEDIATELY' | 'AFTER_GAME' | 'NEVER';
  showScore: boolean;
  maxAttempts: number; // 0 = unlimited
  requirePasscode: boolean;
  allowRetry: boolean; // Cho phép làm lại ngay sau khi sai (chế độ luyện tập)
  forceTimeLimit?: number; // Override all questions time limit (0 = unlimited, null = use quiz default)
  redoWrongQuestions: boolean; // Must redo incorrect questions (no points)
  passingPercentage?: number; // Yêu cầu phần trăm làm đúng
  saveDetailedAnswers?: boolean; // Nếu false, chỉ lưu score, progress, streak, finished. Không lưu object answers.
  ecoMode?: boolean; // Chế độ tiết kiệm dữ liệu (gộp lượt ghi Firebase)
  superEcoMode?: boolean; // Chế độ siêu tiết kiệm (Tải 1 lần, nộp 1 lần, offline)
  persistSession?: boolean; // Không cần nhập lại tên khi quay lại
  // Battle Mode settings
  pacing?: 'STUDENT' | 'TEACHER'; // Tốc độ (Học sinh tự làm) hoặc Đồng loạt (Giáo viên điều khiển)
  reviveCost?: number; // Điểm phí để hồi sinh
  effectDuration?: number; // Thời gian tác dụng của vật phẩm (giây)
  // Oral Quiz settings
  showQuestionBeforeSelection?: boolean;
  randomMethod?: string;
  // Eco Mode settings
  jsonDeliveryMode?: boolean; // Chế độ phân phối JSON (Tải trực tiếp hay qua server)
}

export interface HomeworkConfig {
  deadline: number; // Timestamp
  classId?: string; // Nếu null -> Open mode (ai cũng vào được)
}

export interface GameSession {
  id: string;
  pin: string; // Mã PIN 6 số
  quizId: string;
  quizJsonUrl?: string; // URL file JSON chứa toàn bộ câu hỏi (cho Eco Mode)
  title?: string; // Tên phiên làm việc (VD: Lớp 12A1 - Kiểm tra 15p)
  hostId: string; // ID giáo viên tạo phòng
  status: GameStatus;
  mode: GameMode;
  createdAt: number;
  currentQuestionIndex: number; // Dùng cho chế độ Teacher-paced (nếu cần)
  questionStartTime?: number; // Thời điểm bắt đầu câu hỏi (timestamp)
  settings: GameSettings;
  homeworkConfig?: HomeworkConfig;
  nameInputType?: 'MANUAL' | 'CLASS_LIST';
  selectedClassId?: string;
  isGroupPlay?: boolean;
  players?: Player[]; // Danh sách người chơi
}

export interface Player {
  id: string; // ID session của người chơi (socket ID hoặc random ID)
  name: string; // Tên hiển thị (Tên HS hoặc Tên Nhóm)
  studentIds: string[]; // Danh sách ID học sinh trong nhóm này (để cộng điểm sau này)
  score: number;
  streak: number; // Chuỗi trả lời đúng liên tiếp
  progress: number; // Số câu đã hoàn thành
  finished: boolean; // Đã hoàn thành bài thi chưa
  answers: Record<string, { // Lưu lịch sử trả lời: questionId -> answer info
    optionId: string;
    isCorrect: boolean;
    timeTaken: number;
    pointsAwarded: number;
  }>;
  avatarConfig?: AvatarConfig;
  cardNumber?: string; // Số thứ tự thẻ Plickers
  // Battle Mode Specifics
  hp?: number;
  maxHp?: number;
  items?: string[];
  statusEffects?: {
    type: 'FROZEN' | 'BLINDED' | 'CONFUSED' | 'PARALYZED' | 'POISONED';
    expiresAt: number; // timestamp
    sourceId?: string; // who attacked
  }[];
}

export type PointEventType = 'INDIVIDUAL_POINT' | 'GROUP_POINT' | 'QUIZ_RANK' | 'SPEED_ARENA' | 'QUIZ_SCORE';

export interface PointEvent {
  id: string;
  type: PointEventType;
  targetId: string; // studentId or groupId depending on type
  points: number;
  reason?: string;
  timestamp: number;
}

export interface ClassSession {
  id: string;
  classId: string;
  teacherId: string;
  startTime: number;
  endTime?: number;
  status: 'ACTIVE' | 'COMPLETED';
  events: PointEvent[];
}
