import React, { useEffect, useState } from 'react';
import { shopService } from '../services/shopService';
import { ShopItem, Student } from '../../../types';
import { ShoppingCart, Star, Lock, Check } from 'lucide-react';

interface ShopProps {
  studentId: string;
}

export const Shop: React.FC<ShopProps> = ({ studentId }) => {
  const [items, setItems] = useState<ShopItem[]>([]);
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [shopItems, studentData] = await Promise.all([
          shopService.getShopItems(),
          shopService.getStudentProfile(studentId)
        ]);
        setItems(shopItems);
        setStudent(studentData);
      } catch (err) {
        setError('Không thể tải dữ liệu cửa hàng');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [studentId]);

  const handlePurchase = async (item: ShopItem) => {
    if (!student) return;
    
    try {
      await shopService.purchaseItem(studentId, item);
      // Refresh student data
      const updatedStudent = await shopService.getStudentProfile(studentId);
      setStudent(updatedStudent);
      alert('Mua thành công!');
    } catch (err: any) {
      alert(err.message || 'Lỗi khi mua vật phẩm');
    }
  };

  if (loading) return <div className="p-8 text-center">Đang tải cửa hàng...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;
  if (!student) return <div className="p-8 text-center">Không tìm thấy thông tin học sinh</div>;

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-xl shadow-lg">
      <div className="flex justify-between items-center mb-8 border-b pb-4">
        <h2 className="text-2xl font-bold flex items-center gap-2 text-indigo-700">
          <ShoppingCart className="w-8 h-8" />
          Cửa Hàng Vật Phẩm
        </h2>
        <div className="flex items-center gap-2 bg-yellow-100 px-4 py-2 rounded-full text-yellow-800 font-bold">
          <Star className="w-5 h-5 fill-yellow-500 text-yellow-500" />
          {student.wallet_points} Xu
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {items.map((item) => {
          const isOwned = student.inventory?.unlockedStyles?.includes(item.config.style);
          const canAfford = student.wallet_points >= item.price;

          return (
            <div 
              key={item.id} 
              className={`border rounded-xl p-4 flex flex-col items-center transition-all ${
                isOwned ? 'bg-green-50 border-green-200' : 'hover:shadow-md border-gray-200'
              }`}
            >
              <div className="w-24 h-24 mb-4 bg-gray-100 rounded-full overflow-hidden flex items-center justify-center">
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs text-gray-400">No Image</span>
                )}
              </div>
              
              <h3 className="font-bold text-lg mb-1">{item.name}</h3>
              <p className="text-sm text-gray-500 mb-4 capitalize">{item.type.replace('_', ' ')}</p>
              
              <div className="mt-auto w-full">
                {isOwned ? (
                  <button disabled className="w-full py-2 bg-green-100 text-green-700 rounded-lg font-medium flex items-center justify-center gap-2 cursor-default">
                    <Check size={18} /> Đã sở hữu
                  </button>
                ) : (
                  <button
                    onClick={() => handlePurchase(item)}
                    disabled={!canAfford}
                    className={`w-full py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors ${
                      canAfford 
                        ? 'bg-indigo-600 text-white hover:bg-indigo-700' 
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {canAfford ? (
                      <>Mua với {item.price} Xu</>
                    ) : (
                      <><Lock size={16} /> Cần {item.price} Xu</>
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
