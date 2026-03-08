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
  order?: number;
}

export const classService = {
  getAllClasses: async (): Promise<ClassData[]> => {
    const snapshot = await getDocs(collection(db, 'classes'));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClassData));
  },

  getClassesByTeacher: async (teacherId: string): Promise<ClassData[]> => {
    // Fetch classes for the specific teacher
    const q1 = query(collection(db, 'classes'), where('teacherId', '==', teacherId));
    const snapshot1 = await getDocs(q1);
    const classes1 = snapshot1.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClassData));

    // Fetch classes created with the legacy 'admin' teacherId
    const q2 = query(collection(db, 'classes'), where('teacherId', '==', 'admin'));
    const snapshot2 = await getDocs(q2);
    const classes2 = snapshot2.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClassData));

    // Combine and remove duplicates
    const allClasses = [...classes1, ...classes2];
    const uniqueClasses = Array.from(new Map(allClasses.map(c => [c.id, c])).values());
    
    return uniqueClasses;
  },

  getStudentsByClass: async (classId: string): Promise<StudentData[]> => {
    const q = query(collection(db, 'students'), where('classId', '==', classId));
    const snapshot = await getDocs(q);
    const students = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StudentData));
    return students.sort((a, b) => {
      if (a.order !== undefined && b.order !== undefined) {
        return a.order - b.order;
      }
      return a.name.localeCompare(b.name);
    });
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
