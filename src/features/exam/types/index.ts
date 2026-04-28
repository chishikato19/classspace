export interface ExamQuestion {
  id: string;
  text: string;
  imageUrl?: string;
  points: number;
  options: string[];
  // Obfuscated index of the correct option (e.g. atob/btoa or simple XOR)
  obfuscatedAnswer?: string; 
}

export interface Exam {
  id: string;
  title: string;
  timeLimitMinutes: number;
  questions: ExamQuestion[];
  allowStudentInputName: boolean; // if false, they must pick from allowedStudentNames
  allowedStudentNames?: string[];
  requireClassInput?: boolean; 
  status: 'published' | 'closed';
  teacherId: string;
  createdAt: number;
}

export interface ExamAttempt {
  id: string;
  examId: string;
  studentName: string;
  studentClass?: string;
  startTime: number;
  endTime?: number;
  submissions: Record<string, number>; // questionId -> selected option index
  score: number;
  totalCorrect: number;
  tabSwitchCount: number;
  status: 'in-progress' | 'submitted';
}
