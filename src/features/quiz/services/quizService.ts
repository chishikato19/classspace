import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { Quiz, Folder } from '../../../types';

const getQuizzesRef = () => collection(db, 'quizzes');
const getFoldersRef = () => collection(db, 'folders');

// Helper function to remove undefined values from an object
const sanitizeData = (data: any) => {
  const sanitized = { ...data };
  Object.keys(sanitized).forEach(key => {
    if (sanitized[key] === undefined) {
      delete sanitized[key];
    }
  });
  return sanitized;
};

export const quizService = {
  // Tạo bộ câu hỏi mới
  createQuiz: async (quiz: Omit<Quiz, 'id'>): Promise<string> => {
    const docRef = await addDoc(getQuizzesRef(), sanitizeData(quiz));
    return docRef.id;
  },

  // Cập nhật bộ câu hỏi
  updateQuiz: async (quizId: string, quizData: Partial<Quiz>): Promise<void> => {
    const docRef = doc(db, 'quizzes', quizId);
    await updateDoc(docRef, sanitizeData(quizData));
  },

  // Xóa bộ câu hỏi
  deleteQuiz: async (quizId: string): Promise<void> => {
    const docRef = doc(db, 'quizzes', quizId);
    await deleteDoc(docRef);
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
  },

  // --- Folder Management ---
  createFolder: async (folder: Omit<Folder, 'id'>): Promise<string> => {
    const docRef = await addDoc(getFoldersRef(), sanitizeData(folder));
    return docRef.id;
  },

  updateFolder: async (folderId: string, folderData: Partial<Folder>): Promise<void> => {
    const docRef = doc(db, 'folders', folderId);
    await updateDoc(docRef, sanitizeData(folderData));
  },

  deleteFolder: async (folderId: string): Promise<void> => {
    const docRef = doc(db, 'folders', folderId);
    await deleteDoc(docRef);
  },

  getFoldersByTeacher: async (teacherId: string): Promise<Folder[]> => {
    try {
      const q = query(
        getFoldersRef(), 
        where('teacherId', '==', teacherId)
      );
      const snapshot = await getDocs(q);
      const results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Folder));
      return results.sort((a, b) => b.createdAt - a.createdAt);
    } catch (error: any) {
      console.error("Error fetching folders:", error);
      throw error;
    }
  }
};
