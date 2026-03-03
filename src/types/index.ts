export type Role = 'admin' | 'teacher' | 'student';

export interface User {
  uid: string;
  email: string;
  role: Role;
  displayName?: string;
}

export interface Student {
  id: string;
  name: string;
  classId: string;
  wallet_points: number; // Điểm tích lũy đổi quà
}

export interface ClassGroup {
  id: string;
  name: string; // Tên lớp, ví dụ: "12A1"
  teacherId: string; // ID giáo viên quản lý (nếu có)
}

export interface Question {
  id: string;
  text: string;
  options: {
    id: string;
    text: string;
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
  questions: Question[];
  createdAt: number;
}

export type GameStatus = 'WAITING' | 'PLAYING' | 'FINISHED';

export interface GameSettings {
  shuffleQuestions: boolean;
  shuffleAnswers: boolean;
  equalPoints: boolean;
  timeBasedPoints: boolean;
  streakBonus: boolean;
}

export interface GameSession {
  id: string;
  pin: string; // Mã PIN 6 số
  quizId: string;
  hostId: string; // ID giáo viên tạo phòng
  status: GameStatus;
  createdAt: number;
  currentQuestionIndex: number; // Dùng cho chế độ Teacher-paced (nếu cần)
  settings: GameSettings;
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
}
