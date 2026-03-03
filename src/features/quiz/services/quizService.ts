import { addDoc, collection, doc, getDoc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { Quiz } from '../../../types';

const getQuizzesRef = () => collection(db, 'quizzes');

export const quizService = {
  // Tạo bộ câu hỏi mới
  createQuiz: async (quiz: Omit<Quiz, 'id'>): Promise<string> => {
    const docRef = await addDoc(getQuizzesRef(), quiz);
    return docRef.id;
  },

  // Cập nhật bộ câu hỏi
  updateQuiz: async (quizId: string, quizData: Partial<Quiz>): Promise<void> => {
    const docRef = doc(db, 'quizzes', quizId);
    await updateDoc(docRef, quizData);
  },

  // Lấy danh sách quiz của giáo viên
  getQuizzesByTeacher: async (teacherId: string): Promise<Quiz[]> => {
    try {
      // Chỉ dùng where() để tránh lỗi yêu cầu Composite Index của Firebase
      const q = query(
        getQuizzesRef(), 
        where('teacherId', '==', teacherId)
      );
      const snapshot = await getDocs(q);
      const results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Quiz));
      
      // Sắp xếp trên client (mới nhất lên đầu)
      return results.sort((a, b) => b.createdAt - a.createdAt);
    } catch (error: any) {
      console.error("Error fetching quizzes:", error);
      throw error;
    }
  },

  // Lấy chi tiết 1 quiz
  getQuizById: async (quizId: string): Promise<Quiz | null> => {
    const docRef = doc(db, 'quizzes', quizId);
    const snapshot = await getDoc(docRef);
    if (snapshot.exists()) {
      return { id: snapshot.id, ...snapshot.data() } as Quiz;
    }
    return null;
  }
};
