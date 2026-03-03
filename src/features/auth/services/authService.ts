import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth } from '../../../config/firebase';

export const authService = {
  login: async (email: string, password: string) => {
    if (!auth) throw new Error("Firebase Auth is not initialized");
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  },

  register: async (email: string, password: string) => {
    if (!auth) throw new Error("Firebase Auth is not initialized");
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  },

  logout: async () => {
    if (!auth) return;
    await signOut(auth);
  }
};
