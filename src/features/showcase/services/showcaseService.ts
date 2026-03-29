import { db } from '../../../config/firebase';
import { collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, updateDoc, where, getDocs } from 'firebase/firestore';

export interface ShowcaseImage {
  id: string;
  teacherId: string;
  imageUrl: string; // base64
  status: 'gallery' | 'projecting' | 'comparing';
  annotations?: string; // JSON string of strokes
  createdAt: number;
}

const COLLECTION_NAME = 'showcase_images';

export const showcaseService = {
  subscribeToImages(teacherId: string, callback: (images: ShowcaseImage[]) => void) {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('teacherId', '==', teacherId),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
      const images = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ShowcaseImage[];
      callback(images);
    }, (error) => {
      console.error('Error subscribing to showcase images:', error);
    });
  },

  async addImage(teacherId: string, imageUrl: string, status: 'gallery' | 'projecting' | 'comparing' = 'gallery') {
    try {
      const docRef = await addDoc(collection(db, COLLECTION_NAME), {
        teacherId,
        imageUrl,
        status,
        annotations: '[]', // Initialize empty annotations
        createdAt: Date.now()
      });
      return docRef.id;
    } catch (error) {
      console.error('Error adding showcase image:', error);
      throw error;
    }
  },

  async updateImageStatus(imageId: string, status: 'gallery' | 'projecting' | 'comparing') {
    try {
      const docRef = doc(db, COLLECTION_NAME, imageId);
      await updateDoc(docRef, { status });
    } catch (error) {
      console.error('Error updating showcase image status:', error);
      throw error;
    }
  },

  async updateAnnotations(imageId: string, annotations: string) {
    try {
      const docRef = doc(db, COLLECTION_NAME, imageId);
      await updateDoc(docRef, { annotations });
    } catch (error) {
      console.error('Error updating annotations:', error);
      throw error;
    }
  },

  async deleteImage(imageId: string) {
    try {
      const docRef = doc(db, COLLECTION_NAME, imageId);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting showcase image:', error);
      throw error;
    }
  },

  async clearAllImages(teacherId: string) {
    try {
      const q = query(collection(db, COLLECTION_NAME), where('teacherId', '==', teacherId));
      const snapshot = await getDocs(q);
      const deletePromises = snapshot.docs.map((doc: any) => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
    } catch (error) {
      console.error('Error clearing showcase images:', error);
      throw error;
    }
  }
};
