import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Webcam from 'react-webcam';
// @ts-ignore
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import { quizService } from '../../quiz/services/quizService';
import { Quiz, Question } from '../../../types';
import { soundService } from '../services/soundService';
import { ArrowLeft, CheckCircle, XCircle, Trophy } from 'lucide-react';

// Suppress MediaPipe's internal XNNPACK info logs globally
const originalInfo = console.info;
const originalLog = console.log;
const originalWarn = console.warn;
const originalError = console.error;
const originalDebug = console.debug;

const filterLog = (originalFn: any, ...args: any[]) => {
  const msg = args.map(a => String(a)).join(' ');
  if (msg.includes('TensorFlow Lite XNNPACK delegate') || msg.includes('XNNPACK')) {
    return;
  }
  originalFn(...args);
};

console.info = (...args: any[]) => filterLog(originalInfo, ...args);
console.log = (...args: any[]) => filterLog(originalLog, ...args);
console.warn = (...args: any[]) => filterLog(originalWarn, ...args);
console.error = (...args: any[]) => filterLog(originalError, ...args);
console.debug = (...args: any[]) => filterLog(originalDebug, ...args);

export default function FaceControlMode() {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [loading, setLoading] = useState(true);

  // Face Tracking State
  const webcamRef = useRef<Webcam>(null);
  const [faceLandmarker, setFaceLandmarker] = useState<FaceLandmarker | null>(null);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
  
  // Selection State
  const [hoveredOptionId, setHoveredOptionId] = useState<string | null>(null);
  const [hoverProgress, setHoverProgress] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

  const requestRef = useRef<number>(0);
  const hoverStartTimeRef = useRef<number | null>(null);
  const currentHoveredOptionRef = useRef<string | null>(null);

  const HOVER_DURATION_MS = 1500; // 1.5 seconds to select

  // Load Quiz
  useEffect(() => {
    const loadQuiz = async () => {
      if (!quizId) return;
      try {
        const data = await quizService.getQuizById(quizId);
        if (data) {
          // Filter questions: only multiple choice or true/false, max 4 options
          const validQuestions = (data.questions || []).filter(
            q => (q.type === 'MULTIPLE_CHOICE' || q.type === 'TRUE_FALSE') && (q.options?.length || 0) <= 4
          );
          setQuiz(data);
          setQuestions(validQuestions);
        }
      } catch (error) {
        console.error("Error loading quiz:", error);
      } finally {
        setLoading(false);
      }
    };
    loadQuiz();
  }, [quizId]);

  // Initialize MediaPipe
  useEffect(() => {
    const initMediaPipe = async () => {
      try {
        const filesetResolver = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
        );
        const landmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
            delegate: "CPU"
          },
          outputFaceBlendshapes: false,
          runningMode: "VIDEO",
          numFaces: 1
        });
        setFaceLandmarker(landmarker);
      } catch (error) {
        console.error("Error initializing MediaPipe:", error);
      }
    };
    initMediaPipe();
  }, []);

  // Tracking Loop
  useEffect(() => {
    if (!faceLandmarker || !webcamRef.current || isFinished || selectedOptionId) return;

    let lastVideoTime = -1;

    const detectFace = () => {
      if (
        webcamRef.current &&
        webcamRef.current.video &&
        webcamRef.current.video.readyState === 4
      ) {
        const video = webcamRef.current.video;
        const startTimeMs = performance.now();

        if (video.currentTime !== lastVideoTime) {
          lastVideoTime = video.currentTime;
          const results = faceLandmarker.detectForVideo(video, startTimeMs);

          if (results.faceLandmarks && results.faceLandmarks.length > 0) {
            const landmarks = results.faceLandmarks[0];
            // Nose tip is landmark 1
            const nose = landmarks[1];
            
            // Map normalized coordinates [0, 1] to screen.
            // Webcam is mirrored, so invert X.
            const x = (1 - nose.x) * window.innerWidth;
            const y = nose.y * window.innerHeight;
            
            setCursorPos({ x, y });
            checkHover(x, y);
          } else {
            setCursorPos(null);
            resetHover();
          }
        }
      }
      requestRef.current = requestAnimationFrame(detectFace);
    };

    requestRef.current = requestAnimationFrame(detectFace);

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [faceLandmarker, isFinished, selectedOptionId, currentQuestionIndex]);

  const checkHover = (x: number, y: number) => {
    if (selectedOptionId) return; // Already selected

    const currentQ = questions[currentQuestionIndex];
    if (!currentQ || !currentQ.options) return;

    const w = window.innerWidth;
    const h = window.innerHeight;

    let hoveredId: string | null = null;

    // Determine quadrant
    if (currentQ.options.length === 2) {
      // Left / Right split
      if (x < w / 2) hoveredId = currentQ.options[0].id;
      else hoveredId = currentQ.options[1].id;
    } else if (currentQ.options.length === 3) {
      // Top-Left, Top-Right, Bottom-Center
      if (y < h / 2) {
        if (x < w / 2) hoveredId = currentQ.options[0].id;
        else hoveredId = currentQ.options[1].id;
      } else {
        hoveredId = currentQ.options[2].id;
      }
    } else if (currentQ.options.length === 4) {
      // 2x2 Grid
      if (y < h / 2) {
        if (x < w / 2) hoveredId = currentQ.options[0].id;
        else hoveredId = currentQ.options[1].id;
      } else {
        if (x < w / 2) hoveredId = currentQ.options[2].id;
        else hoveredId = currentQ.options[3].id;
      }
    }

    if (hoveredId !== currentHoveredOptionRef.current) {
      // Changed hover target
      currentHoveredOptionRef.current = hoveredId;
      setHoveredOptionId(hoveredId);
      hoverStartTimeRef.current = performance.now();
      setHoverProgress(0);
    } else if (hoveredId && hoverStartTimeRef.current) {
      // Continue hovering
      const elapsed = performance.now() - hoverStartTimeRef.current;
      const progress = Math.min(100, (elapsed / HOVER_DURATION_MS) * 100);
      setHoverProgress(progress);

      if (progress >= 100) {
        handleSelectOption(hoveredId);
      }
    }
  };

  const resetHover = () => {
    currentHoveredOptionRef.current = null;
    setHoveredOptionId(null);
    hoverStartTimeRef.current = null;
    setHoverProgress(0);
  };

  const handleSelectOption = (optionId: string) => {
    if (selectedOptionId) return;
    
    setSelectedOptionId(optionId);
    resetHover();

    const currentQ = questions[currentQuestionIndex];
    const option = currentQ.options?.find(o => o.id === optionId);
    const correct = option?.isCorrect || false;

    setIsCorrect(correct);
    if (correct) {
      soundService.play('correct');
      setScore(prev => prev + 100);
    } else {
      soundService.play('wrong');
    }

    // Move to next question after delay
    setTimeout(() => {
      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
        setSelectedOptionId(null);
        setIsCorrect(null);
      } else {
        setIsFinished(true);
        soundService.play('finish');
      }
    }, 2000);
  };

  if (loading) return <div className="flex h-screen items-center justify-center bg-gray-900 text-white">Đang tải...</div>;
  if (!quiz || questions.length === 0) return <div className="flex h-screen items-center justify-center bg-gray-900 text-white">Không có câu hỏi phù hợp cho chế độ này.</div>;

  if (isFinished) {
    return (
      <div className="flex flex-col h-screen items-center justify-center bg-indigo-900 text-white p-8 text-center">
        <Trophy className="w-32 h-32 text-yellow-400 mb-6" />
        <h1 className="text-5xl font-black mb-4">Hoàn thành!</h1>
        <p className="text-3xl mb-8">Điểm số của bạn: <span className="text-yellow-400 font-bold">{score}</span></p>
        <button 
          onClick={() => navigate('/teacher/dashboard')}
          className="bg-white text-indigo-900 px-8 py-4 rounded-full font-bold text-xl hover:bg-indigo-100 transition-colors"
        >
          Trở về trang chủ
        </button>
      </div>
    );
  }

  const currentQ = questions[currentQuestionIndex];
  const options = currentQ.options || [];

  // Determine grid layout based on number of options
  let gridClass = "grid-cols-2 grid-rows-2";
  if (options.length === 2) gridClass = "grid-cols-2 grid-rows-1";
  else if (options.length === 3) gridClass = "grid-cols-2 grid-rows-2"; // 3rd item spans 2 cols or just sits in bottom left

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-gray-900">
      {/* Background Webcam */}
      <Webcam
        ref={webcamRef}
        mirrored={true}
        className="absolute inset-0 w-full h-full object-cover opacity-30"
        videoConstraints={{ facingMode: "user" }}
      />

      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-20 bg-gradient-to-b from-black/80 to-transparent">
        <button onClick={() => navigate(-1)} className="text-white hover:text-gray-300">
          <ArrowLeft size={32} />
        </button>
        <div className="text-white text-center">
          <h2 className="text-2xl font-bold">{quiz.title}</h2>
          <p className="text-lg opacity-80">Câu {currentQuestionIndex + 1} / {questions.length}</p>
        </div>
        <div className="text-yellow-400 text-2xl font-black">
          {score} ĐIỂM
        </div>
      </div>

      {/* Question Text */}
      <div className="absolute top-24 left-0 right-0 p-8 flex justify-center z-20 pointer-events-none">
        <div className="bg-white/90 backdrop-blur-md text-gray-900 px-8 py-6 rounded-2xl shadow-2xl max-w-4xl text-center border-4 border-indigo-500/30">
          <h1 className="text-4xl font-black">{currentQ.text}</h1>
        </div>
      </div>

      {/* Options Grid */}
      <div className={`absolute inset-0 grid ${gridClass} gap-4 p-4 pt-64 z-10`}>
        {options.map((opt, index) => {
          const isHovered = hoveredOptionId === opt.id;
          const isSelected = selectedOptionId === opt.id;
          const showResult = selectedOptionId !== null;
          
          let bgColor = "bg-white/20 backdrop-blur-sm border-white/30";
          if (showResult) {
            if (opt.isCorrect) bgColor = "bg-green-500/80 border-green-400";
            else if (isSelected) bgColor = "bg-red-500/80 border-red-400";
            else bgColor = "bg-gray-500/30 border-gray-400/30 opacity-50";
          } else if (isHovered) {
            bgColor = "bg-indigo-500/60 border-indigo-400 scale-[1.02] shadow-[0_0_30px_rgba(99,102,241,0.6)]";
          }

          // Special span for 3 options layout
          const spanClass = (options.length === 3 && index === 2) ? "col-span-2" : "";

          return (
            <div 
              key={opt.id} 
              className={`relative rounded-3xl border-4 transition-all duration-300 flex items-center justify-center p-8 ${bgColor} ${spanClass}`}
            >
              <span className="text-4xl font-bold text-white text-center drop-shadow-lg">{opt.text}</span>
              
              {/* Hover Progress Ring */}
              {!showResult && isHovered && (
                <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
                  <div 
                    className="absolute bottom-0 left-0 h-2 bg-yellow-400 transition-all duration-100"
                    style={{ width: `${hoverProgress}%` }}
                  />
                </div>
              )}

              {/* Result Icon */}
              {showResult && isSelected && (
                <div className="absolute top-4 right-4 animate-bounce">
                  {isCorrect ? <CheckCircle className="w-16 h-16 text-white" /> : <XCircle className="w-16 h-16 text-white" />}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Nose Cursor */}
      {cursorPos && !selectedOptionId && (
        <div 
          className="absolute w-12 h-12 -ml-6 -mt-6 rounded-full border-4 border-yellow-400 bg-yellow-400/30 shadow-[0_0_20px_rgba(250,204,21,0.8)] z-50 pointer-events-none transition-transform duration-75"
          style={{ 
            left: cursorPos.x, 
            top: cursorPos.y,
            transform: hoveredOptionId ? 'scale(1.5)' : 'scale(1)'
          }}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-2 h-2 bg-yellow-400 rounded-full" />
          </div>
        </div>
      )}

      {/* Instructions Overlay (Only show briefly at start) */}
      {currentQuestionIndex === 0 && !selectedOptionId && hoverProgress === 0 && (
        <div className="absolute bottom-10 left-0 right-0 text-center z-30 pointer-events-none animate-pulse">
          <p className="text-white text-2xl font-bold drop-shadow-lg bg-black/50 inline-block px-6 py-3 rounded-full">
            Dùng mũi của bạn để di chuyển con trỏ và chọn đáp án!
          </p>
        </div>
      )}
    </div>
  );
}
