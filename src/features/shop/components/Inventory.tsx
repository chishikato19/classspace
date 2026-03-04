import React, { useEffect, useState } from 'react';
import { shopService } from '../services/shopService';
import { Student } from '../../../types';
import { AvatarConfig } from '../../../types';
import { getAvatarUrl } from '../../../utils/avatarUtils';
import { User, Edit2, Check } from 'lucide-react';

interface InventoryProps {
  studentId: string;
}

export const Inventory: React.FC<InventoryProps> = ({ studentId }) => {
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const studentData = await shopService.getStudentProfile(studentId);
        setStudent(studentData);
        if (studentData?.avatarConfig?.style) {
          setSelectedStyle(studentData.avatarConfig.style);
        }
      } catch (err) {
        setError('Không thể tải dữ liệu túi đồ');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [studentId]);

  const handleEquip = async (style: string) => {
    if (!student) return;
    
    try {
      // Update local state immediately for responsiveness
      setSelectedStyle(style);
      
      // Update Firestore
      await shopService.updateStudentAvatar(studentId, {
        ...student.avatarConfig,
        style: style
      });
      
      alert('Đã trang bị avatar mới!');
    } catch (err: any) {
      alert(err.message || 'Lỗi khi trang bị avatar');
      // Revert local state on error
      setSelectedStyle(student.avatarConfig?.style || null);
    }
  };

  if (loading) return <div className="p-8 text-center">Đang tải túi đồ...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;
  if (!student) return <div className="p-8 text-center">Không tìm thấy thông tin học sinh</div>;

  const unlockedStyles = student.inventory?.unlockedStyles || [];

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-xl shadow-lg mt-8">
      <div className="flex justify-between items-center mb-8 border-b pb-4">
        <h2 className="text-2xl font-bold flex items-center gap-2 text-indigo-700">
          <User className="w-8 h-8" />
          Túi Đồ Của Tôi
        </h2>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
        {unlockedStyles.map((style) => {
          const isEquipped = selectedStyle === style;
          const avatarUrl = getAvatarUrl({
            seed: student.avatarConfig?.seed || student.name,
            style: style as any,
            size: 128
          });

          return (
            <div 
              key={style} 
              className={`border rounded-xl p-4 flex flex-col items-center cursor-pointer transition-all ${
                isEquipped ? 'bg-indigo-50 border-indigo-500 ring-2 ring-indigo-200' : 'hover:bg-gray-50 border-gray-200'
              }`}
              onClick={() => handleEquip(style)}
            >
              <div className="w-20 h-20 mb-3 rounded-full overflow-hidden bg-white shadow-sm">
                <img src={avatarUrl} alt={style} className="w-full h-full object-cover" />
              </div>
              
              <p className="text-sm font-medium text-gray-700 mb-3 capitalize">{style.replace('-', ' ')}</p>
              
              {isEquipped && (
                <div className="mt-auto px-3 py-1 bg-indigo-600 text-white text-xs rounded-full flex items-center gap-1">
                  <Check size={12} /> Đang dùng
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
