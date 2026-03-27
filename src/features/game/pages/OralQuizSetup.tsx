import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Quiz, ClassGroup } from '../../../types';
import { quizService } from '../../quiz/services/quizService';
import { classService } from '../../random-selector/services/classService';
import { gameService } from '../services/gameService';
import { auth } from '../../../config/firebase';
import { ArrowLeft, Play, Settings, Users, Target, Shuffle } from 'lucide-react';

export default function OralQuizSetup() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  
  // Settings
  const [showQuestionBeforeSelection, setShowQuestionBeforeSelection] = useState(true);
  const [randomMethod, setRandomMethod] = useState('wheel');

  useEffect(() => {
    if (!quizId) return;
    
    const loadData = async () => {
      try {
        const [quizData, classesData] = await Promise.all([
          quizService.getQuizById(quizId),
          classService.getClassesByTeacher(auth.currentUser?.uid || '')
        ]);
        setQuiz(quizData);
        setClasses(classesData as any);
        if (classesData.length > 0) {
          setSelectedClassId(classesData[0].id);
        }
      } catch (error) {
        console.error("Failed to load setup data", error);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [quizId]);

  const handleStart = async () => {
    if (!quizId || !selectedClassId || creating) return;
    
    setCreating(true);
    try {
      const { id: sessionId } = await gameService.createSession(
        quizId,
        {
          showQuestionBeforeSelection,
          randomMethod,
          shuffleQuestions: false,
          shuffleAnswers: false,
          equalPoints: true,
          timeBasedPoints: false,
          streakBonus: false,
          showCorrectAnswers: 'IMMEDIATELY',
          showScore: true,
          maxAttempts: 1,
          requirePasscode: false,
          allowRetry: false,
          redoWrongQuestions: false
        },
        'ORAL_QUIZ',
        undefined,
        quiz?.title,
        {
          type: 'CLASS_LIST',
          classId: selectedClassId
        }
      );
      
      navigate(`/game/oral-quiz/${sessionId}`);
    } catch (error) {
      console.error("Failed to create oral quiz session", error);
      alert("Lỗi khi tạo phòng thi. Vui lòng thử lại.");
      setCreating(false);
    }
  };

  if (loading) return <div className="flex h-screen items-center justify-center">Đang tải...</div>;
  if (!quiz) return <div className="flex h-screen items-center justify-center">Không tìm thấy bộ câu hỏi</div>;

  const randomMethods = [
    { id: 'wheel', name: 'Vòng quay may mắn', icon: <Shuffle size={20} /> },
    { id: 'name', name: 'Tên ngẫu nhiên', icon: <Users size={20} /> },
    { id: 'magic', name: 'Mũ ảo thuật', icon: <Target size={20} /> },
    { id: 'card', name: 'Lật thẻ bài', icon: <Play size={20} /> },
    { id: 'slot', name: 'Máy quay số', icon: <Settings size={20} /> },
    { id: 'box', name: 'Mở hộp quà', icon: <Shuffle size={20} /> },
    { id: 'elimination', name: 'Loại trừ', icon: <Users size={20} /> },
    { id: 'balloon', name: 'Bắn bóng', icon: <Target size={20} /> },
    { id: 'race', name: 'Đua xe', icon: <Play size={20} /> },
    { id: 'scratch', name: 'Thẻ cào', icon: <Settings size={20} /> },
    { id: 'duck', name: 'Bắn vịt', icon: <Shuffle size={20} /> }
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto">
        <button 
          onClick={() => navigate('/teacher/dashboard')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-8 font-medium"
        >
          <ArrowLeft size={20} />
          Quay lại thư viện
        </button>

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
          <div className="bg-indigo-600 p-8 text-white">
            <h1 className="text-3xl font-bold mb-2">Thiết lập Kiểm tra miệng</h1>
            <p className="text-indigo-100 opacity-90">Bộ câu hỏi: {quiz.title}</p>
          </div>

          <div className="p-8 space-y-8">
            {/* Class Selection */}
            <section>
              <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-500" />
                CHỌN LỚP HỌC
              </label>
              <select 
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium"
              >
                <option value="">-- Chọn lớp --</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              {classes.length === 0 && (
                <p className="mt-2 text-sm text-red-500">Bạn chưa có lớp học nào. Hãy tạo lớp trước khi bắt đầu.</p>
              )}
            </section>

            {/* Game Settings */}
            <section className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600">
                    <Play size={20} />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">Hiện câu hỏi trước khi chọn</p>
                    <p className="text-sm text-gray-500">Học sinh sẽ thấy câu hỏi trước khi giáo viên quay chọn</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowQuestionBeforeSelection(!showQuestionBeforeSelection)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${showQuestionBeforeSelection ? 'bg-indigo-600' : 'bg-gray-300'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${showQuestionBeforeSelection ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                  <Shuffle className="w-5 h-5 text-indigo-500" />
                  PHƯƠNG THỨC CHỌN HỌC SINH
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {randomMethods.map((method) => (
                    <button
                      key={method.id}
                      onClick={() => setRandomMethod(method.id)}
                      className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${
                        randomMethod === method.id 
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-700' 
                          : 'border-gray-100 bg-white text-gray-600 hover:border-gray-200'
                      }`}
                    >
                      <div className={`p-2 rounded-lg ${randomMethod === method.id ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
                        {method.icon}
                      </div>
                      <span className="font-bold">{method.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </section>

            <button
              onClick={handleStart}
              disabled={!selectedClassId || creating}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-5 rounded-2xl font-black text-xl shadow-lg shadow-indigo-200 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-3"
            >
              {creating ? 'ĐANG KHỞI TẠO...' : (
                <>
                  <Play size={24} fill="currentColor" />
                  BẮT ĐẦU KIỂM TRA
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
