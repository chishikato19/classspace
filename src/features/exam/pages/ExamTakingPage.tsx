import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, doc, getDoc, updateDoc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { Exam, ExamAttempt, ExamQuestion } from '../types';
import { deobfuscateAnswer } from '../utils/obfuscator';
import { Timer, AlertTriangle, Send, CheckCircle2, LayoutGrid } from 'lucide-react';

export default function ExamTakingPage() {
  const { examId, attemptId } = useParams();
  const navigate = useNavigate();

  const [exam, setExam] = useState<Exam | null>(null);
  const [attempt, setAttempt] = useState<ExamAttempt | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [shuffledQuestions, setShuffledQuestions] = useState<(ExamQuestion & { originalIndex: number, optionMapping: number[] })[]>([]);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [isSubmitWarning, setIsSubmitWarning] = useState(false);
  const [tabWarnings, setTabWarnings] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);

  // Parse exam and attempt
  useEffect(() => {
    if (!examId || !attemptId) return;

    const fetchExam = async () => {
      const examDoc = await getDoc(doc(db, 'exams', examId));
      if (examDoc.exists()) {
        const examData = examDoc.data() as Exam;
        setExam(examData);
      }
    };
    
    // Listen to attempt directly
    const unsubAttempt = onSnapshot(doc(db, 'examAttempts', attemptId), (docSnap) => {
      if (docSnap.exists()) {
        const attemptData = docSnap.data() as ExamAttempt;
        
        // Recover local progress if it exists and is newer than server
        const cacheKey = `exam_submissions_${attemptId}`;
        const localProgress = localStorage.getItem(cacheKey);
        if (localProgress && attemptData.status === 'in-progress') {
          attemptData.submissions = {
            ...attemptData.submissions,
            ...JSON.parse(localProgress)
          };
        }
        
        setAttempt(attemptData);
        
        if (exam) {
          // Calculate time left based on startTime and current time
          const now = Date.now();
          const elapsed = now - attemptData.startTime;
          const remaining = Math.max(0, (exam.timeLimitMinutes * 60 * 1000) - elapsed);
          setTimeLeft(remaining);

          if (attemptData.status === 'submitted') {
            navigate(`/exam/${examId}/results/${attemptId}`);
          }
        }
      }
    });

    fetchExam();
    return () => unsubAttempt();
  }, [examId, attemptId, navigate]);

  // Handle Fullscreen & Anti-Cheat
  useEffect(() => {
    // 1. Enter Fullscreen
    const enterFullscreen = async () => {
      try {
        if (!document.fullscreenElement) {
          await document.documentElement.requestFullscreen();
        }
      } catch (e) {
        console.warn("Could not request fullscreen", e);
      }
    };
    enterFullscreen();

    // 2. Tab switch detection
    const handleVisibilityChange = async () => {
      if (document.hidden && attempt && attempt.status === 'in-progress') {
        const newWarnings = tabWarnings + 1;
        setTabWarnings(newWarnings);
        alert(`Cảnh báo gian lận! Bạn đã chuyển tab ${newWarnings} lần. Hệ thống đã ghi nhận.`);
        try {
          await updateDoc(doc(db, 'examAttempts', attemptId!), {
            tabSwitchCount: newWarnings
          });
        } catch (error) {
          console.error("Lỗi cập nhật cảnh báo:", error);
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // 3. F12 and Context Menu Prevention
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && e.key === 'I')) {
        e.preventDefault();
        alert("Cảnh báo: Hành động kiểm tra phần tử bị vô hiệu hóa trong chế độ thi!");
      }
    };
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('contextmenu', handleContextMenu);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('contextmenu', handleContextMenu);
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(e => console.warn(e));
      }
    };
  }, [attemptId, tabWarnings, attempt]);

  // Shuffle Questions and Answers for this user once
  useEffect(() => {
    if (exam && shuffledQuestions.length === 0) {
      // Create a deterministic pseudo-random shuffle based on attemptId
      // For simplicity here we just use Math.random but in a real app, seeding based on attemptId is better 
      // so it survives reloads without reshuffling. We will save the layout to sessionStorage.
      const cacheKey = `exam_layout_${attemptId}`;
      const cached = sessionStorage.getItem(cacheKey);
      
      if (cached) {
        setShuffledQuestions(JSON.parse(cached));
      } else {
        const shuffled = [...exam.questions].map((q, idx) => ({ q, originalIndex: idx }))
          .sort(() => Math.random() - 0.5)
          .map(item => {
            const optionsMap = item.q.options.map((_, i) => i).sort(() => Math.random() - 0.5);
            const shuffledOptions = optionsMap.map(origIdx => item.q.options[origIdx]);
            
            return {
              ...item.q,
              options: shuffledOptions,
              originalIndex: item.originalIndex,
              optionMapping: optionsMap // array where index is shuffled option, value is original option index
            };
          });
        sessionStorage.setItem(cacheKey, JSON.stringify(shuffled));
        setShuffledQuestions(shuffled);
      }
    }
  }, [exam, attemptId, shuffledQuestions.length]);

  // Timer Countdown
  useEffect(() => {
    if (!exam || !attempt || attempt.status === 'submitted') return;
    
    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = now - attempt.startTime;
      const remainingMs = (exam.timeLimitMinutes * 60 * 1000) - Math.floor(elapsed);
      
      if (remainingMs <= 0) {
        clearInterval(interval);
        setTimeLeft(0);
        handleSubmit(true); // Auto submit
      } else {
        setTimeLeft(remainingMs);
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [exam, attempt]);

  const handleSelectAnswer = (questionId: string, shuffledOptionIndex: number) => {
    if (!attempt || attempt.status === 'submitted') return;
    
    // Map shuffled option back to original option index
    const q = shuffledQuestions.find(sq => sq.id === questionId);
    if (!q) return;
    const originalOptionIndex = q.optionMapping[shuffledOptionIndex];

    const newSubmissions = {
      ...attempt.submissions,
      [questionId]: originalOptionIndex
    };
    
    setAttempt({ ...attempt, submissions: newSubmissions });
    
    // SAVE LOCALLY ONLY (Avoid expensive Firebase writes per click)
    // We only write to Firebase on "Nộp bài" or when "Hết giờ"
    const cacheKey = `exam_submissions_${attemptId}`;
    localStorage.setItem(cacheKey, JSON.stringify(newSubmissions));
  };

  const calculateScore = (submissions: Record<string, number>): { score: number, correct: number } => {
    if (!exam) return { score: 0, correct: 0 };
    let correctCount = 0;
    
    exam.questions.forEach(q => {
      const sub = submissions[q.id];
      if (sub !== undefined && q.obfuscatedAnswer) {
        const correctIndex = deobfuscateAnswer(q.obfuscatedAnswer, q.id);
        if (sub === correctIndex) correctCount++;
      }
    });

    const score = (correctCount / exam.questions.length) * 10;
    return { score: parseFloat(score.toFixed(2)), correct: correctCount };
  };

  const handleSubmitRequest = () => {
    const answeredCount = Object.keys(attempt?.submissions || {}).length;
    const totalCount = exam?.questions.length || 0;
    
    if (answeredCount < totalCount) {
      setIsSubmitWarning(true);
    } else {
      setIsSubmitWarning(false);
    }
    setShowSubmitModal(true);
  };

  const handleSubmit = async (auto = false) => {
    if (!exam || !attemptId || !attempt) return;
    
    // Get the latest submissions from local storage or state
    const finalSubmissions = attempt.submissions;
    const { score, correct } = calculateScore(finalSubmissions);
    
    try {
      // FINAL WRITE TO FIREBASE (Crucial for cost optimization)
      await updateDoc(doc(db, 'examAttempts', attemptId), {
        submissions: finalSubmissions,
        status: 'submitted',
        endTime: Date.now(),
        score,
        totalCorrect: correct
      });
      
      // Clear local cache
      localStorage.removeItem(`exam_submissions_${attemptId}`);
      localStorage.removeItem(`exam_layout_${attemptId}`);
      
      setShowSubmitModal(false);
      navigate(`/exam/${examId}/results/${attemptId}`);
    } catch (error) {
      console.error("Submission Error:", error);
      alert("Lỗi khi nộp bài! Vui lòng kiểm tra kết nối mạng và thử lại.");
    }
  };

  const formatTime = (ms: number) => {
    if (ms <= 0) return "00:00:00";
    const totalSeconds = Math.floor(ms / 1000);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    if (h > 0) return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const scrollToQuestion = (id: string) => {
    const el = document.getElementById(`question-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  if (!exam || !attempt || shuffledQuestions.length === 0) {
    return <div className="h-screen w-full flex items-center justify-center">Đang tải đề thi...</div>;
  }

  const answeredCount = Object.keys(attempt.submissions).length;
  const isDangerTime = timeLeft < 60000; // < 1 min

  return (
    <div ref={containerRef} className="h-screen w-full bg-slate-50 flex flex-col font-sans overflow-hidden select-none">
      {/* Top Navbar */}
      <header className="bg-white border-b h-16 flex items-center justify-between px-6 shrink-0 shadow-sm z-10">
        <div>
          <h1 className="font-bold text-lg text-slate-800 line-clamp-1">{exam.title}</h1>
          <p className="text-sm text-slate-500">Thí sinh: {attempt.studentName}</p>
        </div>
        
        <div className="flex items-center gap-6">
          <div className={`flex items-center gap-2 font-mono text-xl font-bold px-4 py-2 rounded-lg ${isDangerTime ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-slate-100 text-slate-700'}`}>
            <Timer className="w-5 h-5" />
            {formatTime(timeLeft)}
          </div>
          <button 
            onClick={handleSubmitRequest}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            Nộp bài
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* Questions Scroll Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth" style={{ scrollBehavior: 'smooth' }}>
          <div className="max-w-4xl mx-auto space-y-6 pb-32">
            {shuffledQuestions.map((q, index) => (
              <div 
                key={q.id} 
                id={`question-${q.id}`}
                className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 transition-all hover:border-indigo-200"
              >
                <div className="flex gap-4">
                  <div className="shrink-0 w-8 h-8 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center font-bold">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="text-slate-800 text-lg font-medium mb-6 whitespace-pre-wrap">
                      {q.text}
                    </div>
                    {q.imageUrl && (
                      <img src={q.imageUrl} alt="Question ref" className="max-w-full h-auto rounded-lg mb-6 max-h-96 object-contain" />
                    )}
                    
                    <div className="space-y-3">
                      {q.options.map((opt, optIndex) => {
                        const originalOptIndex = q.optionMapping[optIndex];
                        const isSelected = attempt.submissions[q.id] === originalOptIndex;
                        const label = String.fromCharCode(65 + optIndex); // A, B, C, D
                        
                        return (
                          <label 
                            key={optIndex} 
                            className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                              isSelected 
                                ? 'border-indigo-600 bg-indigo-50 text-indigo-900' 
                                : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'
                            }`}
                          >
                            <input 
                              type="radio" 
                              name={`question-${q.id}`} 
                              value={originalOptIndex}
                              checked={isSelected}
                              onChange={() => handleSelectAnswer(q.id, optIndex)}
                              className="mt-1 w-5 h-5 text-indigo-600 border-gray-300 focus:ring-indigo-600"
                            />
                            <div className="flex-1 flex gap-3">
                              <span className="font-semibold w-6">{label}.</span>
                              <span className="flex-1">{opt}</span>
                            </div>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </main>

        {/* Right Sidebar - Navigation Map */}
        <aside className="w-72 bg-white border-l flex flex-col shadow-sm z-10 hidden lg:flex">
          <div className="p-4 border-b">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              <LayoutGrid className="w-5 h-5 text-slate-500" />
              Tiến độ làm bài
            </h3>
            <div className="mt-2 text-sm text-slate-600">
              Đã làm: <span className="font-bold text-indigo-600">{answeredCount}</span> / {exam.questions.length}
            </div>
            {/* Progress bar */}
            <div className="w-full bg-slate-100 h-2 rounded-full mt-3 overflow-hidden">
              <div 
                className="bg-indigo-600 h-full transition-all duration-500" 
                style={{ width: `${(answeredCount / exam.questions.length) * 100}%` }}
              />
            </div>
          </div>
          
          <div className="flex-1 p-4 overflow-y-auto">
            <div className="grid grid-cols-4 gap-2">
              {shuffledQuestions.map((q, idx) => {
                const isAnswered = attempt.submissions[q.id] !== undefined;
                return (
                  <button
                    key={q.id}
                    onClick={() => scrollToQuestion(q.id)}
                    className={`h-10 rounded font-medium text-sm flex items-center justify-center transition-all ${
                      isAnswered 
                        ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm' 
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>
        </aside>
      </div>

      {/* Submit Confirmation Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-in slide-in-from-bottom-4 duration-200">
            <div className="flex items-center gap-4 mb-4">
              {isSubmitWarning ? (
                <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-6 h-6" />
                </div>
              ) : (
                <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
              )}
              <div>
                <h3 className="text-xl font-bold text-slate-800">Xác nhận nộp bài</h3>
                <p className="text-slate-500 text-sm mt-1">Bạn có chắc chắn muốn nộp bài ngay?</p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-lg p-4 mb-6 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Thời gian còn lại:</span>
                <span className="font-bold text-slate-800">{formatTime(timeLeft)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Số câu đã làm:</span>
                <span className={`font-bold ${isSubmitWarning ? 'text-amber-600' : 'text-green-600'}`}>
                  {answeredCount} / {exam.questions.length}
                </span>
              </div>
            </div>

            {isSubmitWarning && (
              <p className="text-amber-700 text-sm bg-amber-50 p-3 rounded-lg mb-6 border border-amber-100">
                Chú ý: Bạn vẫn còn <span className="font-bold">{exam.questions.length - answeredCount}</span> câu chưa làm. 
                Hãy kiểm tra lại kỹ trước khi nộp.
              </p>
            )}

            <div className="flex gap-3 mt-6">
              <button 
                onClick={() => setShowSubmitModal(false)}
                className="flex-1 py-2.5 rounded-lg font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-colors"
              >
                Tiếp tục làm bài
              </button>
              <button 
                onClick={() => handleSubmit(false)}
                className="flex-1 py-2.5 rounded-lg font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                Nộp bài ngay
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
