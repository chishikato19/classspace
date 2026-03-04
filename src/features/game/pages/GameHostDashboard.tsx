import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { GameSession, Quiz } from '../../../types';
import { gameService } from '../services/gameService';
import { quizService } from '../../quiz/services/quizService';
import { StudentAvatar } from '../../../components/Avatar/StudentAvatar';

export default function GameHostDashboard() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState<GameSession | null>(null);
  const [quiz, setQuiz] = useState<Quiz | null>(null);

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

  if (!session || !quiz) return <div className="flex h-screen items-center justify-center text-white bg-gray-900">Đang tải...</div>;

  // Sort players by score descending
  const sortedPlayers = [...(session.players || [])].sort((a, b) => b.score - a.score);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Bảng Xếp Hạng Trực Tiếp</h1>
          <div className="flex items-center gap-4">
            <div className="text-xl bg-gray-800 px-4 py-2 rounded-lg">
              Mã PIN: <span className="font-mono font-bold text-yellow-400">{session.pin}</span>
            </div>
            <button 
              onClick={async () => {
                await gameService.endGame(sessionId!);
                navigate(`/game/results/${sessionId}`);
              }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-bold transition-colors shadow-lg"
            >
              Kết thúc & Xem thống kê
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Top 3 Podium */}
          <div className="lg:col-span-3 flex justify-center items-end gap-4 mb-8 h-64">
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

          {/* Full List */}
          <div className="lg:col-span-3 bg-gray-800 rounded-xl overflow-hidden shadow-2xl">
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
        </div>
      </div>
    </div>
  );
}
