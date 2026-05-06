import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, getDocsFromCache, query, updateDoc, where } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../../config/firebase';
import { Quiz, Folder } from '../../../types';

const getQuizzesRef = () => collection(db, 'quizzes');
const getFoldersRef = () => collection(db, 'folders');

// In-memory cache for quizzes to reduce Firestore reads
const quizCache = new Map<string, Quiz>();
const teacherQuizzesCache = new Map<string, { data: Quiz[], timestamp: number }>();
const teacherFoldersCache = new Map<string, { data: Folder[], timestamp: number }>();

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache

// Helper function to remove undefined values recursively
const removeUndefined = (obj: any): any => {
  if (Array.isArray(obj)) {
    return obj.map(v => (v === undefined ? null : removeUndefined(v)));
  } else if (obj !== null && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj)
        .filter(([_, v]) => v !== undefined)
        .map(([k, v]) => [k, removeUndefined(v)])
    );
  }
  return obj;
};

export const quizService = {
  // Tạo bộ câu hỏi mới
  createQuiz: async (quiz: Omit<Quiz, 'id'>): Promise<string> => {
    try {
      const docRef = await addDoc(getQuizzesRef(), removeUndefined(quiz));
      const newQuiz = { id: docRef.id, ...quiz } as Quiz;
      quizCache.set(docRef.id, newQuiz);
      teacherQuizzesCache.delete(quiz.teacherId); // Invalidate list cache
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'quizzes');
      return "";
    }
  },

  // Cập nhật bộ câu hỏi
  updateQuiz: async (quizId: string, quizData: Partial<Quiz>): Promise<void> => {
    try {
      const docRef = doc(db, 'quizzes', quizId);
      await updateDoc(docRef, removeUndefined(quizData));
      
      // Update cache if it exists
      if (quizCache.has(quizId)) {
        const current = quizCache.get(quizId)!;
        const updated = { ...current, ...quizData };
        quizCache.set(quizId, updated);
        teacherQuizzesCache.delete(updated.teacherId); // Invalidate list cache
      } else {
        // If not in cache, we don't know the teacherId easily without a fetch, 
        // but we can clear all list caches to be safe or just clear the specific one if we had it.
        // For simplicity, let's just clear the cache if we don't have the teacherId.
        teacherQuizzesCache.clear();
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `quizzes/${quizId}`);
    }
  },

  // Xóa bộ câu hỏi
  deleteQuiz: async (quizId: string): Promise<void> => {
    try {
      const docRef = doc(db, 'quizzes', quizId);
      const quiz = quizCache.get(quizId);
      await deleteDoc(docRef);
      quizCache.delete(quizId);
      if (quiz) {
        teacherQuizzesCache.delete(quiz.teacherId);
      } else {
        teacherQuizzesCache.clear();
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `quizzes/${quizId}`);
    }
  },

  // Lấy danh sách quiz của giáo viên
  getQuizzesByTeacher: async (teacherId: string): Promise<Quiz[]> => {
    const cached = teacherQuizzesCache.get(teacherId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }

    try {
      // Chỉ dùng where() để tránh lỗi yêu cầu Composite Index của Firebase
      const q = query(
        getQuizzesRef(), 
        where('teacherId', '==', teacherId)
      );
      
      let snapshot;
      try {
        snapshot = await getDocs(q);
      } catch (err: any) {
        // Fallback to cache if quota exceeded or offline
        if (err.message?.includes('Quota exceeded') || err.code === 'unavailable') {
          console.warn(`[QuizService] Falling back to cache for quizzes due to: ${err.message}`);
          snapshot = await getDocsFromCache(q);
        } else {
          throw err;
        }
      }

      const results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Quiz));
      
      // Sắp xếp trên client (mới nhất lên đầu)
      const sorted = results.sort((a, b) => b.createdAt - a.createdAt);
      teacherQuizzesCache.set(teacherId, { data: sorted, timestamp: Date.now() });
      return sorted;
    } catch (error: any) {
      handleFirestoreError(error, OperationType.LIST, "quizzes");
      return [];
    }
  },

  // Lấy chi tiết 1 quiz
  getQuizById: async (quizId: string): Promise<Quiz | null> => {
    // Return from cache if available
    if (quizCache.has(quizId)) {
      return quizCache.get(quizId)!;
    }

    try {
      const docRef = doc(db, 'quizzes', quizId);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        const quiz = { id: snapshot.id, ...snapshot.data() } as Quiz;
        quizCache.set(quizId, quiz);
        return quiz;
      }
      return null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `quizzes/${quizId}`);
      return null;
    }
  },

  // --- Folder Management ---
  createFolder: async (folder: Omit<Folder, 'id'>): Promise<string> => {
    try {
      const docRef = await addDoc(getFoldersRef(), removeUndefined(folder));
      teacherFoldersCache.delete(folder.teacherId);
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'folders');
      return "";
    }
  },

  updateFolder: async (folderId: string, folderData: Partial<Folder>): Promise<void> => {
    try {
      const docRef = doc(db, 'folders', folderId);
      await updateDoc(docRef, removeUndefined(folderData));
      teacherFoldersCache.clear(); // Simple invalidation
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `folders/${folderId}`);
    }
  },

  deleteFolder: async (folderId: string): Promise<void> => {
    try {
      const docRef = doc(db, 'folders', folderId);
      await deleteDoc(docRef);
      teacherFoldersCache.clear();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `folders/${folderId}`);
    }
  },

  getFoldersByTeacher: async (teacherId: string): Promise<Folder[]> => {
    const cached = teacherFoldersCache.get(teacherId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }

    try {
      const q = query(
        getFoldersRef(), 
        where('teacherId', '==', teacherId)
      );
      
      let snapshot;
      try {
        snapshot = await getDocs(q);
      } catch (err: any) {
        // Fallback to cache if quota exceeded or offline
        if (err.message?.includes('Quota exceeded') || err.code === 'unavailable') {
          console.warn(`[QuizService] Falling back to cache for folders due to: ${err.message}`);
          snapshot = await getDocsFromCache(q);
        } else {
          throw err;
        }
      }

      const results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Folder));
      const sorted = results.sort((a, b) => b.createdAt - a.createdAt);
      teacherFoldersCache.set(teacherId, { data: sorted, timestamp: Date.now() });
      return sorted;
    } catch (error: any) {
      handleFirestoreError(error, OperationType.LIST, "folders");
      return [];
    }
  }
};
