import React, { useRef, useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { gameService } from "../services/gameService";
import { GameSession, Quiz, Question, Student } from "../../../types";
import { quizService } from "../../quiz/services/quizService";
import { adminService } from "../../admin/services/adminService";
import { ArrowLeft, CheckCircle2 } from "lucide-react";

import type { ReadResult } from "zxing-wasm/reader";

interface Point {
  x: number;
  y: number;
}

type Answer = "A" | "B" | "C" | "D";

interface ScannedStudent {
  id: string; // This is the card number (1-60)
  name: string;
  answer: Answer;
  corners: Point[];
}

const calculateAnswerFromAngle = (angle: number): Answer => {
  // Normalize angle to 0-360
  let normalizedAngle = angle % 360;
  if (normalizedAngle < 0) normalizedAngle += 360;

  // zxing-wasm orientation:
  // 0: Normal (A is up)
  // 90: Rotated 90 deg clockwise (D is up)
  // 180: Upside down (C is up)
  // 270: Rotated 90 deg counter-clockwise (B is up)

  if (normalizedAngle >= 315 || normalizedAngle < 45) return "A";
  if (normalizedAngle >= 45 && normalizedAngle < 135) return "D"; // Rotated clockwise, left edge (D) is now up
  if (normalizedAngle >= 135 && normalizedAngle < 225) return "C"; // Upside down, bottom edge (C) is now up
  if (normalizedAngle >= 225 && normalizedAngle < 315) return "B"; // Rotated counter-clockwise, right edge (B) is now up

  return "A";
};

export default function PlickersScanner() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const workerRef = useRef<Worker | null>(null);

  const [session, setSession] = useState<GameSession | null>(null);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [results, setResults] = useState<Map<string, ScannedStudent>>(
    new Map(),
  );
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  const lastResultsRef = useRef<Map<string, Answer>>(new Map());
  const processingRef = useRef(false);

  useEffect(() => {
    if (!sessionId) return;
    const unsubscribe = gameService.subscribeToSession(
      sessionId,
      async (data) => {
        setSession(data);
        if (!quiz && data.quizId) {
          const quizData = await quizService.getQuizById(data.quizId);
          setQuiz(quizData);
        }
        if (data.selectedClassId && students.length === 0) {
          const classStudents = await adminService.getStudentsByClass(
            data.selectedClassId,
          );
          setStudents(classStudents);
        }
      },
    );
    return () => unsubscribe();
  }, [sessionId, quiz, students.length]);

  const processBarcodes = useCallback(
    async (barcodes: ReadResult[]) => {
      if (!session || !quiz || session.status !== "QUESTION") return;

      const currentQuestion = quiz.questions[session.currentQuestionIndex];
      const newResults = new Map<string, ScannedStudent>();

      for (const barcode of barcodes) {
        if (!barcode.isValid || !barcode.text) continue;
        try {
          const data = JSON.parse(barcode.text);
          if (data.type === "plicker" && data.id) {
            const cardNumber = String(data.id);
            const answer = calculateAnswerFromAngle(barcode.orientation);

            // Map Answer (A,B,C,D) to Option ID
            const optionIndex =
              answer === "A" ? 0 : answer === "B" ? 1 : answer === "C" ? 2 : 3;
            const optionId = currentQuestion.options[optionIndex]?.id;

            if (optionId) {
              // Find student name by card number (order)
              const student = students.find(
                (s) => s.order === parseInt(cardNumber),
              );
              const playerName = student
                ? student.name
                : `Học sinh ${cardNumber}`;
              const playerId = student ? student.id : `card_${cardNumber}`;

              // Update results for the visual overlay (every frame)
              newResults.set(cardNumber, {
                id: cardNumber,
                name: playerName,
                answer,
                corners: [
                  barcode.position.topLeft,
                  barcode.position.topRight,
                  barcode.position.bottomRight,
                  barcode.position.bottomLeft,
                ],
              });

              // Submit answer to Firebase only if it changed
              if (lastResultsRef.current.get(cardNumber) !== answer) {
                lastResultsRef.current.set(cardNumber, answer);

                if (!processingRef.current) {
                  processingRef.current = true;
                  await gameService.submitScannerAnswer(
                    session.id,
                    playerId,
                    playerName,
                    cardNumber,
                    currentQuestion.id,
                    optionId,
                    currentQuestion,
                  );
                  processingRef.current = false;
                }
              }
            }
          }
        } catch (e) {
          // Ignore JSON parse errors for non-plicker QR codes
        }
      }

      // Always update results to reflect the current camera frame
      // This ensures that if no barcodes are detected, the overlay is cleared
      setResults(newResults);
    },
    [session, quiz, students],
  );

  useEffect(() => {
    // Initialize Web Worker
    workerRef.current = new Worker(
      new URL("../workers/zxingWorker.ts", import.meta.url),
      { type: "module" },
    );

    let isWorkerBusy = false;
    workerRef.current.onmessage = (e) => {
      isWorkerBusy = false;
      if (e.data.results) {
        processBarcodes(e.data.results);
      } else if (e.data.error) {
        console.error("ZXing Worker Error:", e.data.error);
      }
    };

    const startCamera = async () => {
      setCameraError(null);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "environment",
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          // Use a promise to handle play() and avoid "interrupted by new load request"
          const playPromise = videoRef.current.play();
          if (playPromise !== undefined) {
            playPromise.catch(error => {
              console.warn("Video play was interrupted:", error);
            });
          }
          setIsScanning(true);
        }
      } catch (err: any) {
        console.error("Camera Error:", err);
        let errorMsg = "Không thể truy cập camera.";
        
        if (err.name === 'NotAllowedError' || err.message?.includes('Permission denied')) {
          errorMsg = "Quyền truy cập camera bị từ chối. Vui lòng cấp quyền trong cài đặt trình duyệt để tiếp tục.";
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          errorMsg = "Không tìm thấy camera trên thiết bị này.";
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError' || err.message?.includes('could not start')) {
          errorMsg = "Camera đang bị ứng dụng khác sử dụng hoặc bị chặn bởi lớp phủ hệ thống.";
        } else if (err.name === 'OverconstrainedError') {
          errorMsg = "Yêu cầu cấu hình camera không được hỗ trợ bởi thiết bị này.";
        }
        
        setCameraError(errorMsg);
      }
    };

    startCamera();

    return () => {
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }
      workerRef.current?.terminate();
    };
  }, []); // Only run once on mount

  // Scanning Loop Effect
  useEffect(() => {
    if (!isScanning) return;

    let animationFrameId: number;
    let isWorkerBusy = false;

    const scanFrame = () => {
      if (
        videoRef.current &&
        canvasRef.current &&
        videoRef.current.readyState === 4 &&
        !isWorkerBusy
      ) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });

        if (ctx) {
          if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
          }

          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

          isWorkerBusy = true;
          workerRef.current?.postMessage({
            imageData,
            options: {
              tryHarder: false,
              formats: ["QRCode"],
              maxNumberOfSymbols: 60,
            },
          });
        }
      }
      animationFrameId = requestAnimationFrame(scanFrame);
    };

    scanFrame();

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [isScanning, processBarcodes]);

  // Overlay Drawing Effect
  useEffect(() => {
    const drawOverlay = () => {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      if (!canvas || !video || video.readyState !== 4) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      results.forEach((student) => {
        const pts = student.corners;
        ctx.beginPath();
        ctx.lineWidth = 4;
        ctx.strokeStyle = "#00FF00";
        ctx.moveTo(pts[0].x, pts[0].y);
        pts.forEach((p) => ctx.lineTo(p.x, p.y));
        ctx.closePath();
        ctx.stroke();

        ctx.fillStyle = "rgba(0, 255, 0, 0.8)";
        ctx.fillRect(pts[0].x, pts[0].y - 40, 100, 40);

        ctx.fillStyle = "#000";
        ctx.font = "bold 20px Arial";
        ctx.fillText(`${student.name}: ${student.answer}`, pts[0].x + 5, pts[0].y - 12);
      });
    };

    const overlayInterval = setInterval(drawOverlay, 1000 / 30);
    return () => clearInterval(overlayInterval);
  }, [results]);

  if (!session || !quiz)
    return (
      <div className="flex h-screen items-center justify-center bg-gray-900 text-white">
        Đang tải...
      </div>
    );

  const currentQuestion = quiz.questions[session.currentQuestionIndex];
  const answeredCount =
    session.players?.filter((p) => p.answers && p.answers[currentQuestion?.id])
      ?.length || 0;

  const TroubleshootingModal = () => (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-6 overflow-y-auto">
      <div className="bg-white text-gray-900 rounded-2xl p-6 max-w-md w-full shadow-2xl">
        <h3 className="text-xl font-bold mb-4 text-red-600">Khắc phục lỗi Camera</h3>
        
        {cameraError?.includes("Quyền truy cập camera bị từ chối") ? (
          <div className="space-y-4 text-sm leading-relaxed">
            <p className="font-bold text-red-500">Bạn đã chặn quyền truy cập camera.</p>
            <p>Để quét được thẻ Plickers, bạn cần cấp lại quyền theo các bước sau:</p>
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 space-y-3">
              <div>
                <p className="font-bold">Trên Chrome (Android/Máy tính):</p>
                <p>Bấm vào biểu tượng <span className="inline-block px-1 bg-gray-200 rounded">ổ khóa</span> hoặc <span className="inline-block px-1 bg-gray-200 rounded">cài đặt</span> ở bên trái thanh địa chỉ trình duyệt {'>'} Chọn <span className="font-bold">Cài đặt trang web</span> {'>'} Tìm <span className="font-bold">Máy ảnh</span> {'>'} Chọn <span className="font-bold">Cho phép</span>.</p>
              </div>
              <div>
                <p className="font-bold">Trên Safari (iOS):</p>
                <p>Bấm vào biểu tượng <span className="inline-block px-1 bg-gray-200 rounded">Aa</span> ở thanh địa chỉ {'>'} Chọn <span className="font-bold">Cài đặt trang web</span> {'>'} Tìm <span className="font-bold">Máy ảnh</span> {'>'} Chọn <span className="font-bold">Cho phép</span>.</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4 text-sm leading-relaxed">
            <p className="font-semibold">Nếu bạn thấy thông báo "Đóng lớp phủ ứng dụng" hoặc không mở được camera:</p>
            <ol className="list-decimal list-inside space-y-2">
              <li><span className="font-bold">Tắt các ứng dụng chạy đè:</span> Tắt bong bóng chat Messenger, ứng dụng lọc ánh sáng xanh (Twilight), hoặc trình ghi màn hình.</li>
              <li><span className="font-bold">Kiểm tra quyền:</span> Vào Cài đặt {'>'} Ứng dụng {'>'} Trình duyệt {'>'} Quyền {'>'} Camera {'>'} Chọn "Cho phép".</li>
              <li><span className="font-bold">Đóng tab khác:</span> Đảm bảo không có trang web nào khác đang mở camera.</li>
              <li><span className="font-bold">Khởi động lại:</span> Thử tải lại trang hoặc khởi động lại trình duyệt.</li>
            </ol>
          </div>
        )}

        <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 mt-4">
          <p className="text-blue-800 text-xs italic">Mẹo: Nếu vẫn không được, hãy thử mở ứng dụng trong một tab mới (nút "Mở trong tab mới" ở góc trên bên phải).</p>
        </div>

        <div className="mt-6 flex gap-3">
          <button 
            onClick={() => window.location.reload()}
            className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition"
          >
            Thử lại ngay
          </button>
          <button 
            onClick={() => {setShowHelp(false); setCameraError(null);}}
            className="flex-1 bg-gray-200 text-gray-800 py-3 rounded-xl font-bold hover:bg-gray-300 transition"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden flex flex-col">
      {(cameraError || showHelp) && <TroubleshootingModal />}
      
      {/* Header */}
      <div className="absolute top-0 left-0 w-full p-4 z-10 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent">
        <button
          onClick={() => navigate(`/game/dashboard/${session.id}`)}
          className="text-white flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full backdrop-blur-sm hover:bg-white/30 transition"
        >
          <ArrowLeft className="w-5 h-5" />
          Quay lại
        </button>
        <button
          onClick={() => setShowHelp(true)}
          className="text-white flex items-center gap-2 bg-yellow-500/20 border border-yellow-500/50 px-4 py-2 rounded-full backdrop-blur-sm hover:bg-yellow-500/30 transition"
        >
          Trợ giúp Camera
        </button>
        <div className="text-white text-center">
          <h2 className="font-bold text-xl">Máy quét Plickers</h2>
          <p className="text-sm opacity-80">
            Câu hỏi {session.currentQuestionIndex + 1}
          </p>
        </div>
        <div className="bg-green-500 text-white px-4 py-2 rounded-full font-bold flex items-center gap-2 shadow-lg">
          <CheckCircle2 className="w-5 h-5" />
          Đã nhận: {answeredCount}
        </div>
      </div>

      {/* Camera View */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute w-full h-full object-cover"
      />
      <canvas
        ref={canvasRef}
        className="absolute w-full h-full object-cover pointer-events-none"
      />

      {/* Footer Controls */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex gap-4">
        <button
          onClick={() => gameService.showLeaderboard(session.id)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-full font-black text-xl shadow-2xl transform transition hover:scale-105"
        >
          KẾT THÚC CÂU HỎI
        </button>
      </div>
    </div>
  );
}
