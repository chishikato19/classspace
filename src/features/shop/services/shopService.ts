import { collection, doc, getDocs, setDoc, updateDoc, increment, arrayUnion, getDoc } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { ShopItem, Student } from '../../../types';

const SHOP_ITEMS_COLLECTION = 'shop_items';
const STUDENTS_COLLECTION = 'students';

export const shopService = {
  // Lấy danh sách vật phẩm trong cửa hàng
  getShopItems: async (): Promise<ShopItem[]> => {
    const querySnapshot = await getDocs(collection(db, SHOP_ITEMS_COLLECTION));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ShopItem));
  },

  // Khởi tạo dữ liệu mẫu cho cửa hàng (chỉ chạy 1 lần)
  initializeShopItems: async () => {
    const items: Omit<ShopItem, 'id'>[] = [
      {
        type: 'avatar_style',
        name: 'Robot',
        price: 0,
        config: { style: 'bottts' },
        requiredLevel: 1,
        imageUrl: 'https://api.dicebear.com/9.x/bottts/svg?seed=preview'
      },
      {
        type: 'avatar_style',
        name: 'Biểu tượng vui',
        price: 50,
        config: { style: 'fun-emoji' },
        requiredLevel: 2,
        imageUrl: 'https://api.dicebear.com/9.x/fun-emoji/svg?seed=preview'
      },
      {
        type: 'avatar_style',
        name: 'Phiêu lưu',
        price: 100,
        config: { style: 'adventurer' },
        requiredLevel: 5,
        imageUrl: 'https://api.dicebear.com/9.x/adventurer/svg?seed=preview'
      },
      {
        type: 'avatar_style',
        name: 'Hoạt hình',
        price: 200,
        config: { style: 'avataaars' },
        requiredLevel: 10,
        imageUrl: 'https://api.dicebear.com/9.x/avataaars/svg?seed=preview'
      },
      {
        type: 'avatar_style',
        name: 'Nghệ thuật',
        price: 500,
        config: { style: 'lorelei' },
        requiredLevel: 15,
        imageUrl: 'https://api.dicebear.com/9.x/lorelei/svg?seed=preview'
      }
    ];

    for (const item of items) {
      const docRef = doc(collection(db, SHOP_ITEMS_COLLECTION));
      await setDoc(docRef, item);
    }
  },

  // Mua vật phẩm
  purchaseItem: async (studentId: string, item: ShopItem): Promise<void> => {
    const studentRef = doc(db, STUDENTS_COLLECTION, studentId);
    const studentSnap = await getDoc(studentRef);
    
    if (!studentSnap.exists()) {
      throw new Error('Học sinh không tồn tại');
    }

    const studentData = studentSnap.data() as Student;
    
    if (studentData.wallet_points < item.price) {
      throw new Error('Không đủ điểm để mua vật phẩm này');
    }

    const unlockedStyles = studentData.inventory?.unlockedStyles || [];
    if (unlockedStyles.includes(item.config.style)) {
      throw new Error('Bạn đã sở hữu vật phẩm này');
    }

    // Nếu inventory chưa tồn tại, khởi tạo nó
    if (!studentData.inventory) {
      await updateDoc(studentRef, {
        wallet_points: increment(-item.price),
        inventory: {
          unlockedStyles: [item.config.style]
        }
      });
    } else {
      await updateDoc(studentRef, {
        wallet_points: increment(-item.price),
        'inventory.unlockedStyles': arrayUnion(item.config.style)
      });
    }
  },

  // Lấy thông tin học sinh (bao gồm ví và túi đồ)
  getStudentProfile: async (studentId: string): Promise<Student | null> => {
    const docRef = doc(db, STUDENTS_COLLECTION, studentId);
    const snapshot = await getDoc(docRef);
    if (!snapshot.exists()) return null;
    return { id: snapshot.id, ...snapshot.data() } as Student;
  },

  // Cập nhật avatar của học sinh
  updateStudentAvatar: async (studentId: string, avatarConfig: any): Promise<void> => {
    const studentRef = doc(db, STUDENTS_COLLECTION, studentId);
    await updateDoc(studentRef, {
      avatarConfig
    });
  }
};
