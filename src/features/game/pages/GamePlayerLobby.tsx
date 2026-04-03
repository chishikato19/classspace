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
    const name = sessionStorage.getItem('currentPlayerName');
    if (name) setPlayerName(name);

    const avatarJson = sessionStorage.getItem('currentPlayerAvatar');
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

    let unsubscribe: (() => void) | null = null;

    const handleSessionData = (data: GameSession) => {
      setSession(data);
      // Only auto-redirect for LIVE games
      if (data.status === 'PLAYING' && data.mode !== 'HOMEWORK' && data.mode !== 'ORAL_QUIZ') {
        navigate(`/game/play/${sessionId}`);
      }
    };

    const initSession = async () => {
      try {
        const initialData = await gameService.getSessionById(sessionId);
        if (initialData) {
          handleSessionData(initialData);
          
          // Only subscribe if NOT homework (to save reads)
          if (initialData.mode !== 'HOMEWORK') {
            unsubscribe = gameService.subscribeToSession(sessionId, (data) => {
              handleSessionData(data);
            });
          }
        }
      } catch (error) {
        console.error("Error initializing session:", error);
      }
    };

    initSession();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [sessionId, navigate]);

  const handleStartHomework = () => {
    if (sessionId) {
      navigate(`/game/play/${sessionId}`);
    }
  };

  const handleSaveAvatar = async (newConfig: AvatarConfig) => {
    setAvatarConfig(newConfig);
    sessionStorage.setItem('currentPlayerAvatar', JSON.stringify(newConfig));
    setShowEditor(false);

    // Update avatar in Firestore
    if (sessionId) {
      const playerId = sessionStorage.getItem('currentPlayerId');
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
        {session?.mode === 'HOMEWORK' 
          ? 'Đây là bài tập về nhà. Bạn có thể bắt đầu bất cứ lúc nào.' 
          : session?.mode === 'ORAL_QUIZ'
          ? 'Chế độ Kiểm tra miệng. Hãy sẵn sàng khi giáo viên gọi tên!'
          : 'Hãy nhìn lên màn hình của giáo viên. Trò chơi sẽ bắt đầu sớm thôi.'}
      </p>
      
      {session?.mode === 'HOMEWORK' && (
        <div className="flex flex-col gap-4 mt-8">
          <button
            onClick={handleStartHomework}
            className="bg-green-500 hover:bg-green-600 text-white font-bold py-4 px-8 rounded-xl text-xl shadow-lg transform transition hover:scale-105 animate-bounce"
          >
            BẮT ĐẦU LÀM BÀI
          </button>
          <button
            onClick={() => navigate('/')}
            className="bg-red-500/20 hover:bg-red-500/40 text-red-200 border border-red-500/50 font-bold py-3 px-8 rounded-xl text-lg transition-colors"
          >
            Thoát ra
          </button>
        </div>
      )}
      
      <div className="mt-12 bg-indigo-800 rounded-lg p-6 w-full max-w-sm text-center shadow-xl border border-indigo-500 flex flex-col items-center gap-4">
        <p className="text-sm uppercase tracking-widest opacity-70">Tên của bạn</p>
        
        <div className="relative group">
          <div className="bg-white/10 rounded-full p-4 border-2 border-white/20">
            {session?.settings?.allowAvatars !== false ? (
              <StudentAvatar 
                name={playerName} 
                avatarConfig={avatarConfig} 
                size={120} 
                className="border-4 border-yellow-400 shadow-lg"
              />
            ) : (
              <div className="w-[120px] h-[120px] rounded-full bg-indigo-500 flex items-center justify-center text-4xl font-bold border-4 border-yellow-400 shadow-lg">
                {playerName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          {session?.settings?.allowAvatars !== false && (
            <button 
              onClick={() => setShowEditor(true)}
              className="absolute bottom-2 right-2 p-2 bg-white text-indigo-600 rounded-full shadow-lg hover:bg-gray-100 transition-colors"
              title="Đổi Avatar"
            >
              <Edit2 size={20} />
            </button>
          )}
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
