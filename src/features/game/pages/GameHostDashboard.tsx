import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { GameSession, Quiz, Question } from '../../../types';
import { gameService } from '../services/gameService';
import { quizService } from '../../quiz/services/quizService';
import { StudentAvatar } from '../../../components/Avatar/StudentAvatar';
import { CheckCircle2, XCircle, Users, Clock, ArrowRight } from 'lucide-react';

export default function GameHostDashboard() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState<GameSession | null>(null);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    if (!sessionId) return;
    const unsubscribe = gameService.subscribeToSession(sessionId, async (data) => {
      setSession(data);
      if (!quiz && data.quizId) {
        const quizData = await quizService.getQuizById(data.quizId);
        setQuiz(quizData);
      }
    });
    return () => unsubscribe();
  }, [sessionId, quiz]);

  // Timer for Teacher-paced mode
  useEffect(() => {
    if (session?.mode === 'TEACHER_PACED' && session.status === 'QUESTION' && quiz) {
      const currentQuestion = quiz.questions[session.currentQuestionIndex];
      const startTime = session.questionStartTime || Date.now();
      const limit = (currentQuestion.timeLimit || 30) * 1000;
      
      const updateTimer = () => {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, Math.ceil((limit - elapsed) / 1000));
        setTimeLeft(remaining);
        
        if (remaining === 0) {
          // Auto transition to leaderboard when time is up
          gameService.showLeaderboard(session.id);
          return true; // Finished
        }
        return false;
      };

      // Initial update
      if (updateTimer()) return;
      
      const interval = setInterval(() => {
        if (updateTimer()) {
          clearInterval(interval);
        }
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [session?.status, session?.currentQuestionIndex, session?.questionStartTime, quiz]);

  if (!session || !quiz) return <div className="flex h-screen items-center justify-center text-white bg-gray-900">Đang tải...</div>;

  const currentQuestion = quiz.questions[session.currentQuestionIndex];
  const sortedPlayers = [...(session.players || [])].sort((a, b) => b.score - a.score);
  
  const answeredCount = session.players?.filter(p => p.answers && p.answers[currentQuestion.id])?.length || 0;
  const totalPlayers = session.players?.length || 0;

  const handleNext = async () => {
    if (session.status === 'QUESTION') {
      await gameService.showLeaderboard(session.id);
    } else if (session.status === 'LEADERBOARD') {
      const nextIndex = session.currentQuestionIndex + 1;
      if (nextIndex < quiz.questions.length) {
        await gameService.nextQuestion(session.id, nextIndex);
      } else {
        await gameService.endGame(session.id);
        navigate(`/game/results/${session.id}`);
      }
    }
  };

  const renderTeacherPacedContent = () => {
    if (session.status === 'QUESTION') {
      return (
        <div className="space-y-8 animate-in fade-in zoom-in duration-500">
          {/* Question Display */}
          <div className="bg-white text-gray-900 p-8 rounded-3xl shadow-2xl text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gray-100">
              <div 
                className="h-full bg-indigo-600 transition-all duration-1000 ease-linear"
                style={{ width: `${(timeLeft / currentQuestion.timeLimit) * 10000 / 100}%` }}
              ></div>
            </div>
            
            <div className="flex justify-between items-center mb-6">
              <span className="bg-indigo-100 text-indigo-700 px-4 py-1 rounded-full font-bold text-sm">
                Câu hỏi {session.currentQuestionIndex + 1} / {quiz.questions.length}
              </span>
              <div className="flex items-center gap-2 text-2xl font-black text-indigo-600">
                <Clock className="w-6 h-6" />
                {timeLeft}s
              </div>
            </div>

            <h2 className="text-4xl font-black mb-8 leading-tight">{currentQuestion.text}</h2>
            
            <div className="grid grid-cols-2 gap-4">
              {currentQuestion.options.map((opt, idx) => (
                <div 
                  key={opt.id}
                  className={`p-6 rounded-2xl border-4 text-left font-bold text-xl flex items-center gap-4 ${
                    idx === 0 ? 'bg-red-50 border-red-200 text-red-700' :
                    idx === 1 ? 'bg-blue-50 border-blue-200 text-blue-700' :
                    idx === 2 ? 'bg-yellow-50 border-yellow-200 text-yellow-700' :
                    'bg-green-50 border-green-200 text-green-700'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white shrink-0 ${
                    idx === 0 ? 'bg-red-500' :
                    idx === 1 ? 'bg-blue-500' :
                    idx === 2 ? 'bg-yellow-500' :
                    'bg-green-500'
                  }`}>
                    {String.fromCharCode(65 + idx)}
                  </div>
                  {opt.text}
                </div>
              ))}
            </div>
          </div>

          {/* Stats Bar */}
          <div className="flex justify-between items-center bg-gray-800 p-6 rounded-2xl shadow-xl">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <Users className="w-8 h-8 text-indigo-400" />
                <div>
                  <div className="text-2xl font-black">{answeredCount} / {totalPlayers}</div>
                  <div className="text-xs text-gray-400 uppercase tracking-wider">Đã trả lời</div>
                </div>
              </div>
              <div className="h-10 w-px bg-gray-700"></div>
              <div className="flex -space-x-2">
                {session.players?.slice(0, 5).map((p, i) => (
                  <StudentAvatar 
                    key={p.id} 
                    name={p.name} 
                    avatarConfig={p.avatarConfig} 
                    size={40} 
                    className="border-2 border-gray-800"
                  />
                ))}
                {totalPlayers > 5 && (
                  <div className="w-10 h-10 rounded-full bg-gray-700 border-2 border-gray-800 flex items-center justify-center text-xs font-bold">
                    +{totalPlayers - 5}
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={handleNext}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-2xl font-black text-xl flex items-center gap-3 shadow-lg transform transition hover:scale-105 active:scale-95"
            >
              KẾT THÚC CÂU HỎI
              <ArrowRight className="w-6 h-6" />
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-10 duration-700">
        <div className="text-center mb-12">
          <h2 className="text-5xl font-black text-yellow-400 mb-2">BẢNG VÀNG</h2>
          <p className="text-gray-400 text-xl">Thứ hạng sau câu hỏi {session.currentQuestionIndex + 1}</p>
        </div>

        {/* Podium and List */}
        {renderPodium()}
        {renderPlayerList()}

        <div className="fixed bottom-8 right-8">
          <button
            onClick={handleNext}
            className="bg-green-500 hover:bg-green-600 text-white px-10 py-5 rounded-2xl font-black text-2xl flex items-center gap-3 shadow-2xl transform transition hover:scale-110 active:scale-95"
          >
            {session.currentQuestionIndex + 1 < quiz.questions.length ? 'CÂU TIẾP THEO' : 'XEM KẾT QUẢ CHUNG CUỘC'}
            <ArrowRight className="w-8 h-8" />
          </button>
        </div>
      </div>
    );
  };

  const renderPodium = () => (
    <div className="flex justify-center items-end gap-4 mb-12 h-64">
      {sortedPlayers[1] && (
        <div className="w-32 bg-gray-700 rounded-t-lg p-4 text-center h-2/3 flex flex-col justify-end relative items-center">
          <div className="absolute -top-10 left-0 right-0 text-center flex justify-center">
            <div className="relative">
              <StudentAvatar 
                name={sortedPlayers[1].name} 
                avatarConfig={sortedPlayers[1].avatarConfig} 
                size={64} 
                className="border-4 border-gray-400"
              />
              <div className="absolute -bottom-2 -right-2 bg-gray-400 text-gray-900 w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs border-2 border-gray-700">2</div>
            </div>
          </div>
          <div className="font-bold truncate w-full mt-8">{sortedPlayers[1].name}</div>
          <div className="text-yellow-400 font-mono">{sortedPlayers[1].score}</div>
        </div>
      )}
      
      {sortedPlayers[0] && (
        <div className="w-32 bg-yellow-600 rounded-t-lg p-4 text-center h-full flex flex-col justify-end relative shadow-lg shadow-yellow-600/20 items-center">
          <div className="absolute -top-12 left-0 right-0 text-center flex justify-center">
            <div className="relative">
              <StudentAvatar 
                name={sortedPlayers[0].name} 
                avatarConfig={sortedPlayers[0].avatarConfig} 
                size={80} 
                className="border-4 border-yellow-400"
              />
              <div className="absolute -bottom-2 -right-2 bg-yellow-400 text-yellow-900 w-8 h-8 rounded-full flex items-center justify-center font-bold text-lg border-2 border-yellow-600">1</div>
            </div>
          </div>
          <div className="font-bold truncate w-full mt-10 text-lg">{sortedPlayers[0].name}</div>
          <div className="text-white font-mono text-xl">{sortedPlayers[0].score}</div>
        </div>
      )}

      {sortedPlayers[2] && (
        <div className="w-32 bg-orange-700 rounded-t-lg p-4 text-center h-1/2 flex flex-col justify-end relative items-center">
          <div className="absolute -top-10 left-0 right-0 text-center flex justify-center">
            <div className="relative">
              <StudentAvatar 
                name={sortedPlayers[2].name} 
                avatarConfig={sortedPlayers[2].avatarConfig} 
                size={64} 
                className="border-4 border-orange-400"
              />
              <div className="absolute -bottom-2 -right-2 bg-orange-400 text-orange-900 w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs border-2 border-orange-700">3</div>
            </div>
          </div>
          <div className="font-bold truncate w-full mt-8">{sortedPlayers[2].name}</div>
          <div className="text-yellow-400 font-mono">{sortedPlayers[2].score}</div>
        </div>
      )}
    </div>
  );

  const renderPlayerList = () => (
    <div className="bg-gray-800 rounded-xl overflow-hidden shadow-2xl">
      <table className="w-full text-left">
        <thead className="bg-gray-700 text-gray-400 uppercase text-xs">
          <tr>
            <th className="px-6 py-4">Hạng</th>
            <th className="px-6 py-4">Tên</th>
            <th className="px-6 py-4">Tiến độ</th>
            <th className="px-6 py-4 text-right">Điểm số</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-700">
          {sortedPlayers.map((player, index) => (
            <tr key={player.id} className="hover:bg-gray-700/50 transition-colors">
              <td className="px-6 py-4 font-mono text-gray-400">#{index + 1}</td>
              <td className="px-6 py-4 font-bold flex items-center gap-3">
                <StudentAvatar 
                  name={player.name} 
                  avatarConfig={player.avatarConfig} 
                  size={32} 
                />
                {player.name}
              </td>
              <td className="px-6 py-4">
                <div className="w-full h-2.5 flex gap-1">
                  {quiz.questions.map((q) => {
                    const answer = player.answers?.[q.id];
                    let bgColor = 'bg-gray-700'; // Chưa trả lời
                    if (answer) {
                      bgColor = answer.isCorrect ? 'bg-green-500' : 'bg-red-500';
                    }
                    return (
                      <div 
                        key={q.id}
                        className={`${bgColor} h-2.5 rounded-full transition-all duration-500 flex-1`}
                      ></div>
                    );
                  })}
                </div>
              </td>
              <td className="px-6 py-4 text-right font-mono text-yellow-400 font-bold text-lg">
                {player.score}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">
              {session.mode === 'HOMEWORK' ? 'Theo Dõi Bài Tập Về Nhà' : 
               session.mode === 'TEACHER_PACED' ? 'Điều Khiển Phòng Thi' : 'Bảng Xếp Hạng Trực Tiếp'}
            </h1>
            <p className="text-gray-400 mt-1">
              {session.mode === 'TEACHER_PACED' ? 'Chế độ: Giáo viên điều khiển' : 
               session.mode === 'STUDENT_PACED' ? 'Chế độ: Học sinh tự làm' : 'Chế độ: Bài tập về nhà'}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-xl bg-gray-800 px-4 py-2 rounded-lg">
              Mã PIN: <span className="font-mono font-bold text-yellow-400">{session.pin}</span>
            </div>
            <button 
              onClick={async () => {
                const msg = session.mode === 'HOMEWORK' 
                  ? 'Bạn có chắc chắn muốn kết thúc bài tập này? Học sinh sẽ không thể nộp bài nữa.'
                  : 'Bạn có chắc chắn muốn kết thúc trò chơi ngay bây giờ?';
                if (window.confirm(msg)) {
                  await gameService.endGame(sessionId!);
                  navigate(`/game/results/${sessionId}`);
                }
              }}
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-bold transition-colors shadow-lg"
            >
              Kết thúc
            </button>
          </div>
        </header>

        {session.mode === 'TEACHER_PACED' ? renderTeacherPacedContent() : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {renderPodium()}
            {renderPlayerList()}
          </div>
        )}
      </div>
    </div>
  );
}
