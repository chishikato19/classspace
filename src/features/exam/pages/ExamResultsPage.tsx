import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { ExamAttempt, Exam } from '../types';
import { CheckCircle2, ShieldAlert, Award, Clock } from 'lucide-react';

export default function ExamResultsPage() {
  const { examId, attemptId } = useParams();
  const [exam, setExam] = useState<Exam | null>(null);
  const [attempt, setAttempt] = useState<ExamAttempt | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!examId || !attemptId) return;

    const fetchData = async () => {
      try {
        const [examDoc, attemptDoc] = await Promise.all([
          getDoc(doc(db, 'exams', examId)),
          getDoc(doc(db, 'examAttempts', attemptId))
        ]);

        if (examDoc.exists()) setExam(examDoc.data() as Exam);
        if (attemptDoc.exists()) setAttempt(attemptDoc.data() as ExamAttempt);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [examId, attemptId]);

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center">Đang tải kết quả...</div>;
  if (!exam || !attempt) return <div className="min-h-screen bg-slate-50 flex items-center justify-center">Không tìm thấy dữ liệu.</div>;

  const durationMin = attempt.endTime 
    ? Math.round((attempt.endTime - attempt.startTime) / 60000)
    : 0;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100">
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-8 text-center text-white">
          <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-md border border-white/30">
            <CheckCircle2 className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold mb-1">Nộp bài thành công!</h2>
          <p className="text-indigo-100">{exam.title}</p>
        </div>

        <div className="p-8">
          <div className="text-center mb-8">
            <p className="text-slate-500 text-sm font-medium uppercase tracking-wider mb-2">Điểm số của bạn</p>
            <div className="text-6xl font-black text-slate-800 tracking-tighter">
              {attempt.score.toFixed(1)}<span className="text-3xl text-slate-400">/10</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div className="flex items-center gap-2 text-indigo-600 mb-1.5">
                <Award className="w-4 h-4" />
                <span className="font-semibold text-sm">Số câu đúng</span>
              </div>
              <div className="text-xl font-bold text-slate-800">{attempt.totalCorrect} <span className="text-sm font-medium text-slate-500">/ {exam.questions.length}</span></div>
            </div>
            
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div className="flex items-center gap-2 text-indigo-600 mb-1.5">
                <Clock className="w-4 h-4" />
                <span className="font-semibold text-sm">Thời gian làm</span>
              </div>
              <div className="text-xl font-bold text-slate-800">{durationMin} <span className="text-sm font-medium text-slate-500">phút</span></div>
            </div>
          </div>

          {attempt.tabSwitchCount > 0 && (
            <div className="bg-red-50 border border-red-100 p-4 rounded-xl flex items-start gap-3 mb-6">
              <ShieldAlert className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-red-800 text-sm">Hệ thống ghi nhận vi phạm</h4>
                <p className="text-red-600 text-xs mt-1">Bạn đã chuyển tab {attempt.tabSwitchCount} lần trong quá trình thi. Lịch sử đã được báo cáo lại cho giáo viên.</p>
              </div>
            </div>
          )}

          <div className="border-t border-slate-100 pt-6">
             <Link 
              to="/"
              className="w-full flex items-center justify-center py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl transition-colors"
             >
               Về trang chủ
             </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
