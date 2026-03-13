import { addDoc, arrayUnion, collection, deleteDoc, doc, getDoc, getDocs, onSnapshot, query, runTransaction, updateDoc, where } from 'firebase/firestore';
import { db, auth } from '../../../config/firebase';
import { GameMode, GameSession, GameStatus, Player, Question } from '../../../types';
import { timeService } from '../../../services/timeService';

const getSessionsRef = () => collection(db, 'sessions');

export const gameService = {
  // Tạo phòng game mới
  createSession: async (
    quizId: string, 
    settings: any, 
    mode: GameMode = 'STUDENT_PACED', 
    homeworkConfig?: any, 
    title?: string,
    nameInputConfig?: { type: 'MANUAL' | 'CLASS_LIST', classId?: string, isGroupPlay?: boolean }
  ): Promise<{ id: string; pin: string }> => {
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
      settings,
      nameInputType: nameInputConfig?.type || 'MANUAL',
      isGroupPlay: nameInputConfig?.isGroupPlay || false,
    };

    if (nameInputConfig?.classId) {
      sessionData.selectedClassId = nameInputConfig.classId;
    }

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
    
    await runTransaction(db, async (transaction) => {
      const sessionDoc = await transaction.get(sessionRef);
      if (!sessionDoc.exists()) throw "Session not found";
      
      const sessionData = sessionDoc.data() as GameSession;
      const updates: any = {
        startedAt: Date.now()
      };

      if (sessionData.mode === 'TEACHER_PACED') {
        updates.status = 'QUESTION';
        updates.currentQuestionIndex = 0;
        updates.questionStartTime = Date.now();
      } else if (sessionData.mode === 'BATTLE') {
        updates.status = 'PLAYING';
        // Initialize Battle Stats for all players
        const players = sessionData.players || [];
        const initializedPlayers = players.map(p => ({
          ...p,
          hp: 100,
          maxHp: 100,
          items: [], // Start empty or with 1 item? Let's start empty.
          statusEffects: []
        }));
        updates.players = initializedPlayers;
      } else {
        updates.status = 'PLAYING';
      }

      transaction.update(sessionRef, updates);
    });
  },

  // Battle Mode: Use Item
  useBattleItem: async (sessionId: string, sourcePlayerId: string, targetPlayerId: string, itemType: string) => {
    const sessionRef = doc(db, 'sessions', sessionId);
    
    await runTransaction(db, async (transaction) => {
      const sessionDoc = await transaction.get(sessionRef);
      if (!sessionDoc.exists()) throw "Session not found";

      const data = sessionDoc.data();
      const players = data.players as Player[];
      
      const sourceIndex = players.findIndex(p => p.id === sourcePlayerId);
      const targetIndex = players.findIndex(p => p.id === targetPlayerId);
      
      if (sourceIndex === -1 || targetIndex === -1) throw "Player not found";

      const sourcePlayer = { ...players[sourceIndex] };
      
      // Handle self-targeting or separate targets
      let targetPlayer: Player;
      if (sourcePlayerId === targetPlayerId) {
        targetPlayer = sourcePlayer;
      } else {
        targetPlayer = { ...players[targetIndex] };
      }

      // Remove item from source
      if (!sourcePlayer.items?.includes(itemType)) throw "Item not found";
      const itemIndex = sourcePlayer.items.indexOf(itemType);
      sourcePlayer.items.splice(itemIndex, 1);

      // Apply effect to target
      const now = timeService.now();
      if (!targetPlayer.statusEffects) targetPlayer.statusEffects = [];
      
      // Cleanup expired effects to keep document small
      targetPlayer.statusEffects = targetPlayer.statusEffects.filter(e => e.expiresAt > now);

      const baseDuration = (data.settings?.effectDuration || 10) * 1000;
      let duration = baseDuration;
      let effectType = '';

      switch (itemType) {
        case 'ATTACK':
          targetPlayer.hp = Math.max(0, (targetPlayer.hp || 100) - 25);
          break;
        case 'HEAL':
          targetPlayer.hp = Math.min(targetPlayer.maxHp || 100, (targetPlayer.hp || 100) + 35);
          targetPlayer.statusEffects = targetPlayer.statusEffects.filter(e => e.type !== 'POISONED');
          break;
        case 'LIGHTNING':
          targetPlayer.hp = Math.max(0, (targetPlayer.hp || 100) - 15);
          effectType = 'PARALYZED';
          duration = baseDuration;
          break;
        case 'POISON':
          targetPlayer.hp = Math.max(0, (targetPlayer.hp || 100) - 10);
          effectType = 'POISONED';
          duration = baseDuration * 1.5; // Poison lasts 50% longer
          break;
        case 'BLIND':
          effectType = 'BLINDED';
          duration = baseDuration * 1.2; // Blind lasts 20% longer
          break;
        case 'FREEZE':
          effectType = 'FROZEN';
          duration = baseDuration;
          break;
        case 'SWAP':
          const tempScore = sourcePlayer.score;
          sourcePlayer.score = targetPlayer.score;
          targetPlayer.score = tempScore;
          break;
      }

      if (effectType) {
        // Remove existing effect of same type if any to refresh duration
        targetPlayer.statusEffects = targetPlayer.statusEffects.filter(e => e.type !== effectType);
        targetPlayer.statusEffects.push({
          type: effectType as any,
          expiresAt: now + duration,
          sourceId: sourcePlayerId
        });
      }

      // Update players array
      players[sourceIndex] = sourcePlayer;
      if (sourcePlayerId !== targetPlayerId) {
        players[targetIndex] = targetPlayer;
      }

      transaction.update(sessionRef, { players });
    });
  },

  // Hồi sinh người chơi (Battle Mode)
  revivePlayer: async (sessionId: string, playerId: string) => {
    const sessionRef = doc(db, 'sessions', sessionId);
    
    await runTransaction(db, async (transaction) => {
      const sessionDoc = await transaction.get(sessionRef);
      if (!sessionDoc.exists()) throw "Session not found";

      const data = sessionDoc.data() as GameSession;
      const players = [...(data.players || [])];
      const playerIndex = players.findIndex(p => p.id === playerId);
      
      if (playerIndex === -1) throw "Player not found";
      
      const player = players[playerIndex];
      const cost = data.settings?.reviveCost || 1000; // Mặc định 1000 điểm

      // Trừ điểm (chấp nhận âm)
      player.score -= cost;
      
      // Hồi 50% máu
      player.hp = (player.maxHp || 100) * 0.5;
      
      // Xóa hiệu ứng xấu
      player.statusEffects = [];

      players[playerIndex] = player;
      transaction.update(sessionRef, { players });
    });
  },

  // Xóa người chơi khỏi phòng
  removePlayer: async (sessionId: string, playerId: string): Promise<void> => {
    const sessionRef = doc(db, 'sessions', sessionId);
    
    await runTransaction(db, async (transaction) => {
      const sessionDoc = await transaction.get(sessionRef);
      if (!sessionDoc.exists()) throw new Error("Session not found");
      
      const sessionData = sessionDoc.data();
      const players = (sessionData.players || []) as Player[];
      
      const newPlayers = players.filter(p => p.id !== playerId);
      
      transaction.update(sessionRef, { players: newPlayers });
    });
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

  // Xóa session
  deleteSession: async (sessionId: string): Promise<void> => {
    const sessionRef = doc(db, 'sessions', sessionId);
    await deleteDoc(sessionRef);
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
      const player = { ...players[playerIndex] };
      
      // BATTLE MODE: Check for status effects
      if (data.mode === 'BATTLE' && player.statusEffects) {
        const now = timeService.now();
        // Cleanup expired effects
        player.statusEffects = player.statusEffects.filter(e => e.expiresAt > now);
        const activeEffects = player.statusEffects;
        
        const isFrozen = activeEffects.some(e => e.type === 'FROZEN');
        
        if (isFrozen) {
          throw new Error("Bạn đang bị đóng băng, không thể trả lời!");
        }

        const isPoisoned = activeEffects.some(e => e.type === 'POISONED');
        if (isPoisoned) {
          player.hp = Math.max(0, (player.hp || 100) - 10); // Take 10 damage if poisoned when submitting
        }
      }

      // Logic tính điểm
      let points = 0;
      const settings = data.settings || {
        equalPoints: false,
        timeBasedPoints: true,
        streakBonus: true
      };

      if (answerData.isCorrect === true) {
        // Tính điểm cơ bản
        let basePoints = settings.equalPoints ? 1000 : (answerData.points || 0);
        
        // Tính điểm theo thời gian (nếu được bật và không phải chế độ điểm bằng nhau)
        if (settings.timeBasedPoints && !settings.equalPoints) {
          const timeLimit = answerData.timeLimit || 30;
          const timeTaken = answerData.timeTaken || 0;
          const timeRatio = Math.max(0, (timeLimit - timeTaken) / timeLimit);
          basePoints = Math.round(basePoints * (0.5 + 0.5 * timeRatio));
        }

        // Tính điểm thưởng chuỗi đúng
        const streakBonus = settings.streakBonus ? (player.streak * 100) : 0;
        
        points = basePoints + streakBonus;
        player.streak += 1;

        // BATTLE MODE: Grant Item (Only on correct answer)
        if (data.mode === 'BATTLE') {
           const itemPool = ['ATTACK', 'HEAL', 'LIGHTNING', 'POISON', 'BLIND', 'FREEZE'];
           if (answerData.isFirstHalf) {
             itemPool.push('SWAP');
           }
           const randomItem = itemPool[Math.floor(Math.random() * itemPool.length)];
           
           // Ensure items array exists and is unique to this player
           if (!player.items) {
             player.items = [];
           } else {
             // Create a copy to avoid any potential reference sharing
             player.items = [...player.items];
           }
           
           if (player.items.length < 3) { // Max 3 items
             player.items.push(randomItem);
           }
        }
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
