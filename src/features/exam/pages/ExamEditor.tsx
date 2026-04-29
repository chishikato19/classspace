import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../../../config/firebase';
import { Exam, ExamQuestion } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { obfuscateAnswer, deobfuscateAnswer } from '../utils/obfuscator';
import { Pickaxe, Save, Upload, FileText, PlusCircle } from 'lucide-react';

export default function ExamEditor() {
  const navigate = useNavigate();
  const { examId: editExamId } = useParams();
  const [searchParams] = useSearchParams();
  const folderId = searchParams.get('folderId');

  const [title, setTitle] = useState('');
  const [timeLimit, setTimeLimit] = useState(45);
  const [allowStudentInputName, setAllowStudentInputName] = useState(true);
  const [allowedStudentNamesText, setAllowedStudentNamesText] = useState('');
  const [requireClassInput, setRequireClassInput] = useState(false);
  const [loading, setLoading] = useState(false);

  const [questions, setQuestions] = useState<{
    text: string;
    options: string[];
    correctIndex: number;
    points: number;
  }[]>([
    { text: 'Thủ đô của Việt Nam là gì?', options: ['Hồ Chí Minh', 'Đà Nẵng', 'Hà Nội', 'Huế'], correctIndex: 2, points: 10 }
  ]);

  useEffect(() => {
    if (editExamId) {
      setLoading(true);
      getDoc(doc(db, 'exams', editExamId)).then(snap => {
        if (snap.exists()) {
          const data = snap.data() as Exam;
          setTitle(data.title);
          setTimeLimit(data.timeLimitMinutes);
          setAllowStudentInputName(data.allowStudentInputName);
          setAllowedStudentNamesText(data.allowedStudentNames?.join('\n') || '');
          setRequireClassInput(data.requireClassInput || false);
          
          setQuestions(data.questions.map(q => ({
            text: q.text,
            options: q.options,
            correctIndex: deobfuscateAnswer(q.obfuscatedAnswer || '', q.id),
            points: q.points || 0
          })));
        }
      }).finally(() => setLoading(false));
    }
  }, [editExamId]);

  const totalScore = questions.reduce((acc, q) => acc + (q.points || 0), 0);

  const handleAddQuestion = () => {
    const pointsPerQ = Number(((totalScore || 10) / (questions.length + 1)).toFixed(2));
    setQuestions(questions.map(q => ({...q, points: pointsPerQ })).concat([
      { text: '', options: ['', '', '', ''], correctIndex: 0, points: pointsPerQ }
    ]));
  };

  const handleSetTotalScore = (newTotal: number) => {
    if (questions.length === 0) return;
    const pointsPerQ = Number((newTotal / questions.length).toFixed(2));
    setQuestions(questions.map(q => ({...q, points: pointsPerQ })));
  };

  const handleSave = async (status: 'published' | 'closed') => {
    if (!auth.currentUser) return;
    if (!title.trim() || questions.length === 0) {
      alert("Vui lòng nhập tên đề thi và ít nhất 1 câu hỏi.");
      return;
    }
    
    let allowedNames: string[] = [];
    if (!allowStudentInputName) {
      allowedNames = allowedStudentNamesText.split('\n').map(n => n.trim()).filter(n => n.length > 0);
      if (allowedNames.length === 0) {
        alert("Vui lòng nhập danh sách tên học sinh hợp lệ.");
        return;
      }
    }

    setLoading(true);
    const examId = editExamId || Math.random().toString(36).substring(2, 8).toUpperCase();
    
    const formattedQuestions: ExamQuestion[] = questions.map(q => {
      const qId = uuidv4();
      return {
        id: qId,
        text: q.text,
        points: q.points || 0,
        options: q.options,
        obfuscatedAnswer: obfuscateAnswer(q.correctIndex, qId)
      };
    });

    const newExam: Exam = {
      id: examId,
      title: title.trim(),
      timeLimitMinutes: timeLimit,
      questions: formattedQuestions,
      allowStudentInputName,
      allowedStudentNames: allowStudentInputName ? [] : allowedNames,
      requireClassInput,
      status: status,
      teacherId: auth.currentUser.uid,
      createdAt: Date.now(),
      ...(folderId ? { folderId } : {})
    };

    try {
      if (editExamId) {
        await updateDoc(doc(db, 'exams', examId), newExam as any);
      } else {
        await setDoc(doc(db, 'exams', examId), newExam);
      }
      alert(editExamId ? "Cập nhật đề thi thành công!" : "Tạo đề thi thành công!");
      navigate('/teacher/exams');
    } catch (err) {
      console.error(err);
      alert("Lỗi khi lưu đề thi!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Tạo đề thi mới</h1>
          <p className="text-slate-500">Soạn thảo hoặc nhập từ file Word</p>
        </div>
        <div className="flex gap-3">
          <button 
            disabled={loading}
            onClick={() => handleSave('published')}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            <Save className="w-5 h-5" />
            Lưu & Mở ngay
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Tên đề thi</label>
            <input 
              type="text" 
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Ví dụ: Kiểm tra 15p Toán Hình..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Thời gian làm bài (Phút)</label>
            <input 
              type="number" 
              value={timeLimit}
              onChange={e => setTimeLimit(parseInt(e.target.value) || 0)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Tổng điểm bài thi</label>
            <input 
              type="number" 
              step="0.01"
              value={totalScore}
              onChange={e => handleSetTotalScore(parseFloat(e.target.value) || 0)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input 
                type="checkbox" 
                checked={!allowStudentInputName} 
                onChange={e => setAllowStudentInputName(!e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded"
              />
              Yêu cầu học sinh chọn tên từ danh sách
            </label>
            {!allowStudentInputName && (
              <textarea 
                value={allowedStudentNamesText}
                onChange={e => setAllowedStudentNamesText(e.target.value)}
                placeholder="Nhập phần tên học sinh, mỗi người một dòng..."
                className="w-full mt-2 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 min-h-[100px] text-sm"
              />
            )}
          </div>
          <div>
             <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input 
                type="checkbox" 
                checked={requireClassInput} 
                onChange={e => setRequireClassInput(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded"
              />
              Yêu cầu học sinh nhập/chọn thông tin lớp
            </label>
            <p className="text-xs text-slate-500 mt-1 ml-6">
              Giúp phân loại trong báo cáo kết quả thi.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100 flex items-center justify-between mb-6">
         <div className="flex items-center gap-3">
            <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600">
               <Upload className="w-5 h-5" />
            </div>
            <div>
               <h4 className="font-semibold text-indigo-900">Nhập từ file Word (Tự động nhận diện)</h4>
               <p className="text-sm text-indigo-700">Hỗ trợ định dạng .docx chuẩn Azota</p>
            </div>
         </div>
         <button className="bg-white border border-indigo-200 text-indigo-600 px-4 py-2 rounded-lg font-medium hover:bg-indigo-50 shadow-sm transition-colors text-sm">
            Chọn File
         </button>
      </div>

      <div className="space-y-6">
        {questions.map((q, qIndex) => (
          <div key={qIndex} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 relative">
            <div className="absolute top-4 right-4 flex items-center gap-3">
              <div className="text-slate-400 font-bold text-sm bg-slate-100 px-2 py-1 rounded">
                Câu {qIndex + 1}
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-slate-600">Điểm:</label>
                <input 
                  type="number"
                  step="0.01"
                  value={q.points || 0}
                  onChange={e => {
                    const newQ = [...questions];
                    newQ[qIndex].points = parseFloat(e.target.value) || 0;
                    setQuestions(newQ);
                  }}
                  className="w-20 px-2 py-1 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div className="mb-4 mt-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">Nội dung câu hỏi</label>
              <textarea 
                value={q.text}
                onChange={e => {
                  const newQ = [...questions];
                  newQ[qIndex].text = e.target.value;
                  setQuestions(newQ);
                }}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 min-h-[100px]"
                placeholder="Nhập câu hỏi..."
              />
            </div>
            
            <div className="space-y-3">
              <label className="block text-sm font-medium text-slate-700">Các đáp án</label>
              {q.options.map((opt, optIndex) => (
                <div key={optIndex} className="flex items-center gap-3">
                   <input 
                      type="radio" 
                      name={`correct-${qIndex}`}
                      checked={q.correctIndex === optIndex}
                      onChange={() => {
                        const newQ = [...questions];
                        newQ[qIndex].correctIndex = optIndex;
                        setQuestions(newQ);
                      }}
                      className="w-5 h-5 text-green-600 focus:ring-green-500 cursor-pointer"
                      title="Đánh dấu đáp án đúng"
                   />
                   <div className="flex-1 flex gap-2">
                      <span className="font-bold text-slate-500 mt-2">{String.fromCharCode(65 + optIndex)}.</span>
                      <input 
                        type="text"
                        value={opt}
                        onChange={e => {
                          const newQ = [...questions];
                          newQ[qIndex].options[optIndex] = e.target.value;
                          setQuestions(newQ);
                        }}
                        className={`flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 ${q.correctIndex === optIndex ? 'border-green-300 bg-green-50' : 'border-slate-300'}`}
                        placeholder={`Đáp án ${String.fromCharCode(65 + optIndex)}`}
                      />
                   </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <button 
        onClick={handleAddQuestion}
        className="w-full mt-6 py-4 border-2 border-dashed border-slate-300 rounded-xl text-slate-600 font-medium hover:border-indigo-400 hover:text-indigo-600 transition-colors flex items-center justify-center gap-2"
      >
        <PlusCircle className="w-5 h-5" />
        Thêm câu hỏi
      </button>

    </div>
  )
}
