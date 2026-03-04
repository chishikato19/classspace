import { collection, getDocs, query, where } from 'firebase/firestore';
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
  }
};
