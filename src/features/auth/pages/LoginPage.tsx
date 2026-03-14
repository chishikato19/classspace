import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../../config/firebase';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (!auth) return;

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        if (user.email && user.email.includes('admin')) {
          navigate('/admin');
        } else {
          navigate('/teacher/dashboard');
        }
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    
    try {
      const user = await authService.loginWithGoogle();
      
      // Phân quyền đơn giản: Nếu email có chữ admin thì vào trang Admin
      if (user.email && user.email.includes('admin')) {
        navigate('/admin');
      } else {
        navigate('/teacher/dashboard');
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Cửa sổ đăng nhập đã bị đóng trước khi hoàn tất. Vui lòng thử lại và giữ cửa sổ mở cho đến khi đăng nhập xong.');
      } else if (err.code === 'auth/popup-blocked') {
        setError('Trình duyệt của bạn đã chặn cửa sổ đăng nhập. Vui lòng cho phép hiển thị popup (cửa sổ bật lên) cho trang web này.');
      } else if (err.code === 'auth/unauthorized-domain') {
        setError('Tên miền này chưa được cấp quyền đăng nhập Firebase. Vui lòng kiểm tra lại cấu hình Firebase.');
      } else {
        setError(err.message || 'Đã có lỗi xảy ra. Vui lòng thử lại.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center">
      <div className="w-full max-w-md space-y-8 bg-white p-8 rounded-2xl shadow-lg border border-gray-100">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">
            Đăng nhập
          </h2>
          <p className="mt-2 text-sm text-gray-600">Dành cho Giáo viên & Quản trị viên</p>
        </div>
        
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm text-center">
            {error}
          </div>
        )}

        <div className="mt-8 space-y-6">
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="group relative flex w-full justify-center items-center gap-3 rounded-md bg-white border border-gray-300 px-3 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50 shadow-sm"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            {loading ? 'Đang xử lý...' : 'Đăng nhập với Google'}
          </button>
        </div>
      </div>
    </div>
  );
}
