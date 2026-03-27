import { collection, doc, setDoc, updateDoc, onSnapshot, getDoc, arrayUnion, arrayRemove, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { ClassSession, PointEvent } from '../types';

export const classSessionService = {
  async createSession(classId: string, teacherId: string): Promise<string> {
    const sessionRef = doc(collection(db, 'classSessions'));
    const newSession: ClassSession = {
      id: sessionRef.id,
      classId,
      teacherId,
      startTime: Date.now(),
      status: 'ACTIVE',
      events: []
    };
    await setDoc(sessionRef, newSession);
    return sessionRef.id;
  },

  async endSession(sessionId: string): Promise<void> {
    const sessionRef = doc(db, 'classSessions', sessionId);
    await updateDoc(sessionRef, {
      status: 'COMPLETED',
      endTime: Date.now()
    });
  },

  async addEvent(sessionId: string, event: Omit<PointEvent, 'id' | 'timestamp'>): Promise<void> {
    const sessionRef = doc(db, 'classSessions', sessionId);
    const newEvent: PointEvent = {
      ...event,
      id: crypto.randomUUID(),
      timestamp: Date.now()
    };
    await updateDoc(sessionRef, {
      events: arrayUnion(newEvent)
    });
  },

  async removeEvent(sessionId: string, event: PointEvent): Promise<void> {
    const sessionRef = doc(db, 'classSessions', sessionId);
    await updateDoc(sessionRef, {
      events: arrayRemove(event)
    });
  },

  subscribeToSession(sessionId: string, callback: (session: ClassSession | null) => void) {
    const sessionRef = doc(db, 'classSessions', sessionId);
    return onSnapshot(sessionRef, (doc) => {
      if (doc.exists()) {
        callback(doc.data() as ClassSession);
      } else {
        callback(null);
      }
    }, (error) => {
      console.error('Error subscribing to class session:', error);
      callback(null);
    });
  },

  async getActiveSessionForClass(classId: string): Promise<ClassSession | null> {
    const q = query(collection(db, 'classSessions'), where('classId', '==', classId), where('status', '==', 'ACTIVE'));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      return snapshot.docs[0].data() as ClassSession;
    }
    return null;
  }
};
