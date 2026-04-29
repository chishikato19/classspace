import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { Exam, ExamAttempt } from '../types';
import { FileDown, Users, ShieldAlert, Award, Clock, ArrowLeft, Search } from 'lucide-react';
import { deobfuscateAnswer } from '../utils/obfuscator';

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

  const [sortConfig, setSortConfig] = useState<{ key: 'name' | 'score' | 'time', direction: 'asc' | 'desc' }>({ key: 'score', direction: 'desc' });
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedAttempt, setSelectedAttempt] = useState<ExamAttempt | null>(null);

  const classes = Array.from(new Set(attempts.map(a => a.studentClass || 'Khác'))).sort();

  const filteredAttempts = attempts.filter(a => {
    const matchesName = a.studentName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesClass = selectedClass === 'all' || (a.studentClass || 'Khác') === selectedClass;
    return matchesName && matchesClass;
  });

  const sortedAttempts = [...filteredAttempts].sort((a, b) => {
    if (sortConfig.key === 'name') {
      return sortConfig.direction === 'asc' 
        ? a.studentName.localeCompare(b.studentName)
        : b.studentName.localeCompare(a.studentName);
    }
    if (sortConfig.key === 'score') {
      return sortConfig.direction === 'asc' 
        ? a.score - b.score
        : b.score - a.score;
    }
    if (sortConfig.key === 'time') {
      const timeA = a.endTime || Number.MAX_SAFE_INTEGER;
      const timeB = b.endTime || Number.MAX_SAFE_INTEGER;
      return sortConfig.direction === 'asc' 
        ? timeA - timeB
        : timeB - timeA;
    }
    return 0;
  });

  const handleSort = (key: 'name' | 'score' | 'time') => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const formatTime = (ts: number) => {
    return new Intl.DateTimeFormat('vi-VN', {
      hour: '2-digit', minute: '2-digit',
      day: '2-digit', month: '2-digit', year: 'numeric'
    }).format(new Date(ts));
  };

  const exportToCSV = () => {
    if (!exam || attempts.length === 0) return;
    
    const headers = ["Họ tên", "Lớp", "Số câu đúng", "Điểm", "Bắt đầu", "Kết thúc", "Thời gian làm (phút)", "Số lần chuyển tab"];
    const rows = filteredAttempts.map(a => [
      `"${a.studentName}"`,
      `"${a.studentClass || 'Khác'}"`,
      a.totalCorrect,
      a.score,
      `"${formatTime(a.startTime)}"`,
      `"${a.endTime ? formatTime(a.endTime) : 'Chưa nộp'}"`,
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
        <div className="p-4 border-b bg-slate-50/50 flex gap-4">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input 
              type="text"
              placeholder="Tìm kiếm học sinh..."
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          {classes.length > 0 && (
            <select
              className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
              value={selectedClass}
              onChange={e => setSelectedClass(e.target.value)}
            >
              <option value="all">Tất cả các lớp</option>
              {classes.map(c => (
                <option key={c} value={c}>Lớp: {c}</option>
              ))}
            </select>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-sm font-semibold uppercase tracking-wider">
                <th 
                  className="px-6 py-4 cursor-pointer hover:bg-slate-100"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center gap-1">
                    Học sinh {sortConfig.key === 'name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </div>
                </th>
                <th className="px-6 py-4">Lớp</th>
                <th className="px-6 py-4">Số câu đúng</th>
                <th 
                  className="px-6 py-4 cursor-pointer hover:bg-slate-100"
                  onClick={() => handleSort('score')}
                >
                  <div className="flex items-center gap-1">
                    Điểm {sortConfig.key === 'score' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </div>
                </th>
                <th className="px-6 py-4">Thời gian làm</th>
                <th 
                  className="px-6 py-4 cursor-pointer hover:bg-slate-100"
                  onClick={() => handleSort('time')}
                >
                  <div className="flex items-center gap-1">
                    Nộp bài lúc {sortConfig.key === 'time' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </div>
                </th>
                <th className="px-6 py-4">Chuyển tab</th>
                <th className="px-6 py-4 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedAttempts.map((attempt) => (
                <tr key={attempt.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <span className="font-bold text-slate-800">{attempt.studentName}</span>
                  </td>
                  <td className="px-6 py-4 text-slate-600 font-medium">
                    {attempt.studentClass || '-'}
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
                    {attempt.endTime ? <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {Math.round((attempt.endTime - attempt.startTime) / 60000)} phút</span> : 'Đang làm'}
                  </td>
                  <td className="px-6 py-4 text-slate-500 text-sm font-medium">
                    {attempt.endTime ? formatTime(attempt.endTime) : '-'}
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
                    <button 
                      onClick={() => setSelectedAttempt(attempt)}
                      className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                    >
                      Chi tiết
                    </button>
                  </td>
                </tr>
              ))}
              {sortedAttempts.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-slate-500">
                    Không tìm thấy dữ liệu phù hợp
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedAttempt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-slate-800">Chi tiết bài thi - {selectedAttempt.studentName}</h3>
                <p className="text-slate-500 text-sm mt-1">Đạt {selectedAttempt.score.toFixed(1)} điểm ({selectedAttempt.totalCorrect}/{exam.questions.length})</p>
              </div>
              <button 
                onClick={() => setSelectedAttempt(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                Đóng
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-6">
               {exam.questions.map((q, idx) => {
                  const studentAnswerIdx = selectedAttempt.submissions[q.id];
                  // decode correct answer
                  let correctIndex = -1;
                  try {
                    correctIndex = deobfuscateAnswer(q.obfuscatedAnswer || '', q.id);
                  } catch (e) {
                     console.error("Decode error:", e);
                  }
                  
                  const isCorrect = studentAnswerIdx === correctIndex;
                  const isUnanswered = studentAnswerIdx === undefined;

                  return (
                    <div key={q.id} className={`p-4 rounded-xl border ${isCorrect ? 'bg-green-50 border-green-200' : isUnanswered ? 'bg-slate-50 border-slate-200' : 'bg-red-50 border-red-200'}`}>
                      <div className="flex justify-between items-start mb-2">
                        <p className="font-medium text-slate-800">Câu {idx + 1}: {q.text}</p>
                        <span className="text-sm font-semibold text-slate-500 whitespace-nowrap bg-white px-2 py-1 rounded border ml-4">
                          {typeof q.points === 'number' ? q.points : (10/exam.questions.length).toFixed(2)} điểm
                        </span>
                      </div>
                      <div className="space-y-2 mt-3">
                         {q.options.map((opt, oIdx) => (
                            <div key={oIdx} className={`p-2 rounded-lg text-sm border ${
                              oIdx === correctIndex ? 'bg-green-100 border-green-300 text-green-800 font-medium' :
                              oIdx === studentAnswerIdx ? 'bg-red-100 border-red-300 text-red-800 font-medium' :
                              'bg-white border-slate-200 text-slate-600'
                            }`}>
                               {String.fromCharCode(65 + oIdx)}. {opt}
                               {oIdx === correctIndex && " (Đáp án đúng)"}
                               {oIdx === studentAnswerIdx && oIdx !== correctIndex && " (Đã chọn)"}
                            </div>
                         ))}
                      </div>
                    </div>
                  );
               })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
