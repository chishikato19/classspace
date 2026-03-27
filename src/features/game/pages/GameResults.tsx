import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { GameSession, Quiz, Player, ClassSession, StudentGroup } from '../../../types';
import { gameService } from '../services/gameService';
import { quizService } from '../../quiz/services/quizService';
import { classSessionService } from '../../../services/classSessionService';
import { groupService } from '../../teacher/services/groupService';
import { CheckCircle, XCircle, Clock, Award, ChevronLeft, RefreshCw } from 'lucide-react';
import { StudentAvatar } from '../../../components/Avatar/StudentAvatar';
import { MathText } from '../../../components/MathText';

export default function GameResults() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState<GameSession | null>(null);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'questions'>('overview');
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState(0);

  // Sync state
  const [activeClassSession, setActiveClassSession] = useState<ClassSession | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSynced, setIsSynced] = useState(false);

  useEffect(() => {
    if (!sessionId) return;
    const loadData = async () => {
      const sessionData = await gameService.getSessionById(sessionId);
      if (sessionData) {
        setSession(sessionData);
        if (sessionData.quizId) {
          const quizData = await quizService.getQuizById(sessionData.quizId);
          setQuiz(quizData);
        }
        
        // Check for active class session
        if (sessionData.selectedClassId) {
          const activeSession = await classSessionService.getActiveSessionForClass(sessionData.selectedClassId);
          if (activeSession) {
            setActiveClassSession(activeSession);
            // Check if already synced (we can check if there's an event with reason containing this sessionId)
            const hasSynced = activeSession.events.some(e => e.reason?.includes(sessionId));
            setIsSynced(hasSynced);
          }
        }
      }
    };
    loadData();
  }, [sessionId]);

  const handleSyncToClassSession = async () => {
    if (!session || !activeClassSession || !quiz) return;
    setIsSyncing(true);

    try {
      const groups = await groupService.getGroupsByClass(session.selectedClassId!);
      const groupScores: Record<string, number> = {};
      groups.forEach(g => groupScores[g.id] = 0);

      // 1. Sync Individual Scores
      for (const player of session.players || []) {
        if (!session.isGroupPlay) {
          // Individual play: add QUIZ_SCORE to student
          await classSessionService.addEvent(activeClassSession.id, {
            type: 'QUIZ_SCORE',
            targetId: player.id,
            points: player.score,
            reason: `Điểm thi: ${quiz.title} (${sessionId})`
          });

          // Add to group total for ranking
          const studentGroup = groups.find(g => g.studentIds.includes(player.id));
          if (studentGroup) {
            groupScores[studentGroup.id] += player.score;
          }
        } else {
          // Group play: player.id is actually the groupId
          groupScores[player.id] = player.score;
        }
      }

      // 2. Rank Groups and award QUIZ_RANK points
      const sortedGroups = Object.entries(groupScores)
        .filter(([_, score]) => score > 0) // Only rank groups that participated/scored
        .sort((a, b) => b[1] - a[1]);

      const rankPoints = [100, 80, 60, 40, 20]; // Points for 1st, 2nd, 3rd, etc.

      for (let i = 0; i < sortedGroups.length; i++) {
        const [groupId, _] = sortedGroups[i];
        const points = rankPoints[i] || 10; // Default 10 points for lower ranks
        await classSessionService.addEvent(activeClassSession.id, {
          type: 'QUIZ_RANK',
          targetId: groupId,
          points: points,
          reason: `Hạng ${i + 1} thi: ${quiz.title} (${sessionId})`
        });
      }

      setIsSynced(true);
      alert('Đồng bộ điểm thành công!');
    } catch (error) {
      console.error('Error syncing points:', error);
      alert('Có lỗi xảy ra khi đồng bộ điểm.');
    } finally {
      setIsSyncing(false);
    }
  };

  if (!session || !quiz) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50">Đang tải dữ liệu...</div>;
  }

  const sortedPlayers = [...(session.players || [])].sort((a, b) => b.score - a.score);

  // Calculate stats for the selected question
  const currentQuestion = quiz.questions[selectedQuestionIndex];
  const questionStats = {
    correct: 0,
    incorrect: 0,
    unanswered: 0,
    optionCounts: {} as Record<string, number>
  };

  currentQuestion.options.forEach(opt => {
    questionStats.optionCounts[opt.id] = 0;
  });

  session.players?.forEach(player => {
    const answer = player.answers?.[currentQuestion.id];
    if (answer) {
      if (currentQuestion.type === 'SURVEY') {
        questionStats.correct++; // Coi như "đã trả lời"
      } else {
        if (answer.isCorrect) questionStats.correct++;
        else questionStats.incorrect++;
      }
      
      if (questionStats.optionCounts[answer.optionId] !== undefined) {
        questionStats.optionCounts[answer.optionId]++;
      }
    } else {
      questionStats.unanswered++;
    }
  });

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => navigate('/teacher/dashboard')}
                className="text-gray-500 hover:text-gray-700 flex items-center gap-1"
              >
                <ChevronLeft className="w-5 h-5" />
                Về trang chủ
              </button>
              <h1 className="text-xl font-bold text-gray-900 border-l border-gray-300 pl-4">
                Thống kê: {quiz.title}
              </h1>
            </div>
            <div className="flex gap-2 items-center">
              {activeClassSession && (
                <button
                  onClick={handleSyncToClassSession}
                  disabled={isSyncing || isSynced}
                  className={`mr-4 px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                    isSynced 
                      ? 'bg-green-100 text-green-700 cursor-not-allowed' 
                      : 'bg-indigo-600 text-white hover:bg-indigo-700'
                  }`}
                >
                  <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                  {isSynced ? 'Đã đồng bộ vào Tiết học' : 'Đồng bộ điểm vào Tiết học'}
                </button>
              )}
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'overview' 
                    ? 'bg-indigo-100 text-indigo-700' 
                    : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                Tổng quan
              </button>
              <button
                onClick={() => setActiveTab('questions')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'questions' 
                    ? 'bg-indigo-100 text-indigo-700' 
                    : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                Chi tiết câu hỏi
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' ? (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex items-center gap-4">
                <div className="p-3 bg-indigo-100 text-indigo-600 rounded-lg">
                  <Award className="w-8 h-8" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 font-medium">Tổng người chơi</p>
                  <p className="text-2xl font-bold text-gray-900">{session.players?.length || 0}</p>
                </div>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex items-center gap-4">
                <div className="p-3 bg-green-100 text-green-600 rounded-lg">
                  <CheckCircle className="w-8 h-8" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 font-medium">Tỷ lệ đúng trung bình</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {session.players?.length ? (() => {
                      const nonSurveyQuestions = quiz.questions.filter(q => q.type !== 'SURVEY');
                      if (nonSurveyQuestions.length === 0) return 100; // Hoặc 0 nếu chỉ có khảo sát
                      
                      const totalCorrectPercent = session.players.reduce((acc, p) => {
                        let correctCount = 0;
                        nonSurveyQuestions.forEach(q => {
                          if (p.answers?.[q.id]?.isCorrect) correctCount++;
                        });
                        return acc + (correctCount / nonSurveyQuestions.length);
                      }, 0);
                      
                      return Math.round((totalCorrectPercent / session.players.length) * 100);
                    })() : 0}%
                  </p>
                </div>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex items-center gap-4">
                <div className="p-3 bg-orange-100 text-orange-600 rounded-lg">
                  <Clock className="w-8 h-8" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 font-medium">Số câu hỏi</p>
                  <p className="text-2xl font-bold text-gray-900">{quiz.questions.length}</p>
                </div>
              </div>
            </div>

            {/* Leaderboard Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <h2 className="text-lg font-bold text-gray-900">Kết quả học sinh</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-gray-500 uppercase">
                    <tr>
                      <th className="px-6 py-3 font-medium">Hạng</th>
                      <th className="px-6 py-3 font-medium">Tên học sinh</th>
                      <th className="px-6 py-3 font-medium text-center">Đúng</th>
                      <th className="px-6 py-3 font-medium text-center">Sai</th>
                      <th className="px-6 py-3 font-medium text-center">% Đúng</th>
                      <th className="px-6 py-3 font-medium text-right">Điểm số</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {sortedPlayers.map((player, index) => {
                      let correct = 0;
                      let incorrect = 0;
                      let unanswered = 0;
                      
                      const nonSurveyQuestions = quiz.questions.filter(q => q.type !== 'SURVEY');
                      
                      quiz.questions.forEach(q => {
                        const ans = player.answers?.[q.id];
                        if (ans) {
                          if (q.type === 'SURVEY') {
                            // Không tính đúng/sai cho câu hỏi khảo sát trong bảng tổng quan
                          } else {
                            if (ans.isCorrect) correct++;
                            else incorrect++;
                          }
                        } else {
                          unanswered++;
                        }
                      });

                      const percentage = nonSurveyQuestions.length > 0 
                        ? Math.round((correct / nonSurveyQuestions.length) * 100) 
                        : 0;

                      return (
                        <tr key={player.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 font-medium text-gray-900">#{index + 1}</td>
                          <td className="px-6 py-4 font-bold text-indigo-600 flex items-center gap-3">
                            <StudentAvatar 
                              name={player.name} 
                              avatarConfig={player.avatarConfig} 
                              size={32} 
                            />
                            {player.name}
                          </td>
                          <td className="px-6 py-4 text-center text-green-600 font-medium">{correct}</td>
                          <td className="px-6 py-4 text-center text-red-600 font-medium">{incorrect}</td>
                          <td className="px-6 py-4 text-center">
                            <span className={`font-bold px-2 py-1 rounded-md text-xs ${
                              percentage >= 80 ? 'bg-green-100 text-green-700' :
                              percentage >= 50 ? 'bg-yellow-100 text-yellow-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {percentage}%
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right font-bold text-gray-900">{player.score}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Question Navigation */}
            <div className="lg:w-1/4">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden sticky top-24">
                <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 font-bold text-gray-700">
                  Danh sách câu hỏi
                </div>
                <div className="max-h-[calc(100vh-200px)] overflow-y-auto p-2 space-y-1">
                  {quiz.questions.map((q, idx) => {
                    // Calculate correct percentage for this question
                    let correctCount = 0;
                    session.players?.forEach(p => {
                      if (p.answers?.[q.id]?.isCorrect) correctCount++;
                    });
                    const totalPlayers = session.players?.length || 1;
                    const correctPercent = Math.round((correctCount / totalPlayers) * 100);
                    
                    return (
                      <button
                        key={q.id}
                        onClick={() => setSelectedQuestionIndex(idx)}
                        className={`w-full text-left px-3 py-3 rounded-lg text-sm transition-colors flex items-center justify-between ${
                          selectedQuestionIndex === idx 
                            ? 'bg-indigo-50 border border-indigo-200 text-indigo-700 font-medium' 
                            : 'hover:bg-gray-50 text-gray-700 border border-transparent'
                        }`}
                      >
                        <span className="truncate pr-2">Câu {idx + 1}</span>
                        {q.type === 'SURVEY' ? (
                          <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                            Khảo sát
                          </span>
                        ) : (
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            correctPercent >= 70 ? 'bg-green-100 text-green-700' : 
                            correctPercent >= 40 ? 'bg-yellow-100 text-yellow-700' : 
                            'bg-red-100 text-red-700'
                          }`}>
                            {correctPercent}% đúng
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Question Detail */}
            <div className="lg:w-3/4 space-y-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex justify-between items-start mb-6">
                    <div className="text-xl font-bold text-gray-900 flex items-start gap-2 flex-wrap">
                      <span>Câu {selectedQuestionIndex + 1}:</span> <MathText text={currentQuestion.text} className="flex-1" />
                      {currentQuestion.type === 'SURVEY' && <span className="ml-2 text-sm bg-blue-100 text-blue-700 px-2 py-1 rounded-full whitespace-nowrap">Khảo sát</span>}
                    </div>
                  <div className="flex gap-4 text-sm font-medium">
                    {currentQuestion.type === 'SURVEY' ? (
                      <div className="flex items-center gap-1 text-blue-600">
                        <CheckCircle className="w-4 h-4" /> {questionStats.correct} đã trả lời
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-1 text-green-600">
                          <CheckCircle className="w-4 h-4" /> {questionStats.correct} đúng
                        </div>
                        <div className="flex items-center gap-1 text-red-600">
                          <XCircle className="w-4 h-4" /> {questionStats.incorrect} sai
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                  {currentQuestion.options.map((option) => {
                    const count = questionStats.optionCounts[option.id] || 0;
                    const total = session.players?.length || 1;
                    const percent = Math.round((count / total) * 100);
                    const isSurvey = currentQuestion.type === 'SURVEY';
                    
                    return (
                      <div 
                        key={option.id}
                        className={`p-4 rounded-xl border-2 relative overflow-hidden ${
                          isSurvey ? 'border-blue-200 bg-white' :
                          option.isCorrect 
                            ? 'border-green-500 bg-green-50' 
                            : 'border-gray-200 bg-white'
                        }`}
                      >
                        {/* Progress bar background */}
                        <div 
                          className={`absolute inset-y-0 left-0 opacity-10 ${
                            isSurvey ? 'bg-blue-500' :
                            option.isCorrect ? 'bg-green-500' : 'bg-gray-500'
                          }`}
                          style={{ width: `${percent}%` }}
                        ></div>
                        
                        <div className="relative z-10 flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            {!isSurvey && option.isCorrect && <CheckCircle className="w-5 h-5 text-green-600" />}
                            <span className={`font-medium ${!isSurvey && option.isCorrect ? 'text-green-800' : 'text-gray-700'}`}>
                              <MathText text={option.text} />
                            </span>
                          </div>
                          <div className="text-sm font-bold text-gray-500">
                            {count} ({percent}%)
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* List of students who got it wrong */}
                {currentQuestion.type !== 'SURVEY' && questionStats.incorrect > 0 && (
                  <div className="mt-8">
                    <h3 className="text-md font-bold text-gray-900 mb-4 border-b pb-2">Học sinh trả lời sai</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {session.players?.filter(p => {
                        const ans = p.answers?.[currentQuestion.id];
                        return ans && !ans.isCorrect;
                      }).map(player => {
                        const ans = player.answers![currentQuestion.id];
                        const selectedOpt = currentQuestion.options.find(o => o.id === ans.optionId);
                        return (
                          <div key={player.id} className="bg-red-50 p-3 rounded-lg border border-red-100 flex items-center gap-3">
                            <StudentAvatar 
                              name={player.name} 
                              avatarConfig={player.avatarConfig} 
                              size={40} 
                            />
                            <div>
                              <div className="font-bold text-red-800">{player.name}</div>
                              <div className="text-xs text-red-600 mt-1">
                                Chọn: <MathText text={selectedOpt?.text || 'Không rõ'} />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
