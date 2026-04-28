import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { Exam, ExamAttempt } from '../types';
import { FileDown, Users, ShieldAlert, Award, Clock, ArrowLeft, Search } from 'lucide-react';

export default function TeacherExamResultsPage() {
  const { examId } = useParams();
  const [exam, setExam] = useState<Exam | null>(null);
  const [attempts, setAttempts] = useState<ExamAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!examId) return;

    const fetchData = async () => {
      try {
        const examSnap = await getDoc(doc(db, 'exams', examId));
        if (examSnap.exists()) {
          setExam(examSnap.data() as Exam);
        }

        const q = query(
          collection(db, 'examAttempts'),
          where('examId', '==', examId)
        );
        const attemptSnap = await getDocs(q);
        const attemptData = attemptSnap.docs.map(d => d.data() as ExamAttempt);
        setAttempts(attemptData.sort((a, b) => b.score - a.score));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [examId]);

  const filteredAttempts = attempts.filter(a => 
    a.studentName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const exportToCSV = () => {
    if (!exam || attempts.length === 0) return;
    
    const headers = ["Họ tên", "Số câu đúng", "Điểm", "Thời gian làm (phút)", "Số lần chuyển tab"];
    const rows = attempts.map(a => [
      a.studentName,
      a.totalCorrect,
      a.score,
      a.endTime ? Math.round((a.endTime - a.startTime) / 60000) : 0,
      a.tabSwitchCount
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + "\uFEFF" // BOM for Excel UTF-8
      + [headers, ...rows].map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Bao_cao_${exam.title.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Đang tải báo cáo...</div>;
  if (!exam) return <div className="min-h-screen flex items-center justify-center">Không tìm thấy đề thi.</div>;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-6">
        <Link to="/teacher/exams" className="text-indigo-600 hover:text-indigo-700 flex items-center gap-2 text-sm font-medium">
          <ArrowLeft className="w-4 h-4" /> Quay lại danh sách
        </Link>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{exam.title}</h1>
          <p className="text-slate-500">Báo cáo kết quả chi tiết của {attempts.length} thí sinh</p>
        </div>
        <button 
          onClick={exportToCSV}
          className="bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-colors shrink-0 shadow-sm"
        >
          <FileDown className="w-5 h-5" />
          Xuất file CSV (Excel)
        </button>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-2 text-indigo-500 mb-2">
            <Users className="w-5 h-5" />
            <span className="text-sm font-semibold uppercase tracking-wider">Học sinh đã thi</span>
          </div>
          <div className="text-3xl font-bold text-slate-800">{attempts.length}</div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-2 text-green-500 mb-2">
            <Award className="w-5 h-5" />
            <span className="text-sm font-semibold uppercase tracking-wider">Điểm trung bình</span>
          </div>
          <div className="text-3xl font-bold text-slate-800">
            {attempts.length > 0 ? (attempts.reduce((acc, curr) => acc + curr.score, 0) / attempts.length).toFixed(1) : 0}
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-2 text-red-500 mb-2">
            <ShieldAlert className="w-5 h-5" />
            <span className="text-sm font-semibold uppercase tracking-wider">Lượt nghi vấn gian lận</span>
          </div>
          <div className="text-3xl font-bold text-slate-800">
            {attempts.filter(a => a.tabSwitchCount > 0).length}
          </div>
        </div>
      </div>

      {/* Search and Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-slate-50/50">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input 
              type="text"
              placeholder="Tìm kiếm học sinh..."
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-sm font-semibold uppercase tracking-wider">
                <th className="px-6 py-4">Học sinh</th>
                <th className="px-6 py-4">Số câu đúng</th>
                <th className="px-6 py-4">Điểm</th>
                <th className="px-6 py-4">Thời gian</th>
                <th className="px-6 py-4">Chuyển tab</th>
                <th className="px-6 py-4 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAttempts.map((attempt) => (
                <tr key={attempt.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <span className="font-bold text-slate-800">{attempt.studentName}</span>
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    {attempt.totalCorrect} / {exam.questions.length}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-sm font-bold ${attempt.score >= 5 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {attempt.score.toFixed(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-500 text-sm">
                    {attempt.endTime ? <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {Math.round((attempt.endTime - attempt.startTime) / 60000)} phút</span> : 'N/A'}
                  </td>
                  <td className="px-6 py-4">
                    {attempt.tabSwitchCount > 0 ? (
                      <span className="text-red-600 font-bold flex items-center gap-1.5">
                        <ShieldAlert className="w-4 h-4" />
                        {attempt.tabSwitchCount} lần
                      </span>
                    ) : (
                      <span className="text-green-600">0</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">Chi tiết</button>
                  </td>
                </tr>
              ))}
              {filteredAttempts.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    Không tìm thấy dữ liệu phù hợp
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
