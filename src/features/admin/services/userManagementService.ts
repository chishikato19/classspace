import { collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { User } from '../../../types';

export const userManagementService = {
  getProfile: async (uid: string, email: string | null): Promise<User | null> => {
    // Hardcode the super admin
    if (email === 'chishikato19@gmail.com') {
      return {
        uid,
        email,
        role: 'admin',
        permissions: 'all',
        status: 'active'
      };
    }
    
    // Check old admin logic
    if (email?.includes('admin')) {
      return {
        uid,
        email,
        role: 'admin',
        permissions: 'all',
        status: 'active'
      };
    }

    const docRef = doc(db, 'users', uid);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return { id: snap.id, uid: snap.id, ...(snap.data() as Omit<User, 'id'>) };
    }
    
    return null; // Normal user without a record yet
  },

  getAllUsers: async (): Promise<User[]> => {
    const q = collection(db, 'users');
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, uid: d.id, ...(d.data() as Omit<User, 'id'>) }));
  },

  createUserRecord: async (uid: string, email: string, permissions: 'all' | 'exams_only') => {
    await setDoc(doc(db, 'users', uid), {
      email,
      role: 'teacher',
      permissions,
      status: 'active',
      createdAt: Date.now()
    });
  },

  updateUserStatus: async (uid: string, status: 'active' | 'suspended') => {
    await updateDoc(doc(db, 'users', uid), { status });
  },

  updateUserPermissions: async (uid: string, permissions: 'all' | 'exams_only') => {
    await updateDoc(doc(db, 'users', uid), { permissions });
  },

  deleteUserRecord: async (uid: string) => {
    await deleteDoc(doc(db, 'users', uid));
  }
};
