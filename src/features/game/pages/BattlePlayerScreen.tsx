import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { GameSession, Player, Question, Quiz } from '../../../types';
import { gameService } from '../services/gameService';
import { quizService } from '../../quiz/services/quizService';
import { StudentAvatar } from '../../../components/Avatar/StudentAvatar';
import { Zap, Skull, Snowflake, EyeOff, ShieldAlert, Target, Sword, Heart, Home, Trophy, Maximize, Minimize, ArrowLeftRight } from 'lucide-react';
import { soundService } from '../services/soundService';
import { MathText } from '../../../components/MathText';
import { timeService } from '../../../services/timeService';

export default function BattlePlayerScreen() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState<GameSession | null>(null);
  const [player, setPlayer] = useState<Player | null>(null);
  const [targetSelection, setTargetSelection] = useState<string | null>(null); // Item type being used
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [shuffledQuestions, setShuffledQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [questionStartTime, setQuestionStartTime] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState(timeService.now());
  const [hasFinished, setHasFinished] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const currentQuestion = shuffledQuestions[currentQuestionIndex];
  const activeEffects = player ? (player.statusEffects || []).filter(e => e.expiresAt > currentTime) : [];
  const isParalyzed = activeEffects.some(e => e.type === 'PARALYZED');
  const isFrozen = activeEffects.some(e => e.type === 'FROZEN');
  const isBlinded = activeEffects.some(e => e.type === 'BLINDED');
  const isPoisoned = activeEffects.some(e => e.type === 'POISONED');

  const displayOptions = useMemo(() => {
    if (!currentQuestion) return [];
    if (isParalyzed) {
      const seed = Math.floor(currentTime / 1000);
      const shuffled = [...(currentQuestion.options || [])];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = (seed * (i + 1)) % (i + 1);
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    }
    return currentQuestion.options || [];
  }, [currentQuestion, isParalyzed, Math.floor(currentTime / 1000)]);

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
    }, 200); // Update every 200ms for smoother countdowns and faster effect detection
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const playerId = sessionStorage.getItem('currentPlayerId');
    if (!sessionId || !playerId) return;

    const unsubscribe = gameService.subscribeToSession(sessionId, async (data) => {
      setSession(data);
      const p = data.players?.find(p => p.id === playerId);
      setPlayer(p || null);

      if (!quiz && data.quizId) {
        const quizData = await quizService.getQuizById(data.quizId);
        if (quizData) {
          setQuiz(quizData);
          // Simple shuffle for battle mode
          const questions = [...(quizData.questions || [])].sort(() => Math.random() - 0.5);
          setShuffledQuestions(questions);
          setQuestionStartTime(timeService.now());
        }
      }
    });
    return () => unsubscribe();
  }, [sessionId, quiz]);

  const handleAnswer = async (optionId: string) => {
    if (isSubmitted || !quiz || !session || !player || shuffledQuestions.length === 0) return;
    if (isFrozen) return; // Block answering if frozen
    
    const currentQuestion = shuffledQuestions[currentQuestionIndex];
    if (!currentQuestion) return;
    const correctOption = (currentQuestion.options || []).find(o => o.isCorrect);
    const isAnswerCorrect = correctOption?.id === optionId;

    setIsSubmitted(true);
    setIsCorrect(isAnswerCorrect);
    
    if (isAnswerCorrect) {
      soundService.play('correct');
    } else {
      soundService.play('wrong');
    }
    
    const timeTaken = (timeService.now() - questionStartTime) / 1000;
    const isFirstHalf = currentQuestionIndex < shuffledQuestions.length / 2;

    // Submit answer
    await gameService.submitAnswer(session.id, player.id, currentQuestion.id, {
      optionId,
      isCorrect: isAnswerCorrect,
      timeTaken,
      timeLimit: currentQuestion.timeLimit,
      points: currentQuestion.points,
      isFirstHalf
    });

    // Move to next question
    if (pacing === 'STUDENT') {
      setTimeout(() => {
        if (currentQuestionIndex < shuffledQuestions.length - 1) {
          setCurrentQuestionIndex(prev => prev + 1);
          setIsSubmitted(false);
          setQuestionStartTime(timeService.now());
        } else {
          setHasFinished(true);
        }
      }, 2000);
    }
  };

  // Sync with teacher pacing
  useEffect(() => {
    if (session?.settings?.pacing === 'TEACHER' && session.currentQuestionIndex !== undefined) {
      if (session.currentQuestionIndex !== currentQuestionIndex) {
        setCurrentQuestionIndex(session.currentQuestionIndex);
        setIsSubmitted(false);
        setQuestionStartTime(timeService.now());
      }
    }
  }, [session?.currentQuestionIndex, session?.settings?.pacing]);

  const handleUseItem = (itemType: string) => {
    if (isFrozen) return; // Block using items if frozen
    setTargetSelection(itemType);
  };

  const handleAttack = async (targetId: string) => {
    if (!session || !player || !targetSelection) return;
    try {
      await gameService.useBattleItem(session.id, player.id, targetId, targetSelection);
      setTargetSelection(null);
      soundService.play('item'); // Reuse item sound
    } catch (error) {
      console.error("Failed to use item", error);
    }
  };

  if (!session || !player) return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">Loading...</div>;

  const hp = player.hp ?? 100;
  const maxHp = player.maxHp ?? 100;
  const isDead = hp <= 0;
  const pacing = session.settings?.pacing || 'STUDENT';
  const reviveCost = session.settings?.reviveCost || 1000;

  const handleRevive = async () => {
    if (!session || !player) return;
    try {
      await gameService.revivePlayer(session.id, player.id);
    } catch (error) {
      console.error("Revive failed", error);
    }
  };

  if (isDead) {
    return (
      <div className="min-h-screen bg-red-900 text-white flex flex-col items-center justify-center p-8 text-center animate-in fade-in">
        <Skull className="w-24 h-24 mb-4 animate-pulse text-red-300" />
        <h1 className="text-4xl font-black mb-2">BẠN ĐÃ BỊ HẠ!</h1>
        <p className="text-xl opacity-80 mb-8">Bạn đã hết máu chiến đấu.</p>
        
        <div className="bg-black/40 p-6 rounded-2xl border border-red-500/50 max-w-sm w-full">
          <p className="text-gray-300 mb-4">Đổi <span className="text-yellow-400 font-bold">{reviveCost} điểm</span> để hồi sinh với 50% HP?</p>
          <button 
            onClick={handleRevive}
            className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-black py-4 rounded-xl text-xl shadow-lg transform active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <Heart className="w-6 h-6 fill-black" />
            HỒI SINH NGAY
          </button>
          <p className="text-xs text-gray-400 mt-3">Điểm hiện tại của bạn: <span className={player.score < reviveCost ? "text-red-400" : "text-green-400"}>{player.score}</span></p>
        </div>
        <button onClick={() => navigate('/')} className="mt-8 text-white/50 hover:text-white flex items-center gap-2">
          <Home size={20} /> Trở về trang chủ
        </button>
      </div>
    );
  }

  if (hasFinished || session.status === 'FINISHED') {
    const winner = (session.players || []).filter(p => (p.hp || 0) > 0).sort((a, b) => b.score - a.score)[0];
    const isWinner = winner?.id === player.id;

    return (
      <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-8 text-center animate-in fade-in">
        {session.status === 'FINISHED' ? (
           <>
             {isWinner ? (
               <Trophy className="w-32 h-32 text-yellow-400 mb-6 animate-bounce" />
             ) : (
               <ShieldAlert className="w-24 h-24 text-gray-400 mb-6" />
             )}
             <h1 className="text-4xl font-black mb-4 text-yellow-400">
               {isWinner ? 'CHIẾN THẮNG!' : 'KẾT THÚC TRẬN ĐẤU'}
             </h1>
             <div className="bg-gray-800 p-8 rounded-3xl border-4 border-yellow-500/50 flex flex-col items-center shadow-2xl mb-8">
                <StudentAvatar student={{ name: player.name, avatarConfig: player.avatarConfig } as any} size={100} />
                <div className="text-3xl font-bold mt-4">{player.score} điểm</div>
                <div className="text-green-400 font-bold mt-2">HP còn lại: {player.hp}</div>
             </div>
           </>
        ) : (
           <>
             <div className="w-24 h-24 rounded-full border-4 border-t-yellow-400 border-r-transparent border-b-yellow-400 border-l-transparent animate-spin mb-8"></div>
             <h1 className="text-3xl font-bold mb-4">ĐÃ HOÀN THÀNH!</h1>
             <p className="text-xl text-gray-400 mb-8">Đang chờ kết quả từ những người chơi khác...</p>
             <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 max-w-sm w-full">
                <div className="text-gray-400 text-sm mb-1">Điểm số hiện tại</div>
                <div className="text-3xl font-mono font-bold text-yellow-400">{player.score}</div>
             </div>
           </>
        )}
        
        <button 
          onClick={() => navigate('/')}
          className="mt-8 bg-gray-700 hover:bg-gray-600 px-8 py-4 rounded-xl font-bold flex items-center gap-2 transition-all"
        >
          <Home size={20} /> Trở về trang chủ
        </button>
      </div>
    );
  }

  if (targetSelection) {
    // Target Selection Screen
    // For HEAL, include self
    const targets = (session.players || []).filter(p => {
      if (targetSelection === 'HEAL') return (p.hp || 0) > 0; // Can heal self or others
      return p.id !== player.id && (p.hp || 0) > 0; // Others only for offensive items
    });
    
    return (
      <div className="min-h-screen bg-gray-900 text-white p-4">
        <h2 className="text-2xl font-bold mb-6 text-center text-yellow-400 flex items-center justify-center gap-2">
          <Target /> CHỌN MỤC TIÊU
        </h2>
        <div className="grid grid-cols-2 gap-4">
          {targets.map(target => (
            <button
              key={target.id}
              onClick={() => handleAttack(target.id)}
              className="bg-gray-800 p-4 rounded-xl border-2 border-gray-700 hover:border-red-500 active:scale-95 transition-all flex flex-col items-center"
            >
              <StudentAvatar student={{ name: target.name, avatarConfig: target.avatarConfig } as any} size={60} />
              <span className="font-bold mt-2 truncate w-full text-center">{target.name}</span>
              <div className="w-full bg-gray-700 h-2 rounded-full mt-2 overflow-hidden">
                <div className="bg-red-500 h-full" style={{ width: `${((target.hp || 0) / (target.maxHp || 100)) * 100}%` }}></div>
              </div>
            </button>
          ))}
        </div>
        <button 
          onClick={() => setTargetSelection(null)}
          className="w-full mt-8 bg-gray-700 py-4 rounded-xl font-bold"
        >
          Hủy bỏ
        </button>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gray-900 text-white flex flex-col`}>
      {/* Status Bar */}
      <div className="bg-gray-800 p-4 flex items-center justify-between shadow-lg z-10">
        <div className="flex items-center gap-3">
          <StudentAvatar student={{ name: player.name, avatarConfig: player.avatarConfig } as any} size={40} />
          <div>
            <div className="font-bold">{player.name}</div>
            <div className="w-32 bg-gray-700 h-3 rounded-full overflow-hidden relative">
              <div 
                className={`h-full transition-all duration-500 ${hp > 50 ? 'bg-green-500' : 'bg-red-500'}`}
                style={{ width: `${(hp / maxHp) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="font-mono font-bold text-yellow-400 text-xl">{player.score}</div>
          <button 
            onClick={toggleFullscreen} 
            className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-gray-300"
            title={isFullscreen ? "Thu nhỏ" : "Toàn màn hình"}
          >
            {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
          </button>
        </div>
      </div>

      {/* Effect Overlays */}
      {isParalyzed && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-40 pointer-events-none">
           <div className="flex items-center gap-2 bg-yellow-900/80 text-yellow-400 px-4 py-2 rounded-full border border-yellow-500 animate-bounce shadow-lg shadow-yellow-500/50">
              <Zap size={16} /> <span className="font-bold">ĐÁP ÁN BỊ XÁO TRỘN! ({Math.max(0, Math.ceil(((activeEffects.find(e => e.type === 'PARALYZED')?.expiresAt || currentTime) - currentTime) / 1000))}s)</span>
           </div>
        </div>
      )}
      {isFrozen && (
        <div className="absolute inset-0 bg-blue-500/20 z-50 flex flex-col items-center justify-center backdrop-blur-[2px]">
          <Snowflake className="w-32 h-32 text-blue-400 animate-pulse" />
          <div className="bg-black/80 text-white px-6 py-3 rounded-xl mt-4 font-bold text-xl animate-pulse border-2 border-blue-400">
             BỊ ĐÓNG BĂNG! ({Math.max(0, Math.ceil(((activeEffects.find(e => e.type === 'FROZEN')?.expiresAt || currentTime) - currentTime) / 1000))}s)
          </div>
        </div>
      )}
      {isPoisoned && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-40 pointer-events-none">
           <div className="flex items-center gap-2 bg-green-900/80 text-green-400 px-4 py-2 rounded-full border border-green-500 animate-bounce">
              <Skull size={16} /> <span className="font-bold">BỊ TRÚNG ĐỘC! ({Math.max(0, Math.ceil(((activeEffects.find(e => e.type === 'POISONED')?.expiresAt || currentTime) - currentTime) / 1000))}s)</span>
           </div>
        </div>
      )}

      {/* Main Area: Question or Waiting */}
      <div className={`flex-1 p-4 flex flex-col justify-center relative`}>
        {isBlinded && (
          <div className={`absolute inset-0 z-50 flex flex-col items-center justify-center pointer-events-none transition-colors duration-75 ${Math.floor(currentTime / 400) % 2 === 0 ? 'bg-black/95' : 'bg-black/50'}`}>
            <EyeOff className="w-32 h-32 text-purple-500 opacity-80" />
            <div className="bg-black/80 text-white px-6 py-3 rounded-xl mt-4 font-bold text-xl border-2 border-purple-500">
               MỰC CHE KHUẤT! ({Math.max(0, Math.ceil(((activeEffects.find(e => e.type === 'BLINDED')?.expiresAt || currentTime) - currentTime) / 1000))}s)
            </div>
          </div>
        )}
        {isSubmitted && (
             <div className={`absolute inset-0 z-20 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in zoom-in`}>
                <div className={`text-4xl font-black px-8 py-4 rounded-2xl shadow-2xl ${isCorrect ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                   {isCorrect ? 'CHÍNH XÁC!' : 'SAI RỒI!'}
                </div>
             </div>
        )}

        {currentQuestion ? (
           <>
              <div className="bg-gray-800 p-4 rounded-xl mb-4 text-center min-h-[100px] flex items-center justify-center border-2 border-gray-700">
                 <h2 className="text-xl font-bold"><MathText text={currentQuestion.text} /></h2>
              </div>
              
              {/* Controls (A, B, C, D) */}
              <div className="grid grid-cols-2 gap-4 mb-8 flex-1">
                 {displayOptions.map((opt, idx) => (
                   <button
                     key={opt.id}
                     onClick={() => handleAnswer(opt.id)}
                     disabled={isFrozen || isSubmitted}
                     className={`rounded-2xl font-bold text-lg p-4 shadow-lg active:scale-95 transition-transform flex flex-col items-center justify-center gap-2 ${
                       idx === 0 ? 'bg-red-600 hover:bg-red-500' : 
                       idx === 1 ? 'bg-blue-600 hover:bg-blue-500' : 
                       idx === 2 ? 'bg-yellow-600 hover:bg-yellow-500' : 
                       'bg-green-600 hover:bg-green-500'
                     } ${isFrozen || isSubmitted ? 'opacity-50 grayscale cursor-not-allowed' : ''}`}
                   >
                     {opt.imageUrl && <img src={opt.imageUrl} className="h-16 object-contain rounded bg-white" />}
                     <MathText text={opt.text} />
                   </button>
                 ))}
              </div>
           </>
        ) : (
           <div className="text-center opacity-50">Đang tải câu hỏi...</div>
        )}

        {/* Items */}
        {player.items && player.items.length > 0 && (
          <div className="mt-auto">
            <h3 className="text-sm font-bold text-gray-400 mb-2 uppercase">Vật phẩm ({player.items.length}/3)</h3>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {player.items.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => handleUseItem(item)}
                  disabled={isParalyzed || isFrozen}
                  className="w-16 h-16 bg-gray-800 rounded-xl border-2 border-gray-600 flex items-center justify-center shrink-0 hover:border-yellow-500 active:scale-95 transition-all relative group"
                >
                  {item === 'LIGHTNING' && <Zap className="text-yellow-400" />}
                  {item === 'POISON' && <Skull className="text-green-400" />}
                  {item === 'FREEZE' && <Snowflake className="text-blue-400" />}
                  {item === 'BLIND' && <EyeOff className="text-purple-400" />}
                  {item === 'ATTACK' && <Sword className="text-red-500" />}
                  {item === 'HEAL' && <Heart className="text-pink-500" />}
                  {item === 'SWAP' && <ArrowLeftRight className="text-orange-400" />}
                  
                  <span className={`absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none ${isBlinded ? 'hidden' : ''}`}>
                    {item}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
