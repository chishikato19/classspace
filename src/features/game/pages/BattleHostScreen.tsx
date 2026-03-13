import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { GameSession, Player, Quiz } from '../../../types';
import { gameService } from '../services/gameService';
import { quizService } from '../../quiz/services/quizService';
import { StudentAvatar } from '../../../components/Avatar/StudentAvatar';
import { Zap, Skull, Snowflake, EyeOff, ShieldAlert, ArrowLeft, Maximize, Minimize } from 'lucide-react';
import { timeService } from '../../../services/timeService';

export default function BattleHostScreen() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState<GameSession | null>(null);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [currentTime, setCurrentTime] = useState(timeService.now());
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  // Tick timer to refresh effects
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(timeService.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

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

  if (!session) return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">Loading...</div>;

  const players = session.players || [];
  const pacing = session?.settings?.pacing || 'STUDENT';
  const totalQuestions = quiz?.questions?.length || 0;

  const handleNextQuestion = async () => {
    if (!session) return;
    const nextIndex = (session.currentQuestionIndex || 0) + 1;
    await gameService.nextQuestion(session.id, nextIndex);
  };

  const handleEndGame = async () => {
    if (!session) return;
    if (window.confirm('Bạn có chắc chắn muốn kết thúc trận đấu sinh tồn này ngay lập tức?')) {
      await gameService.endGame(session.id);
    }
  };

  // Find winner if game finished
  const winner = session?.status === 'FINISHED' 
    ? session.players?.filter(p => (p.hp || 0) > 0).sort((a, b) => b.score - a.score)[0] 
    : null;

  if (session?.status === 'FINISHED') {
     return (
        <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-8">
           <h1 className="text-6xl font-black text-yellow-400 mb-8 animate-bounce">CHIẾN THẮNG!</h1>
           {winner ? (
             <div className="bg-gray-800 p-8 rounded-3xl border-4 border-yellow-500 flex flex-col items-center shadow-2xl">
                <StudentAvatar student={{ name: winner.name, avatarConfig: winner.avatarConfig } as any} size={120} />
                <div className="text-4xl font-bold mt-4">{winner.name}</div>
                <div className="text-2xl text-gray-400 mt-2">{winner.score} điểm</div>
                <div className="text-green-400 font-bold mt-2">HP: {winner.hp}</div>
             </div>
           ) : (
             <div className="text-2xl text-gray-400">Không có ai sống sót...</div>
           )}
           <button onClick={() => navigate('/teacher/dashboard')} className="mt-8 bg-gray-700 hover:bg-gray-600 px-8 py-4 rounded-xl font-bold flex items-center gap-2">
             <ArrowLeft size={20} /> Quay lại Dashboard
           </button>
        </div>
     );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center mb-6 bg-gray-800 p-4 rounded-xl shadow-lg border border-gray-700">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/teacher/dashboard')} className="p-2 hover:bg-gray-700 rounded-lg transition-colors">
             <ArrowLeft />
          </button>
          <h1 className="text-2xl font-black text-red-500 flex items-center gap-2">
            <ShieldAlert /> ĐẤU TRƯỜNG SINH TỒN
          </h1>
          <div className="bg-gray-700 px-4 py-1 rounded-full text-sm font-mono">
            {pacing === 'TEACHER' ? 'Chế độ: Đồng loạt' : 'Chế độ: Tự do'}
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={toggleFullscreen} 
            className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-gray-300"
            title={isFullscreen ? "Thu nhỏ" : "Toàn màn hình"}
          >
            {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
          </button>
          {pacing === 'TEACHER' && (
             <button 
               onClick={handleNextQuestion}
               className="bg-blue-600 hover:bg-blue-500 px-6 py-2 rounded-lg font-bold shadow-lg active:scale-95 transition-all"
             >
               Câu tiếp theo
             </button>
          )}
          <button 
            onClick={handleEndGame}
            className="bg-red-600 hover:bg-red-500 px-6 py-2 rounded-lg font-bold shadow-lg active:scale-95 transition-all"
          >
            Kết thúc
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {players.map(player => (
          <BattlePlayerCard 
            key={player.id} 
            player={player} 
            currentTime={currentTime} 
            totalQuestions={totalQuestions} 
            onRemove={async () => {
              if (window.confirm(`Bạn có chắc muốn xóa ${player.name} khỏi phòng?`)) {
                await gameService.removePlayer(session.id, player.id);
              }
            }}
          />
        ))}
      </div>
    </div>
  );
}

const BattlePlayerCard: React.FC<{ player: Player, currentTime: number, totalQuestions: number, onRemove: () => void }> = ({ player, currentTime, totalQuestions, onRemove }) => {
  const hp = player.hp ?? 100;
  const maxHp = player.maxHp ?? 100;
  const hpPercent = (hp / maxHp) * 100;

  // Check active effects
  const activeEffects = (player.statusEffects || []).filter(e => e.expiresAt > currentTime);

  const isFrozen = activeEffects.some(e => e.type === 'FROZEN');
  const isParalyzed = activeEffects.some(e => e.type === 'PARALYZED');
  const isBlinded = activeEffects.some(e => e.type === 'BLINDED');
  const isPoisoned = activeEffects.some(e => e.type === 'POISONED');

  return (
    <div className={`relative bg-gray-800 rounded-2xl p-4 border-2 transition-all group ${
      isParalyzed ? 'border-yellow-400 animate-shake' : 
      isFrozen ? 'border-blue-400' : 
      isPoisoned ? 'border-green-500' : 
      'border-gray-700'
    }`}>
      <button
        onClick={onRemove}
        className="absolute top-2 left-2 z-30 bg-red-500 hover:bg-red-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
        title="Xóa người chơi"
      >
        ✕
      </button>
      {/* Status Overlays */}
      {isFrozen && (
        <div className="absolute inset-0 bg-blue-500/30 backdrop-blur-sm z-10 rounded-xl flex items-center justify-center">
          <Snowflake className="w-12 h-12 text-blue-200 animate-pulse" />
        </div>
      )}
      {isParalyzed && (
        <div className="absolute inset-0 bg-yellow-500/30 z-10 rounded-xl flex items-center justify-center">
          <Zap className="w-12 h-12 text-yellow-200 animate-bounce" />
        </div>
      )}
      {isBlinded && (
        <div className="absolute top-2 right-2 z-20">
          <EyeOff className="w-6 h-6 text-purple-400" />
        </div>
      )}

      {/* Avatar & Name */}
      <div className="flex flex-col items-center mb-4">
        <div className="w-20 h-20 mb-2 relative">
          <StudentAvatar 
            student={{ name: player.name, avatarConfig: player.avatarConfig } as any} 
            className="w-20 h-20 text-2xl" 
          />
          {player.streak > 2 && (
            <div className="absolute -top-2 -right-2 bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded-full animate-bounce">
              🔥 {player.streak}
            </div>
          )}
        </div>
        <h3 className="font-bold text-lg truncate w-full text-center">{player.name}</h3>
        <div className="flex items-center justify-center gap-2 w-full mt-1">
          <div className="text-yellow-400 font-mono font-bold bg-gray-900 px-2 py-0.5 rounded-md text-sm">{player.score} pts</div>
          <div className="text-indigo-300 font-mono font-bold bg-gray-900 px-2 py-0.5 rounded-md text-sm">{Object.keys(player.answers || {}).length}{totalQuestions > 0 ? `/${totalQuestions}` : ''} câu</div>
        </div>
      </div>

      {/* HP Bar */}
      <div className="w-full bg-gray-700 h-4 rounded-full overflow-hidden mb-2 relative">
        <div 
          className={`h-full transition-all duration-500 ${
            hpPercent > 50 ? 'bg-green-500' : hpPercent > 20 ? 'bg-yellow-500' : 'bg-red-500'
          }`}
          style={{ width: `${hpPercent}%` }}
        ></div>
        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white shadow-black drop-shadow-md">
          {hp}/{maxHp}
        </span>
      </div>

      {/* Active Effects List */}
      <div className="flex flex-wrap gap-1 justify-center min-h-[1.5rem] mt-2">
        {activeEffects.map((effect, idx) => (
          <div key={idx} className="bg-black/50 rounded px-1.5 py-0.5 flex items-center gap-1 text-[10px] font-bold" title={`By: ${effect.sourceId}`}>
            {effect.type === 'PARALYZED' && <Zap size={10} className="text-yellow-400" />}
            {effect.type === 'FROZEN' && <Snowflake size={10} className="text-blue-400" />}
            {effect.type === 'POISONED' && <Skull size={10} className="text-green-400" />}
            {effect.type === 'BLINDED' && <EyeOff size={10} className="text-purple-400" />}
            <span>{Math.max(0, Math.ceil((effect.expiresAt - currentTime) / 1000))}s</span>
          </div>
        ))}
      </div>
    </div>
  );
};
