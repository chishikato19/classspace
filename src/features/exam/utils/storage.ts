import { ref, deleteObject } from 'firebase/storage';
import { storage } from '../../../config/firebase';

/**
 * Xóa một file trên Firebase Storage từ Download URL
 */
export async function deleteFileFromUrl(downloadUrl: string) {
  try {
    // Chỉ xử lý các URL của Firebase Storage
    if (!downloadUrl || !downloadUrl.includes('firebasestorage.googleapis.com')) return;
    
    // Decode URL để lấy path
    // Ví dụ: https://firebasestorage.googleapis.com/v0/b/app.appspot.com/o/users%2Fuid%2Fexams%2Fimage.png?alt=media
    const urlObj = new URL(downloadUrl);
    const path = decodeURIComponent(urlObj.pathname.split('/o/')[1]);
    
    if (path) {
      const fileRef = ref(storage, path);
      await deleteObject(fileRef);
      console.log('Đã xóa file rác thành công:', path);
    }
  } catch (error) {
    console.error('Lỗi khi xóa file từ URL:', error);
  }
}

/**
 * Xóa danh sách các file từ mảng URL
 */
export async function deleteFilesFromUrls(urls: string[]) {
  const uniqueUrls = [...new Set(urls.filter(Boolean))];
  await Promise.all(uniqueUrls.map(url => deleteFileFromUrl(url)));
}
