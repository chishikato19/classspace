import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { auth, db } from '../../../config/firebase';
import { Exam } from '../types';
import { Link } from 'react-router-dom';
import { PlusCircle, FileText,  Users, Clock, PlayCircle, Settings, ChevronRight } from 'lucide-react';

export default function TeacherExamDashboard() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchExams = async () => {
      if (!auth.currentUser) return;
      try {
        const q = query(
          collection(db, 'exams'),
          where('teacherId', '==', auth.currentUser.uid),
          orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => doc.data() as Exam);
        setExams(data);
      } catch (err) {
        console.error("Lỗi khi tải danh sách đề thi:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchExams();
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Quản lý Đề thi</h1>
          <p className="text-slate-500 mt-1">Tạo, chia sẻ và chấm điểm đề thi tự động</p>
        </div>
        <Link 
          to="/teacher/exams/new"
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-colors"
        >
          <PlusCircle className="w-5 h-5" />
          Tạo đề mới
        </Link>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white h-24 rounded-2xl border border-slate-100"></div>
          ))}
        </div>
      ) : exams.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 border-dashed p-12 text-center flex flex-col items-center">
          <div className="w-16 h-16 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center mb-4">
            <FileText className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">Chưa có đề thi nào</h3>
          <p className="text-slate-500 mt-2 mb-6 max-w-md">Tạo đề thi mới bằng cách nhập file Word (.docx) hoặc soạn thảo trực tiếp để bắt đầu.</p>
          <Link 
            to="/teacher/exams/new"
            className="bg-indigo-50 text-indigo-600 hover:bg-indigo-100 px-6 py-2.5 rounded-lg font-medium transition-colors"
          >
            Tạo đề thi đầu tiên
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {exams.map(exam => (
             <div key={exam.id} className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-indigo-300 transition-colors flex items-center justify-between group shadow-sm">
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-xl ${exam.status === 'published' ? 'bg-green-50 text-green-600' : 'bg-slate-100 text-slate-500'}`}>
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                      {exam.title}
                      {exam.status === 'published' && (
                        <span className="text-[10px] uppercase font-bold tracking-wider bg-green-100 text-green-700 px-2 py-0.5 rounded">Đang mở</span>
                      )}
                      {exam.status === 'closed' && (
                        <span className="text-[10px] uppercase font-bold tracking-wider bg-slate-100 text-slate-600 px-2 py-0.5 rounded">Đã đóng</span>
                      )}
                    </h3>
                    <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                      <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> {exam.timeLimitMinutes} phút</span>
                      <span className="text-slate-300">|</span>
                      <span className="flex items-center gap-1.5"><FileText className="w-4 h-4" /> {exam.questions.length} câu</span>
                      <span className="text-slate-300">|</span>
                      <span className="flex items-center gap-1.5 tracking-tight">ID: {exam.id.substring(0, 8)}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => {
                       navigator.clipboard.writeText(`${window.location.origin}/#/e/${exam.id}`);
                       alert("Đã copy link bài thi!");
                    }}
                    className="p-2 hover:bg-slate-100 text-slate-600 rounded-lg flex items-center gap-2 text-sm font-medium"
                    title="Copy link tham gia"
                  >
                     <span className="hidden sm:inline">Copy Link</span>
                  </button>
                  <Link 
                    to={`/teacher/exams/${exam.id}/results`}
                    className="p-2 hover:bg-indigo-50 text-indigo-600 rounded-lg flex items-center gap-2 text-sm font-medium"
                  >
                    <span className="hidden sm:inline">Báo cáo</span>
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
             </div>
          ))}
        </div>
      )}
    </div>
  );
}
