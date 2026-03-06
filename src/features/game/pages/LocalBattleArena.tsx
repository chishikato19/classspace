import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Quiz, Question } from '../../../types';
import { quizService } from '../../quiz/services/quizService';
import { ArrowLeft, Trophy, Swords, Zap, Timer, AlertCircle, Shield, Snowflake, EyeOff, Magnet } from 'lucide-react';

type GameMode = 'sync' | 'chaos';
type ItemType = 'FREEZE' | 'SHIELD' | 'STEAL' | 'BLIND';

interface PlayerState {
  name: string;
  score: number;
  streak: number;
  isLocked: boolean;
  lockedUntil: number;
  lastAnswer: string | null;
  isCorrect: boolean | null;
  questionIndex: number;
  item: ItemType | null;
  hasShield: boolean;
  isFrozen: boolean;
  frozenUntil: number;
  isBlinded: boolean;
  blindedUntil: number;
  showFeedback: boolean;
  isSelectingItem: boolean;
  selectionOptions: ItemType[];
}

const TEAM_RED = {
  id: 'red',
  name: 'Đội Đỏ',
  color: 'red',
  keys: {
    'w': '0', 'W': '0',
    'a': '1', 'A': '1',
    's': '2', 'S': '2',
    'd': '3', 'D': '3',
    'q': 'ITEM', 'Q': 'ITEM'
  }
};

const TEAM_BLUE = {
  id: 'blue',
  name: 'Đội Xanh',
  color: 'blue',
  keys: {
    'ArrowUp': '0',
    'ArrowLeft': '1',
    'ArrowDown': '2',
    'ArrowRight': '3',
    'Enter': 'ITEM'
  }
};

const ITEMS: { type: ItemType; name: string; icon: any; color: string; desc: string }[] = [
  { type: 'FREEZE', name: 'Đóng băng', icon: Snowflake, color: 'blue', desc: 'Khóa đối thủ 5s' },
  { type: 'SHIELD', name: 'Khiên', icon: Shield, color: 'green', desc: 'Chặn 1 lần tấn công' },
  { type: 'STEAL', name: 'Cướp điểm', icon: Magnet, color: 'yellow', desc: 'Cướp 200 điểm' },
  { type: 'BLIND', name: 'Che mắt', icon: EyeOff, color: 'purple', desc: 'Che đáp án 5s' },
];

