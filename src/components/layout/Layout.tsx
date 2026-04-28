import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { authService } from '../../features/auth/services/authService';
import { useNoiseMonitor } from '../../contexts/NoiseMonitorContext';
import { useTimer } from '../../contexts/TimerContext';
import { Settings, Youtube, Shuffle, Mic, Timer, LogOut, Camera, FolderOpen, Pen, Calculator } from 'lucide-react';
import { useCalculator } from '../../contexts/CalculatorContext';

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isWidgetVisible, setWidgetVisible } = useNoiseMonitor();
  const { isTimerVisible, setTimerVisible } = useTimer();
  const { isCalculatorVisible, setCalculatorVisible } = useCalculator();

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
          <nav className="flex items-center gap-6">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => navigate('/admin')}
                className={`text-sm font-medium transition-colors ${location.pathname === '/admin' ? 'text-indigo-600' : 'text-gray-500 hover:text-gray-900'}`}
              >
                Admin
              </button>
              <button 
                onClick={() => navigate('/teacher/dashboard')}
                className={`text-sm font-medium transition-colors ${location.pathname.includes('/teacher/dashboard') || location.pathname.includes('/teacher/quiz') ? 'text-indigo-600' : 'text-gray-500 hover:text-gray-900'}`}
              >
                Quizizz
              </button>
              <button 
                onClick={() => navigate('/teacher/exams')}
                className={`text-sm font-medium transition-colors ${location.pathname.includes('/teacher/exams') ? 'text-indigo-600' : 'text-gray-500 hover:text-gray-900'}`}
              >
                Đề thi Online
              </button>
              <button 
                onClick={() => navigate('/teacher/shop')}
                className={`text-sm font-medium transition-colors ${location.pathname.includes('/teacher/shop') ? 'text-indigo-600' : 'text-gray-500 hover:text-gray-900'}`}
              >
                Cửa hàng
              </button>
            </div>

            <div className="h-6 w-px bg-gray-300"></div>

            <div className="flex items-center gap-3">
              <button 
                onClick={() => setTimerVisible(!isTimerVisible)}
                className={`p-2 rounded-lg transition-colors ${isTimerVisible ? 'bg-indigo-100 text-indigo-600' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'}`}
                title="Đồng hồ đếm ngược"
              >
                <Timer className="w-5 h-5" />
              </button>
              <button 
                onClick={() => setCalculatorVisible(!isCalculatorVisible)}
                className={`p-2 rounded-lg transition-colors ${isCalculatorVisible ? 'bg-indigo-100 text-indigo-600' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'}`}
                title="Máy tính Casio"
              >
                <Calculator className="w-5 h-5" />
              </button>
              <button 
                onClick={() => setWidgetVisible(!isWidgetVisible)}
                className={`p-2 rounded-lg transition-colors ${isWidgetVisible ? 'bg-indigo-100 text-indigo-600' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'}`}
                title="Đo tiếng ồn"
              >
                <Mic className="w-5 h-5" />
              </button>
              <button 
                onClick={() => navigate('/teacher/random-selector')}
                className={`p-2 rounded-lg transition-colors ${location.pathname === '/teacher/random-selector' ? 'bg-indigo-100 text-indigo-600' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'}`}
                title="Công cụ lớp học"
              >
                <Shuffle className="w-5 h-5" />
              </button>
              <button 
                onClick={() => navigate('/teacher/video-player')}
                className={`p-2 rounded-lg transition-colors ${location.pathname === '/teacher/video-player' ? 'bg-indigo-100 text-indigo-600' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'}`}
                title="Video YouTube"
              >
                <Youtube className="w-5 h-5" />
              </button>
              <button 
                onClick={() => navigate('/teacher/showcase')}
                className={`p-2 rounded-lg transition-colors ${location.pathname === '/teacher/showcase' ? 'bg-indigo-100 text-indigo-600' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'}`}
                title="Trình chiếu bài làm"
              >
                <Camera className="w-5 h-5" />
              </button>
              <button 
                onClick={() => navigate('/teacher/resources')}
                className={`p-2 rounded-lg transition-colors ${location.pathname === '/teacher/resources' ? 'bg-indigo-100 text-indigo-600' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'}`}
                title="Kho tài nguyên"
              >
                <FolderOpen className="w-5 h-5" />
              </button>
              <button 
                onClick={() => navigate('/teacher/whiteboard')}
                className={`p-2 rounded-lg transition-colors ${location.pathname === '/teacher/whiteboard' ? 'bg-indigo-100 text-indigo-600' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'}`}
                title="Bảng trắng"
              >
                <Pen className="w-5 h-5" />
              </button>
              <button 
                onClick={() => navigate('/teacher/settings')}
                className={`p-2 rounded-lg transition-colors ${location.pathname === '/teacher/settings' ? 'bg-indigo-100 text-indigo-600' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'}`}
                title="Cài đặt"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>

            <div className="h-6 w-px bg-gray-300"></div>

            <button 
              onClick={handleLogout}
              className="flex items-center gap-2 text-sm font-medium text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-2 rounded-lg transition-colors"
              title="Đăng xuất"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Đăng xuất</span>
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
