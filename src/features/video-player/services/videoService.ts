import { 
  collection, 
  addDoc, 
  getDocs, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  orderBy,
  serverTimestamp 
} from 'firebase/firestore';
import { db, auth } from '../../../config/firebase';

export interface VideoData {
  id: string;
  title: string;
  url: string;
  teacherId: string;
  createdAt: any;
}

export const videoService = {
  async getVideos(): Promise<VideoData[]> {
    const user = auth.currentUser;
    if (!user) return [];

    const q = query(
      collection(db, 'videos'),
      where('teacherId', '==', user.uid)
    );

    const snapshot = await getDocs(q);
    const videos = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as VideoData));

    // Sort in-memory to avoid composite index requirement
    return videos.sort((a, b) => {
      const timeA = a.createdAt?.toMillis?.() || a.createdAt || 0;
      const timeB = b.createdAt?.toMillis?.() || b.createdAt || 0;
      return timeB - timeA;
    });
  },

  async addVideo(title: string, url: string): Promise<string> {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    // Basic URL validation and extraction of YouTube ID
    const youtubeId = this.extractYoutubeId(url);
    if (!youtubeId) throw new Error('Invalid YouTube URL');

    const docRef = await addDoc(collection(db, 'videos'), {
      title,
      url,
      youtubeId,
      teacherId: user.uid,
      createdAt: serverTimestamp()
    });

    return docRef.id;
  },

  async deleteVideo(videoId: string): Promise<void> {
    await deleteDoc(doc(db, 'videos', videoId));
  },

  extractYoutubeId(url: string): string | null {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  }
};
