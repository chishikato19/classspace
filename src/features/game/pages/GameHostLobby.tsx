import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { GameSession } from '../../../types';
import { gameService } from '../services/gameService';

export default function GameHostLobby() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState<GameSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!quizId) return;

    const initSession = async () => {
      try {
        // Tạo session mới
        const sessionId = await gameService.createSession(quizId, 'admin'); // Mock hostId
        
        // Lắng nghe thay đổi
        const unsubscribe = gameService.subscribeToSession(sessionId, (data) => {
          setSession(data);
          setLoading(false);
        });

        return () => unsubscribe();
      } catch (error) {
        console.error("Error creating session:", error);
      }
    };

    initSession();
  }, [quizId]);

  const handleStartGame = async () => {
    if (!session) return;
    await gameService.startGame(session.id);
    navigate(`/game/dashboard/${session.id}`);
  };

  if (loading) return <div className="flex h-screen items-center justify-center text-2xl font-bold">Đang tạo phòng...</div>;
  if (!session) return <div className="flex h-screen items-center justify-center text-red-500">Lỗi tạo phòng!</div>;

  return (
    <div className="min-h-screen bg-indigo-900 text-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-6 bg-indigo-800 shadow-lg">
        <h1 className="text-2xl font-bold">Phòng chờ</h1>
        <div className="text-center">
          <p className="text-sm uppercase tracking-widest opacity-70">Mã PIN tham gia</p>
          <p className="text-6xl font-black tracking-widest bg-white text-indigo-900 px-8 py-2 rounded-xl shadow-2xl mt-2">
            {session.pin}
          </p>
        </div>
        <button
          onClick={handleStartGame}
          disabled={session.players?.length === 0}
          className="bg-green-500 hover:bg-green-600 text-white font-bold py-4 px-8 rounded-xl text-xl shadow-lg transform transition hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          BẮT ĐẦU ({session.players?.length || 0})
        </button>
      </div>

      {/* Player List */}
      <div className="flex-1 p-8 overflow-y-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {session.players?.map((player, index) => (
            <div 
              key={index} 
              className="bg-indigo-700 p-4 rounded-lg text-center font-bold text-lg animate-bounce shadow-md border border-indigo-500"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {player.name}
            </div>
          ))}
          {(!session.players || session.players.length === 0) && (
            <div className="col-span-full text-center text-indigo-300 text-xl mt-20 animate-pulse">
              Đang chờ người chơi tham gia...
            </div>
          )}
        </div>
      </div>
      
      <div className="p-4 text-center text-indigo-300 text-sm">
        Hãy truy cập vào trang web và nhập mã PIN ở trên để tham gia.
      </div>
    </div>
  );
}
