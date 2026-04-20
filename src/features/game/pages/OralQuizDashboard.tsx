import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { GameSession, Quiz, Player, StudentGroup } from '../../../types';
import { gameService } from '../services/gameService';
import { quizService } from '../../quiz/services/quizService';
import { groupService } from '../../teacher/services/groupService';
import { classService } from '../../random-selector/services/classService';
import { StudentAvatar } from '../../../components/Avatar/StudentAvatar';
import { CheckCircle2, XCircle, Users, ArrowRight, LogOut, Shuffle, Trophy, Eye, EyeOff, UserCheck, Maximize, Minimize, PartyPopper, Frown } from 'lucide-react';
import { MathText } from '../../../components/MathText';
import { soundService } from '../services/soundService';
import { motion, AnimatePresence } from 'motion/react';

// Import Random Selectors
import WheelSpinner from '../../random-selector/components/WheelSpinner';
import RandomName from '../../random-selector/components/RandomName';
import CardDraw from '../../random-selector/components/CardDraw';
import MysteryBox from '../../random-selector/components/MysteryBox';
import MagicHat from '../../random-selector/components/MagicHat';
import SlotMachine from '../../random-selector/components/SlotMachine';
import Elimination from '../../random-selector/components/Elimination';
import BalloonPop from '../../random-selector/components/BalloonPop';
import MiniRace from '../../random-selector/components/MiniRace';
import ScratchCard from '../../random-selector/components/ScratchCard';
import DuckShoot from '../../random-selector/components/DuckShoot';

type OralGameState = 'question_preview' | 'selecting' | 'answering';

