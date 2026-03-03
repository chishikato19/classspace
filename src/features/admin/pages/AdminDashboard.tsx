import React, { useEffect, useState } from 'react';
import { adminService } from '../services/adminService';
import { ClassGroup, Student } from '../../../types';

export default function AdminDashboard() {
  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [selectedClass, setSelectedClass] = useState<ClassGroup | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [newClassName, setNewClassName] = useState('');
  const [newStudentNames, setNewStudentNames] = useState(''); // Nhập nhiều tên, cách nhau bởi xuống dòng
  const [loading, setLoading] = useState(false);

  // Load danh sách lớp khi vào trang
  useEffect(() => {
    loadClasses();
  }, []);

  // Load danh sách học sinh khi chọn lớp
  useEffect(() => {
    if (selectedClass) {
      loadStudents(selectedClass.id);
    }
  }, [selectedClass]);

  const loadClasses = async () => {
    const data = await adminService.getAllClasses();
    setClasses(data);
  };

  const loadStudents = async (classId: string) => {
    const data = await adminService.getStudentsByClass(classId);
    setStudents(data);
  };

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim()) return;
    
    setLoading(true);
    try {
      await adminService.createClass(newClassName, 'admin'); // Tạm thời để teacherId là admin
      setNewClassName('');
      await loadClasses(); // Refresh list
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

  return (
    <div className="space-y-8">
      <div className="border-b border-gray-200 pb-5">
        <h1 className="text-3xl font-bold leading-6 text-gray-900">Quản trị Hệ thống</h1>
        <p className="mt-2 text-sm text-gray-500">Quản lý danh sách lớp học và học sinh.</p>
      </div>

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
                  <button
                    onClick={() => setSelectedClass(cls)}
                    className={`block w-full hover:bg-gray-50 text-left ${selectedClass?.id === cls.id ? 'bg-indigo-50 ring-1 ring-inset ring-indigo-600' : ''}`}
                  >
                    <div className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <p className="truncate text-sm font-medium text-indigo-600">{cls.name}</p>
                        <div className="ml-2 flex flex-shrink-0">
                          <p className="inline-flex rounded-full bg-green-100 px-2 text-xs font-semibold leading-5 text-green-800">
                            Active
                          </p>
                        </div>
                      </div>
                    </div>
                  </button>
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
                  <ul className="divide-y divide-gray-100">
                    {students.map((student) => (
                      <li key={student.id} className="flex justify-between gap-x-6 py-3">
                        <div className="flex min-w-0 gap-x-4">
                          <div className="min-w-0 flex-auto">
                            <p className="text-sm font-semibold leading-6 text-gray-900">{student.name}</p>
                            <p className="mt-1 truncate text-xs leading-5 text-gray-500">Điểm tích lũy: {student.wallet_points}</p>
                          </div>
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
    </div>
  );
}
