import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { GameSession, Quiz, Question } from '../../../types';
import { gameService } from '../services/gameService';
import { quizService } from '../../quiz/services/quizService';
import { StudentAvatar } from '../../../components/Avatar/StudentAvatar';
import { CheckCircle2, XCircle, Users, Clock, ArrowRight, Copy, Check, LogOut } from 'lucide-react';
import { MathText } from '../../../components/MathText';
import { soundService } from '../services/soundService';
import BattleHostScreen from './BattleHostScreen';

export default function GameHostDashboard() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState<GameSession | null>(null);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!sessionId) return;
    const unsubscribe = gameService.subscribeToSession(sessionId, async (data) => {
      setSession(data);
      if (data.quizId) {
        // Fetch quiz only if not already fetched
        setQuiz(prevQuiz => {
          if (!prevQuiz) {
            quizService.getQuizById(data.quizId).then(setQuiz);
          }
          return prevQuiz;
        });
      }
    });
    return () => unsubscribe();
  }, [sessionId]);

  // Timer for Teacher-paced and Plickers mode
  useEffect(() => {
    if ((session?.mode === 'TEACHER_PACED' || session?.mode === 'PLICKERS') && session.status === 'QUESTION' && quiz) {
      const currentQuestion = quiz.questions[session.currentQuestionIndex];
      const startTime = session.questionStartTime || Date.now();
      const limit = (currentQuestion.timeLimit || 30) * 1000;
      
      const updateTimer = () => {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, Math.ceil((limit - elapsed) / 1000));
        
        if (remaining !== timeLeft) {
          if (remaining <= 5 && remaining > 0) {
            soundService.play('tick');
          }
          setTimeLeft(remaining);
        }
        
        if (remaining === 0) {
          // Auto transition to leaderboard when time is up
          soundService.play('finish');
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

  if (session?.mode === 'BATTLE') {
    return <BattleHostScreen />;
  }

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

  const renderSurveyResults = () => {
    // Count votes for each option
    const optionCounts: Record<string, number> = {};
    currentQuestion.options.forEach(opt => {
      optionCounts[opt.id] = 0;
    });

    session.players?.forEach(player => {
      const answer = player.answers?.[currentQuestion.id];
      if (answer && answer.optionId && optionCounts[answer.optionId] !== undefined) {
        optionCounts[answer.optionId]++;
      }
    });

    const totalVotes = Object.values(optionCounts).reduce((a, b) => a + b, 0);

    return (
      <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-4xl mx-auto">
        <h3 className="text-3xl font-black text-gray-800 mb-8 text-center">Kết quả khảo sát</h3>
        <div className="space-y-6">
          {currentQuestion.options.map((opt, idx) => {
            const count = optionCounts[opt.id] || 0;
            const percentage = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
            
            return (
              <div key={opt.id} className="relative">
                <div className="flex justify-between items-end mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                      {String.fromCharCode(65 + idx)}
                    </div>
                    <div className="font-bold text-gray-700 text-lg"><MathText text={opt.text} /></div>
                  </div>
                  <div className="font-black text-indigo-600 text-xl">{count} phiếu ({percentage}%)</div>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-6 overflow-hidden">
                  <div 
                    className="bg-indigo-500 h-full rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-8 text-center text-gray-500 font-medium">
          Tổng số người tham gia khảo sát: {totalVotes}
        </div>
      </div>
    );
  };

  const handleCopyLink = () => {
    if (!session?.pin) return;
    const link = `${window.location.origin}/#/join?pin=${session.pin}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const renderTeacherPacedContent = () => {
    if (session.status === 'QUESTION') {
      return (
        <div className="space-y-8 animate-in fade-in zoom-in duration-500">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Left Side: Question Display (3/5) */}
            <div className="lg:w-3/5 bg-white text-gray-900 p-8 rounded-3xl shadow-2xl relative overflow-hidden flex flex-col">
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

              <h2 className="text-4xl font-black mb-8 leading-tight flex flex-col items-center text-center">
                {currentQuestion.imageUrl && (
                  <img 
                    src={currentQuestion.imageUrl} 
                    alt="Question" 
                    className="max-h-96 object-contain rounded-xl mb-6 border-4 border-gray-200 shadow-lg"
                    referrerPolicy="no-referrer"
                    onError={(e) => (e.currentTarget.style.display = 'none')}
                  />
                )}
                <MathText text={currentQuestion.text} />
              </h2>
              
              <div className="grid grid-cols-2 gap-4 mt-auto">
                {currentQuestion.type === 'SHORT_ANSWER' ? (
                   <div className="col-span-2 bg-white p-6 rounded-2xl border-4 border-indigo-200 text-center shadow-sm">
                      <p className="text-gray-500 font-bold mb-4 uppercase tracking-wide text-sm">Đáp án chấp nhận</p>
                      <div className="flex flex-wrap gap-3 justify-center">
                         {currentQuestion.options.map(opt => (
                            <span key={opt.id} className="bg-green-100 text-green-800 px-4 py-2 rounded-full font-bold text-xl border-2 border-green-200 shadow-sm">
                               <MathText text={opt.text} />
                            </span>
                         ))}
                      </div>
                   </div>
                ) : (
                  currentQuestion.options.map((opt, idx) => (
                    <div 
                      key={opt.id}
                      className={`p-6 rounded-2xl border-4 text-left font-bold text-xl flex flex-col gap-4 ${
                        idx === 0 ? 'bg-red-50 border-red-200 text-red-700' :
                        idx === 1 ? 'bg-blue-50 border-blue-200 text-blue-700' :
                        idx === 2 ? 'bg-yellow-50 border-yellow-200 text-yellow-700' :
                        'bg-green-50 border-green-200 text-green-700'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white shrink-0 ${
                          idx === 0 ? 'bg-red-500' :
                          idx === 1 ? 'bg-blue-500' :
                          idx === 2 ? 'bg-yellow-500' :
                          'bg-green-500'
                        }`}>
                          {String.fromCharCode(65 + idx)}
                        </div>
                        <MathText text={opt.text} />
                      </div>
                      {opt.imageUrl && (
                        <img 
                          src={opt.imageUrl} 
                          alt="Option" 
                          className="w-full h-48 object-cover rounded-lg border border-gray-300 bg-white"
                          referrerPolicy="no-referrer"
                          onError={(e) => (e.currentTarget.style.display = 'none')}
                        />
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Right Side: Tracking Board (2/5) */}
            <div className="lg:w-2/5 bg-gray-800 rounded-3xl shadow-2xl p-6 flex flex-col border border-gray-700">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-400" />
                  Bảng theo dõi
                </h3>
                <div className="bg-gray-900 px-3 py-1 rounded-full text-sm font-bold text-indigo-400 border border-gray-700">
                  Đã nhận: {answeredCount}/{totalPlayers}
                </div>
              </div>
              
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 gap-3 overflow-y-auto max-h-[600px] pr-2 custom-scrollbar">
                {session.players?.map((p, idx) => {
                  const hasAnswered = !!p.answers?.[currentQuestion.id];
                  // Extract last name
                  const nameParts = p.name.trim().split(' ');
                  const lastName = nameParts[nameParts.length - 1];
                  
                  return (
                    <div 
                      key={p.id}
                      className={`relative p-3 rounded-xl border-2 flex flex-col items-center justify-center text-center transition-all duration-300 ${
                        hasAnswered 
                          ? 'bg-green-500 border-green-400 text-white shadow-[0_0_15px_rgba(34,197,94,0.5)] transform scale-105 z-10' 
                          : 'bg-gray-700 border-gray-600 text-gray-400'
                      }`}
                    >
                      <span className="text-xs font-bold opacity-70 mb-1">[{p.cardNumber || idx + 1}]</span>
                      <span className="font-bold text-sm truncate w-full">{lastName}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="flex justify-between items-center bg-gray-800 p-6 rounded-2xl shadow-xl">
            <div className="flex items-center gap-6">
              {session.mode === 'PLICKERS' && (
                <button
                  onClick={() => window.open(`#/game/scanner/${session.id}`, '_blank')}
                  className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-colors border border-gray-600"
                >
                  Mở máy quét (Plickers)
                </button>
              )}
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
          <h2 className="text-5xl font-black text-yellow-400 mb-2">
            {currentQuestion.type === 'SURVEY' ? 'KẾT QUẢ KHẢO SÁT' : 'BẢNG VÀNG'}
          </h2>
          <p className="text-gray-400 text-xl">
            {currentQuestion.type === 'SURVEY' ? `Khảo sát câu hỏi ${session.currentQuestionIndex + 1}` : `Thứ hạng sau câu hỏi ${session.currentQuestionIndex + 1}`}
          </p>
        </div>

        {/* Podium and List or Survey Results */}
        {currentQuestion.type === 'SURVEY' ? (
          renderSurveyResults()
        ) : (
          <>
            {renderPodium()}
            {renderPlayerList()}
          </>
        )}

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
            <th className="px-6 py-4 text-center">% Đúng</th>
            <th className="px-6 py-4 text-right">Điểm số</th>
            <th className="px-6 py-4 text-center">Thao tác</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-700">
          {sortedPlayers.map((player, index) => {
            const nonSurveyQuestions = quiz.questions.filter(q => q.type !== 'SURVEY');
            const correctCount = Object.values(player.answers || {}).filter(a => a.isCorrect).length;
            const percentage = nonSurveyQuestions.length > 0 ? Math.round((correctCount / nonSurveyQuestions.length) * 100) : 0;
            const totalAnswered = Object.keys(player.answers || {}).length;
            
            return (
              <tr key={player.id} className="hover:bg-gray-700/50 transition-colors group">
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
                <td className="px-6 py-4 text-center">
                  <span className={`font-bold px-2 py-1 rounded-md text-sm ${
                    percentage >= 80 ? 'bg-green-900/30 text-green-400' :
                    percentage >= 50 ? 'bg-yellow-900/30 text-yellow-400' :
                    totalAnswered > 0 ? 'bg-red-900/30 text-red-400' : 'text-gray-500'
                  }`}>
                    {percentage}%
                  </span>
                </td>
                <td className="px-6 py-4 text-right font-mono text-yellow-400 font-bold text-lg">
                  {player.score}
                </td>
                <td className="px-6 py-4 text-center">
                  <button
                    onClick={async () => {
                      if (window.confirm(`Bạn có chắc muốn xóa ${player.name} khỏi phòng?`)) {
                        await gameService.removePlayer(session.id, player.id);
                      }
                    }}
                    className="text-red-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Xóa người chơi"
                  >
                    ✕
                  </button>
                </td>
              </tr>
            );
          })}
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
               (session.mode === 'TEACHER_PACED' || session.mode === 'PLICKERS') ? 'Điều Khiển Phòng Thi' : 'Bảng Xếp Hạng Trực Tiếp'}
            </h1>
            <p className="text-gray-400 mt-1">
              {session.mode === 'TEACHER_PACED' ? 'Chế độ: Giáo viên điều khiển' : 
               session.mode === 'PLICKERS' ? 'Chế độ: Quét thẻ Plickers' :
               session.mode === 'STUDENT_PACED' ? 'Chế độ: Học sinh tự làm' : 'Chế độ: Bài tập về nhà'}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-gray-800 px-4 py-2 rounded-lg">
              <span className="text-xl">Mã PIN:</span>
              <span className="font-mono font-bold text-yellow-400 text-xl">{session.pin}</span>
              {session.mode === 'HOMEWORK' && (
                <button 
                  onClick={handleCopyLink}
                  className="ml-2 p-1.5 hover:bg-gray-700 rounded-md transition-colors text-gray-400 hover:text-white"
                  title="Sao chép đường dẫn"
                >
                  {copied ? <Check className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5" />}
                </button>
              )}
            </div>
            
            <button 
              onClick={() => navigate('/teacher/dashboard?tab=reports')}
              className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-2 rounded-lg font-bold transition-colors flex items-center gap-2"
            >
              <LogOut size={18} />
              Thoát
            </button>

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

        {(session.mode === 'TEACHER_PACED' || session.mode === 'PLICKERS') ? renderTeacherPacedContent() : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {renderPodium()}
            {renderPlayerList()}
          </div>
        )}
      </div>
    </div>
  );
}