export default function OralQuizDashboard() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState<GameSession | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [groups, setGroups] = useState<StudentGroup[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [gameState, setGameState] = useState<OralGameState>('question_preview');
  const [showQuestion, setShowQuestion] = useState(true);
  const [awardToGroup, setAwardToGroup] = useState(false);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  
  const [activeRandomMethod, setActiveRandomMethod] = useState<string>('wheel');
  const [isSelecting, setIsSelecting] = useState(false);
  const [lastSelectedName, setLastSelectedName] = useState('');

  const [className, setClassName] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    const unsubscribeSession = gameService.subscribeToSession(sessionId, async (data) => {
      setSession(data);
      if (data.quizId) {
        setQuiz(prevQuiz => {
          if (!prevQuiz) {
            quizService.getQuizById(data.quizId).then(setQuiz);
          }
          return prevQuiz;
        });
      }
      if (data.selectedClassId) {
        groupService.getGroupsByClass(data.selectedClassId).then(setGroups);
        // Fetch class name
        const classes = await classService.getAllClasses();
        const selectedClass = classes.find(c => c.id === data.selectedClassId);
        if (selectedClass) setClassName(selectedClass.name);
      }
      
      // Initialize game state based on settings
      if (data.settings?.showQuestionBeforeSelection === false) {
        setGameState('selecting');
        setShowQuestion(false);
      }
    });

    const unsubscribePlayers = gameService.subscribeToPlayers(sessionId, (playersData) => {
      setPlayers(playersData);
    });

    return () => {
      unsubscribeSession();
      unsubscribePlayers();
    };
  }, [sessionId]);

  useEffect(() => {
    if (session?.settings?.randomMethod === 'random') {
      if (gameState === 'selecting') {
        const methods = ['wheel', 'name', 'card', 'box', 'magic', 'slot', 'elimination', 'balloon', 'race', 'scratch', 'duck'];
        const randomIndex = Math.floor(Math.random() * methods.length);
        setActiveRandomMethod(methods[randomIndex]);
      }
    } else if (session?.settings?.randomMethod) {
      setActiveRandomMethod(session.settings.randomMethod);
    }
  }, [gameState, session?.settings?.randomMethod]);

  if (!session || !quiz) return <div className="flex h-screen items-center justify-center text-white bg-gray-900">Đang tải...</div>;


  const currentQuestion = quiz.questions[session.currentQuestionIndex];

  // Map players or groups to StudentData for random selectors
  const isGroupSelection = session.settings?.selectionTarget === 'group';
  const studentDataList = players.map(p => ({
    id: p.id,
    name: p.name,
    classId: session.selectedClassId || '',
    avatarConfig: p.avatarConfig
  }));

  const handleStudentSelected = (student: any) => {
    const player = players.find(p => p.id === student.id);
    if (player) {
      setSelectedPlayer(player);
      setGameState('answering');
      setShowQuestion(true);
      soundService.play('finish');
    }
  };

  const handleSubmitAnswer = async (isCorrect: boolean, optionId?: string) => {
    if (!selectedPlayer || !sessionId) return;

    const points = 1000;
    
    if (isGroupSelection) {
      // Award points to the group in the class
      if (isCorrect) {
        const group = groups.find(g => g.id === selectedPlayer.id);
        if (group) {
          await groupService.awardPoints(group.id, points, group.studentIds);
        }
      }
    } else {
      // Handle group points if selected (for individual selection)
      if (isCorrect && awardToGroup) {
        const playerGroup = groups.find(g => g.studentIds.includes(selectedPlayer.id));
        if (playerGroup) {
          await groupService.awardIndividualAndGroupPoints(selectedPlayer.id, playerGroup.id, points);
        }
      }
    }

    // Always submit oral answer to update session score
    await gameService.submitOralAnswer(
      sessionId,
      selectedPlayer.id,
      currentQuestion.id,
      isCorrect,
      points,
      optionId
    );

    setFeedback(isCorrect ? 'correct' : 'wrong');
    soundService.play(isCorrect ? 'correct' : 'wrong');
    
    // Wait for 3 seconds to show feedback
    await new Promise(resolve => setTimeout(resolve, 3000));
    setFeedback(null);

    if (isCorrect) {
      const nextIndex = session.currentQuestionIndex + 1;
      if (nextIndex < quiz.questions.length) {
        await gameService.nextQuestion(sessionId, nextIndex);
        setSelectedPlayer(null);
        setGameState(session.settings?.showQuestionBeforeSelection !== false ? 'question_preview' : 'selecting');
        if (session.settings?.showQuestionBeforeSelection === false) setShowQuestion(false);
      } else {
        await gameService.endGame(sessionId);
        navigate(`/game/results/${sessionId}`);
      }
    } else {
      setSelectedPlayer(null);
      setGameState('selecting');
    }
  };

  const handleSkip = async () => {
    const nextIndex = session.currentQuestionIndex + 1;
    if (nextIndex < quiz.questions.length) {
      await gameService.nextQuestion(session.id, nextIndex);
      setSelectedPlayer(null);
      setGameState(session.settings?.showQuestionBeforeSelection !== false ? 'question_preview' : 'selecting');
      if (session.settings?.showQuestionBeforeSelection === false) setShowQuestion(false);
    } else {
      await gameService.endGame(session.id);
      navigate(`/game/results/${session.id}`);
    }
  };

  const renderRandomSelector = () => {
    const method = activeRandomMethod;
    const props = {
      students: studentDataList,
      onSelect: handleStudentSelected,
      selectableIds: studentDataList.map(s => s.id),
      hideSelected: false
    };

    switch (method) {
      case 'wheel': return <WheelSpinner {...props} />;
      case 'name': return <RandomName {...props} />;
      case 'card': return <CardDraw {...props} />;
      case 'box': return <MysteryBox {...props} />;
      case 'magic': return <MagicHat {...props} />;
      case 'slot': return <SlotMachine {...props} />;
      case 'elimination': return <Elimination {...props} />;
      case 'balloon': return <BalloonPop {...props} />;
      case 'race': return <MiniRace {...props} />;
      case 'scratch': return <ScratchCard {...props} />;
      case 'duck': return <DuckShoot {...props} />;
      default: return <WheelSpinner {...props} />;
    }
  };

  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

  return (
    <div ref={containerRef} className={`min-h-screen bg-gray-900 text-white p-6 font-sans ${isFullscreen ? 'overflow-auto' : ''}`}>
      <div className="max-w-7xl mx-auto">
        <header className="flex justify-between items-center mb-8 bg-gray-800 p-4 rounded-2xl border border-gray-700 shadow-xl">
          <div>
            <h1 className="text-2xl font-black text-orange-400 flex items-center gap-2">
              <Users className="w-6 h-6" />
              CHẾ ĐỘ VẤN ĐÁP TRỰC TIẾP
            </h1>
            <div className="flex items-center gap-4 mt-1">
              <p className="text-gray-400 text-sm font-medium">Mã PIN: <span className="text-white font-mono">{session.pin}</span></p>
              {session.selectedClassId && (
                <p className="text-gray-400 text-sm font-medium border-l border-gray-700 pl-4">Lớp: <span className="text-white">{className || 'Đang tải...'}</span></p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={toggleFullscreen}
              className="bg-gray-700 hover:bg-gray-600 text-white p-2 rounded-xl transition-all border border-gray-600"
              title={isFullscreen ? "Thu nhỏ" : "Toàn màn hình"}
            >
              {isFullscreen ? <Minimize size={24} /> : <Maximize size={24} />}
            </button>
            <button 
              onClick={() => navigate('/teacher/dashboard')}
              className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-2 border border-gray-600"
            >
              <LogOut size={18} />
              Thoát
            </button>
            <button 
              onClick={async () => {
                if (window.confirm('Bạn có chắc chắn muốn kết thúc trò chơi?')) {
                  await gameService.endGame(session.id);
                  navigate(`/game/results/${session.id}`);
                }
              }}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl font-bold transition-all shadow-lg"
            >
              Kết thúc
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Question & Selection */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Question Card */}
            <div className={`bg-white text-gray-900 p-8 rounded-3xl shadow-2xl border-b-8 border-gray-200 transition-all duration-500 ${!showQuestion ? 'blur-xl grayscale opacity-50 pointer-events-none' : ''}`}>
              <div className="flex justify-between items-center mb-6">
                <span className="bg-orange-100 text-orange-700 px-4 py-1 rounded-full font-black text-sm uppercase tracking-wider">
                  Câu hỏi {session.currentQuestionIndex + 1} / {quiz.questions.length}
                </span>
                <button 
                  onClick={() => setShowQuestion(!showQuestion)}
                  className="p-2 hover:bg-gray-100 rounded-full text-gray-400 transition-colors"
                  title={showQuestion ? "Ẩn câu hỏi" : "Hiện câu hỏi"}
                >
                  {showQuestion ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>

              <div className="flex flex-col items-center text-center">
                {currentQuestion.imageUrl && (
                  <img 
                    src={currentQuestion.imageUrl} 
                    alt="Question" 
                    className="max-h-64 object-contain rounded-2xl mb-6 border-4 border-gray-100 shadow-md"
                    referrerPolicy="no-referrer"
                  />
                )}
                <h2 className="text-3xl font-black leading-tight text-gray-800">
                  <MathText text={currentQuestion.text} />
                </h2>
              </div>

              {/* Options Preview */}
              <div className="grid grid-cols-2 gap-4 mt-8">
                {currentQuestion.options.map((opt, idx) => (
                  <button 
                    key={opt.id}
                    disabled={gameState !== 'answering' || !selectedPlayer}
                    onClick={() => handleSubmitAnswer(opt.isCorrect, opt.id)}
                    className={`p-4 rounded-xl border-2 flex items-center gap-3 font-bold transition-all ${
                      gameState !== 'answering' || !selectedPlayer
                        ? 'cursor-not-allowed bg-gray-50 border-gray-200 text-gray-700' 
                        : 'hover:scale-105 active:scale-95 bg-white border-indigo-200 text-indigo-700 hover:bg-indigo-50 hover:border-indigo-400 cursor-pointer shadow-sm'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0 ${
                      gameState !== 'answering' || !selectedPlayer ? 'bg-gray-400' : 'bg-indigo-500'
                    }`}>
                      {String.fromCharCode(65 + idx)}
                    </div>
                    <MathText text={opt.text} />
                  </button>
                ))}
              </div>
            </div>

            {/* Selection Area */}
            <div className="bg-gray-800 rounded-3xl p-8 border border-gray-700 shadow-2xl relative overflow-hidden min-h-[400px] flex items-center justify-center">
              <AnimatePresence mode="wait">
                {gameState === 'question_preview' && (
                  <motion.div 
                    key="preview"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.1 }}
                    className="text-center space-y-6"
                  >
                    <div className="bg-indigo-600/20 p-6 rounded-full inline-block mb-4">
                      <Eye className="w-16 h-16 text-indigo-400" />
                    </div>
                    <h3 className="text-3xl font-black">Đang xem trước câu hỏi</h3>
                    <p className="text-gray-400 font-medium max-w-md mx-auto">Giáo viên có thể thảo luận câu hỏi với cả lớp trước khi chọn {isGroupSelection ? 'nhóm' : 'học sinh'} trả lời.</p>
                    <button
                      onClick={() => {
                        setGameState('selecting');
                        if (session.settings?.showQuestionBeforeSelection === false) setShowQuestion(false);
                      }}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-4 rounded-2xl font-black text-xl shadow-lg transition-all hover:scale-105 active:scale-95 flex items-center gap-3 mx-auto"
                    >
                      <Shuffle size={24} />
                      TIẾP TỤC CHỌN HỌC SINH
                    </button>
                  </motion.div>
                )}

                {gameState === 'selecting' && (
                  <motion.div 
                    key="selector"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="w-full"
                  >
                    {renderRandomSelector()}
                  </motion.div>
                )}

                {gameState === 'answering' && selectedPlayer && (
                  <motion.div 
                    key="result"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center py-6 w-full"
                  >
                    <div className="relative mb-6">
                      {session.settings?.allowAvatars !== false ? (
                        <StudentAvatar 
                          name={selectedPlayer.name} 
                          avatarConfig={selectedPlayer.avatarConfig} 
                          size={160} 
                          className="border-8 border-orange-500 shadow-2xl"
                        />
                      ) : (
                        <div className="w-40 h-40 rounded-full bg-indigo-500 flex items-center justify-center text-6xl font-bold border-8 border-orange-500 shadow-2xl">
                          {selectedPlayer.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <motion.div 
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.3, type: 'spring' }}
                        className="absolute -top-4 -right-4 bg-orange-500 text-white p-3 rounded-full shadow-lg"
                      >
                        <UserCheck className="w-8 h-8" />
                      </motion.div>
                    </div>
                    
                    <h3 className="text-4xl font-black text-white mb-2">{selectedPlayer.name}</h3>
                    <p className="text-orange-400 font-bold text-lg mb-8 uppercase tracking-widest">Mời em trả lời!</p>

                    <div className="flex flex-col gap-6 w-full max-w-md">
                      <p className="text-center text-gray-300 font-medium">
                        Giáo viên hãy chọn đáp án mà {isGroupSelection ? 'nhóm' : 'học sinh'} đã chọn ở phần câu hỏi bên trên.
                      </p>

                      {/* Group Points Option */}
                      {!isGroupSelection && (
                        <div className="bg-gray-700/50 p-4 rounded-xl border border-gray-600 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Users className="text-indigo-400" size={20} />
                            <span className="font-bold text-sm">Cộng điểm cho cả nhóm</span>
                          </div>
                          <button 
                            onClick={() => setAwardToGroup(!awardToGroup)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${awardToGroup ? 'bg-indigo-600' : 'bg-gray-500'}`}
                          >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${awardToGroup ? 'translate-x-6' : 'translate-x-1'}`} />
                          </button>
                        </div>
                      )}
                    </div>
                    
                    <button 
                      onClick={() => {
                        setSelectedPlayer(null);
                        setGameState('selecting');
                      }}
                      className="mt-8 text-gray-400 hover:text-white font-bold underline underline-offset-4 transition-colors"
                    >
                      Chọn lại {isGroupSelection ? 'nhóm' : 'học sinh'} khác
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            <div className="flex justify-end">
              <button
                onClick={handleSkip}
                className="text-gray-500 hover:text-white flex items-center gap-2 font-bold transition-colors"
              >
                Bỏ qua câu hỏi này
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Right Column: Leaderboard */}
          <div className="bg-gray-800 rounded-3xl p-6 border border-gray-700 shadow-2xl flex flex-col h-fit">
            <h3 className="text-xl font-black text-white mb-6 flex items-center gap-2 border-b border-gray-700 pb-4">
              <Trophy className="w-6 h-6 text-yellow-500" />
              BẢNG XẾP HẠNG
            </h3>
            
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
              {sortedPlayers.map((p, idx) => (
                <div 
                  key={p.id}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                    selectedPlayer?.id === p.id 
                      ? 'bg-orange-500/20 border-orange-500/50' 
                      : 'bg-gray-900/50 border-gray-700'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm ${
                    idx === 0 ? 'bg-yellow-500 text-yellow-950' :
                    idx === 1 ? 'bg-gray-400 text-gray-900' :
                    idx === 2 ? 'bg-orange-700 text-orange-100' :
                    'bg-gray-800 text-gray-400'
                  }`}>
                    {idx + 1}
                  </div>
                  <StudentAvatar 
                    name={p.name} 
                    avatarConfig={p.avatarConfig} 
                    size={36} 
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-bold truncate text-sm">{p.name}</div>
                    <div className="text-xs text-gray-500">Chuỗi: {p.streak || 0}</div>
                  </div>
                  <div className="font-mono font-black text-orange-400">
                    {p.score}
                  </div>
                </div>
              ))}
              
              {players.length === 0 && (
                <div className="text-center py-12 text-gray-500 font-medium italic">
                  Chưa có {isGroupSelection ? 'nhóm' : 'học sinh'} tham gia
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Feedback Overlay */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-6"
          >
            <motion.div
              initial={{ scale: 0.5, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.5, y: 50 }}
              className={`max-w-xl w-full rounded-[40px] p-12 text-center shadow-2xl ${
                feedback === 'correct' ? 'bg-green-600' : 'bg-red-600'
              }`}
            >
              <div className="flex justify-center mb-8">
                {feedback === 'correct' ? (
                  <div className="bg-white/20 p-8 rounded-full">
                    <PartyPopper className="w-24 h-24 text-white" />
                  </div>
                ) : (
                  <div className="bg-white/20 p-8 rounded-full">
                    <Frown className="w-24 h-24 text-white" />
                  </div>
                )}
              </div>
              
              <h2 className="text-6xl font-black text-white mb-4 uppercase tracking-tighter">
                {feedback === 'correct' ? 'CHÚC MỪNG!' : 'CHIA BUỒN!'}
              </h2>
              
              <p className="text-2xl font-bold text-white/90">
                {feedback === 'correct' 
                  ? 'Em đã trả lời chính xác câu hỏi này!' 
                  : 'Rất tiếc, câu trả lời chưa chính xác.'}
              </p>

              {feedback === 'correct' && (
                <div className="mt-8 flex justify-center gap-2">
                  {[...Array(5)].map((_, i) => (
                    <motion.div
                      key={i}
                      animate={{
                        y: [0, -20, 0],
                        scale: [1, 1.2, 1],
                      }}
                      transition={{
                        duration: 1,
                        repeat: Infinity,
                        delay: i * 0.1,
                      }}
                      className="text-4xl"
                    >
                      ⭐
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
