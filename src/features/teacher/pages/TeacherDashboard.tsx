import { useState } from 'react';
import QuizDashboard from '../../quiz/pages/QuizDashboard';
import ReportsDashboard from '../../quiz/pages/ReportsDashboard';
import { BookOpen, BarChart2, ShoppingBag } from 'lucide-react';
import { shopService } from '../../shop/services/shopService';

export default function TeacherDashboard() {
  const [activeTab, setActiveTab] = useState<'quizzes' | 'reports' | 'shop'>('quizzes');

  const handleInitShop = async () => {
    if (confirm('Bạn có chắc muốn khởi tạo lại dữ liệu cửa hàng?')) {
      await shopService.initializeShopItems();
      alert('Đã khởi tạo dữ liệu cửa hàng!');
    }
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('quizzes')}
            className={`
              ${activeTab === 'quizzes'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }
              group inline-flex items-center border-b-2 py-4 px-1 text-sm font-medium
            `}
          >
            <BookOpen className={`
              ${activeTab === 'quizzes' ? 'text-indigo-500' : 'text-gray-400 group-hover:text-gray-500'}
              -ml-0.5 mr-2 h-5 w-5
            `} />
            Thư viện câu hỏi
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`
              ${activeTab === 'reports'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }
              group inline-flex items-center border-b-2 py-4 px-1 text-sm font-medium
            `}
          >
            <BarChart2 className={`
              ${activeTab === 'reports' ? 'text-indigo-500' : 'text-gray-400 group-hover:text-gray-500'}
              -ml-0.5 mr-2 h-5 w-5
            `} />
            Báo cáo & Lịch sử
          </button>
          <button
            onClick={() => setActiveTab('shop')}
            className={`
              ${activeTab === 'shop'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }
              group inline-flex items-center border-b-2 py-4 px-1 text-sm font-medium
            `}
          >
            <ShoppingBag className={`
              ${activeTab === 'shop' ? 'text-indigo-500' : 'text-gray-400 group-hover:text-gray-500'}
              -ml-0.5 mr-2 h-5 w-5
            `} />
            Quản lý Cửa hàng
          </button>
        </nav>
      </div>

      <div className="mt-6">
        {activeTab === 'quizzes' && <QuizDashboard />}
        {activeTab === 'reports' && <ReportsDashboard />}
        {activeTab === 'shop' && (
          <div className="p-6 bg-white rounded-lg shadow">
            <h2 className="text-lg font-medium mb-4">Cài đặt Cửa hàng</h2>
            <p className="text-gray-600 mb-4">
              Tính năng quản lý cửa hàng đang được phát triển. Hiện tại bạn có thể khởi tạo dữ liệu mẫu.
            </p>
            <button
              onClick={handleInitShop}
              className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
            >
              Khởi tạo Dữ liệu Mẫu cho Shop
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
