import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { GameSession, AvatarConfig } from '../../../types';
import { gameService } from '../services/gameService';
import { StudentAvatar } from '../../../components/Avatar/StudentAvatar';
import { AvatarEditor } from '../../../components/Avatar/AvatarEditor';
import { Edit2 } from 'lucide-react';

export default function GamePlayerLobby() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState<GameSession | null>(null);
  const [playerName, setPlayerName] = useState('');
  const [avatarConfig, setAvatarConfig] = useState<AvatarConfig | undefined>(undefined);
  const [showEditor, setShowEditor] = useState(false);

  useEffect(() => {
    const name = localStorage.getItem('currentPlayerName');
    if (name) setPlayerName(name);

    const avatarJson = localStorage.getItem('currentPlayerAvatar');
    if (avatarJson) {
      try {
        setAvatarConfig(JSON.parse(avatarJson));
      } catch (e) {
        console.error("Error parsing avatar config", e);
      }
    }
  }, []);

  useEffect(() => {
    if (!sessionId) return;

    const unsubscribe = gameService.subscribeToSession(sessionId, (data) => {
      setSession(data);
      if (data.status === 'PLAYING') {
        navigate(`/game/play/${sessionId}`);
      }
    });

    return () => unsubscribe();
  }, [sessionId, navigate]);

  const handleSaveAvatar = async (newConfig: AvatarConfig) => {
    setAvatarConfig(newConfig);
    localStorage.setItem('currentPlayerAvatar', JSON.stringify(newConfig));
    setShowEditor(false);

    // Update avatar in Firestore
    if (sessionId) {
      const playerId = localStorage.getItem('currentPlayerId');
      if (playerId) {
        try {
          await gameService.updatePlayerAvatar(sessionId, playerId, newConfig);
        } catch (error) {
          console.error("Failed to update avatar in session:", error);
        }
      }
    }
  };

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
      
      <div className="mt-12 bg-indigo-800 rounded-lg p-6 w-full max-w-sm text-center shadow-xl border border-indigo-500 flex flex-col items-center gap-4">
        <p className="text-sm uppercase tracking-widest opacity-70">Tên của bạn</p>
        
        <div className="relative group">
          <div className="bg-white/10 rounded-full p-4 border-2 border-white/20">
            <StudentAvatar 
              name={playerName} 
              avatarConfig={avatarConfig} 
              size={120} 
              className="border-4 border-yellow-400 shadow-lg"
            />
          </div>
          <button 
            onClick={() => setShowEditor(true)}
            className="absolute bottom-2 right-2 p-2 bg-white text-indigo-600 rounded-full shadow-lg hover:bg-gray-100 transition-colors"
            title="Đổi Avatar"
          >
            <Edit2 size={20} />
          </button>
        </div>

        <p className="text-2xl font-bold text-yellow-400">
          {playerName || 'Người chơi ẩn danh'}
        </p>
      </div>

      {showEditor && avatarConfig && (
        <AvatarEditor
          initialConfig={avatarConfig}
          onSave={handleSaveAvatar}
          onCancel={() => setShowEditor(false)}
        />
      )}
    </div>
  );
}