export default function LocalBattleArena() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  
  // Game State
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [gameState, setGameState] = useState<'SETUP' | 'PLAYING' | 'FINISHED'>('SETUP');
  const [gameMode, setGameMode] = useState<GameMode>('sync');
  const [itemsEnabled, setItemsEnabled] = useState(false);
  const [balance, setBalance] = useState(50); // 0 = Red wins, 100 = Blue wins, 50 = Balanced
  
  // Player State
  const [redPlayer, setRedPlayer] = useState<PlayerState>({
    name: 'Đội Đỏ', score: 0, streak: 0, isLocked: false, lockedUntil: 0, lastAnswer: null, isCorrect: null, questionIndex: 0, item: null, hasShield: false, isFrozen: false, frozenUntil: 0, isBlinded: false, blindedUntil: 0, showFeedback: false, isSelectingItem: false, selectionOptions: []
  });
  const [bluePlayer, setBluePlayer] = useState<PlayerState>({
    name: 'Đội Xanh', score: 0, streak: 0, isLocked: false, lockedUntil: 0, lastAnswer: null, isCorrect: null, questionIndex: 0, item: null, hasShield: false, isFrozen: false, frozenUntil: 0, isBlinded: false, blindedUntil: 0, showFeedback: false, isSelectingItem: false, selectionOptions: []
  });

  // Load Quiz
  useEffect(() => {
    if (quizId) {
      quizService.getQuizById(quizId).then(setQuiz);
    }
  }, [quizId]);

  // Game Loop & Input Handling
  useEffect(() => {
    if (gameState !== 'PLAYING') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const now = Date.now();
      
      // Check Red Input
      const redKey = TEAM_RED.keys[e.key as keyof typeof TEAM_RED.keys];
      if (redKey !== undefined) {
        if (redKey === 'ITEM') {
          useItem('red');
        } else {
          if (redPlayer.isLocked && now < redPlayer.lockedUntil) return;
          if (redPlayer.isFrozen && now < redPlayer.frozenUntil) return;
          if (redPlayer.lastAnswer || redPlayer.showFeedback || redPlayer.isSelectingItem) return;
          
          const currentQuestion = quiz?.questions[redPlayer.questionIndex];
          if (!currentQuestion) return;

          const answerIndex = parseInt(redKey);
          const option = currentQuestion.options[answerIndex];
          if (option) handleAnswer('red', option.id, option.isCorrect);
        }
      }

      // Check Blue Input
      const blueKey = TEAM_BLUE.keys[e.key as keyof typeof TEAM_BLUE.keys];
      if (blueKey !== undefined) {
        if (blueKey === 'ITEM') {
          useItem('blue');
        } else {
          if (bluePlayer.isLocked && now < bluePlayer.lockedUntil) return;
          if (bluePlayer.isFrozen && now < bluePlayer.frozenUntil) return;
          if (bluePlayer.lastAnswer || bluePlayer.showFeedback || bluePlayer.isSelectingItem) return;

          const currentQuestion = quiz?.questions[bluePlayer.questionIndex];
          if (!currentQuestion) return;

          const answerIndex = parseInt(blueKey);
          const option = currentQuestion.options[answerIndex];
          if (option) handleAnswer('blue', option.id, option.isCorrect);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, quiz, redPlayer, bluePlayer]);

  // Timer for unlocking players
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      // Unlock
      if (redPlayer.isLocked && now >= redPlayer.lockedUntil) setRedPlayer(p => ({ ...p, isLocked: false }));
      if (bluePlayer.isLocked && now >= bluePlayer.lockedUntil) setBluePlayer(p => ({ ...p, isLocked: false }));
      
      // Unfreeze
      if (redPlayer.isFrozen && now >= redPlayer.frozenUntil) setRedPlayer(p => ({ ...p, isFrozen: false }));
      if (bluePlayer.isFrozen && now >= bluePlayer.frozenUntil) setBluePlayer(p => ({ ...p, isFrozen: false }));

      // Unblind
      if (redPlayer.isBlinded && now >= redPlayer.blindedUntil) setRedPlayer(p => ({ ...p, isBlinded: false }));
      if (bluePlayer.isBlinded && now >= bluePlayer.blindedUntil) setBluePlayer(p => ({ ...p, isBlinded: false }));

    }, 100);
    return () => clearInterval(interval);
  }, [redPlayer, bluePlayer]);

  const getRandomOptions = (): ItemType[] => {
    const shuffled = [...ITEMS].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 3).map(i => i.type);
  };

  const useItem = (team: 'red' | 'blue') => {
    const isRed = team === 'red';
    const player = isRed ? redPlayer : bluePlayer;
    const opponent = isRed ? bluePlayer : redPlayer;
    const setPlayer = isRed ? setRedPlayer : setBluePlayer;
    const setOpponent = isRed ? setBluePlayer : setRedPlayer;

    if (!player.item) return;

    if (player.item === 'SHIELD') {
      setPlayer(p => ({ ...p, item: null, hasShield: true }));
    } else {
      // Offensive items
      if (opponent.hasShield) {
        setOpponent(p => ({ ...p, hasShield: false })); // Break shield
      } else {
        if (player.item === 'FREEZE') {
          setOpponent(p => ({ ...p, isFrozen: true, frozenUntil: Date.now() + 5000 }));
        } else if (player.item === 'STEAL') {
          setOpponent(p => ({ ...p, score: Math.max(0, p.score - 200) }));
          setPlayer(p => ({ ...p, score: p.score + 200 }));
        } else if (player.item === 'BLIND') {
          setOpponent(p => ({ ...p, isBlinded: true, blindedUntil: Date.now() + 5000 }));
        }
      }
      setPlayer(p => ({ ...p, item: null }));
    }
  };

  const handleAnswer = (team: 'red' | 'blue', answerId: string, isCorrect: boolean) => {
    const isRed = team === 'red';
    const setter = isRed ? setRedPlayer : setBluePlayer;

    if (isCorrect) {
      // Correct Answer
      setter(p => ({ 
        ...p, 
        lastAnswer: answerId, 
        isCorrect: true, 
        score: p.score + 100, 
        streak: p.streak + 1, 
        showFeedback: true 
      }));
      
      // Update Balance
      setBalance(prev => {
        const change = 10;
        const newBalance = isRed ? prev - change : prev + change;
        return Math.max(0, Math.min(100, newBalance));
      });

      if (itemsEnabled) {
        // Show Item Selection
        setter(p => ({ ...p, isSelectingItem: true, selectionOptions: getRandomOptions() }));
        
        // In Sync mode, we still need to advance eventually if they don't pick? 
        // Let's force a timeout in Sync mode to keep game moving, but long enough to pick.
        if (gameMode === 'sync') {
           setTimeout(() => nextQuestion(team), 5000); // 5s to pick
           const otherSetter = isRed ? setBluePlayer : setRedPlayer;
           otherSetter(p => ({ ...p, showFeedback: true }));
           setTimeout(() => nextQuestion(isRed ? 'blue' : 'red'), 5000);
        }
      } else {
        // No items, just advance
        setTimeout(() => nextQuestion(team), gameMode === 'sync' ? 2000 : 1000);
        if (gameMode === 'sync') {
          const otherSetter = isRed ? setBluePlayer : setRedPlayer;
          otherSetter(p => ({ ...p, showFeedback: true }));
          setTimeout(() => nextQuestion(isRed ? 'blue' : 'red'), 2000);
        }
      }

    } else {
      // Wrong Answer
      setter(p => ({ 
        ...p, 
        lastAnswer: answerId, 
        isCorrect: false, 
        streak: 0,
        isLocked: true,
        lockedUntil: Date.now() + 3000
      }));

      setTimeout(() => {
        setter(p => ({ ...p, lastAnswer: null, isCorrect: null }));
      }, 1000);
    }
  };

  const selectItem = (team: 'red' | 'blue', item: ItemType) => {
    const isRed = team === 'red';
    const setter = isRed ? setRedPlayer : setBluePlayer;
    
    setter(p => ({ ...p, item: item, isSelectingItem: false }));
    
    // In Chaos mode, advance immediately after picking
    if (gameMode === 'chaos') {
      nextQuestion(team);
    }
  };

  const nextQuestion = (team: 'red' | 'blue') => {
    if (!quiz) return;
    
    setBalance(prev => {
      if (prev <= 0 || prev >= 100) setGameState('FINISHED');
      return prev;
    });

    const isRed = team === 'red';
    const setter = isRed ? setRedPlayer : setBluePlayer;
    const player = isRed ? redPlayer : bluePlayer;

    if (player.questionIndex < quiz.questions.length - 1) {
      setter(p => ({ ...p, questionIndex: p.questionIndex + 1, lastAnswer: null, isCorrect: null, showFeedback: false, isSelectingItem: false }));
    } else {
      setter(p => ({ ...p, showFeedback: true, lastAnswer: null, isCorrect: null, isSelectingItem: false }));
      
      // Check finish
      setRedPlayer(r => {
        setBluePlayer(b => {
          if (r.questionIndex >= quiz.questions.length - 1 && b.questionIndex >= quiz.questions.length - 1) {
            setGameState('FINISHED');
          }
          return b;
        });
        return r;
      });
    }
  };

  const startGame = () => {
    setGameState('PLAYING');
  };

  if (!quiz) return <div className="flex h-screen items-center justify-center">Đang tải...</div>;

  if (gameState === 'SETUP') {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-8">
        <div className="max-w-4xl w-full bg-gray-800 rounded-3xl p-12 shadow-2xl text-center">
          <Swords className="w-24 h-24 text-yellow-400 mx-auto mb-6" />
          <h1 className="text-5xl font-black mb-4 bg-gradient-to-r from-red-500 via-yellow-400 to-blue-500 text-transparent bg-clip-text">
            ĐẤU TRƯỜNG TỐC ĐỘ
          </h1>
          <p className="text-xl text-gray-400 mb-8">Chế độ đối kháng 1vs1 trên cùng một thiết bị</p>

          {/* Settings */}
          <div className="flex justify-center gap-8 mb-12">
            <div className="bg-gray-700 p-6 rounded-2xl flex-1 max-w-xs">
              <h3 className="text-lg font-bold mb-4">Chế độ chơi</h3>
              <div className="flex flex-col gap-2">
                <button 
                  onClick={() => setGameMode('sync')}
                  className={`p-3 rounded-xl font-bold transition ${gameMode === 'sync' ? 'bg-indigo-500 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-600'}`}
                >
                  Đồng bộ (Cùng câu hỏi)
                </button>
                <button 
                  onClick={() => setGameMode('chaos')}
                  className={`p-3 rounded-xl font-bold transition ${gameMode === 'chaos' ? 'bg-indigo-500 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-600'}`}
                >
                  Hỗn loạn (Tốc độ riêng)
                </button>
              </div>
            </div>

            <div className="bg-gray-700 p-6 rounded-2xl flex-1 max-w-xs">
              <h3 className="text-lg font-bold mb-4">Vật phẩm</h3>
              <div className="flex flex-col gap-2">
                <button 
                  onClick={() => setItemsEnabled(true)}
                  className={`p-3 rounded-xl font-bold transition ${itemsEnabled ? 'bg-green-500 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-600'}`}
                >
                  Bật (Cướp, Mù, Băng...)
                </button>
                <button 
                  onClick={() => setItemsEnabled(false)}
                  className={`p-3 rounded-xl font-bold transition ${!itemsEnabled ? 'bg-red-500 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-600'}`}
                >
                  Tắt
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-12 mb-12">
            <div className="bg-red-900/30 border-2 border-red-500 rounded-2xl p-8">
              <h2 className="text-3xl font-bold text-red-500 mb-4">ĐỘI ĐỎ</h2>
              <div className="grid grid-cols-3 gap-2 max-w-[150px] mx-auto mb-4">
                <div className="col-start-2 w-12 h-12 border-2 border-red-500 rounded flex items-center justify-center font-bold">W</div>
                <div className="col-start-1 row-start-2 w-12 h-12 border-2 border-red-500 rounded flex items-center justify-center font-bold">A</div>
                <div className="col-start-2 row-start-2 w-12 h-12 border-2 border-red-500 rounded flex items-center justify-center font-bold">S</div>
                <div className="col-start-3 row-start-2 w-12 h-12 border-2 border-red-500 rounded flex items-center justify-center font-bold">D</div>
              </div>
              <p className="text-sm text-red-300">Sử dụng các phím WASD để chọn đáp án</p>
              {itemsEnabled && <p className="text-sm text-yellow-300 mt-2">Phím Q để dùng vật phẩm</p>}
            </div>

            <div className="bg-blue-900/30 border-2 border-blue-500 rounded-2xl p-8">
              <h2 className="text-3xl font-bold text-blue-500 mb-4">ĐỘI XANH</h2>
              <div className="grid grid-cols-3 gap-2 max-w-[150px] mx-auto mb-4">
                <div className="col-start-2 w-12 h-12 border-2 border-blue-500 rounded flex items-center justify-center font-bold">↑</div>
                <div className="col-start-1 row-start-2 w-12 h-12 border-2 border-blue-500 rounded flex items-center justify-center font-bold">←</div>
                <div className="col-start-2 row-start-2 w-12 h-12 border-2 border-blue-500 rounded flex items-center justify-center font-bold">↓</div>
                <div className="col-start-3 row-start-2 w-12 h-12 border-2 border-blue-500 rounded flex items-center justify-center font-bold">→</div>
              </div>
              <p className="text-sm text-blue-300">Sử dụng các phím Mũi tên để chọn đáp án</p>
              {itemsEnabled && <p className="text-sm text-yellow-300 mt-2">Phím Enter để dùng vật phẩm</p>}
            </div>
          </div>

          <div className="flex gap-4 justify-center">
            <button 
              onClick={() => navigate(-1)}
              className="px-8 py-4 rounded-xl font-bold text-gray-400 hover:bg-gray-700 transition"
            >
              Quay lại
            </button>
            <button 
              onClick={startGame}
              className="px-12 py-4 bg-yellow-500 hover:bg-yellow-400 text-black rounded-xl font-black text-2xl shadow-lg transform transition hover:scale-105 active:scale-95 flex items-center gap-3"
            >
              <Swords className="w-6 h-6" />
              BẮT ĐẦU TRẬN ĐẤU
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (gameState === 'FINISHED') {
    const winner = balance <= 0 ? 'red' : balance >= 100 ? 'blue' : (redPlayer.score > bluePlayer.score ? 'red' : 'blue');
    
    return (
      <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-8">
        <Trophy className={`w-32 h-32 mb-8 ${winner === 'red' ? 'text-red-500' : 'text-blue-500'}`} />
        <h1 className="text-6xl font-black mb-4">
          {winner === 'red' ? 'ĐỘI ĐỎ CHIẾN THẮNG!' : 'ĐỘI XANH CHIẾN THẮNG!'}
        </h1>
        <div className="text-2xl text-gray-400 mb-12">
          {balance <= 0 || balance >= 100 ? 'KNOCKOUT!' : 'Hết câu hỏi'}
        </div>
        
        <div className="flex gap-12 mb-12">
          <div className="text-center">
            <div className="text-red-500 font-bold text-xl mb-2">Đội Đỏ</div>
            <div className="text-4xl font-mono">{redPlayer.score}</div>
          </div>
          <div className="text-center">
            <div className="text-blue-500 font-bold text-xl mb-2">Đội Xanh</div>
            <div className="text-4xl font-mono">{bluePlayer.score}</div>
          </div>
        </div>

        <button 
          onClick={() => navigate(-1)}
          className="px-8 py-3 bg-white text-gray-900 rounded-lg font-bold hover:bg-gray-100"
        >
          Thoát ra
        </button>
      </div>
    );
  }

  const renderPlayerZone = (team: 'red' | 'blue', isSidePanel: boolean = false) => {
    const isRed = team === 'red';
    const player = isRed ? redPlayer : bluePlayer;
    const currentQuestion = quiz.questions[player.questionIndex];
    const isFinished = player.questionIndex >= quiz.questions.length - 1 && player.showFeedback;

    return (
      <div className={`flex-1 flex flex-col p-6 transition-colors duration-300 h-full relative ${player.isLocked ? 'opacity-50 grayscale' : ''} ${player.isFrozen ? 'bg-blue-900/40 border-4 border-blue-300' : ''}`}>
        
        {/* Status Overlays */}
        {player.isLocked && !player.isFrozen && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50 backdrop-blur-sm rounded-xl m-6">
            <div className="text-center animate-pulse text-red-500 font-bold text-2xl">
              <AlertCircle className="w-16 h-16 mx-auto mb-2" />
              BỊ KHÓA!
            </div>
          </div>
        )}
        {player.isFrozen && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-blue-500/30 backdrop-blur-md rounded-xl border-4 border-blue-300 m-6">
            <div className="text-center animate-pulse text-blue-200 font-bold text-2xl">
              <Snowflake className="w-16 h-16 mx-auto mb-2" />
              ĐÓNG BĂNG!
            </div>
          </div>
        )}

        {/* Item Selection Overlay */}
        {player.isSelectingItem && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-gray-900/90 backdrop-blur-md rounded-xl p-4">
            <h3 className="text-xl font-bold text-yellow-400 mb-4 animate-bounce">CHỌN VẬT PHẨM!</h3>
            <div className="grid grid-cols-1 gap-3 w-full">
              {player.selectionOptions.map((itemType, idx) => {
                const item = ITEMS.find(i => i.type === itemType)!;
                return (
                  <button
                    key={idx}
                    onClick={() => selectItem(team, itemType)}
                    className={`p-3 rounded-xl border-2 flex items-center gap-3 transition-all hover:scale-105 active:scale-95 bg-gray-800 border-${item.color}-500`}
                  >
                    <div className={`p-2 rounded-lg bg-${item.color}-500/20 text-${item.color}-400`}>
                      <item.icon size={24} />
                    </div>
                    <div className="text-left">
                      <div className={`font-bold text-${item.color}-400`}>{item.name}</div>
                      <div className="text-xs text-gray-400">{item.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Header: Items & Shield */}
        <div className="flex justify-between items-center mb-4 h-12">
          <div className="flex gap-2">
            {player.hasShield && (
              <div className="bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full border border-blue-500 flex items-center gap-2 font-bold">
                <Shield size={16} /> Khiên
              </div>
            )}
          </div>
          
          {itemsEnabled && (
            <button
              onClick={() => useItem(team)}
              disabled={!player.item || player.isFrozen || player.isLocked || player.isSelectingItem}
              className={`px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all active:scale-95 touch-manipulation z-30 ${
                player.item 
                  ? `bg-gray-700 text-white border border-gray-500 hover:bg-gray-600`
                  : 'bg-gray-800 text-gray-500 border border-gray-700'
              }`}
            >
              {player.item ? (
                <>
                  {(() => {
                    const i = ITEMS.find(x => x.type === player.item);
                    return i ? <><i.icon size={18} className={`text-${i.color}-400`} /> {i.name}</> : null;
                  })()}
                  <span className="text-xs opacity-50 ml-1">({isRed ? 'Q' : 'Enter'})</span>
                </>
              ) : 'Chưa có vật phẩm'}
            </button>
          )}
        </div>

        {/* Question Area */}
        <div className="flex-1 bg-gray-800 rounded-2xl p-6 flex flex-col relative overflow-hidden">
          {isFinished ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <Trophy className="w-20 h-20 text-yellow-500 mb-4" />
              <h2 className="text-3xl font-bold text-white mb-2">Đã hoàn thành!</h2>
              <p className="text-gray-400">Đang chờ đối thủ...</p>
            </div>
          ) : (
            <>
              {(!isSidePanel || gameMode === 'chaos') && (
                <>
                  <div className="mb-4 text-center">
                    <span className="bg-gray-700 px-3 py-1 rounded-full text-sm font-bold text-gray-300">
                      Câu {player.questionIndex + 1} / {quiz.questions.length}
                    </span>
                  </div>
                  
                  <h2 className={`text-2xl font-bold mb-8 text-center flex-1 flex items-center justify-center ${player.isBlinded ? 'blur-md select-none opacity-50' : ''}`}>
                    {currentQuestion?.text}
                  </h2>
                </>
              )}

              <div className="grid grid-cols-1 gap-3 mt-auto">
                {currentQuestion?.options.map((opt, idx) => (
                  <button
                    key={opt.id}
                    onClick={() => {
                      if (player.isLocked || player.isFrozen || player.lastAnswer || player.showFeedback || player.isSelectingItem) return;
                      handleAnswer(team, opt.id, opt.isCorrect);
                    }}
                    disabled={player.isLocked || player.isFrozen || !!player.lastAnswer || player.showFeedback || player.isSelectingItem}
                    className={`w-full p-4 rounded-xl border-2 font-bold text-lg flex items-center gap-4 transition-all active:scale-95 touch-manipulation ${
                      player.lastAnswer === opt.id
                        ? (player.isCorrect ? 'bg-green-600 border-green-400' : 'bg-red-600 border-red-400')
                        : (player.showFeedback && opt.isCorrect) 
                          ? 'bg-green-900/50 border-green-500'
                          : 'bg-gray-700 border-gray-600 hover:bg-gray-600'
                    } ${player.isBlinded ? 'blur-sm text-transparent' : ''}`}
                  >
                    <div className="w-8 h-8 border-2 border-gray-500 rounded flex items-center justify-center text-sm shrink-0 text-white !blur-0">
                      {isRed 
                        ? (idx === 0 ? 'W' : idx === 1 ? 'A' : idx === 2 ? 'S' : 'D')
                        : (idx === 0 ? '↑' : idx === 1 ? '←' : idx === 2 ? '↓' : '→')}
                    </div>
                    <span className="text-left">{opt.text}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white overflow-hidden flex flex-col">
      {/* Top Bar: Tug of War */}
      <div className="h-24 bg-gray-800 flex items-center px-8 relative shadow-xl z-10 shrink-0">
        <div className="w-1/4 flex items-center gap-4">
          <div className="w-16 h-16 bg-red-600 rounded-full border-4 border-white flex items-center justify-center font-bold text-2xl shadow-lg shadow-red-500/50">
            R
          </div>
          <div>
            <div className="font-bold text-red-400 text-xl">Đội Đỏ</div>
            <div className="font-mono text-2xl">{redPlayer.score}</div>
          </div>
        </div>

        <div className="flex-1 px-8 relative">
          <div className="h-6 bg-gray-700 rounded-full overflow-hidden relative border-2 border-gray-600">
            <div 
              className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-red-600 to-red-400 transition-all duration-500 ease-out"
              style={{ width: `${100 - balance}%` }}
            ></div>
            <div 
              className="absolute top-0 bottom-0 right-0 bg-gradient-to-l from-blue-600 to-blue-400 transition-all duration-500 ease-out"
              style={{ width: `${balance}%` }}
            ></div>
            
            {/* Center Marker */}
            <div className="absolute top-0 bottom-0 left-1/2 w-1 bg-white/50 -translate-x-1/2 z-10"></div>
          </div>
          
          {/* Tug Marker */}
          <div 
            className="absolute top-1/2 -translate-y-1/2 w-12 h-12 bg-white rounded-full shadow-xl border-4 border-gray-800 flex items-center justify-center transition-all duration-500 ease-out z-20"
            style={{ left: `${balance}%`, transform: 'translate(-50%, -50%)' }}
          >
            <Swords className="w-6 h-6 text-gray-800" />
          </div>
        </div>

        <div className="w-1/4 flex items-center justify-end gap-4">
          <div className="text-right">
            <div className="font-bold text-blue-400 text-xl">Đội Xanh</div>
            <div className="font-mono text-2xl">{bluePlayer.score}</div>
          </div>
          <div className="w-16 h-16 bg-blue-600 rounded-full border-4 border-white flex items-center justify-center font-bold text-2xl shadow-lg shadow-blue-500/50">
            B
          </div>
        </div>
      </div>

      {/* Main Game Area */}
      <div className="flex-1 flex relative overflow-hidden">
        {gameMode === 'sync' ? (
          /* SYNC MODE LAYOUT */
          <>
            <div className="w-1/4 border-r border-gray-800 relative bg-gray-900">
              {renderPlayerZone('red', true)}
            </div>
            
            {/* Center Question Zone for Sync Mode */}
            <div className="flex-1 p-8 flex flex-col bg-gray-900 z-10 shadow-2xl overflow-y-auto">
              <div className="flex-1 flex flex-col justify-center items-center text-center">
                <div className="mb-8">
                  <span className="bg-gray-800 px-4 py-2 rounded-full text-sm font-bold text-gray-400">
                    Câu hỏi {redPlayer.questionIndex + 1} / {quiz.questions.length}
                  </span>
                </div>
                
                <h2 className={`text-4xl font-black mb-12 leading-tight max-w-3xl ${redPlayer.isBlinded || bluePlayer.isBlinded ? 'blur-md opacity-50' : ''}`}>
                  {quiz.questions[redPlayer.questionIndex]?.text}
                </h2>

                <div className="grid grid-cols-2 gap-6 w-full max-w-4xl">
                  {quiz.questions[redPlayer.questionIndex]?.options.map((opt, idx) => (
                    <div 
                      key={opt.id}
                      className={`p-6 rounded-2xl border-l-8 text-left font-bold text-xl bg-gray-800 shadow-lg transition-all ${
                        (redPlayer.showFeedback || bluePlayer.showFeedback) && opt.isCorrect ? 'ring-4 ring-green-500 scale-105 bg-green-900/30' : ''
                      } ${
                        idx === 0 ? 'border-red-500' :
                        idx === 1 ? 'border-blue-500' :
                        idx === 2 ? 'border-yellow-500' :
                        'border-green-500'
                      } ${redPlayer.isBlinded || bluePlayer.isBlinded ? 'blur-sm text-transparent' : ''}`}
                    >
                      <span className={`mr-4 inline-block w-8 font-black ${
                        idx === 0 ? 'text-red-500' :
                        idx === 1 ? 'text-blue-500' :
                        idx === 2 ? 'text-yellow-500' :
                        'text-green-500'
                      }`}>
                        {String.fromCharCode(65 + idx)}.
                      </span>
                      {opt.text}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="w-1/4 border-l border-gray-800 relative bg-gray-900">
              {renderPlayerZone('blue', true)}
            </div>
          </>
        ) : (
          /* CHAOS MODE LAYOUT */
          <>
            <div className="flex-1 border-r border-gray-800 relative bg-gray-900">
              {renderPlayerZone('red', false)}
            </div>
            <div className="flex-1 border-l border-gray-800 relative bg-gray-900">
              {renderPlayerZone('blue', false)}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
