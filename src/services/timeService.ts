import { doc, serverTimestamp, setDoc, getDoc, collection } from 'firebase/firestore';
import { db } from '../config/firebase';

class TimeService {
  private offset: number = 0;
  private synchronized: boolean = false;

  async synchronize() {
    if (this.synchronized) return;

    try {
      // Create a temporary document with server timestamp
      const tempRef = doc(collection(db, 'system'), 'time_sync');
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
