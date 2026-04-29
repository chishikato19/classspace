import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { Exam } from '../types';
import { User, Users, ArrowRight, ShieldCheck, Clock, AlertTriangle } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { classService, ClassData } from '../../random-selector/services/classService';

export default function ExamJoinPage() {
  const { examId } = useParams();
  const navigate = useNavigate();
  
  const [exam, setExam] = useState<Exam | null>(null);
  const [studentName, setStudentName] = useState('');
  const [studentClass, setStudentClass] = useState('');
  const [availableClasses, setAvailableClasses] = useState<ClassData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  useEffect(() => {
    if (!examId) return;
    
    const fetchExam = async () => {
      try {
        const docRef = await getDoc(doc(db, 'exams', examId));
        if (docRef.exists()) {
          const loadedExam = docRef.data() as Exam;
          setExam(loadedExam);
          
          if (loadedExam.requireClassInput) {
            const classes = await classService.getClassesByTeacher(loadedExam.teacherId);
            setAvailableClasses(classes);
          }
        } else {
          setError('Không tìm thấy đề thi. Mã đề có thể sai hoặc đã bị xóa.');
        }
      } catch (err) {
        setError('Lỗi khi tải dữ liệu đề thi.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchExam();
  }, [examId]);

  const handleStartExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!exam) return;
    if (exam.allowStudentInputName && !studentName.trim()) return;
    if (!exam.allowStudentInputName && !studentName) {
      alert("Vui lòng chọn tên của bạn!");
      return;
    }
    if (exam.requireClassInput && !studentClass.trim()) {
      alert("Vui lòng nhập lớp của bạn!");
      return;
    }

    if (exam.status !== 'published') {
      alert("Đề thi này chưa được mở hoặc đã đóng!");
      return;
    }

    try {
      setLoading(true);
      const attemptId = uuidv4();
      
      const newAttempt = {
        id: attemptId,
        examId: exam.id,
        studentName: studentName.trim(),
        studentClass: studentClass.trim() || null,
        startTime: Date.now(),
        submissions: {},
        score: 0,
        totalCorrect: 0,
        tabSwitchCount: 0,
        status: 'in-progress'
      };

      await setDoc(doc(db, 'examAttempts', attemptId), newAttempt);
      
      // Start fullscreen request on user interaction
      try {
        await document.documentElement.requestFullscreen();
      } catch (e) {
        console.log("Fullscreen request deferred to next page");
      }
      
      navigate(`/exam/${exam.id}/take/${attemptId}`);
    } catch (err) {
      console.error(err);
      alert("Lỗi khi bắt đầu thi. Vui lòng thử lại!");
      setLoading(false);
    }
  };

  if (loading && !exam) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center">Đang tải...</div>;
  }

  if (error || !exam) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm text-center max-w-md w-full">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Không thể truy cập</h2>
          <p className="text-slate-600">{error}</p>
          <button 
            onClick={() => navigate('/')}
            className="mt-6 w-full py-2 bg-slate-800 text-white rounded-lg font-medium"
          >
            Về trang chủ
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Banner */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 text-white rounded-2xl shadow-lg mb-4">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Hệ thống Thi Online</h1>
          <p className="text-slate-500 mt-2">Chế độ giám sát nghiêm ngặt</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
          <div className="bg-indigo-50/50 p-6 border-b border-indigo-100">
            <h2 className="font-bold text-xl text-slate-800 line-clamp-2">{exam.title}</h2>
            <div className="flex gap-4 mt-4 text-sm">
              <div className="flex items-center gap-1.5 text-slate-600 bg-white px-3 py-1.5 rounded-md border shadow-sm">
                <Clock className="w-4 h-4 text-indigo-500" />
                <span className="font-semibold">{exam.timeLimitMinutes} phút</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-600 bg-white px-3 py-1.5 rounded-md border shadow-sm">
                <Users className="w-4 h-4 text-indigo-500" />
                <span className="font-semibold">{exam.questions.length} câu</span>
              </div>
            </div>
          </div>

          <form onSubmit={handleStartExam} className="p-6 space-y-6">
            
            <div className="space-y-4">
              {exam.allowStudentInputName ? (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Họ và tên thí sinh</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                      type="text"
                      autoFocus
                      required
                      placeholder="Ví dụ: Nguyễn Văn A"
                      className="block w-full pl-10 pr-3 py-3 border border-slate-300 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50 focus:bg-white transition-colors"
                      value={studentName}
                      onChange={(e) => setStudentName(e.target.value)}
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Chọn tên của bạn</label>
                  <select 
                    required
                    className="block w-full pl-3 pr-10 py-3 border border-slate-300 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50 focus:bg-white"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                  >
                    <option value="">-- Chọn tên --</option>
                    {exam.allowedStudentNames?.map((name, idx) => (
                      <option key={idx} value={name}>{name}</option>
                    ))}
                  </select>
                </div>
              )}

              {exam.requireClassInput && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Thông tin Lớp học</label>
                  <div className="relative">
                    {exam.allowedClasses && exam.allowedClasses.length > 0 ? (
                      <select
                        required
                        className="block w-full px-3 py-3 border border-slate-300 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50 focus:bg-white transition-colors appearance-none"
                        value={studentClass}
                        onChange={(e) => setStudentClass(e.target.value)}
                      >
                        <option value="">-- Chọn lớp của bạn --</option>
                        {exam.allowedClasses.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    ) : (
                      <>
                        <input
                          type="text"
                          list="class-list"
                          required
                          placeholder="Chọn lớp hoặc nhập tên lớp..."
                          className="block w-full px-3 py-3 border border-slate-300 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50 focus:bg-white transition-colors"
                          value={studentClass}
                          onChange={(e) => setStudentClass(e.target.value)}
                          autoComplete="off"
                        />
                        <datalist id="class-list">
                          {availableClasses.map(c => (
                            <option key={c.id} value={c.name} />
                          ))}
                        </datalist>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 text-sm text-amber-800">
              <strong className="block mb-1 flex items-center gap-1">
                <AlertTriangle className="w-4 h-4" /> Lưu ý trước khi thi:
              </strong>
              <ul className="list-disc pl-5 space-y-1">
                <li>Bài thi sẽ tự động chạy toàn màn hình (Fullscreen).</li>
                <li>Không được chuyển tab, thoát toàn màn hình hay dùng phím tắt F12.</li>
                <li>Hệ thống <strong>tự động ghi nhận số lần vi phạm</strong>.</li>
              </ul>
            </div>

            <button
              type="submit"
              disabled={loading || !studentName.trim() || exam.status !== 'published'}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-all"
            >
              {loading ? 'Đang chuẩn bị...' : 'Bắt đầu làm bài'}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
