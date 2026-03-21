import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { GameSession, Question, Quiz, AvatarConfig } from '../../../types';
import { quizService } from '../../quiz/services/quizService';
import { gameService } from '../services/gameService';
import { StudentAvatar } from '../../../components/Avatar/StudentAvatar';
import { MathText } from '../../../components/MathText';
import { soundService } from '../services/soundService';
import BattlePlayerScreen from './BattlePlayerScreen';

export default function GamePlayerScreen() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState<GameSession | null>(null);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [shuffledQuestions, setShuffledQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [score, setScore] = useState(0);
  const [correctAnswersCount, setCorrectAnswersCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [finished, setFinished] = useState(false);
  const [questionStartTime, setQuestionStartTime] = useState<number>(0);
  const [avatarConfig, setAvatarConfig] = useState<AvatarConfig | undefined>(undefined);
  const [playerName, setPlayerName] = useState('');
  const [shortAnswerText, setShortAnswerText] = useState('');
  const [timeLeft, setTimeLeft] = useState<number>(0);

  // Load session and quiz data
  useEffect(() => {
    const name = sessionStorage.getItem('currentPlayerName');
    if (name) setPlayerName(name);
    const playerId = sessionStorage.getItem('currentPlayerId');

    const avatarJson = sessionStorage.getItem('currentPlayerAvatar');
    if (avatarJson) {
      try {
        setAvatarConfig(JSON.parse(avatarJson));
      } catch (e) {
        console.error("Error parsing avatar config", e);
      }
    }

    if (!sessionId) return;

    const unsubscribe = gameService.subscribeToSession(sessionId, async (data) => {
      // Handle Teacher-paced synchronization
      if (data.mode === 'TEACHER_PACED') {
        // Reset question state when moving to a new question
        if (session && data.currentQuestionIndex !== session.currentQuestionIndex) {
          setIsSubmitted(false);
          setSelectedOptionId(null);
          setIsCorrect(false);
          setQuestionStartTime(Date.now());
          setTimeLeft(shuffledQuestions[data.currentQuestionIndex]?.timeLimit || 30);
        }
        
        // Sync current question index
        setCurrentQuestionIndex(data.currentQuestionIndex);
      }

      setSession(data);
      
      // Load quiz data only once
      if (!quiz && data.quizId) {
        const quizData = await quizService.getQuizById(data.quizId);
        if (quizData) {
          setQuiz(quizData);
          
          let questions = [...(quizData.questions || [])];
          const settings = data.settings || { shuffleQuestions: false, shuffleAnswers: false };
          
          // Simple seeded random generator
          const seededRandom = (seed: number) => {
            let t = seed += 0x6D2B79F5;
            t = Math.imul(t ^ t >>> 15, t | 1);
            t ^= t + Math.imul(t ^ t >>> 7, t | 61);
            return ((t ^ t >>> 14) >>> 0) / 4294967296;
          };

          // Generate a numeric seed from playerId or sessionId
          const seedString = playerId || data.id;
          let seed = 0;
          for (let i = 0; i < seedString.length; i++) {
            seed = Math.imul(31, seed) + seedString.charCodeAt(i) | 0;
          }

          // Fisher-Yates shuffle function with seeded random
          const shuffleArray = <T,>(array: T[], seedValue: number): T[] => {
            const newArray = [...array];
            let currentSeed = seedValue;
            for (let i = newArray.length - 1; i > 0; i--) {
              const randomVal = seededRandom(currentSeed++);
              const j = Math.floor(randomVal * (i + 1));
              [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
            }
            return newArray;
          };

          // Only shuffle if NOT teacher-paced (everyone must see the same order in teacher-paced)
          if (data.mode !== 'TEACHER_PACED') {
            if (settings.shuffleQuestions) {
              questions = shuffleArray(questions, seed);
            }
            
            if (settings.shuffleAnswers) {
              questions = questions.map((q, idx) => ({
                ...q,
                options: shuffleArray(q.options || [], seed + idx)
              }));
            }
          }
          
          setShuffledQuestions(questions);

          // Determine starting question index based on previous answers
          const player = data.players.find(p => p.id === playerId);
          let startIndex = 0;
          if (data.mode !== 'TEACHER_PACED' && player && player.answers) {
            const firstUnansweredIndex = questions.findIndex(q => !player.answers[q.id]);
            if (firstUnansweredIndex !== -1) {
              startIndex = firstUnansweredIndex;
            } else {
              startIndex = questions.length;
              setFinished(true);
            }
          } else {
            startIndex = data.currentQuestionIndex || 0;
          }
          
          setCurrentQuestionIndex(startIndex);
          setQuestionStartTime(Date.now());
          setTimeLeft(questions[startIndex]?.timeLimit || 30);
        }
      }
    });

    return () => unsubscribe();
  }, [sessionId, quiz, session?.currentQuestionIndex]);

  // Timer logic
  useEffect(() => {
    if (!session || isSubmitted || finished || session.status === 'FINISHED' || session.status === 'WAITING' || session.status === 'STARTING' || session.status === 'LEADERBOARD') return;
    
    if (shuffledQuestions.length === 0) return;

    const currentQuestion = shuffledQuestions[currentQuestionIndex];
    // If time limit is 0, it's unlimited
    if (!currentQuestion || currentQuestion.timeLimit === 0) {
      setTimeLeft(0); // Or some indicator for unlimited
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // Auto submit when time is up
          if (!isSubmitted) {
            handleAnswer(null);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [session?.status, isSubmitted, finished, currentQuestionIndex, shuffledQuestions]);

  if (session?.mode === 'BATTLE') {
    return <BattlePlayerScreen />;
  }

  // Handle answer submission
  const handleAnswer = async (optionId: string | null, textAnswer?: string) => {
    if (isSubmitted || !quiz || !session || shuffledQuestions.length === 0) return;
    
    const currentQuestion = shuffledQuestions[currentQuestionIndex];
    let isAnswerCorrect = false;

    if (currentQuestion.type === 'SHORT_ANSWER') {
      if (!textAnswer || !textAnswer.trim()) return;
      // Check against all correct options (case-insensitive)
      isAnswerCorrect = (currentQuestion.options || []).some(
        opt => opt.text.trim().toLowerCase() === textAnswer.trim().toLowerCase()
      );
    } else if (currentQuestion.type === 'SURVEY') {
      if (!optionId) return;
      setSelectedOptionId(optionId);
      isAnswerCorrect = true; // Any answer is accepted
    } else {
      if (!optionId) return;
      setSelectedOptionId(optionId);
      const correctOption = (currentQuestion.options || []).find(o => o.isCorrect);
      isAnswerCorrect = correctOption?.id === optionId;
    }

    setIsSubmitted(true);
    
    setIsCorrect(isAnswerCorrect);
    if (isAnswerCorrect && currentQuestion.type !== 'SURVEY') {
      soundService.play('correct');
    } else if (!isAnswerCorrect) {
      soundService.play('wrong');
    }
    
    const timeTaken = (Date.now() - questionStartTime) / 1000; // in seconds
    const settings = session.settings || { equalPoints: false, timeBasedPoints: true, streakBonus: true };
    
    let points = 0;
    if (isAnswerCorrect && currentQuestion.type !== 'SURVEY') {
      let basePoints = settings.equalPoints ? 1000 : currentQuestion.points;
      
      if (settings.timeBasedPoints && !settings.equalPoints) {
        const timeLimit = currentQuestion.timeLimit || 30;
        const timeRatio = Math.max(0, (timeLimit - timeTaken) / timeLimit);
        basePoints = Math.round(basePoints * (0.5 + 0.5 * timeRatio));
      }
      
      const streakBonus = settings.streakBonus ? (streak * 100) : 0;
      points = basePoints + streakBonus;
      
      setScore(prev => prev + points);
      setCorrectAnswersCount(prev => prev + 1);
      setStreak(prev => prev + 1);
    } else if (currentQuestion.type !== 'SURVEY') {
      setStreak(0);
    }

    // Send to server
    const playerId = sessionStorage.getItem('currentPlayerId');
    if (playerId) {
      try {
        await gameService.submitAnswer(session.id, playerId, currentQuestion.id, {
          optionId,
          textAnswer,
          isCorrect: isAnswerCorrect,
          timeTaken,
          timeLimit: currentQuestion.timeLimit,
          points: points
        });
      } catch (e) {
        console.error("Failed to submit answer", e);
        // We continue to the next question even if submission fails to avoid getting stuck
      }
    }

    // Move to next question after delay (Only for Student-paced)
    if (session.mode !== 'TEACHER_PACED') {
      setTimeout(async () => {
        try {
          if (currentQuestionIndex < shuffledQuestions.length - 1) {
            const nextIndex = currentQuestionIndex + 1;
            setCurrentQuestionIndex(nextIndex);
            setIsSubmitted(false);
            setSelectedOptionId(null);
            setShortAnswerText('');
            setIsCorrect(false);
            setQuestionStartTime(Date.now());
            const nextTimeLimit = shuffledQuestions[nextIndex]?.timeLimit;
            setTimeLeft(nextTimeLimit === 0 ? 0 : (nextTimeLimit || 30));
          } else {
            setFinished(true);
            if (playerId) {
              await gameService.finishPlayerSession(session.id, playerId);
            }
          }
        } catch (e) {
          console.error("Error moving to next question", e);
          // Even on error, try to reset submission state to avoid getting stuck
          setIsSubmitted(false);
        }
      }, 2000); // 2 seconds delay to show result
    }
  };

  if (!session || !quiz || shuffledQuestions.length === 0) return <div className="flex h-screen items-center justify-center">Đang tải câu hỏi...</div>;

  // Teacher-paced waiting screens
  if (session.mode === 'TEACHER_PACED') {
    if (session.status === 'WAITING' || session.status === 'STARTING') {
      return (
        <div className="min-h-screen bg-indigo-900 text-white flex flex-col items-center justify-center p-4">
          <div className="animate-pulse text-2xl font-bold">Chuẩn bị bắt đầu...</div>
          <p className="mt-4 opacity-70">Hãy nhìn lên màn hình của giáo viên</p>
        </div>
      );
    }
    
    if (session.status === 'LEADERBOARD') {
      return (
        <div className="min-h-screen bg-indigo-900 text-white flex flex-col items-center justify-center p-4">
          <div className="text-center mb-8">
            <div className="text-sm uppercase tracking-widest opacity-60 mb-2">Điểm hiện tại</div>
            <div className="text-6xl font-black text-yellow-400">{score}</div>
          </div>
          
          <div className={`p-6 rounded-2xl text-center font-bold text-xl ${isCorrect ? 'bg-green-500' : 'bg-red-500'}`}>
            {isCorrect ? '🔥 TUYỆT VỜI!' : '😢 CỐ GẮNG HƠN NHÉ!'}
          </div>
          
          <p className="mt-12 animate-bounce text-indigo-300">Đang chờ câu hỏi tiếp theo...</p>
        </div>
      );
    }
  }

  if (finished || session?.status === 'FINISHED') {
    return (
      <div className="min-h-screen bg-indigo-900 text-white flex flex-col items-center justify-center p-4">
        <StudentAvatar 
          name={playerName} 
          avatarConfig={avatarConfig} 
          size={120} 
          className="border-4 border-yellow-400 shadow-lg mb-6"
        />
        <h1 className="text-4xl font-bold mb-4">HOÀN THÀNH!</h1>
        {session?.settings?.showScore && (
          <div className="flex flex-col items-center gap-2 mb-8">
            <div className="text-6xl font-black text-yellow-400">{score} điểm</div>
            <div className="text-2xl font-bold text-indigo-200">
              Đúng {correctAnswersCount} / {quiz?.questions.length} câu
            </div>
          </div>
        )}
        <p className="text-xl opacity-80">
          {session?.status === 'FINISHED' ? 'Giáo viên đã kết thúc bài thi.' : 'Bạn đã trả lời hết các câu hỏi.'}
        </p>
        <button 
          onClick={() => navigate('/')}
          className="mt-8 bg-white text-indigo-900 px-6 py-3 rounded-lg font-bold hover:bg-gray-100"
        >
          Về trang chủ
        </button>
      </div>
    );
  }

  const currentQuestion = shuffledQuestions[currentQuestionIndex];

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header Info */}
      <div className="bg-white p-4 shadow-sm flex justify-between items-center">
        <div className="flex items-center gap-4">
          <StudentAvatar 
            name={playerName} 
            avatarConfig={avatarConfig} 
            size={40} 
            className="border border-gray-200"
          />
          <div className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-sm font-bold">
            {currentQuestionIndex + 1}/{shuffledQuestions.length}
          </div>
          <div className="text-sm font-medium text-gray-500">Streak: 🔥 {session?.settings?.showCorrectAnswers === 'IMMEDIATELY' ? streak : '?'}</div>
        </div>
        <div className="flex items-center gap-6">
          <div className={`text-2xl font-black ${timeLeft > 0 && timeLeft <= 5 ? 'text-red-500 animate-pulse' : 'text-gray-700'}`}>
            ⏱ {currentQuestion.timeLimit === 0 ? '∞' : `${timeLeft}s`}
          </div>
          <div className="font-bold text-xl text-indigo-600">
            {session?.settings?.showCorrectAnswers === 'IMMEDIATELY' ? `${score} điểm` : '---'}
          </div>
        </div>
      </div>

      {/* Timer Progress Bar */}
      <div className="w-full bg-gray-200 h-2">
        {currentQuestion.timeLimit > 0 && (
          <div 
            className={`h-full transition-all duration-1000 linear ${timeLeft <= 5 ? 'bg-red-500' : 'bg-indigo-500'}`}
            style={{ width: `${(timeLeft / (currentQuestion.timeLimit || 30)) * 100}%` }}
          ></div>
        )}
      </div>

      {/* Question Area */}
      <div className="flex-1 p-4 max-w-3xl mx-auto w-full flex flex-col justify-center">
        <div className="bg-white p-6 rounded-2xl shadow-lg mb-6 text-center min-h-[200px] flex flex-col items-center justify-center">
          {currentQuestion.imageUrl && (
            <img 
              src={currentQuestion.imageUrl} 
              alt="Question" 
              className="max-h-64 object-contain rounded-lg mb-4 border-2 border-gray-100"
              referrerPolicy="no-referrer"
              onError={(e) => (e.currentTarget.style.display = 'none')}
            />
          )}
          <h2 className="text-2xl font-bold text-gray-800"><MathText text={currentQuestion.text} /></h2>
        </div>

        {/* Options Grid */}
        {currentQuestion.type === 'SHORT_ANSWER' ? (
          <div className="w-full max-w-md mx-auto">
            <input
              type="text"
              value={shortAnswerText}
              onChange={(e) => setShortAnswerText(e.target.value)}
              disabled={isSubmitted}
              placeholder="Nhập câu trả lời của bạn..."
              className="w-full p-4 text-lg border-2 border-gray-300 rounded-xl focus:border-indigo-500 focus:ring-indigo-500 mb-4 text-center shadow-sm"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isSubmitted) {
                  handleAnswer(null, shortAnswerText);
                }
              }}
            />
            <button
              onClick={() => handleAnswer(null, shortAnswerText)}
              disabled={isSubmitted || !shortAnswerText.trim()}
              className="w-full bg-indigo-600 text-white p-4 rounded-xl font-bold text-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md"
            >
              Gửi câu trả lời
            </button>
            {isSubmitted && (
               <div className="mt-6 text-center bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                  <p className="text-gray-500 text-sm font-medium uppercase tracking-wide mb-2">Đáp án chấp nhận:</p>
                  <div className="flex flex-wrap gap-2 justify-center">
                     {currentQuestion.options?.map(opt => (
                        <span key={opt.id} className="bg-green-50 text-green-700 px-3 py-1 rounded-full text-sm font-bold border border-green-200">
                           {opt.text}
                        </span>
                     ))}
                  </div>
               </div>
            )}
          </div>
        ) : (
          <div className={`grid ${currentQuestion.type === 'TRUE_FALSE' ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-2'} gap-4`}>
            {currentQuestion.options?.map((option, index) => {
              let bgClass = "bg-white hover:bg-gray-50 border-2 border-gray-200";
              
              if (isSubmitted) {
                const showAnswers = session?.settings?.showCorrectAnswers === 'IMMEDIATELY' && currentQuestion.type !== 'SURVEY';
                
                if (showAnswers) {
                  if (option.isCorrect) bgClass = "bg-green-500 border-green-600 text-white";
                  else if (option.id === selectedOptionId) bgClass = "bg-red-500 border-red-600 text-white";
                  else bgClass = "bg-gray-100 border-gray-200 opacity-50";
                } else {
                  // Just highlight selected
                  if (option.id === selectedOptionId) bgClass = "bg-indigo-500 border-indigo-600 text-white";
                  else bgClass = "bg-gray-100 border-gray-200 opacity-50";
                }
              }

              // For True/False, use specific colors if not submitted
              if (!isSubmitted && currentQuestion.type === 'TRUE_FALSE') {
                 if (index === 0) bgClass = "bg-blue-50 hover:bg-blue-100 border-2 border-blue-200 text-blue-800"; // True
                 else bgClass = "bg-red-50 hover:bg-red-100 border-2 border-red-200 text-red-800"; // False
              }

              return (
                <button
                  key={option.id}
                  disabled={isSubmitted}
                  onClick={() => handleAnswer(option.id)}
                  className={`p-6 rounded-xl text-lg font-semibold transition-all transform active:scale-95 shadow-sm flex flex-col items-center gap-2 ${bgClass} ${currentQuestion.type === 'TRUE_FALSE' ? 'h-40 justify-center text-2xl' : ''}`}
                >
                  {option.imageUrl && (
                    <img 
                      src={option.imageUrl} 
                      alt="Option" 
                      className="w-full h-32 object-contain rounded border border-gray-300 bg-white"
                      referrerPolicy="no-referrer"
                      onError={(e) => (e.currentTarget.style.display = 'none')}
                    />
                  )}
                  <MathText text={option.text} />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Feedback Overlay */}
      {isSubmitted && (
        <div className={`fixed inset-x-0 top-0 p-4 text-center font-bold text-white text-lg animate-slide-down ${
          session?.settings?.showCorrectAnswers === 'IMMEDIATELY' && currentQuestion.type !== 'SURVEY'
            ? (isCorrect ? 'bg-green-500' : 'bg-red-500')
            : 'bg-indigo-500'
        }`}>
          {session?.settings?.showCorrectAnswers === 'IMMEDIATELY' && currentQuestion.type !== 'SURVEY'
            ? (isCorrect ? 'CHÍNH XÁC! +Điểm' : 'SAI RỒI!')
            : 'Đã ghi nhận câu trả lời!'}
        </div>
      )}
    </div>
  );
}
