import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { GameSession, Question, Quiz, AvatarConfig } from '../../../types';
import { quizService } from '../../quiz/services/quizService';
import { gameService } from '../services/gameService';
import { StudentAvatar } from '../../../components/Avatar/StudentAvatar';

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
  const [streak, setStreak] = useState(0);
  const [finished, setFinished] = useState(false);
  const [questionStartTime, setQuestionStartTime] = useState<number>(0);
  const [avatarConfig, setAvatarConfig] = useState<AvatarConfig | undefined>(undefined);
  const [playerName, setPlayerName] = useState('');

  // Load session and quiz data
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

    if (!sessionId) return;

    const unsubscribe = gameService.subscribeToSession(sessionId, async (data) => {
      setSession(data);
      
      // Load quiz data only once
      if (!quiz && data.quizId) {
        const quizData = await quizService.getQuizById(data.quizId);
        if (quizData) {
          setQuiz(quizData);
          
          let questions = [...quizData.questions];
          const settings = data.settings || { shuffleQuestions: false, shuffleAnswers: false };
          
          // Fisher-Yates shuffle function
          const shuffleArray = <T,>(array: T[]): T[] => {
            const newArray = [...array];
            for (let i = newArray.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
            }
            return newArray;
          };

          if (settings.shuffleQuestions) {
            questions = shuffleArray(questions);
          }
          
          if (settings.shuffleAnswers) {
            questions = questions.map(q => ({
              ...q,
              options: shuffleArray(q.options)
            }));
          }
          
          setShuffledQuestions(questions);
          setQuestionStartTime(Date.now());
        }
      }
    });

    return () => unsubscribe();
  }, [sessionId, quiz]);

  // Handle answer submission
  const handleAnswer = async (optionId: string) => {
    if (isSubmitted || !quiz || !session || shuffledQuestions.length === 0) return;
    
    setSelectedOptionId(optionId);
    setIsSubmitted(true);

    const currentQuestion = shuffledQuestions[currentQuestionIndex];
    const correctOption = currentQuestion.options.find(o => o.isCorrect);
    const isAnswerCorrect = correctOption?.id === optionId;
    
    setIsCorrect(isAnswerCorrect);
    
    const timeTaken = (Date.now() - questionStartTime) / 1000; // in seconds
    const settings = session.settings || { equalPoints: false, timeBasedPoints: true, streakBonus: true };
    
    let points = 0;
    if (isAnswerCorrect) {
      let basePoints = settings.equalPoints ? 1000 : currentQuestion.points;
      
      if (settings.timeBasedPoints && !settings.equalPoints) {
        const timeLimit = currentQuestion.timeLimit || 30;
        const timeRatio = Math.max(0, (timeLimit - timeTaken) / timeLimit);
        basePoints = Math.round(basePoints * (0.5 + 0.5 * timeRatio));
      }
      
      const streakBonus = settings.streakBonus ? (streak * 100) : 0;
      points = basePoints + streakBonus;
      
      setScore(prev => prev + points);
      setStreak(prev => prev + 1);
    } else {
      setStreak(0);
    }

    // Send to server
    const playerId = localStorage.getItem('currentPlayerId');
    if (playerId) {
      await gameService.submitAnswer(session.id, playerId, currentQuestion.id, {
        optionId,
        isCorrect: isAnswerCorrect,
        timeTaken,
        timeLimit: currentQuestion.timeLimit,
        points: currentQuestion.points
      });
    }

    // Move to next question after delay
    setTimeout(() => {
      if (currentQuestionIndex < shuffledQuestions.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
        setIsSubmitted(false);
        setSelectedOptionId(null);
        setIsCorrect(false);
        setQuestionStartTime(Date.now());
      } else {
        setFinished(true);
      }
    }, 2000); // 2 seconds delay to show result
  };

  if (!session || !quiz || shuffledQuestions.length === 0) return <div className="flex h-screen items-center justify-center">Đang tải câu hỏi...</div>;

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
        <div className="text-6xl font-black text-yellow-400 mb-8">{score} điểm</div>
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
          <div className="text-sm font-medium text-gray-500">Streak: 🔥 {streak}</div>
        </div>
        <div className="font-bold text-xl text-indigo-600">{score} điểm</div>
      </div>

      {/* Question Area */}
      <div className="flex-1 p-4 max-w-3xl mx-auto w-full flex flex-col justify-center">
        <div className="bg-white p-6 rounded-2xl shadow-lg mb-6 text-center min-h-[200px] flex items-center justify-center">
          <h2 className="text-2xl font-bold text-gray-800">{currentQuestion.text}</h2>
        </div>

        {/* Options Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {currentQuestion.options.map((option, index) => {
            let bgClass = "bg-white hover:bg-gray-50 border-2 border-gray-200";
            if (isSubmitted) {
              if (option.isCorrect) bgClass = "bg-green-500 border-green-600 text-white";
              else if (option.id === selectedOptionId) bgClass = "bg-red-500 border-red-600 text-white";
              else bgClass = "bg-gray-100 border-gray-200 opacity-50";
            }

            return (
              <button
                key={option.id}
                disabled={isSubmitted}
                onClick={() => handleAnswer(option.id)}
                className={`p-6 rounded-xl text-lg font-semibold transition-all transform active:scale-95 shadow-sm ${bgClass}`}
              >
                {option.text}
              </button>
            );
          })}
        </div>
      </div>

      {/* Feedback Overlay */}
      {isSubmitted && (
        <div className={`fixed inset-x-0 top-0 p-4 text-center font-bold text-white text-lg animate-slide-down ${isCorrect ? 'bg-green-500' : 'bg-red-500'}`}>
          {isCorrect ? 'CHÍNH XÁC! +Điểm' : 'SAI RỒI!'}
        </div>
      )}
    </div>
  );
}
