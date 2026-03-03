import { addDoc, arrayUnion, collection, doc, getDoc, getDocs, onSnapshot, query, runTransaction, updateDoc, where } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { GameSession, Player, Question } from '../../../types';

const getSessionsRef = () => collection(db, 'sessions');

export const gameService = {
  // Tạo phòng game mới
  createSession: async (quizId: string, hostId: string): Promise<string> => {
    // Sinh mã PIN 6 số ngẫu nhiên
    const pin = Math.floor(100000 + Math.random() * 900000).toString();
    
    const docRef = await addDoc(getSessionsRef(), {
      pin,
      quizId,
      hostId,
      status: 'WAITING',
      createdAt: Date.now(),
      players: [],
      currentQuestionIndex: 0
    });
    return docRef.id;
  },

  // Tìm phòng bằng PIN
  findSessionByPin: async (pin: string): Promise<GameSession | null> => {
    const q = query(getSessionsRef(), where('pin', '==', pin), where('status', 'in', ['WAITING', 'PLAYING']));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as GameSession;
  },

  // Học sinh tham gia phòng
  joinSession: async (sessionId: string, player: Player): Promise<void> => {
    const sessionRef = doc(db, 'sessions', sessionId);
    await updateDoc(sessionRef, {
      players: arrayUnion(player) // Lưu ý: Player object cần plain object
    });
  },

  // Bắt đầu game
  startGame: async (sessionId: string): Promise<void> => {
    const sessionRef = doc(db, 'sessions', sessionId);
    await updateDoc(sessionRef, {
      status: 'PLAYING',
      startedAt: Date.now()
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
      if (answerData.isCorrect) {
        // Điểm cơ bản + (Streak * 100)
        points = answerData.points + (player.streak * 100);
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

  // Lắng nghe thay đổi của phòng (Real-time)
  subscribeToSession: (sessionId: string, callback: (data: GameSession) => void) => {
    return onSnapshot(doc(db, 'sessions', sessionId), (doc) => {
      if (doc.exists()) {
        callback({ id: doc.id, ...doc.data() } as GameSession);
      }
    });
  }
};
