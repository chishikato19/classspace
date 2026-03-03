export default function SetupRequired() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white p-8 rounded-2xl shadow-xl border border-gray-200">
        <h1 className="text-3xl font-bold text-red-600 mb-4">Thiếu cấu hình Firebase!</h1>
        <p className="text-gray-700 mb-6 text-lg">
          Ứng dụng cần kết nối với Firebase để hoạt động (lưu trữ câu hỏi, điểm số realtime). 
          Hiện tại hệ thống chưa tìm thấy các biến môi trường cấu hình Firebase.
        </p>
        <div className="bg-gray-900 text-green-400 p-6 rounded-lg font-mono text-sm overflow-x-auto mb-6 shadow-inner">
          <p className="text-gray-400 mb-2">// Vui lòng thêm các biến sau vào cấu hình Secrets của AI Studio</p>
          <p className="text-gray-400 mb-4">// hoặc file .env nếu chạy local:</p>
          <p>VITE_FIREBASE_API_KEY="<span className="text-yellow-300">your-api-key</span>"</p>
          <p>VITE_FIREBASE_AUTH_DOMAIN="<span className="text-yellow-300">your-auth-domain</span>"</p>
          <p>VITE_FIREBASE_PROJECT_ID="<span className="text-yellow-300">your-project-id</span>"</p>
          <p>VITE_FIREBASE_STORAGE_BUCKET="<span className="text-yellow-300">your-storage-bucket</span>"</p>
          <p>VITE_FIREBASE_MESSAGING_SENDER_ID="<span className="text-yellow-300">your-sender-id</span>"</p>
          <p>VITE_FIREBASE_APP_ID="<span className="text-yellow-300">your-app-id</span>"</p>
        </div>
        <div className="bg-blue-50 text-blue-800 p-4 rounded-lg text-sm">
          <strong>Hướng dẫn:</strong>
          <ol className="list-decimal ml-5 mt-2 space-y-1">
            <li>Truy cập <a href="https://console.firebase.google.com/" target="_blank" rel="noreferrer" className="underline font-bold">Firebase Console</a></li>
            <li>Tạo một Project mới (hoặc chọn project có sẵn).</li>
            <li>Thêm ứng dụng Web (biểu tượng <code>&lt;/&gt;</code>) để lấy cấu hình.</li>
            <li>Bật <strong>Firestore Database</strong> ở chế độ Test Mode.</li>
            <li>Copy các giá trị tương ứng vào Secrets.</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
