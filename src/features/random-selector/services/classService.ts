import { collection, getDocs, query, where, doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { AvatarConfig } from '../../../types';

export interface ClassData {
  id: string;
  name: string;
  teacherId: string;
}

export interface StudentData {
  id: string;
  name: string;
  classId: string;
  wallet_points?: number;
  avatarConfig?: AvatarConfig;
}

export const classService = {
  getAllClasses: async (): Promise<ClassData[]> => {
    const snapshot = await getDocs(collection(db, 'classes'));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClassData));
  },

  getClassesByTeacher: async (teacherId: string): Promise<ClassData[]> => {
    const q = query(collection(db, 'classes'), where('teacherId', '==', teacherId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClassData));
  },

  getStudentsByClass: async (classId: string): Promise<StudentData[]> => {
    const q = query(collection(db, 'students'), where('classId', '==', classId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StudentData));
  },

  updateStudentPoints: async (studentId: string, points: number): Promise<void> => {
    // Since we might be using manual input students (id starts with 'manual-'), we can't update Firestore for them.
    if (studentId.startsWith('manual-')) {
      console.log(`Updated manual student ${studentId} points by ${points}`);
      return;
    }
    
    // For real students, update Firestore
    try {
      const studentRef = doc(db, 'students', studentId);
      await updateDoc(studentRef, { wallet_points: increment(points) });
      console.log(`Updated student ${studentId} points by ${points}`);
    } catch (error) {
      console.error(`Error updating points for student ${studentId}:`, error);
    }
  }
};
