import { useState, useEffect } from 'react';
import { Save, Eye, EyeOff, Keyboard, Printer } from 'lucide-react';
import { PlickersCardsPrint } from '../components/PlickersCardsPrint';

export default function Settings() {
  const [noDuplicate, setNoDuplicate] = useState(false);
  const [hideSelected, setHideSelected] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);

  // Local Battle Key Bindings
  const [redKeys, setRedKeys] = useState({
    up: 'w', left: 'a', down: 's', right: 'd',
    item1: '1', item2: '2', item3: '3'
  });
  const [blueKeys, setBlueKeys] = useState({
    up: 'ArrowUp', left: 'ArrowLeft', down: 'ArrowDown', right: 'ArrowRight',
    item1: '7', item2: '8', item3: '9'
  });

  useEffect(() => {
    const savedNoDuplicate = localStorage.getItem('randomSelector_noDuplicate');
    if (savedNoDuplicate) {
      setNoDuplicate(JSON.parse(savedNoDuplicate));
    }
    const savedHideSelected = localStorage.getItem('randomSelector_hideSelected');
    if (savedHideSelected) {
      setHideSelected(JSON.parse(savedHideSelected));
    }

    const savedRedKeys = localStorage.getItem('localBattle_redKeys');
    if (savedRedKeys) setRedKeys(JSON.parse(savedRedKeys));
    
    const savedBlueKeys = localStorage.getItem('localBattle_blueKeys');
    if (savedBlueKeys) setBlueKeys(JSON.parse(savedBlueKeys));
  }, []);

  const handleSave = () => {
    localStorage.setItem('randomSelector_noDuplicate', JSON.stringify(noDuplicate));
    localStorage.setItem('randomSelector_hideSelected', JSON.stringify(hideSelected));
    localStorage.setItem('localBattle_redKeys', JSON.stringify(redKeys));
    localStorage.setItem('localBattle_blueKeys', JSON.stringify(blueKeys));
    
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6 print:hidden">Cài đặt hệ thống</h1>
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden print:hidden">
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
        
        {/* Local Battle Key Bindings Settings */}
        <div className="border-t border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Keyboard className="w-5 h-5 text-indigo-600" />
              Cài đặt phím Đấu trường (Local Battle)
            </h2>
            <p className="text-sm text-gray-500 mt-1">Tùy chỉnh phím điều khiển cho hai đội</p>
          </div>
          
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Red Team Keys */}
            <div className="bg-red-50 p-6 rounded-xl border border-red-100">
              <h3 className="text-lg font-bold text-red-600 mb-4">ĐỘI ĐỎ</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-red-800 mb-2">Phím di chuyển/chọn đáp án</label>
                  <div className="grid grid-cols-3 gap-2 max-w-[150px]">
                    <input type="text" maxLength={1} value={redKeys.up} onChange={e => setRedKeys(p => ({...p, up: e.target.value}))} className="col-start-2 w-10 h-10 text-center bg-white border border-red-300 rounded font-bold uppercase focus:ring-2 focus:ring-red-500 focus:border-red-500" title="Lên" />
                    <input type="text" maxLength={1} value={redKeys.left} onChange={e => setRedKeys(p => ({...p, left: e.target.value}))} className="col-start-1 row-start-2 w-10 h-10 text-center bg-white border border-red-300 rounded font-bold uppercase focus:ring-2 focus:ring-red-500 focus:border-red-500" title="Trái" />
                    <input type="text" maxLength={1} value={redKeys.down} onChange={e => setRedKeys(p => ({...p, down: e.target.value}))} className="col-start-2 row-start-2 w-10 h-10 text-center bg-white border border-red-300 rounded font-bold uppercase focus:ring-2 focus:ring-red-500 focus:border-red-500" title="Xuống" />
                    <input type="text" maxLength={1} value={redKeys.right} onChange={e => setRedKeys(p => ({...p, right: e.target.value}))} className="col-start-3 row-start-2 w-10 h-10 text-center bg-white border border-red-300 rounded font-bold uppercase focus:ring-2 focus:ring-red-500 focus:border-red-500" title="Phải" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-red-800 mb-2">Phím sử dụng vật phẩm</label>
                  <div className="flex gap-2">
                    <input type="text" maxLength={1} value={redKeys.item1} onChange={e => setRedKeys(p => ({...p, item1: e.target.value}))} className="w-10 h-10 text-center bg-white border border-red-300 rounded font-bold uppercase focus:ring-2 focus:ring-red-500 focus:border-red-500" title="Vật phẩm 1" />
                    <input type="text" maxLength={1} value={redKeys.item2} onChange={e => setRedKeys(p => ({...p, item2: e.target.value}))} className="w-10 h-10 text-center bg-white border border-red-300 rounded font-bold uppercase focus:ring-2 focus:ring-red-500 focus:border-red-500" title="Vật phẩm 2" />
                    <input type="text" maxLength={1} value={redKeys.item3} onChange={e => setRedKeys(p => ({...p, item3: e.target.value}))} className="w-10 h-10 text-center bg-white border border-red-300 rounded font-bold uppercase focus:ring-2 focus:ring-red-500 focus:border-red-500" title="Vật phẩm 3" />
                  </div>
                </div>
              </div>
            </div>

            {/* Blue Team Keys */}
            <div className="bg-blue-50 p-6 rounded-xl border border-blue-100">
              <h3 className="text-lg font-bold text-blue-600 mb-4">ĐỘI XANH</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-blue-800 mb-2">Phím di chuyển/chọn đáp án</label>
                  <div className="grid grid-cols-3 gap-2 max-w-[150px]">
                    <input type="text" maxLength={10} value={blueKeys.up} onChange={e => setBlueKeys(p => ({...p, up: e.target.value}))} className="col-start-2 w-10 h-10 text-center bg-white border border-blue-300 rounded font-bold text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" title="Lên (ArrowUp)" />
                    <input type="text" maxLength={10} value={blueKeys.left} onChange={e => setBlueKeys(p => ({...p, left: e.target.value}))} className="col-start-1 row-start-2 w-10 h-10 text-center bg-white border border-blue-300 rounded font-bold text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" title="Trái (ArrowLeft)" />
                    <input type="text" maxLength={10} value={blueKeys.down} onChange={e => setBlueKeys(p => ({...p, down: e.target.value}))} className="col-start-2 row-start-2 w-10 h-10 text-center bg-white border border-blue-300 rounded font-bold text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" title="Xuống (ArrowDown)" />
                    <input type="text" maxLength={10} value={blueKeys.right} onChange={e => setBlueKeys(p => ({...p, right: e.target.value}))} className="col-start-3 row-start-2 w-10 h-10 text-center bg-white border border-blue-300 rounded font-bold text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" title="Phải (ArrowRight)" />
                  </div>
                  <p className="text-xs text-blue-500 mt-1">Gợi ý: ArrowUp, ArrowLeft...</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-blue-800 mb-2">Phím sử dụng vật phẩm</label>
                  <div className="flex gap-2">
                    <input type="text" maxLength={1} value={blueKeys.item1} onChange={e => setBlueKeys(p => ({...p, item1: e.target.value}))} className="w-10 h-10 text-center bg-white border border-blue-300 rounded font-bold uppercase focus:ring-2 focus:ring-blue-500 focus:border-blue-500" title="Vật phẩm 1" />
                    <input type="text" maxLength={1} value={blueKeys.item2} onChange={e => setBlueKeys(p => ({...p, item2: e.target.value}))} className="w-10 h-10 text-center bg-white border border-blue-300 rounded font-bold uppercase focus:ring-2 focus:ring-blue-500 focus:border-blue-500" title="Vật phẩm 2" />
                    <input type="text" maxLength={1} value={blueKeys.item3} onChange={e => setBlueKeys(p => ({...p, item3: e.target.value}))} className="w-10 h-10 text-center bg-white border border-blue-300 rounded font-bold uppercase focus:ring-2 focus:ring-blue-500 focus:border-blue-500" title="Vật phẩm 3" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="border-t border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Printer className="w-5 h-5 text-indigo-600" />
              In thẻ Plickers
            </h2>
            <p className="text-sm text-gray-500 mt-1">In bộ 60 thẻ để học sinh sử dụng trong lớp học</p>
          </div>
          <div className="p-6">
            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
              >
                <Printer className="w-4 h-4" />
                In bộ 60 thẻ (A4)
              </button>
              
              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
              >
                <Save className="w-4 h-4" />
                Xuất ra file PDF
              </button>
            </div>
            <div className="mt-4 p-4 bg-blue-50 text-blue-800 rounded-lg text-sm">
              <p className="font-semibold mb-1">💡 Hướng dẫn xuất PDF:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Nhấn nút <strong>Xuất ra file PDF</strong> hoặc <strong>In bộ 60 thẻ</strong>.</li>
                <li>Trong hộp thoại in hiện ra, tìm mục <strong>Destination (Máy in đích)</strong>.</li>
                <li>Chọn <strong>Save as PDF (Lưu dưới dạng PDF)</strong>.</li>
                <li>Nhấn <strong>Save (Lưu)</strong> để tải file về máy.</li>
              </ul>
            </div>
            <p className="mt-4 text-sm text-gray-500">
              Lưu ý: Mỗi thẻ sẽ được in trên 1 tờ giấy A4. Hãy đảm bảo máy in của bạn đã sẵn sàng hoặc chọn lưu thành PDF để in sau.
            </p>
          </div>
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
      <PlickersCardsPrint />
    </div>
  );
}
