import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { ExamAttempt, Exam } from '../types';
import { CheckCircle2, ShieldAlert, Award, Clock, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { deobfuscateAnswer, deobfuscateStringAnswer } from '../utils/obfuscator';

export default function ExamResultsPage() {
  const { examId, attemptId } = useParams();
  const [exam, setExam] = useState<Exam | null>(null);
  const [attempt, setAttempt] = useState<ExamAttempt | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);

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

  const maxScore = exam.questions.reduce((acc, q) => acc + (q.points || 0), 0) || 10;
  const isPracticeMode = exam.isPracticeMode;
  const passingScorePercentage = exam.passingPercentage || 0;
  const actualPercentage = (attempt.score / maxScore) * 100;
  const isPassed = actualPercentage >= passingScorePercentage;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center p-4 py-12">
      <div className={`${showDetails ? 'max-w-4xl' : 'max-w-md'} w-full transition-all duration-300 bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100`}>
        <div className={`p-8 text-center text-white ${isPracticeMode ? (isPassed ? 'bg-gradient-to-br from-green-500 to-emerald-600' : 'bg-gradient-to-br from-red-500 to-rose-600') : 'bg-gradient-to-br from-indigo-500 to-purple-600'}`}>
          <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-md border border-white/30">
            {isPracticeMode ? (
              isPassed ? <CheckCircle2 className="w-10 h-10 text-white" /> : <XCircle className="w-10 h-10 text-white" />
            ) : (
              <CheckCircle2 className="w-10 h-10 text-white" />
            )}
          </div>
          <h2 className="text-2xl font-bold mb-1">
            {isPracticeMode 
              ? (isPassed ? 'Chúc mừng! Bạn đã Đạt' : 'Chưa Đạt! Cố gắng lần sau') 
              : 'Nộp bài thành công!'}
          </h2>
          <p className="text-white/80">{exam.title}</p>
        </div>

        <div className="p-8">
          <div className="text-center mb-8">
            <p className="text-slate-500 text-sm font-medium uppercase tracking-wider mb-2">Điểm số của bạn</p>
            <div className="text-6xl font-black text-slate-800 tracking-tighter">
              {Number(attempt.score.toFixed(2))}<span className="text-3xl text-slate-400">/{Number(maxScore.toFixed(2))}</span>
            </div>
            {isPracticeMode && (
              <div className="mt-2 text-sm text-slate-500 font-medium">
                Yêu cầu tối thiểu: {passingScorePercentage}% ({Number((passingScorePercentage * maxScore / 100).toFixed(2))} điểm)
              </div>
            )}
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

          {isPracticeMode && (
            <div className="mb-6">
              <button 
                onClick={() => setShowDetails(!showDetails)}
                className="w-full flex items-center justify-between p-4 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-medium rounded-xl transition-colors border border-indigo-100"
              >
                <span>Xem chi tiết đáp án</span>
                {showDetails ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </button>
            </div>
          )}

          {showDetails && isPracticeMode && (
             <div className="mt-8 pt-8 border-t border-slate-200">
               <h3 className="text-lg font-bold text-slate-800 mb-6">Chi tiết bài làm</h3>
               <div className="space-y-6">
                 {exam.questions.map((q, idx) => {
                   const studentAns = attempt.submissions[q.id];
                   const isUnanswered = studentAns === undefined;
                   
                   let isCorrect = false;
                   let correctString = '';
                   
                   if (q.type === 'short_answer') {
                     const correctAnsStr = deobfuscateStringAnswer(q.obfuscatedAnswer || '', q.id);
                     correctString = correctAnsStr.replace(/\|\|/g, ' hoặc ');
                     const validAnswers = correctAnsStr.split('||').map(s => s.trim().toLowerCase());
                     const studentAnsStr = String(studentAns || '').trim().toLowerCase();
                     if (studentAns !== undefined && validAnswers.includes(studentAnsStr)) {
                       isCorrect = true;
                     }
                   } else if (q.type === 'true_false_cluster') {
                     const realAnsArr = (deobfuscateStringAnswer(q.obfuscatedAnswer || '', q.id) || '').split(',');
                     const subAnsArr = (studentAns !== undefined ? String(studentAns) : '').split(',');
                     let correctCount = 0;
                     for(let i=0; i<4; i++) {
                       const expectedVal = realAnsArr[i] === 'true' ? 'T' : 'F';
                       if (subAnsArr[i] === expectedVal) correctCount++;
                     }
                     if (correctCount === 4) isCorrect = true; // simplifying "completely correct" concept here
                   } else {
                     const correctIndex = deobfuscateAnswer(q.obfuscatedAnswer || '', q.id);
                     if (studentAns === correctIndex) isCorrect = true;
                   }

                   return (
                     <div key={q.id} className={`p-4 rounded-xl border ${isCorrect ? 'bg-green-50 border-green-200' : isUnanswered ? 'bg-slate-50 border-slate-200' : 'bg-red-50 border-red-200'}`}>
                       <div className="flex justify-between items-start mb-2">
                         <div className="font-medium text-slate-800 prose prose-slate max-w-none prose-p:my-1 prose-img:my-2 prose-img:rounded-lg prose-img:max-h-48 prose-img:object-contain">
                           <p className="font-bold inline-block mr-2">Câu {idx + 1}:</p>
                           <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{q.text}</ReactMarkdown>
                           {q.imageUrl && <img src={q.imageUrl} alt="Question" className="mt-2" />}
                         </div>
                       </div>
                       
                       <div className="space-y-2 mt-3">
                         {q.type === 'short_answer' ? (
                           <div className="text-sm">
                              <p className="mb-2"><span className="font-semibold text-green-700">Đáp án chuẩn:</span> {correctString}</p>
                              <div className={`p-2 rounded-lg border flex flex-col gap-1 ${isCorrect ? 'bg-green-100 border-green-300 text-green-800 font-medium' : isUnanswered ? 'bg-slate-100 border-slate-200 text-slate-500' : 'bg-red-100 border-red-300 text-red-800 font-medium'}`}>
                                 <span className="font-semibold text-xs opacity-70">Bạn đã trả lời:</span>
                                 <span>{isUnanswered ? '(Không trả lời)' : String(studentAns)}</span>
                              </div>
                           </div>
                         ) : q.type === 'true_false_cluster' ? (
                           <div className="grid grid-cols-1 gap-2">
                              {q.options.map((opt, oIdx) => {
                                 const realAnsArr = (deobfuscateStringAnswer(q.obfuscatedAnswer || '', q.id) || '').split(',');
                                 const subAnsArr = (studentAns !== undefined ? String(studentAns) : '').split(',');
                                 const expectedVal = realAnsArr[oIdx] === 'true' ? 'T' : 'F';
                                 const isCorrectSub = subAnsArr[oIdx] === expectedVal;
                                 const hasAnsSub = subAnsArr[oIdx] === 'T' || subAnsArr[oIdx] === 'F';
                                 return (
                                   <div key={oIdx} className={`p-3 rounded-lg text-sm border flex items-start gap-3 ${hasAnsSub ? (isCorrectSub ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200') : 'bg-white border-slate-200'}`}>
                                     <span className="font-bold flex-shrink-0">{String.fromCharCode(97 + oIdx)}.</span>
                                     <div className="flex-1 prose prose-sm max-w-none prose-p:my-0 prose-img:my-1 prose-img:rounded lg:prose-img:max-h-24">
                                       <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{opt}</ReactMarkdown>
                                     </div>
                                     <div className="flex flex-col items-end shrink-0 gap-1 text-xs">
                                        <span className="text-slate-500">
                                           Chuẩn: <span className="font-bold">{realAnsArr[oIdx] === 'true' ? 'Đúng' : 'Sai'}</span>
                                        </span>
                                        <span className={`${hasAnsSub ? (isCorrectSub ? 'text-green-700' : 'text-red-600') : 'text-slate-400'}`}>
                                           Bạn chọn: <span className="font-bold">{hasAnsSub ? (subAnsArr[oIdx] === 'T' ? 'Đúng' : 'Sai') : '(Trống)'}</span>
                                        </span>
                                     </div>
                                   </div>
                                 )
                              })}
                           </div>
                         ) : (
                           q.options.map((opt, oIdx) => {
                             const correctIndex = deobfuscateAnswer(q.obfuscatedAnswer || '', q.id);
                             return (
                               <div key={oIdx} className={`p-2 rounded-lg text-sm border flex items-start gap-2 ${
                                 oIdx === correctIndex ? 'bg-green-100 border-green-300 text-green-800 font-medium' :
                                 oIdx === studentAns ? 'bg-red-100 border-red-300 text-red-800 font-medium' :
                                 'bg-white border-slate-200 text-slate-600'
                               }`}>
                                  <span className="font-bold flex-shrink-0">{String.fromCharCode(65 + oIdx)}.</span>
                                  <div className="flex-1 prose prose-sm max-w-none prose-p:my-0 prose-img:my-1 prose-img:rounded lg:prose-img:max-h-24">
                                    <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{opt}</ReactMarkdown>
                                    {q.optionImageUrls && q.optionImageUrls[oIdx] && (
                                      <img src={q.optionImageUrls[oIdx]!} alt="Option" />
                                    )}
                                  </div>
                                  {oIdx === correctIndex && <span className="ml-auto text-xs whitespace-nowrap">(Đáp án đúng)</span>}
                                  {oIdx === studentAns && oIdx !== correctIndex && <span className="ml-auto text-xs whitespace-nowrap text-red-600">(Đã chọn)</span>}
                               </div>
                             );
                           })
                         )}
                       </div>
                     </div>
                   );
                 })}
               </div>
             </div>
          )}

          <div className="border-t border-slate-100 pt-6 mt-6">
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
