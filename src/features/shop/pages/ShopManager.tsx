import { shopService } from '../services/shopService';
import { ShoppingBag } from 'lucide-react';

export default function ShopManager() {
  const handleInitShop = async () => {
    if (confirm('Bạn có chắc muốn khởi tạo lại dữ liệu cửa hàng?')) {
      await shopService.initializeShopItems();
      alert('Đã khởi tạo dữ liệu cửa hàng!');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <ShoppingBag className="w-8 h-8 text-indigo-600" />
          Quản lý Cửa hàng
        </h1>
      </div>

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
    </div>
  );
}
