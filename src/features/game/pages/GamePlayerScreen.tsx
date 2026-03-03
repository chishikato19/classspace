import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { GameSession, Question, Quiz } from '../../../types';
import { quizService } from '../../quiz/services/quizService';
import { gameService } from '../services/gameService';

export default function GamePlayerScreen() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState<GameSession | null>(null);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [finished, setFinished] = useState(false);

  // Load session and quiz data
  useEffect(() => {
    if (!sessionId) return;

    const unsubscribe = gameService.subscribeToSession(sessionId, async (data) => {
      setSession(data);
      
      // Load quiz data only once
      if (!quiz && data.quizId) {
        const quizData = await quizService.getQuizById(data.quizId);
        setQuiz(quizData);
      }
    });

    return () => unsubscribe();
  }, [sessionId, quiz]);

  // Handle answer submission
  const handleAnswer = async (optionId: string) => {
    if (isSubmitted || !quiz || !session) return;
    
    setSelectedOptionId(optionId);
    setIsSubmitted(true);

    const currentQuestion = quiz.questions[currentQuestionIndex];
    const correctOption = currentQuestion.options.find(o => o.isCorrect);
    const isAnswerCorrect = correctOption?.id === optionId;
    
    setIsCorrect(isAnswerCorrect);
    
    if (isAnswerCorrect) {
      setScore(prev => prev + currentQuestion.points + (streak * 100));
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
        timeTaken: 0, // TODO: Calculate time taken
        points: currentQuestion.points
      });
    }

    // Move to next question after delay
    setTimeout(() => {
      if (currentQuestionIndex < quiz.questions.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
        setIsSubmitted(false);
        setSelectedOptionId(null);
        setIsCorrect(false);
      } else {
        setFinished(true);
      }
    }, 2000); // 2 seconds delay to show result
  };

  if (!session || !quiz) return <div className="flex h-screen items-center justify-center">Đang tải câu hỏi...</div>;

  if (finished) {
    return (
      <div className="min-h-screen bg-indigo-900 text-white flex flex-col items-center justify-center p-4">
        <h1 className="text-4xl font-bold mb-4">HOÀN THÀNH!</h1>
        <div className="text-6xl font-black text-yellow-400 mb-8">{score} điểm</div>
        <p className="text-xl opacity-80">Bạn đã trả lời hết các câu hỏi.</p>
        <button 
          onClick={() => navigate('/')}
          className="mt-8 bg-white text-indigo-900 px-6 py-3 rounded-lg font-bold hover:bg-gray-100"
        >
          Về trang chủ
        </button>
      </div>
    );
  }

  const currentQuestion = quiz.questions[currentQuestionIndex];

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header Info */}
      <div className="bg-white p-4 shadow-sm flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-sm font-bold">
            {currentQuestionIndex + 1}/{quiz.questions.length}
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
