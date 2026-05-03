import React, { useEffect, useState } from 'react';
import { User } from '../../../types';
import { userManagementService } from '../services/userManagementService';
import { adminAuthHelpers } from '../services/adminAuthHelpers';
import { CheckCircle2, XCircle, ShieldAlert, Key, Edit, Trash2 } from 'lucide-react';

export default function AdminUserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPermissions, setNewPermissions] = useState<'all' | 'exams_only'>('exams_only');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await userManagementService.getAllUsers();
      setUsers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !newPassword) return;
    setLoading(true);
    try {
      const newUid = await adminAuthHelpers.createTeacherAccount(newEmail, newPassword);
      await userManagementService.createUserRecord(newUid, newEmail, newPermissions);
      setShowCreateModal(false);
      setNewEmail('');
      setNewPassword('');
      loadUsers();
      alert("Tạo tài khoản giáo viên thành công!");
    } catch (error: any) {
      console.error(error);
      alert("Lỗi khi tạo tài khoản: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (user: User) => {
    if (!user.uid) return;
    const newStatus = user.status === 'active' ? 'suspended' : 'active';
    if (!window.confirm(`Bạn có chắc muốn ${newStatus === 'active' ? 'kích hoạt' : 'khóa'} tài khoản ${user.email}?`)) return;
    try {
      await userManagementService.updateUserStatus(user.uid, newStatus);
      loadUsers();
    } catch (err) {
      console.error(err);
      alert("Lỗi khi cập nhật trạng thái");
    }
  };

  const handleDeleteUser = async (user: User) => {
    if (!user.uid) return;
    if (!window.confirm(`XÓA TÀI KHOẢN: Dữ liệu của ${user.email} có thể bị ảnh hưởng. Tiếp tục?`)) return;
    try {
      // Deleting firestore record only. To delete from Auth securely requires backend.
      await userManagementService.deleteUserRecord(user.uid);
      loadUsers();
      alert("Đã xóa bản ghi của người dùng! Để xóa hoàn toàn cần xóa thủ công trong Firebase Console.");
    } catch (err) {
      console.error(err);
    }
  };

  const handleTogglePermission = async (user: User) => {
    if (!user.uid) return;
    const newPerm = user.permissions === 'all' ? 'exams_only' : 'all';
    try {
      await userManagementService.updateUserPermissions(user.uid, newPerm);
      loadUsers();
    } catch (err) {
      console.error(err);
      alert("Lỗi phân quyền");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">Danh sách Giáo viên</h3>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md font-medium text-sm transition-colors"
        >
          Tạo Tài khoản Giáo viên
        </button>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quyền hạn</th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Hành động</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200 text-sm">
            {users.length === 0 && (
              <tr><td colSpan={4} className="px-6 py-4 text-center text-gray-500">Chưa có tài khoản giáo viên nào</td></tr>
            )}
            {users.map(user => (
              <tr key={user.uid}>
                <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{user.email}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {user.status === 'active' ? 'Hoạt động' : 'Bị khóa'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                  {user.permissions === 'all' ? 'Toàn quyền' : 'Chỉ Đề thi Online'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button onClick={() => handleTogglePermission(user)} className="text-indigo-600 hover:text-indigo-900 mr-4" title="Đổi quyền">
                    <ShieldAlert className="w-5 h-5" />
                  </button>
                  <button onClick={() => handleToggleStatus(user)} className={`${user.status === 'active' ? 'text-orange-600 hover:text-orange-900' : 'text-green-600 hover:text-green-900'} mr-4`} title="Khóa/Mở khóa">
                    {user.status === 'active' ? <XCircle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
                  </button>
                  <button onClick={() => handleDeleteUser(user)} className="text-red-600 hover:text-red-900" title="Xóa">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Tạo Tài khoản Mới</h3>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input type="email" required value={newEmail} onChange={e => setNewEmail(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Mật khẩu</label>
                <input type="password" required value={newPassword} onChange={e => setNewPassword(e.target.value)} minLength={6} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Quyền hạn</label>
                <select value={newPermissions} onChange={e => setNewPermissions(e.target.value as any)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border">
                  <option value="exams_only">Chỉ sử dụng Đề thi Online</option>
                  <option value="all">Toàn quyền (Tất cả chức năng Học Sinh / Game)</option>
                </select>
              </div>
              <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
                <button type="submit" disabled={loading} className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none sm:col-start-2 sm:text-sm disabled:opacity-50">
                  {loading ? 'Đang tạo...' : 'Tạo'}
                </button>
                <button type="button" onClick={() => setShowCreateModal(false)} className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:col-start-1 sm:text-sm">
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
