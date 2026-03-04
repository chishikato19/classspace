import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Shop } from '../components/Shop';
import { Inventory } from '../components/Inventory';
import { ShoppingBag, User } from 'lucide-react';

interface StudentDashboardProps {
  studentId: string;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({ studentId }) => {
  const [activeTab, setActiveTab] = useState<'shop' | 'inventory'>('shop');

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <h1 className="text-xl font-bold text-indigo-700">Hệ Thống Đổi Quà</h1>
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab('shop')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === 'shop' 
                    ? 'bg-indigo-100 text-indigo-700' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <ShoppingBag size={20} />
                Cửa Hàng
              </button>
              <button
                onClick={() => setActiveTab('inventory')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === 'inventory' 
                    ? 'bg-indigo-100 text-indigo-700' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <User size={20} />
                Túi Đồ
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="py-8 px-4">
        {activeTab === 'shop' ? (
          <Shop studentId={studentId} />
        ) : (
          <Inventory studentId={studentId} />
        )}
      </div>
    </div>
  );
};

export const StudentDashboardWrapper = () => {
  const { studentId } = useParams();
  if (!studentId) return <div>Thiếu ID học sinh</div>;
  return <StudentDashboard studentId={studentId} />;
};
