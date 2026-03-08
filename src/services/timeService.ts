import { doc, serverTimestamp, setDoc, getDoc, collection, deleteDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

class TimeService {
  private offset: number = 0;
  private synchronized: boolean = false;

  async synchronize() {
    if (this.synchronized) return;

    try {
      // Create a temporary document with server timestamp
      // Use a random ID to avoid collisions
      const randomId = Math.random().toString(36).substring(2, 15);
      const tempRef = doc(collection(db, 'time_sync'), randomId);
      
      await setDoc(tempRef, { timestamp: serverTimestamp() });
      
      // Read it back
      const snap = await getDoc(tempRef);
      const serverTime = snap.data()?.timestamp?.toMillis();
      
      if (serverTime) {
        const localTime = Date.now();
        this.offset = serverTime - localTime;
        this.synchronized = true;
        console.log(`[TimeService] Synchronized. Offset: ${this.offset}ms`);
      }
      
      // Cleanup
      await deleteDoc(tempRef); 
    } catch (error) {
      console.error('[TimeService] Synchronization failed:', error);
    }
  }

  now() {
    return Date.now() + this.offset;
  }

  getOffset() {
    return this.offset;
  }
}

export const timeService = new TimeService();
