import { collection, getDocs, query, where, doc, updateDoc, increment, addDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { StudentGroup } from '../../../types';

export const groupService = {
  getGroupsByClass: async (classId: string): Promise<StudentGroup[]> => {
    const q = query(collection(db, 'groups'), where('classId', '==', classId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StudentGroup));
  },

  createGroup: async (group: Omit<StudentGroup, 'id'>): Promise<string> => {
    const docRef = await addDoc(collection(db, 'groups'), group);
    return docRef.id;
  },

  updateGroup: async (groupId: string, data: Partial<StudentGroup>): Promise<void> => {
    const groupRef = doc(db, 'groups', groupId);
    await updateDoc(groupRef, data);
  },

  deleteGroup: async (groupId: string): Promise<void> => {
    const groupRef = doc(db, 'groups', groupId);
    await deleteDoc(groupRef);
  },

  awardPoints: async (groupId: string, points: number, studentIds: string[]): Promise<void> => {
    const batch = writeBatch(db);
    
    // Update group points
    const groupRef = doc(db, 'groups', groupId);
    batch.update(groupRef, { points: increment(points) });
    
    // Update individual student points for ALL members
    studentIds.forEach(studentId => {
      const studentRef = doc(db, 'students', studentId);
      batch.update(studentRef, { wallet_points: increment(points) });
    });
    
    await batch.commit();
  },

  awardIndividualAndGroupPoints: async (studentId: string, groupId: string, points: number): Promise<void> => {
    const batch = writeBatch(db);
    
    // Update student points
    const studentRef = doc(db, 'students', studentId);
    batch.update(studentRef, { wallet_points: increment(points) });
    
    // Update group points
    const groupRef = doc(db, 'groups', groupId);
    batch.update(groupRef, { points: increment(points) });
    
    await batch.commit();
  },

  deleteAllGroupsInClass: async (classId: string): Promise<void> => {
    const q = query(collection(db, 'groups'), where('classId', '==', classId));
    const snapshot = await getDocs(q);
    const batch = writeBatch(db);
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    await batch.commit();
  }
};
