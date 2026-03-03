import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { GameSession } from '../../../types';
import { gameService } from '../services/gameService';

export default function GameHostDashboard() {
  const { sessionId } = useParams();
  const [session, setSession] = useState<GameSession | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    const unsubscribe = gameService.subscribeToSession(sessionId, (data) => {
      setSession(data);
    });
    return () => unsubscribe();
  }, [sessionId]);

  if (!session) return <div>Loading...</div>;

  // Sort players by score descending
  const sortedPlayers = [...(session.players || [])].sort((a, b) => b.score - a.score);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Bảng Xếp Hạng Trực Tiếp</h1>
          <div className="text-xl bg-gray-800 px-4 py-2 rounded-lg">
            Mã PIN: <span className="font-mono font-bold text-yellow-400">{session.pin}</span>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Top 3 Podium */}
          <div className="lg:col-span-3 flex justify-center items-end gap-4 mb-8 h-64">
            {sortedPlayers[1] && (
              <div className="w-32 bg-gray-700 rounded-t-lg p-4 text-center h-2/3 flex flex-col justify-end relative">
                <div className="absolute -top-10 left-0 right-0 text-center">
                  <div className="w-16 h-16 bg-gray-300 rounded-full mx-auto flex items-center justify-center text-gray-800 font-bold text-xl border-4 border-gray-700">2</div>
                </div>
                <div className="font-bold truncate">{sortedPlayers[1].name}</div>
                <div className="text-yellow-400 font-mono">{sortedPlayers[1].score}</div>
              </div>
            )}
            
            {sortedPlayers[0] && (
              <div className="w-32 bg-yellow-600 rounded-t-lg p-4 text-center h-full flex flex-col justify-end relative shadow-lg shadow-yellow-600/20">
                <div className="absolute -top-12 left-0 right-0 text-center">
                  <div className="w-20 h-20 bg-yellow-400 rounded-full mx-auto flex items-center justify-center text-yellow-900 font-bold text-2xl border-4 border-yellow-600">1</div>
                </div>
                <div className="font-bold truncate text-lg">{sortedPlayers[0].name}</div>
                <div className="text-white font-mono text-xl">{sortedPlayers[0].score}</div>
              </div>
            )}

            {sortedPlayers[2] && (
              <div className="w-32 bg-orange-700 rounded-t-lg p-4 text-center h-1/2 flex flex-col justify-end relative">
                <div className="absolute -top-10 left-0 right-0 text-center">
                  <div className="w-16 h-16 bg-orange-400 rounded-full mx-auto flex items-center justify-center text-orange-900 font-bold text-xl border-4 border-orange-700">3</div>
                </div>
                <div className="font-bold truncate">{sortedPlayers[2].name}</div>
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
                    <td className="px-6 py-4 font-bold">{player.name}</td>
                    <td className="px-6 py-4">
                      <div className="w-full bg-gray-700 rounded-full h-2.5">
                        <div 
                          className="bg-green-500 h-2.5 rounded-full transition-all duration-500" 
                          style={{ width: `${(player.progress / 10) * 100}%` }} // Mock progress max 10
                        ></div>
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
