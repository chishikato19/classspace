import { addDoc, collection, doc, getDocs, query, where, writeBatch, deleteDoc } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { ClassGroup, Student } from '../../../types';
import { DEFAULT_AVATAR_STYLE } from '../../../utils/avatarUtils';

// Lazy initialization to prevent crash on module load if db is null
const getClassesRef = () => collection(db, 'classes');
const getStudentsRef = () => collection(db, 'students');

export const adminService = {
  // Lấy danh sách tất cả các lớp
  getAllClasses: async (): Promise<ClassGroup[]> => {
    const snapshot = await getDocs(getClassesRef());
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClassGroup));
  },

  // Lấy danh sách lớp theo giáo viên
  getClassesByTeacher: async (teacherId: string): Promise<ClassGroup[]> => {
    const q1 = query(getClassesRef(), where('teacherId', '==', teacherId));
    const snapshot1 = await getDocs(q1);
    const classes1 = snapshot1.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClassGroup));

    const q2 = query(getClassesRef(), where('teacherId', '==', 'admin'));
    const snapshot2 = await getDocs(q2);
    const classes2 = snapshot2.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClassGroup));

    const allClasses = [...classes1, ...classes2];
    return Array.from(new Map(allClasses.map(c => [c.id, c])).values());
  },

  // Tạo lớp mới
  createClass: async (name: string, teacherId: string): Promise<string> => {
    const docRef = await addDoc(getClassesRef(), {
      name,
      teacherId,
      createdAt: Date.now()
    });
    return docRef.id;
  },

  // Xóa lớp và tất cả học sinh trong lớp
  deleteClass: async (classId: string): Promise<void> => {
    const batch = writeBatch(db);
    
    // Xóa lớp
    const classRef = doc(db, 'classes', classId);
    batch.delete(classRef);

    // Lấy danh sách học sinh của lớp để xóa
    const q = query(getStudentsRef(), where('classId', '==', classId));
    const snapshot = await getDocs(q);
    snapshot.docs.forEach(studentDoc => {
      batch.delete(studentDoc.ref);
    });

    await batch.commit();
  },

  // Thêm danh sách học sinh vào lớp (Batch write để tối ưu hiệu năng)
  addStudentsToClass: async (classId: string, studentNames: string[]) => {
    const batch = writeBatch(db);
    
    studentNames.forEach(name => {
      const newStudentRef = doc(getStudentsRef()); // Tự động sinh ID
      batch.set(newStudentRef, {
        name,
        classId,
        wallet_points: 0,
        createdAt: Date.now(),
        avatarConfig: {
          style: DEFAULT_AVATAR_STYLE,
          seed: name, // Dùng tên làm seed để avatar cố định
        },
        inventory: {
          unlockedStyles: [DEFAULT_AVATAR_STYLE, 'initials'],
        }
      });
    });

    await batch.commit();
  },

  // Xóa học sinh
  deleteStudent: async (studentId: string): Promise<void> => {
    const studentRef = doc(db, 'students', studentId);
    await deleteDoc(studentRef);
  },

  // Lấy danh sách học sinh của một lớp
  getStudentsByClass: async (classId: string): Promise<Student[]> => {
    const q = query(getStudentsRef(), where('classId', '==', classId));
    const snapshot = await getDocs(q);
    const students = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student));
    return students.sort((a, b) => {
      if (a.order !== undefined && b.order !== undefined) {
        return a.order - b.order;
      }
      // Fallback: sort by name if no order
      return a.name.localeCompare(b.name);
    });
  },

  // Cập nhật thứ tự học sinh
  updateStudentsOrder: async (students: Student[]): Promise<void> => {
    const batch = writeBatch(db);
    students.forEach((student, index) => {
      const ref = doc(db, 'students', student.id);
      batch.update(ref, { order: index });
    });
    await batch.commit();
  }
};
