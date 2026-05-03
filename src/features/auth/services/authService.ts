import { signInWithPopup, GoogleAuthProvider, signOut, signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../../config/firebase';

const googleProvider = new GoogleAuthProvider();

export const authService = {
  loginWithGoogle: async () => {
    if (!auth) throw new Error("Firebase Auth is not initialized");
    const userCredential = await signInWithPopup(auth, googleProvider);
    return userCredential.user;
  },

  loginWithEmail: async (email: string, pass: string) => {
    if (!auth) throw new Error("Firebase Auth is not initialized");
    const userCredential = await signInWithEmailAndPassword(auth, email, pass);
    return userCredential.user;
  },

  logout: async () => {
    if (!auth) return;
    await signOut(auth);
  },

  getCurrentUser: () => {
    return auth?.currentUser;
  }
};
