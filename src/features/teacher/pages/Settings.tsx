import { useState, useEffect } from 'react';
import { Save, Eye, EyeOff } from 'lucide-react';

export default function Settings() {
  const [noDuplicate, setNoDuplicate] = useState(false);
  const [hideSelected, setHideSelected] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    const savedNoDuplicate = localStorage.getItem('randomSelector_noDuplicate');
    if (savedNoDuplicate) {
      setNoDuplicate(JSON.parse(savedNoDuplicate));
    }
    const savedHideSelected = localStorage.getItem('randomSelector_hideSelected');
    if (savedHideSelected) {
      setHideSelected(JSON.parse(savedHideSelected));
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem('randomSelector_noDuplicate', JSON.stringify(noDuplicate));
    localStorage.setItem('randomSelector_hideSelected', JSON.stringify(hideSelected));
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Cài đặt hệ thống</h1>
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Công cụ chọn ngẫu nhiên</h2>
          <p className="text-sm text-gray-500 mt-1">Cấu hình cho các công cụ chọn học sinh</p>
        </div>
        
        <div className="p-6 space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <label htmlFor="noDuplicate" className="text-base font-medium text-gray-900 block">
                Không trùng lặp
              </label>
              <p className="text-sm text-gray-500 mt-1">
                Khi bật, học sinh đã được chọn sẽ không xuất hiện lại trong phiên làm việc hiện tại.
              </p>
            </div>
            <button
              id="noDuplicate"
              onClick={() => setNoDuplicate(!noDuplicate)}
              className={`
                relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2
                ${noDuplicate ? 'bg-indigo-600' : 'bg-gray-200'}
              `}
              role="switch"
              aria-checked={noDuplicate}
            >
              <span
                aria-hidden="true"
                className={`
                  pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out
                  ${noDuplicate ? 'translate-x-5' : 'translate-x-0'}
                `}
              />
            </button>
          </div>

          {noDuplicate && (
            <div className="pl-6 border-l-4 border-indigo-100 space-y-4 animate-in slide-in-from-left-2 duration-200">
              <h3 className="text-sm font-bold text-indigo-600 uppercase tracking-wider">Tùy chọn hiển thị</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  onClick={() => setHideSelected(true)}
                  className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                    hideSelected 
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700' 
                      : 'border-gray-100 bg-gray-50 text-gray-500 hover:border-gray-200'
                  }`}
                >
                  <EyeOff className="w-5 h-5" />
                  <div className="text-left">
                    <p className="font-bold text-sm">Ẩn học sinh</p>
                    <p className="text-xs opacity-80">Không hiện tên đã chọn</p>
                  </div>
                </button>

                <button
                  onClick={() => setHideSelected(false)}
                  className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                    !hideSelected 
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700' 
                      : 'border-gray-100 bg-gray-50 text-gray-500 hover:border-gray-200'
                  }`}
                >
                  <Eye className="w-5 h-5" />
                  <div className="text-left">
                    <p className="font-bold text-sm">Vẫn hiển thị</p>
                    <p className="text-xs opacity-80">Hiện nhưng không gọi lại</p>
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>
        
        <div className="bg-gray-50 px-6 py-4 flex items-center justify-end">
          {showSuccess && (
            <span className="text-green-600 text-sm font-medium mr-4 animate-fade-in">
              Đã lưu cài đặt!
            </span>
          )}
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <Save className="w-4 h-4" />
            Lưu thay đổi
          </button>
        </div>
      </div>
    </div>
  );
}
