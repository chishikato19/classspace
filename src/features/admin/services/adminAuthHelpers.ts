import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut, deleteUser, signInWithEmailAndPassword, updatePassword } from 'firebase/auth';
import firebaseConfig from '../../../../firebase-applet-config.json';

// Initialize a secondary app instance for creating users without logging out the admin
const secondaryApp = initializeApp(firebaseConfig, "Secondary");
const secondaryAuth = getAuth(secondaryApp);

export const adminAuthHelpers = {
  createTeacherAccount: async (email: string, pass: string) => {
    // Create the user on secondary instance
    const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, pass);
    const newUid = userCredential.user.uid;
    // Log out from secondary app immediately
    await signOut(secondaryAuth);
    return newUid;
  },
  
  changeTeacherPassword: async (email: string, newPass: string) => {
     // Because we have no back-end to manually change password, an admin can't simply change someone else's password via Admin SDK.
     // On client side: we'd need them to sign in or send a password reset email.
     // For a true password change we can't do it without existing password unless we do a workaround.
     // But we CAN send a reset email from the main auth.
     throw new Error("Vui lòng sử dụng tính năng gửi email đặt lại mật khẩu, hoặc yêu cầu giáo viên đó tự đặt lại.");
  }
};
