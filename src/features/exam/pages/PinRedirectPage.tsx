import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { Loader2, AlertCircle } from 'lucide-react';

export default function PinRedirectPage() {
  const { pin } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const resolvePin = async () => {
      if (!pin) return;
      try {
        const cleanPin = pin.trim().toUpperCase();
        const q = query(
          collection(db, 'exams'),
          where('pin', '==', cleanPin),
          limit(1)
        );
        const snapshot = await getDocs(q);
        if (snapshot.empty) {
          setError('Không tìm thấy bài thi với mã PIN này. Vui lòng kiểm tra lại.');
          return;
        }
        const examId = snapshot.docs[0].id;
        navigate(`/e/${examId}`, { replace: true });
      } catch (err) {
        console.error(err);
        setError('Đã xảy ra lỗi khi tìm kiếm bài thi.');
      }
    };

    resolvePin();
  }, [pin, navigate]);

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-sm w-full text-center border border-slate-100">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Lỗi truy cập</h2>
          <p className="text-slate-500 mb-6">{error}</p>
          <button 
            onClick={() => navigate('/')}
            className="w-full bg-indigo-600 text-white py-2.5 rounded-xl font-bold hover:bg-indigo-700 transition-colors"
          >
            Quay lại trang chủ
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mx-auto mb-4" />
        <p className="text-slate-500 font-medium">Đang chuyển hướng đến bài thi...</p>
      </div>
    </div>
  );
}
