import { addDoc, arrayUnion, collection, doc, getDoc, getDocs, onSnapshot, query, runTransaction, updateDoc, where } from 'firebase/firestore';
import { db, auth } from '../../../config/firebase';
import { GameMode, GameSession, GameStatus, Player, Question } from '../../../types';

const getSessionsRef = () => collection(db, 'sessions');

export const gameService = {
  // Tạo phòng game mới
  createSession: async (quizId: string, settings: any, mode: GameMode = 'STUDENT_PACED', homeworkConfig?: any, title?: string): Promise<{ id: string; pin: string }> => {
    // Sinh mã PIN 6 số ngẫu nhiên
    const pin = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Lấy hostId từ auth hiện tại
    const hostId = auth.currentUser?.uid || 'unknown';

    const status = mode === 'HOMEWORK' ? 'PLAYING' : 'WAITING';

    const sessionData: any = {
      pin,
      quizId,
      hostId,
      status,
      mode,
      createdAt: Date.now(),
      players: [],
      currentQuestionIndex: 0,
      settings
    };

    if (title) {
      sessionData.title = title;
    }

    if (homeworkConfig) {
      sessionData.homeworkConfig = homeworkConfig;
    }

    const docRef = await addDoc(getSessionsRef(), sessionData);
    return { id: docRef.id, pin };
  },

  // Tìm phòng bằng PIN
  findSessionByPin: async (pin: string): Promise<GameSession | null> => {
    const q = query(getSessionsRef(), where('pin', '==', pin), where('status', 'in', ['WAITING', 'PLAYING']));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as GameSession;
  },

  // Lấy thông tin phòng bằng ID
  getSessionById: async (sessionId: string): Promise<GameSession | null> => {
    const docRef = doc(db, 'sessions', sessionId);
    const snapshot = await getDoc(docRef);
    if (!snapshot.exists()) return null;
    return { id: snapshot.id, ...snapshot.data() } as GameSession;
  },

  // Học sinh tham gia phòng
  joinSession: async (sessionId: string, player: Player): Promise<void> => {
    const sessionRef = doc(db, 'sessions', sessionId);
    
    await runTransaction(db, async (transaction) => {
      const sessionDoc = await transaction.get(sessionRef);
      if (!sessionDoc.exists()) throw new Error("Session not found");
      
      const sessionData = sessionDoc.data();
      const players = (sessionData.players || []) as Player[];
      const settings = sessionData.settings || {};
      
      const existingPlayerIndex = players.findIndex(p => p.id === player.id);
      
      if (existingPlayerIndex !== -1) {
        // Player exists
        const existingPlayer = players[existingPlayerIndex];
        
        // Check if they have played (score > 0 or answers not empty)
        const hasPlayed = existingPlayer.score > 0 || (existingPlayer.answers && Object.keys(existingPlayer.answers).length > 0);
        
        if (hasPlayed) {
          // Check maxAttempts / allowRetry
          // Default maxAttempts is 1. If > 1, allow retry.
          // Or if allowRetry is explicitly true.
          const maxAttempts = settings.maxAttempts || 1;
          const allowRetry = settings.allowRetry || (maxAttempts > 1);
          
          if (!allowRetry) {
             throw new Error("Bạn đã hết lượt làm bài.");
          }
        }
        
        // Overwrite/Reset player
        players[existingPlayerIndex] = player;
      } else {
        // New player
        players.push(player);
      }
      
      transaction.update(sessionRef, { players });
    });
  },

  // Bắt đầu game
  startGame: async (sessionId: string): Promise<void> => {
    const sessionRef = doc(db, 'sessions', sessionId);
    const sessionDoc = await getDoc(sessionRef);
    const sessionData = sessionDoc.data() as GameSession;

    if (sessionData.mode === 'TEACHER_PACED') {
      await updateDoc(sessionRef, {
        status: 'QUESTION',
        currentQuestionIndex: 0,
        questionStartTime: Date.now(),
        startedAt: Date.now()
      });
    } else {
      await updateDoc(sessionRef, {
        status: 'PLAYING',
        startedAt: Date.now()
      });
    }
  },

  // Chuyển sang câu hỏi tiếp theo
  nextQuestion: async (sessionId: string, nextIndex: number): Promise<void> => {
    const sessionRef = doc(db, 'sessions', sessionId);
    await updateDoc(sessionRef, {
      status: 'QUESTION',
      currentQuestionIndex: nextIndex,
      questionStartTime: Date.now()
    });
  },

  // Hiện bảng xếp hạng (sau mỗi câu trong Teacher-paced)
  showLeaderboard: async (sessionId: string): Promise<void> => {
    const sessionRef = doc(db, 'sessions', sessionId);
    await updateDoc(sessionRef, {
      status: 'LEADERBOARD'
    });
  },

  // Cập nhật trạng thái game
  updateGameState: async (sessionId: string, status: GameStatus): Promise<void> => {
    const sessionRef = doc(db, 'sessions', sessionId);
    await updateDoc(sessionRef, { status });
  },

  // Kết thúc game
  endGame: async (sessionId: string): Promise<void> => {
    const sessionRef = doc(db, 'sessions', sessionId);
    await updateDoc(sessionRef, {
      status: 'FINISHED',
      finishedAt: Date.now()
    });
  },

  // Nộp câu trả lời (Quan trọng: Xử lý Transaction để cộng điểm chính xác)
  submitAnswer: async (sessionId: string, playerId: string, questionId: string, answerData: any) => {
    const sessionRef = doc(db, 'sessions', sessionId);
    
    await runTransaction(db, async (transaction) => {
      const sessionDoc = await transaction.get(sessionRef);
      if (!sessionDoc.exists()) throw "Session not found";

      const data = sessionDoc.data();
      const players = data.players as Player[];
      const playerIndex = players.findIndex(p => p.id === playerId);
      
      if (playerIndex === -1) throw "Player not found";

      // Cập nhật thông tin người chơi
      const player = players[playerIndex];
      
      // Logic tính điểm
      let points = 0;
      const settings = data.settings || {
        equalPoints: false,
        timeBasedPoints: true,
        streakBonus: true
      };

      if (answerData.isCorrect) {
        // Tính điểm cơ bản
        let basePoints = settings.equalPoints ? 1000 : answerData.points;
        
        // Tính điểm theo thời gian (nếu được bật và không phải chế độ điểm bằng nhau)
        if (settings.timeBasedPoints && !settings.equalPoints) {
          // Giả sử answerData.timeTaken là số giây đã trôi qua, answerData.timeLimit là tổng thời gian
          const timeLimit = answerData.timeLimit || 30;
          const timeTaken = answerData.timeTaken || 0;
          const timeRatio = Math.max(0, (timeLimit - timeTaken) / timeLimit);
          // Điểm tối thiểu là 50% số điểm, điểm tối đa là 100%
          basePoints = Math.round(basePoints * (0.5 + 0.5 * timeRatio));
        }

        // Tính điểm thưởng chuỗi đúng
        const streakBonus = settings.streakBonus ? (player.streak * 100) : 0;
        
        points = basePoints + streakBonus;
        player.streak += 1;
      } else {
        player.streak = 0;
      }

      player.score += points;
      player.progress += 1;
      player.answers = {
        ...player.answers,
        [questionId]: {
          ...answerData,
          pointsAwarded: points
        }
      };

      players[playerIndex] = player;

      transaction.update(sessionRef, { players });
    });
  },

  // Cập nhật avatar của người chơi
  updatePlayerAvatar: async (sessionId: string, playerId: string, avatarConfig: any) => {
    const sessionRef = doc(db, 'sessions', sessionId);
    
    await runTransaction(db, async (transaction) => {
      const sessionDoc = await transaction.get(sessionRef);
      if (!sessionDoc.exists()) throw "Session not found";

      const data = sessionDoc.data();
      const players = data.players as Player[];
      const playerIndex = players.findIndex((p: Player) => p.id === playerId);
      
      if (playerIndex === -1) throw "Player not found";

      // Cập nhật avatar
      players[playerIndex].avatarConfig = avatarConfig;

      transaction.update(sessionRef, { players });
    });
  },

  // Lắng nghe thay đổi của phòng (Real-time)
  subscribeToSession: (sessionId: string, callback: (data: GameSession) => void) => {
    return onSnapshot(doc(db, 'sessions', sessionId), (doc) => {
      if (doc.exists()) {
        callback({ id: doc.id, ...doc.data() } as GameSession);
      }
    });
  }
};
