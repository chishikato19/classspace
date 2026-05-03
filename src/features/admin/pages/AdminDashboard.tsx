import React, { useEffect, useState } from 'react';
import { adminService } from '../services/adminService';
import { ClassGroup, Student } from '../../../types';
import { Trash2, ArrowUp, ArrowDown, Users, ShieldAlert } from 'lucide-react';
import { StudentAvatar } from '../../../components/Avatar/StudentAvatar';
import { auth } from '../../../config/firebase';
import { sortVietnameseNames } from '../../../utils/stringUtils';
import AdminUserManagement from './AdminUserManagement';

type AdminTab = 'classes' | 'users';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<AdminTab>('classes');
  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [selectedClass, setSelectedClass] = useState<ClassGroup | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [newClassName, setNewClassName] = useState('');
  const [newStudentNames, setNewStudentNames] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setIsSuperAdmin(user.email === 'chishikato19@gmail.com');
        loadClasses(user.uid);
      } else {
        setClasses([]);
        setIsSuperAdmin(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // Load danh sách học sinh khi chọn lớp
  useEffect(() => {
    if (selectedClass) {
      loadStudents(selectedClass.id);
    }
  }, [selectedClass]);

  const loadClasses = async (teacherId?: string) => {
    const uid = teacherId || auth.currentUser?.uid;
    if (!uid) return;
    const data = await adminService.getClassesByTeacher(uid);
    setClasses(data);
  };

  const loadStudents = async (classId: string) => {
    const data = await adminService.getStudentsByClass(classId);
    setStudents(data);
  };

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim()) return;
    
    const currentUser = auth.currentUser;
    if (!currentUser) {
      alert("Bạn cần đăng nhập để tạo lớp.");
      return;
    }

    setLoading(true);
    try {
      await adminService.createClass(newClassName, currentUser.uid);
      setNewClassName('');
      await loadClasses(currentUser.uid); // Refresh list
    } catch (error) {
      console.error("Error creating class:", error);
      alert("Lỗi khi tạo lớp. Kiểm tra console.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddStudents = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClass || !newStudentNames.trim()) return;

    setLoading(true);
    try {
      const names = newStudentNames.split('\n').map(s => s.trim()).filter(s => s);
      await adminService.addStudentsToClass(selectedClass.id, names);
      setNewStudentNames('');
      await loadStudents(selectedClass.id); // Refresh list
    } catch (error) {
      console.error("Error adding students:", error);
      alert("Lỗi khi thêm học sinh.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClass = async (classId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Bạn có chắc chắn muốn xóa lớp này và toàn bộ học sinh trong lớp?")) return;

    setLoading(true);
    try {
      await adminService.deleteClass(classId);
      if (selectedClass?.id === classId) {
        setSelectedClass(null);
        setStudents([]);
      }
      await loadClasses();
    } catch (error) {
      console.error("Error deleting class:", error);
      alert("Lỗi khi xóa lớp.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStudent = async (studentId: string) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa học sinh này?")) return;

    setLoading(true);
    try {
      await adminService.deleteStudent(studentId);
      if (selectedClass) {
        await loadStudents(selectedClass.id);
      }
    } catch (error) {
      console.error("Error deleting student:", error);
      alert("Lỗi khi xóa học sinh.");
    } finally {
      setLoading(false);
    }
  };

  const handleSortStudents = async () => {
    if (!selectedClass || students.length === 0) return;
    setLoading(true);
    try {
      const sortedStudents = [...students].sort((a, b) => sortVietnameseNames(a.name, b.name));
      const updatedStudents = sortedStudents.map((s, index) => ({ ...s, order: index }));
      setStudents(updatedStudents);
      await adminService.updateStudentsOrder(updatedStudents);
    } catch (error) {
      console.error("Error sorting students:", error);
      alert("Lỗi khi sắp xếp học sinh.");
    } finally {
      setLoading(false);
    }
  };

  const handleMoveStudent = async (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === students.length - 1) return;

    const newStudents = [...students];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    const temp = newStudents[index];
    newStudents[index] = newStudents[targetIndex];
    newStudents[targetIndex] = temp;
    
    const updatedStudents = newStudents.map((s, i) => ({ ...s, order: i }));
    setStudents(updatedStudents);
    
    try {
      await adminService.updateStudentsOrder(updatedStudents);
    } catch (error) {
      console.error("Error updating student order:", error);
      // Revert if failed
      if (selectedClass) loadStudents(selectedClass.id);
    }
  };

  return (
    <div className="space-y-8">
      <div className="border-b border-gray-200 pb-5">
        <h1 className="text-3xl font-bold leading-6 text-gray-900">Quản trị Hệ thống</h1>
        <p className="mt-2 text-sm text-gray-500">Quản lý hệ thống ứng dụng</p>
      </div>

      {isSuperAdmin && (
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('classes')}
              className={`${activeTab === 'classes' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'} flex whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium`}
            >
              <Users className={`${activeTab === 'classes' ? 'text-indigo-500' : 'text-gray-400'} mr-2 h-5 w-5`} />
              Quản lý Lớp & Học sinh
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`${activeTab === 'users' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'} flex whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium`}
            >
              <ShieldAlert className={`${activeTab === 'users' ? 'text-indigo-500' : 'text-gray-400'} mr-2 h-5 w-5`} />
              Quản lý Giáo viên
            </button>
          </nav>
        </div>
      )}

      {activeTab === 'users' ? (
        <AdminUserManagement />
      ) : (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Cột trái: Danh sách lớp */}
        <div className="space-y-6">
          <div className="bg-white shadow sm:rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-base font-semibold leading-6 text-gray-900">Tạo lớp mới</h3>
              <form className="mt-5 sm:flex sm:items-center" onSubmit={handleCreateClass}>
                <div className="w-full sm:max-w-xs">
                  <input
                    type="text"
                    className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 px-3"
                    placeholder="Tên lớp (VD: 12A1)"
                    value={newClassName}
                    onChange={(e) => setNewClassName(e.target.value)}
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="mt-3 inline-flex w-full items-center justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 sm:ml-3 sm:mt-0 sm:w-auto disabled:opacity-50"
                >
                  {loading ? 'Đang tạo...' : 'Thêm lớp'}
                </button>
              </form>
            </div>
          </div>

          <div className="overflow-hidden bg-white shadow sm:rounded-md">
            <ul role="list" className="divide-y divide-gray-200">
              {classes.map((cls) => (
                <li key={cls.id}>
                  <div
                    onClick={() => setSelectedClass(cls)}
                    className={`block w-full hover:bg-gray-50 text-left cursor-pointer ${selectedClass?.id === cls.id ? 'bg-indigo-50 ring-1 ring-inset ring-indigo-600' : ''}`}
                  >
                    <div className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <p className="truncate text-sm font-medium text-indigo-600">{cls.name}</p>
                        <div className="ml-2 flex flex-shrink-0 items-center gap-2">
                          <p className="inline-flex rounded-full bg-green-100 px-2 text-xs font-semibold leading-5 text-green-800">
                            Active
                          </p>
                          <button
                            onClick={(e) => handleDeleteClass(cls.id, e)}
                            className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-50 transition-colors"
                            title="Xóa lớp"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
              {classes.length === 0 && (
                <li className="px-4 py-4 text-center text-sm text-gray-500">Chưa có lớp nào.</li>
              )}
            </ul>
          </div>
        </div>

        {/* Cột phải: Chi tiết lớp & Danh sách học sinh */}
        <div className="space-y-6">
          {selectedClass ? (
            <div className="bg-white shadow sm:rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-base font-semibold leading-6 text-gray-900">
                  Danh sách học sinh lớp: {selectedClass.name}
                </h3>
                
                <form className="mt-5" onSubmit={handleAddStudents}>
                  <label htmlFor="students" className="block text-sm font-medium leading-6 text-gray-900">
                    Thêm nhanh học sinh (Mỗi tên một dòng)
                  </label>
                  <div className="mt-2">
                    <textarea
                      rows={4}
                      className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 px-3"
                      placeholder="Nguyễn Văn A&#10;Trần Thị B&#10;Lê Văn C"
                      value={newStudentNames}
                      onChange={(e) => setNewStudentNames(e.target.value)}
                    />
                  </div>
                  <div className="mt-3 flex justify-end">
                    <button
                      type="submit"
                      disabled={loading}
                      className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50"
                    >
                      {loading ? 'Đang lưu...' : 'Lưu danh sách'}
                    </button>
                  </div>
                </form>

                <div className="mt-6 border-t border-gray-100 pt-4">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-sm font-medium text-gray-700">Danh sách học sinh ({students.length})</h4>
                    {students.length > 1 && (
                      <button
                        onClick={handleSortStudents}
                        disabled={loading}
                        className="text-xs font-medium text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2 py-1 rounded border border-indigo-100 transition-colors disabled:opacity-50"
                      >
                        Sắp xếp A-Z
                      </button>
                    )}
                  </div>
                  <ul className="divide-y divide-gray-100">
                    {students.map((student, index) => (
                      <li key={student.id} className="flex justify-between gap-x-6 py-3 items-center">
                        <div className="flex min-w-0 gap-x-4 items-center flex-1">
                          <StudentAvatar student={student} size={40} />
                          <div className="min-w-0 flex-auto">
                            <p className="text-sm font-semibold leading-6 text-gray-900">{student.name}</p>
                            <p className="mt-1 truncate text-xs leading-5 text-gray-500">Điểm tích lũy: {student.wallet_points}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleMoveStudent(index, 'up')}
                            disabled={index === 0 || loading}
                            className="text-gray-400 hover:text-indigo-600 p-1 rounded-full hover:bg-gray-50 transition-colors disabled:opacity-30"
                            title="Lên"
                          >
                            <ArrowUp className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleMoveStudent(index, 'down')}
                            disabled={index === students.length - 1 || loading}
                            className="text-gray-400 hover:text-indigo-600 p-1 rounded-full hover:bg-gray-50 transition-colors disabled:opacity-30"
                            title="Xuống"
                          >
                            <ArrowDown className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteStudent(student.id)}
                            disabled={loading}
                            className="text-red-500 hover:text-red-700 p-1 ml-2 rounded-full hover:bg-red-50 transition-colors disabled:opacity-50"
                            title="Xóa học sinh"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </li>
                    ))}
                    {students.length === 0 && (
                      <li className="py-4 text-center text-sm text-gray-500">Lớp này chưa có học sinh.</li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-12 text-center hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
              <span className="mt-2 block text-sm font-semibold text-gray-900">Chọn một lớp để xem chi tiết</span>
            </div>
          )}
        </div>
      </div>
      )}
    </div>
  );
}
