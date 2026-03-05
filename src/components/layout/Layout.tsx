import { Outlet, useNavigate } from 'react-router-dom';
import { authService } from '../../features/auth/services/authService';

export default function Layout() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await authService.logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-indigo-600">ClassVerse</span>
          </div>
          <nav className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/admin')}
              className="text-sm font-medium text-gray-500 hover:text-gray-900"
            >
              Admin
            </button>
            <button 
              onClick={() => navigate('/teacher/dashboard')}
              className="text-sm font-medium text-gray-500 hover:text-gray-900"
            >
              Quizizz
            </button>
            <button 
              onClick={() => navigate('/teacher/shop')}
              className="text-sm font-medium text-gray-500 hover:text-gray-900"
            >
              Cửa hàng
            </button>
            <button 
              onClick={() => navigate('/teacher/random-selector')}
              className="text-sm font-medium text-gray-500 hover:text-gray-900"
            >
              Công cụ lớp học
            </button>
            <button 
              onClick={() => navigate('/teacher/video-player')}
              className="text-sm font-medium text-gray-500 hover:text-gray-900"
            >
              Video YouTube
            </button>
            <button 
              onClick={() => navigate('/teacher/settings')}
              className="text-sm font-medium text-gray-500 hover:text-gray-900"
            >
              Cài đặt
            </button>
            <button 
              onClick={handleLogout}
              className="text-sm font-medium text-red-500 hover:text-red-700 ml-4 border border-red-200 px-3 py-1 rounded-md"
            >
              Đăng xuất
            </button>
          </nav>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
}
