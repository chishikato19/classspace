import { doc, serverTimestamp, setDoc, getDoc, collection, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../config/firebase';

class TimeService {
  private offset: number = 0;
  private synchronized: boolean = false;

  async synchronize() {
    if (this.synchronized) return;
    if (!db) return;

    // Check if we have a recent sync in localStorage (within last 24 hours)
    const lastSync = localStorage.getItem('last_time_sync');
    const cachedOffset = localStorage.getItem('time_offset');
    
    if (lastSync && cachedOffset) {
      const lastSyncTime = parseInt(lastSync);
      if (Date.now() - lastSyncTime < 24 * 60 * 60 * 1000) { // 24 hours
        this.offset = parseInt(cachedOffset);
        this.synchronized = true;
        console.log(`[TimeService] Using cached offset: ${this.offset}ms`);
        return;
      }
    }

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
        
        // Cache in localStorage
        localStorage.setItem('last_time_sync', Date.now().toString());
        localStorage.setItem('time_offset', this.offset.toString());
        
        console.log(`[TimeService] Synchronized. Offset: ${this.offset}ms`);
      }
      
      // Cleanup
      await deleteDoc(tempRef); 
    } catch (error: any) {
      // If quota exceeded, just use local time and don't spam errors
      if (error?.message?.includes('Quota exceeded')) {
        console.warn('[TimeService] Quota exceeded, using local time.');
        this.synchronized = true; // Mark as done so we don't retry
        return;
      }
      handleFirestoreError(error, OperationType.WRITE, 'time_sync');
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
