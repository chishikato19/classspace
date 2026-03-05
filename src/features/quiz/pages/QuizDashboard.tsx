import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Quiz } from '../../../types';
import { quizService } from '../services/quizService';
import { auth } from '../../../config/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { HomeworkModal } from '../components/HomeworkModal';
import { Play, Clock } from 'lucide-react';

export default function QuizDashboard() {
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Homework Modal State
  const [showHomeworkModal, setShowHomeworkModal] = useState(false);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);

  useEffect(() => {
    if (!auth) return;
    
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        loadQuizzes(user.uid);
      } else {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const loadQuizzes = async (userId: string) => {
    try {
      setLoading(true);
      const data = await quizService.getQuizzesByTeacher(userId);
      setQuizzes(data);
    } catch (error) {
      console.error("Failed to load quizzes", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartGame = (quizId: string) => {
    navigate(`/game/host/${quizId}`);
  };

  const handleAssignHomework = (quiz: Quiz) => {
    setSelectedQuiz(quiz);
    setShowHomeworkModal(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Thư viện câu hỏi của tôi</h1>
        <button 
          onClick={() => navigate('/teacher/quiz/new')}
          className="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        >
          + Tạo bộ câu hỏi mới
        </button>
      </div>
      
      {loading ? (
        <div className="text-center py-10">Đang tải...</div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {quizzes.map((quiz) => (
            <div key={quiz.id} className="flex flex-col overflow-hidden rounded-lg bg-white shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
              <div className="flex-1 p-6 flex flex-col justify-between">
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                      Sẵn sàng
                    </span>
                    <span className="text-sm text-gray-500">{quiz.questions.length} câu hỏi</span>
                  </div>
                  <div className="mt-2 block">
                    <p className="text-xl font-semibold text-gray-900">{quiz.title}</p>
                    <p className="mt-3 text-base text-gray-500 line-clamp-2">{quiz.description || 'Không có mô tả'}</p>
                  </div>
                </div>
                <div className="mt-6 flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleStartGame(quiz.id)}
                      className="flex-1 rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 flex items-center justify-center gap-2"
                    >
                      <Play size={16} /> Thi Trực Tiếp
                    </button>
                    <button 
                      onClick={() => handleAssignHomework(quiz)}
                      className="flex-1 rounded-md bg-white border border-indigo-600 px-3 py-2 text-sm font-semibold text-indigo-600 shadow-sm hover:bg-indigo-50 flex items-center justify-center gap-2"
                    >
                      <Clock size={16} /> Giao Bài Tập
                    </button>
                  </div>
                  <button 
                    onClick={() => navigate(`/teacher/quiz/edit/${quiz.id}`)}
                    className="w-full rounded-md bg-gray-50 px-2.5 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 border border-gray-200"
                  >
                    Chỉnh sửa nội dung
                  </button>
                </div>
              </div>
            </div>
          ))}
          {quizzes.length === 0 && (
            <div className="col-span-full text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <p className="text-gray-500">Bạn chưa có bộ câu hỏi nào. Hãy tạo mới ngay!</p>
            </div>
          )}
        </div>
      )}

      {showHomeworkModal && selectedQuiz && (
        <HomeworkModal 
          quizId={selectedQuiz.id}
          quizTitle={selectedQuiz.title}
          onClose={() => setShowHomeworkModal(false)}
        />
      )}
    </div>
  );
}
