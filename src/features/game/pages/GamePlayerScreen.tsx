import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { GameSession, Question, Quiz, AvatarConfig, Player } from '../../../types';
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
  const [hasFailedCurrentQuestion, setHasFailedCurrentQuestion] = useState(false);
  const [finished, setFinished] = useState(false);
  const [questionStartTime, setQuestionStartTime] = useState<number>(0);
  const [avatarConfig, setAvatarConfig] = useState<AvatarConfig | undefined>(undefined);
  const [playerName, setPlayerName] = useState('');
  const [shortAnswerText, setShortAnswerText] = useState('');
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [localAnswers, setLocalAnswers] = useState<Record<string, any>>({});
  const [showReview, setShowReview] = useState(false);
  const [playerAnswers, setPlayerAnswers] = useState<Record<string, any>>({});
  
  const quizLoadingRef = useRef(false);
  const initializationRef = useRef(false);

  // Load player info from session storage
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

  // 1. Subscribe to session data
  useEffect(() => {
    if (!sessionId) return;

    let unsubscribe: (() => void) | null = null;

    const handleSessionData = (data: GameSession) => {
      setSession(prevSession => {
        // Handle Teacher-paced synchronization
        if (data.mode === 'TEACHER_PACED') {
          if (prevSession && data.currentQuestionIndex !== prevSession.currentQuestionIndex) {
            setIsSubmitted(false);
            setSelectedOptionId(null);
            setIsCorrect(false);
            setQuestionStartTime(Date.now());
            
            // Update time left for new question
            if (shuffledQuestions.length > 0) {
              const nextQuestion = shuffledQuestions[data.currentQuestionIndex];
              if (nextQuestion) {
                const getEffectiveTimeLimit = (q: Question) => {
                  if (data.settings?.forceTimeLimit !== undefined) {
                    return data.settings.forceTimeLimit;
                  }
                  return q.timeLimit;
                };
                const limit = getEffectiveTimeLimit(nextQuestion);
                setTimeLeft(limit === 0 ? 0 : (limit || 30));
              }
            }
          }
          setCurrentQuestionIndex(data.currentQuestionIndex);
        }
        return data;
      });
    };

    const initSession = async () => {
      try {
        let initialData: GameSession | null = null;
        
        // Try to load from local storage if superEcoMode might be active
        let cachedSession = null;
        try {
          cachedSession = localStorage.getItem(`session_${sessionId}`);
        } catch (e) {
          console.warn("[SuperEcoMode] localStorage blocked in this browser");
        }

        if (cachedSession) {
          try {
            const parsed = JSON.parse(cachedSession);
            if (parsed.settings?.superEcoMode) {
              initialData = parsed;
              console.log("[SuperEcoMode] Loaded session from local storage");
            }
          } catch (e) {
            console.error("[SuperEcoMode] Error parsing cached session", e);
          }
        }

        // If not loaded from cache, fetch from service
        if (!initialData) {
          initialData = await gameService.getSessionById(sessionId);
          if (initialData && initialData.settings?.superEcoMode) {
            try {
              localStorage.setItem(`session_${sessionId}`, JSON.stringify(initialData));
            } catch (e) {
              console.warn("[SuperEcoMode] Could not cache session to localStorage");
            }
          }
        }

        if (initialData) {
          handleSessionData(initialData);
          
          // Only subscribe if NOT homework or student-paced or superEcoMode (to save reads)
          if (initialData.mode !== 'HOMEWORK' && 
              initialData.mode !== 'STUDENT_PACED' && 
              !initialData.settings?.superEcoMode) {
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
  }, [sessionId, shuffledQuestions.length]);

  // 2. Load quiz data (with Eco Mode caching)
  useEffect(() => {
    if (!session?.quizId || quiz || quizLoadingRef.current) return;

    const loadQuiz = async () => {
      quizLoadingRef.current = true;
      let quizData: Quiz | null = null;
      
      // Try to load from local storage if ecoMode is enabled
      if (session.settings?.ecoMode) {
        let cached = null;
        try {
          cached = localStorage.getItem(`quizContent_${session.quizId}`);
        } catch (e) {
          console.warn("[EcoMode] localStorage blocked in this browser");
        }
        
        if (cached) {
          try {
            quizData = JSON.parse(cached);
            console.log("[EcoMode] Loaded quiz content from local storage");
          } catch (e) {
            console.error("[EcoMode] Error parsing cached quiz", e);
          }
        }
      }
      
      // If not in cache or not ecoMode, fetch from service
      if (!quizData) {
        if (session.quizJsonUrl) {
          try {
            console.log("[JsonMode] Fetching quiz from static JSON URL");
            const response = await fetch(session.quizJsonUrl);
            if (response.ok) {
              quizData = await response.json();
            } else {
              throw new Error("Failed to fetch JSON");
            }
          } catch (e) {
            console.error("[JsonMode] Error fetching JSON, falling back to Firestore", e);
            quizData = await quizService.getQuizById(session.quizId);
          }
        } else {
          quizData = await quizService.getQuizById(session.quizId);
        }
        
        // Save to local storage if ecoMode is enabled
        if (quizData && session.settings?.ecoMode) {
          try {
            localStorage.setItem(`quizContent_${session.quizId}`, JSON.stringify(quizData));
            console.log("[EcoMode] Saved quiz content to local storage");
          } catch (e) {
            console.warn("[EcoMode] Could not save quiz content to localStorage");
          }
        }
      }

      if (quizData) {
        setQuiz(quizData);
      }
      quizLoadingRef.current = false;
    };

    loadQuiz();
  }, [session?.quizId, quiz]);

  // 3. Initialize questions, shuffling, and progress
  useEffect(() => {
    if (!session || !quiz || initializationRef.current) return;
    initializationRef.current = true;

    let questions = [...(quiz.questions || [])];
    const settings = session.settings || { shuffleQuestions: false, shuffleAnswers: false };
    const playerId = sessionStorage.getItem('currentPlayerId');
    
    // Simple seeded random generator
    const seededRandom = (seed: number) => {
      let t = seed += 0x6D2B79F5;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };

    // Generate a numeric seed from playerId or sessionId
    const seedString = playerId || session.id;
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

    // Only shuffle if NOT teacher-paced
    if (session.mode !== 'TEACHER_PACED') {
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
    const player = session.players?.find(p => p.id === playerId);
    let startIndex = 0;
    
    // Load local answers for ecoMode
    let currentLocalAnswers = {};
    if (session.settings?.ecoMode && playerId) {
      let saved = null;
      try {
        saved = localStorage.getItem(`ecoMode_${session.id}_${playerId}`);
      } catch (e) {
        console.warn("[EcoMode] localStorage blocked in this browser");
      }
      
      if (saved) {
        try {
          currentLocalAnswers = JSON.parse(saved);
          setLocalAnswers(currentLocalAnswers);
        } catch (e) {}
      }
    }
    
    if (session.mode !== 'TEACHER_PACED' && player) {
      const combinedAnswers = { ...(player.answers || {}), ...currentLocalAnswers };
      setPlayerAnswers(combinedAnswers);
      
      // Recalculate score and correct answers from combined answers
      let loadedScore = 0;
      let loadedCorrectCount = 0;
      Object.values(combinedAnswers).forEach((ans: any) => {
        loadedScore += (ans.pointsAwarded || 0);
        if (ans.isCorrect) loadedCorrectCount++;
      });
      setScore(loadedScore);
      setCorrectAnswersCount(loadedCorrectCount);
      
      const firstUnansweredIndex = questions.findIndex(q => !combinedAnswers[q.id]);
      if (firstUnansweredIndex !== -1) {
        startIndex = firstUnansweredIndex;
      } else {
        startIndex = questions.length;
        setFinished(true);
      }
    } else {
      startIndex = session.currentQuestionIndex || 0;
    }
    
    setCurrentQuestionIndex(startIndex);
    setQuestionStartTime(Date.now());
    
    const getEffectiveTimeLimit = (q: Question) => {
      if (session.settings?.forceTimeLimit !== undefined) {
        return session.settings.forceTimeLimit;
      }
      return q.timeLimit;
    };
    
    if (questions[startIndex]) {
      const limit = getEffectiveTimeLimit(questions[startIndex]);
      setTimeLeft(limit === 0 ? 0 : (limit || 30));
    }
  }, [session, quiz]);

  // Timer logic
  useEffect(() => {
    if (!session || isSubmitted || finished || session.status === 'FINISHED' || session.status === 'WAITING' || session.status === 'STARTING' || session.status === 'LEADERBOARD') return;
    
    if (shuffledQuestions.length === 0) return;

    const currentQuestion = shuffledQuestions[currentQuestionIndex];
    const getEffectiveTimeLimit = (q: Question) => {
      if (session?.settings?.forceTimeLimit !== undefined) {
        return session.settings.forceTimeLimit;
      }
      return q.timeLimit;
    };
    
    const limit = getEffectiveTimeLimit(currentQuestion);
    // If time limit is 0, it's unlimited
    if (!currentQuestion || limit === 0) {
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
    
    // Check if we should show correct/wrong feedback (including sound)
    const showImmediately = session.settings.showCorrectAnswers === 'IMMEDIATELY';
    
    if (currentQuestion.type === 'SURVEY') {
      soundService.play('correct'); // Neutral "submitted" sound for survey
    } else if (showImmediately) {
      if (isAnswerCorrect) {
        soundService.play('correct');
      } else {
        soundService.play('wrong');
      }
    } else {
      // Security mode: play a neutral sound so they can't guess from the audio
      soundService.play('tick'); 
    }
    
    const timeTaken = (Date.now() - questionStartTime) / 1000; // in seconds
    const settings = session.settings || { equalPoints: false, timeBasedPoints: true, streakBonus: true };
    
    const getEffectiveTimeLimit = (q: Question) => {
      if (session?.settings?.forceTimeLimit !== undefined) {
        return session.settings.forceTimeLimit;
      }
      return q.timeLimit;
    };

    let points = 0;
    if (isAnswerCorrect && currentQuestion.type !== 'SURVEY') {
      // No points if redoing a failed question
      if (!hasFailedCurrentQuestion) {
        let basePoints = settings.equalPoints ? 1000 : currentQuestion.points;
        
        if (settings.timeBasedPoints && !settings.equalPoints) {
          const timeLimit = getEffectiveTimeLimit(currentQuestion) || 30;
          const timeRatio = Math.max(0, (timeLimit - timeTaken) / timeLimit);
          basePoints = Math.round(basePoints * (0.5 + 0.5 * timeRatio));
        }
        
        const streakBonus = settings.streakBonus ? (streak * 100) : 0;
        points = basePoints + streakBonus;
        
        setScore(prev => prev + points);
        setCorrectAnswersCount(prev => prev + 1);
        setStreak(prev => prev + 1);
      } else {
        // Redoing - no points, but we still count it as correct for progress
        setStreak(0); // Reset streak because they failed once
      }
    } else if (currentQuestion.type !== 'SURVEY') {
      setStreak(0);
    }

    // Send to server or save locally if ecoMode
    const playerId = sessionStorage.getItem('currentPlayerId');
    if (playerId) {
      const answerData = {
        optionId,
        textAnswer,
        isCorrect: isAnswerCorrect,
        timeTaken,
        timeLimit: getEffectiveTimeLimit(currentQuestion),
        points: points,
        pointsAwarded: points // For ecoMode compatibility
      };

      if (session.settings.ecoMode || session.settings.superEcoMode) {
        // Save locally
        const newLocalAnswers = {
          ...localAnswers,
          [currentQuestion.id]: answerData
        };
        setLocalAnswers(newLocalAnswers);
        setPlayerAnswers(prev => ({ ...prev, [currentQuestion.id]: answerData }));
        try {
          localStorage.setItem(`ecoMode_${session.id}_${playerId}`, JSON.stringify(newLocalAnswers));
        } catch (e) {
          console.warn("[EcoMode] Could not save progress to localStorage");
        }
      } else {
        // Submit to Firebase immediately
        setPlayerAnswers(prev => ({ ...prev, [currentQuestion.id]: answerData }));
        try {
          await gameService.submitAnswer(session.id, playerId, currentQuestion.id, answerData);
        } catch (e) {
          console.error("Failed to submit answer", e);
          // We continue to the next question even if submission fails to avoid getting stuck
        }
      }
    }

    // Handle Redoing Wrong Questions
    if (!isAnswerCorrect && session.settings.redoWrongQuestions && currentQuestion.type !== 'SURVEY') {
      setHasFailedCurrentQuestion(true);
      setTimeout(() => {
        setIsSubmitted(false);
        setSelectedOptionId(null);
        setShortAnswerText('');
        setIsCorrect(false);
        setQuestionStartTime(Date.now());
        const limit = getEffectiveTimeLimit(currentQuestion);
        setTimeLeft(limit === 0 ? 0 : (limit || 30));
      }, 2000);
      return;
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
            setHasFailedCurrentQuestion(false); // Reset for next question
            setQuestionStartTime(Date.now());
            const nextTimeLimit = getEffectiveTimeLimit(shuffledQuestions[nextIndex]);
            setTimeLeft(nextTimeLimit === 0 ? 0 : (nextTimeLimit || 30));
          } else {
            setFinished(true);
            if (playerId) {
              if (session.settings.ecoMode || session.settings.superEcoMode) {
                // Submit all accumulated progress
                let finalAnswers = localAnswers;
                try {
                  const saved = localStorage.getItem(`ecoMode_${session.id}_${playerId}`);
                  if (saved) finalAnswers = JSON.parse(saved);
                } catch (e) {
                  console.warn("[EcoMode] Could not read progress from localStorage");
                }
                
                // Calculate final score and progress
                const finalScore = Object.values(finalAnswers).reduce((sum: number, ans: any) => sum + (ans.pointsAwarded || 0), 0) as number;
                
                const submitResults = async () => {
                  try {
                    // If saveDetailedAnswers is false, don't send answers object to save bandwidth
                    const answersToSubmit = session.settings.saveDetailedAnswers === false ? {} : finalAnswers;

                    await gameService.submitEcoModeProgress(session.id, playerId, {
                      answers: answersToSubmit,
                      score: finalScore,
                      progress: Object.keys(finalAnswers).length,
                      streak: streak,
                      finished: true
                    });
                    
                    // Clean up local storage
                    try {
                      localStorage.removeItem(`ecoMode_${session.id}_${playerId}`);
                      if (session.settings.superEcoMode) {
                        localStorage.removeItem(`session_${session.id}`);
                      }
                    } catch (e) {}
                  } catch (e) {
                    console.error("Failed to submit final results", e);
                    alert("Không thể gửi kết quả. Vui lòng kiểm tra kết nối mạng và thử lại.");
                  }
                };
                
                submitResults();
              } else {
                await gameService.finishPlayerSession(session.id, playerId);
              }
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
    if (showReview) {
      return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
          <div className="bg-white p-4 shadow-sm flex justify-between items-center sticky top-0 z-10">
            <div className="flex items-center gap-3">
              {session.settings?.allowAvatars !== false ? (
                <StudentAvatar 
                  name={playerName} 
                  avatarConfig={avatarConfig} 
                  size={32} 
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-700">
                  {playerName.charAt(0).toUpperCase()}
                </div>
              )}
              <h1 className="text-xl font-bold text-gray-800">Xem lại: {playerName}</h1>
            </div>
            <button 
              onClick={() => setShowReview(false)}
              className="bg-indigo-100 text-indigo-700 px-4 py-2 rounded-lg font-bold hover:bg-indigo-200 transition-colors"
            >
              Đóng
            </button>
          </div>
          <div className="flex-1 p-4 max-w-3xl mx-auto w-full space-y-6 overflow-y-auto pb-20">
            {quiz?.questions.map((q, idx) => {
              const answer = playerAnswers[q.id];
              const isCorrect = answer?.isCorrect;
              
              return (
                <div key={q.id} className={`bg-white p-6 rounded-2xl shadow-sm border-2 ${isCorrect ? 'border-green-200' : 'border-red-200'}`}>
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-bold text-gray-800">
                      Câu {idx + 1}: <MathText text={q.text} />
                    </h3>
                    <div className={`px-3 py-1 rounded-full text-sm font-bold ${isCorrect ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {isCorrect ? 'Đúng' : 'Sai'}
                    </div>
                  </div>
                  
                  {q.imageUrl && (
                    <img 
                      src={q.imageUrl} 
                      alt="Question" 
                      className="max-h-48 object-contain rounded-lg mb-4 border border-gray-100"
                      referrerPolicy="no-referrer"
                    />
                  )}

                  <div className="space-y-3">
                    {q.type === 'SHORT_ANSWER' ? (
                      <div>
                        <div className="mb-2">
                          <span className="text-sm text-gray-500 font-medium">Câu trả lời của bạn:</span>
                          <div className={`p-3 rounded-lg mt-1 font-medium ${isCorrect ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                            {answer?.textAnswer || '(Không trả lời)'}
                          </div>
                        </div>
                        {!isCorrect && (
                          <div>
                            <span className="text-sm text-gray-500 font-medium">Đáp án đúng:</span>
                            <div className="flex flex-wrap gap-2 mt-1">
                              {q.options?.map(opt => (
                                <span key={opt.id} className="bg-green-50 text-green-700 px-3 py-1 rounded-md text-sm font-bold border border-green-200">
                                  <MathText text={opt.text} />
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {q.options?.map(opt => {
                          const isSelected = answer?.optionId === opt.id;
                          const isActuallyCorrect = opt.isCorrect;
                          
                          let bgClass = "bg-gray-50 border-gray-200 text-gray-600";
                          if (isActuallyCorrect) {
                            bgClass = "bg-green-50 border-green-500 text-green-800 font-bold";
                          } else if (isSelected && !isActuallyCorrect) {
                            bgClass = "bg-red-50 border-red-500 text-red-800 font-bold";
                          }
                          
                          return (
                            <div key={opt.id} className={`p-3 rounded-lg border-2 flex items-center gap-2 ${bgClass}`}>
                              <div className="flex-1"><MathText text={opt.text} /></div>
                              {isSelected && <span className="text-xs uppercase tracking-wider font-black opacity-50">(Bạn chọn)</span>}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    const totalQuestions = quiz?.questions.length || 1;
    const percentage = Math.round((correctAnswersCount / totalQuestions) * 100);
    const passingPercentage = session?.settings?.passingPercentage || 0;
    const isPassed = passingPercentage > 0 && percentage >= passingPercentage;

    return (
      <div className="min-h-screen bg-indigo-900 text-white flex flex-col items-center justify-center p-4">
        {session.settings?.allowAvatars !== false ? (
          <StudentAvatar 
            name={playerName} 
            avatarConfig={avatarConfig} 
            size={120} 
            className="border-4 border-yellow-400 shadow-lg mb-4"
          />
        ) : (
          <div className="w-[120px] h-[120px] rounded-full bg-indigo-500 flex items-center justify-center text-5xl font-bold border-4 border-yellow-400 shadow-lg mb-4">
            {playerName.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="text-2xl font-bold text-yellow-400 mb-2">{playerName}</div>
        <h1 className="text-4xl font-bold mb-4">HOÀN THÀNH!</h1>
        {session?.settings?.showScore && (
          <div className="flex flex-col items-center gap-2 mb-8">
            <div className="text-6xl font-black text-yellow-400">{score} điểm</div>
            <div className="text-2xl font-bold text-indigo-200">
              Đúng {correctAnswersCount} / {totalQuestions} câu ({percentage}%)
            </div>
            {passingPercentage > 0 && (
              <div className={`mt-4 px-6 py-3 rounded-xl font-bold text-lg ${isPassed ? 'bg-green-500/20 text-green-400 border border-green-500/50' : 'bg-red-500/20 text-red-400 border border-red-500/50'}`}>
                {isPassed ? '🎉 Bạn đã hoàn thành yêu cầu của giáo viên' : `❌ Chưa đạt yêu cầu (Cần ${passingPercentage}%)`}
              </div>
            )}
          </div>
        )}
        <p className="text-xl opacity-80 mb-8">
          {session?.status === 'FINISHED' ? 'Giáo viên đã kết thúc bài thi.' : 'Bạn đã trả lời hết các câu hỏi.'}
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4">
          {session?.settings?.showCorrectAnswers !== 'NEVER' && (
            <button 
              onClick={() => setShowReview(true)}
              className="bg-green-500 text-white px-8 py-3 rounded-lg font-bold hover:bg-green-400 border-2 border-green-400 shadow-lg transition-all"
            >
              Xem lại bài
            </button>
          )}
          {session?.mode === 'HOMEWORK' && (
            <button 
              onClick={() => {
                sessionStorage.removeItem('currentPlayerId');
                sessionStorage.removeItem('currentPlayerName');
                sessionStorage.removeItem('currentPlayerAvatar');
                navigate(`/join?pin=${session?.pin}`);
              }}
              className="bg-indigo-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-indigo-500 border-2 border-indigo-400 shadow-lg transition-all"
            >
              Làm lại
            </button>
          )}
          <button 
            onClick={() => {
              sessionStorage.removeItem('currentPlayerId');
              sessionStorage.removeItem('currentPlayerName');
              sessionStorage.removeItem('currentPlayerAvatar');
              navigate('/');
            }}
            className="bg-white text-indigo-900 px-8 py-3 rounded-lg font-bold hover:bg-gray-100 shadow-lg transition-all"
          >
            Thoát
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = shuffledQuestions[currentQuestionIndex];

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header Info */}
      <div className="bg-white p-4 shadow-sm flex justify-between items-center">
        <div className="flex items-center gap-4">
          {session.settings?.allowAvatars !== false ? (
            <StudentAvatar 
              name={playerName} 
              avatarConfig={avatarConfig} 
              size={40} 
              className="border border-gray-200"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-sm font-bold text-indigo-700">
              {playerName.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex flex-col">
            <span className="text-sm font-bold text-gray-800 leading-tight">{playerName}</span>
            <div className="flex items-center gap-2 mt-0.5">
              <div className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full text-xs font-bold">
                {currentQuestionIndex + 1}/{shuffledQuestions.length}
              </div>
              <div className="text-xs font-medium text-gray-500">🔥 {session?.settings?.showCorrectAnswers === 'IMMEDIATELY' ? streak : '?'}</div>
            </div>
          </div>
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
              value={shortAnswerText || ''}
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
            {isSubmitted && session?.settings?.showCorrectAnswers === 'IMMEDIATELY' && (
               <div className="mt-6 text-center bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                  <p className="text-gray-500 text-sm font-medium uppercase tracking-wide mb-2">Đáp án chấp nhận:</p>
                  <div className="flex flex-wrap gap-2 justify-center">
                     {currentQuestion.options?.map(opt => (
                        <span key={opt.id} className="bg-green-50 text-green-700 px-3 py-1 rounded-full text-sm font-bold border border-green-200">
                           <MathText text={opt.text} />
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
            ? (isCorrect 
                ? (hasFailedCurrentQuestion ? 'CHÍNH XÁC!' : 'CHÍNH XÁC! +Điểm') 
                : (session.settings.redoWrongQuestions ? 'SAI RỒI! HÃY THỬ LẠI' : 'SAI RỒI!'))
            : 'Đã ghi nhận câu trả lời!'}
        </div>
      )}
    </div>
  );
}
