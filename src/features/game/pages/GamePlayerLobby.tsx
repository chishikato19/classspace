import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { GameSession } from '../../../types';
import { gameService } from '../services/gameService';

export default function GamePlayerLobby() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState<GameSession | null>(null);
  const [playerName, setPlayerName] = useState('');

  useEffect(() => {
    const name = localStorage.getItem('currentPlayerName');
    if (name) setPlayerName(name);

    if (!sessionId) return;

    const unsubscribe = gameService.subscribeToSession(sessionId, (data) => {
      setSession(data);
      if (data.status === 'PLAYING') {
        navigate(`/game/play/${sessionId}`);
      }
    });

    return () => unsubscribe();
  }, [sessionId, navigate]);

  if (!session) return <div className="flex h-screen items-center justify-center text-white bg-indigo-600">Đang kết nối...</div>;

  return (
    <div className="min-h-screen bg-indigo-600 flex flex-col items-center justify-center text-white p-4">
      <div className="animate-pulse mb-8">
        <div className="h-4 w-4 bg-white rounded-full mx-auto mb-2"></div>
        <div className="h-4 w-4 bg-white rounded-full mx-auto mb-2"></div>
        <div className="h-4 w-4 bg-white rounded-full mx-auto"></div>
      </div>
      
      <h1 className="text-4xl font-bold mb-4 text-center">Bạn đã tham gia!</h1>
      <p className="text-xl opacity-90 text-center max-w-md">
        Hãy nhìn lên màn hình của giáo viên. Trò chơi sẽ bắt đầu sớm thôi.
      </p>
      
      <div className="mt-12 bg-indigo-800 rounded-lg p-6 w-full max-w-sm text-center shadow-xl border border-indigo-500">
        <p className="text-sm uppercase tracking-widest opacity-70 mb-2">Tên của bạn</p>
        <p className="text-2xl font-bold text-yellow-400">
          {playerName || 'Người chơi ẩn danh'}
        </p>
      </div>
    </div>
  );
}
