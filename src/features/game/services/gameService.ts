import {
  addDoc,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getDocsFromCache,
  onSnapshot,
  query,
  runTransaction,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { ref, uploadString, getDownloadURL } from "firebase/storage";
import { db, auth, storage, handleFirestoreError, OperationType } from "../../../config/firebase";
import {
  GameMode,
  GameSession,
  GameStatus,
  Player,
  Question,
} from "../../../types";
import { timeService } from "../../../services/timeService";
import { quizService } from "../../quiz/services/quizService";
import { adminService } from "../../admin/services/adminService";

// Helper function to remove undefined values recursively
const removeUndefined = (obj: any): any => {
  if (Array.isArray(obj)) {
    return obj.map(removeUndefined);
  } else if (obj !== null && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj)
        .filter(([_, v]) => v !== undefined)
        .map(([k, v]) => [k, removeUndefined(v)])
    );
  }
  return obj;
};

const getSessionsRef = () => collection(db, "sessions");

const teacherSessionsCache = new Map<string, { data: GameSession[], timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache

export const gameService = {
  // Tạo phòng game mới
  createSession: async (
    quizId: string,
    settings: any,
    mode: GameMode = "STUDENT_PACED",
    homeworkConfig?: any,
    title?: string,
    nameInputConfig?: {
      type: "MANUAL" | "CLASS_LIST";
      classId?: string;
      isGroupPlay?: boolean;
    },
  ): Promise<{ id: string; pin: string }> => {
    // Sinh mã PIN 6 số ngẫu nhiên
    const pin = Math.floor(100000 + Math.random() * 900000).toString();

    // Lấy hostId từ auth hiện tại
    const hostId = auth.currentUser?.uid || "unknown";

    const status = mode === "HOMEWORK" ? "PLAYING" : "WAITING";

    let initialPlayers: Player[] = [];

    // Nếu chọn từ danh sách lớp và không phải chơi nhóm, khởi tạo sẵn danh sách học sinh
    if (nameInputConfig?.classId && !nameInputConfig.isGroupPlay) {
      if (settings?.selectionTarget === 'group') {
        const groupsRef = collection(db, "groups");
        const q = query(groupsRef, where("classId", "==", nameInputConfig.classId));
        const groupsSnap = await getDocs(q);
        initialPlayers = groupsSnap.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.name,
            studentIds: data.studentIds || [],
            score: 0,
            streak: 0,
            progress: 0,
            finished: false,
            answers: {},
          };
        });
      } else {
        const students = await adminService.getStudentsByClass(nameInputConfig.classId);
        initialPlayers = students.map((student, index) => {
          const player: any = {
            id: student.id,
            name: student.name,
            studentIds: [student.id],
            score: 0,
            streak: 0,
            progress: 0,
            finished: false,
            answers: {},
          };
          
          // Assign 1-based cardNumber based on sorted index
          player.cardNumber = (index + 1).toString();
          
          if (student.avatarConfig) {
            player.avatarConfig = student.avatarConfig;
          }
          
          return player;
        });
      }
    }

    const sessionData: any = {
      pin,
      quizId,
      hostId,
      status,
      mode,
      createdAt: Date.now(),
      currentQuestionIndex: 0,
      settings,
      nameInputType: nameInputConfig?.type || "MANUAL",
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

    // Sanitize sessionData to remove undefined values for Firestore
    const sanitizedData = JSON.parse(JSON.stringify(sessionData));
    try {
      const docRef = await addDoc(getSessionsRef(), sanitizedData);
      
      // Batch write players to subcollection
      if (initialPlayers.length > 0) {
        const batch = writeBatch(db);
        initialPlayers.forEach(player => {
          const playerRef = doc(db, "sessions", docRef.id, "players", player.id);
          batch.set(playerRef, player);
        });
        await batch.commit();
      }
      
      // Nếu bật chế độ JSON (Quizizz Mode), tạo file JSON và lưu URL
      if (settings?.jsonDeliveryMode && storage) {
        try {
          const quizData = await quizService.getQuizById(quizId);
          if (quizData) {
            const jsonString = JSON.stringify(quizData);
            const storageRef = ref(storage, `quizzes/${quizId}_${docRef.id}.json`);
            await uploadString(storageRef, jsonString, 'raw', { contentType: 'application/json' });
            const downloadUrl = await getDownloadURL(storageRef);
            
            await updateDoc(docRef, { quizJsonUrl: downloadUrl });
            sanitizedData.quizJsonUrl = downloadUrl;
          }
        } catch (error) {
          console.error("Lỗi khi tạo file JSON cho đề thi:", error);
          // Không throw error để game vẫn tiếp tục bằng cách đọc từ Firestore
        }
      }

      // Invalidate teacher sessions cache
      teacherSessionsCache.delete(hostId);
      
      return { id: docRef.id, pin };
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "sessions");
      throw error;
    }
  },

  // Tìm phòng bằng PIN
  findSessionByPin: async (pin: string): Promise<GameSession | null> => {
    const q = query(
      getSessionsRef(),
      where("pin", "==", pin),
      where("status", "in", ["WAITING", "PLAYING"]),
    );
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    return {
      id: snapshot.docs[0].id,
      ...snapshot.docs[0].data(),
    } as GameSession;
  },

  // Lấy danh sách session của giáo viên
  getSessionsByTeacher: async (teacherId: string): Promise<GameSession[]> => {
    const cached = teacherSessionsCache.get(teacherId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }

    try {
      const q = query(
        getSessionsRef(),
        where("hostId", "==", teacherId)
      );
      
      let snapshot;
      try {
        snapshot = await getDocs(q);
      } catch (err: any) {
        // Fallback to cache if quota exceeded or offline
        if (err.message?.includes('Quota exceeded') || err.code === 'unavailable') {
          console.warn(`[GameService] Falling back to cache for sessions due to: ${err.message}`);
          snapshot = await getDocsFromCache(q);
        } else {
          throw err;
        }
      }

      const results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GameSession));
      
      // Sắp xếp trên client
      const sorted = results.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      teacherSessionsCache.set(teacherId, { data: sorted, timestamp: Date.now() });
      return sorted;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, "sessions");
      return [];
    }
  },

  // Lấy thông tin phòng bằng ID
  getSessionById: async (sessionId: string, includePlayers: boolean = false): Promise<GameSession & { players?: Player[] } | null> => {
    try {
      const docRef = doc(db, "sessions", sessionId);
      const snapshot = await getDoc(docRef);
      if (!snapshot.exists()) return null;
      const session = { id: snapshot.id, ...snapshot.data() } as GameSession & { players?: Player[] };
      
      if (includePlayers) {
        const playersSnap = await getDocs(collection(db, "sessions", sessionId, "players"));
        session.players = playersSnap.docs.map(d => ({ id: d.id, ...d.data() } as Player));
      }
      
      return session;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `sessions/${sessionId}`);
      return null;
    }
  },

  // Tìm phòng Plickers đang hoạt động của giáo viên
  getActivePlickersSession: async (teacherId: string): Promise<GameSession | null> => {
    const q = query(
      getSessionsRef(),
      where("hostId", "==", teacherId),
      where("mode", "==", "PLICKERS"),
      where("status", "in", ["WAITING", "QUESTION", "LEADERBOARD"])
    );
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    
    // Trả về session mới nhất
    const sessions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GameSession));
    return sessions.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))[0];
  },

  // Lắng nghe các phòng Plickers đang hoạt động của giáo viên
  subscribeToActivePlickersSessions: (teacherId: string, callback: (session: GameSession | null) => void) => {
    const q = query(
      getSessionsRef(),
      where("hostId", "==", teacherId),
      where("mode", "==", "PLICKERS"),
      where("status", "in", ["WAITING", "QUESTION", "LEADERBOARD"])
    );

    return onSnapshot(q, (snapshot) => {
      if (snapshot.empty) {
        callback(null);
        return;
      }

      const sessions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GameSession));
      const latestSession = sessions.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))[0];
      callback(latestSession);
    }, (error) => {
      // If quota exceeded, don't throw an uncaught error, just warn and notify via callback if possible
      if (error.message?.includes('Quota exceeded')) {
        console.warn('[GameService] Quota exceeded for active sessions listener.');
        callback(null);
        return;
      }
      handleFirestoreError(error, OperationType.LIST, "sessions");
    });
  },

  // Cập nhật nhiều câu trả lời từ máy quét Plickers cùng lúc
  submitScannerAnswersBatch: async (
    sessionId: string,
    answers: {
      playerId: string;
      playerName: string;
      cardNumber: string;
      questionId: string;
      optionId: string;
      question: Question;
    }[]
  ): Promise<void> => {
    if (answers.length === 0) return;

    // Use a batch write instead of transaction for multiple independent player docs
    const batch = writeBatch(db);
    
    // We need to fetch existing player docs to update them correctly
    // Since we can't easily do multiple gets in a batch, and we don't want to lock the whole session,
    // we'll fetch the players we need first.
    const playerIds = Array.from(new Set(answers.map(a => a.playerId)));
    const playersMap = new Map<string, Player>();
    
    // Fetch in chunks of 10 if needed, but usually Plickers has ~30 students, so we can fetch them individually or use 'in' query
    if (playerIds.length > 0) {
      // Firestore 'in' query supports up to 10 items. For simplicity, we can just fetch the whole subcollection
      // since it's only ~30-50 players.
      const playersSnap = await getDocs(collection(db, "sessions", sessionId, "players"));
      playersSnap.docs.forEach(doc => {
        playersMap.set(doc.id, doc.data() as Player);
      });
    }

    for (const ans of answers) {
      const playerRef = doc(db, "sessions", sessionId, "players", ans.playerId);
      let player = playersMap.get(ans.playerId);

      if (!player) {
        player = {
          id: ans.playerId,
          name: ans.playerName,
          studentIds: [ans.playerId],
          progress: 0,
          finished: false,
          cardNumber: ans.cardNumber,
          score: 0,
          answers: {},
          streak: 0,
        };
      }

      if (!player.cardNumber) {
        player.cardNumber = ans.cardNumber;
      }
      if (!player.answers) {
        player.answers = {};
      }

      const isCorrect = ans.question.options.find((o) => o.id === ans.optionId)?.isCorrect || false;

      const currentAnswer = player.answers[ans.questionId];
      if (!currentAnswer || currentAnswer.optionId !== ans.optionId) {
        player.answers[ans.questionId] = {
          optionId: ans.optionId,
          isCorrect,
          timeTaken: 0,
          pointsAwarded: isCorrect ? 1000 : 0,
        };

        player.score = Object.values(player.answers).reduce(
          (total, a) => total + (a.pointsAwarded || 0),
          0,
        );
        
        batch.set(playerRef, player);
      }
    }

    await batch.commit();
  },

  // Cập nhật câu trả lời từ máy quét Plickers
  submitScannerAnswer: async (
    sessionId: string,
    playerId: string,
    playerName: string,
    cardNumber: string,
    questionId: string,
    optionId: string,
    question: Question,
  ): Promise<void> => {
    const playerRef = doc(db, "sessions", sessionId, "players", playerId);

    await runTransaction(db, async (transaction) => {
      const playerDoc = await transaction.get(playerRef);
      
      let player: Player;
      if (!playerDoc.exists()) {
        player = {
          id: playerId,
          name: playerName,
          studentIds: [playerId],
          progress: 0,
          finished: false,
          cardNumber,
          score: 0,
          answers: {},
          streak: 0,
        };
      } else {
        player = playerDoc.data() as Player;
      }

      // Cập nhật cardNumber nếu chưa có
      if (!player.cardNumber) player.cardNumber = cardNumber;

      // Khởi tạo answers nếu chưa có
      if (!player.answers) player.answers = {};

      // Nếu đã trả lời câu này rồi thì chỉ cập nhật lại đáp án (không cộng thêm điểm)
      // Plickers cho phép đổi đáp án trước khi giáo viên chốt
      const isCorrect =
        question.options.find((o) => o.id === optionId)?.isCorrect || false;

      player.answers[questionId] = {
        optionId,
        isCorrect,
        timeTaken: 0,
        pointsAwarded: isCorrect ? 1000 : 0, // Điểm cơ bản cho Plickers
      };

      // Tính lại tổng điểm (đơn giản hóa)
      player.score = Object.values(player.answers).reduce(
        (total, ans) => total + (ans.pointsAwarded || 0),
        0,
      );

      transaction.set(playerRef, player);
    });
  },
  joinSession: async (sessionId: string, player: Player): Promise<void> => {
    const sessionRef = doc(db, "sessions", sessionId);
    const playerRef = doc(db, "sessions", sessionId, "players", player.id);

    await runTransaction(db, async (transaction) => {
      const sessionDoc = await transaction.get(sessionRef);
      if (!sessionDoc.exists()) throw new Error("Session not found");

      const sessionData = sessionDoc.data();
      const settings = sessionData.settings || {};

      const playerDoc = await transaction.get(playerRef);

      if (playerDoc.exists()) {
        // Player exists
        const existingPlayer = playerDoc.data() as Player;

        // Check if they have played (score > 0 or answers not empty)
        const hasPlayed =
          existingPlayer.score > 0 ||
          (existingPlayer.answers &&
            Object.keys(existingPlayer.answers).length > 0);

        if (hasPlayed) {
          // Check maxAttempts / allowRetry
          // Default maxAttempts is 1. If > 1, allow retry.
          // Or if allowRetry is explicitly true.
          const maxAttempts = settings.maxAttempts || 1;
          const allowRetry = settings.allowRetry || maxAttempts > 1;

          if (existingPlayer.finished && !allowRetry) {
            throw new Error("Bạn đã hoàn thành bài tập này rồi.");
          }
        }

        // Update player info but preserve progress
        transaction.update(playerRef, removeUndefined({
          name: player.name,
          avatarConfig: player.avatarConfig,
          studentIds: player.studentIds,
        }));
      } else {
        // New player
        transaction.set(playerRef, removeUndefined(player));
      }
    });
  },

  // Bắt đầu game
  startGame: async (sessionId: string): Promise<void> => {
    const sessionRef = doc(db, "sessions", sessionId);

    await runTransaction(db, async (transaction) => {
      const sessionDoc = await transaction.get(sessionRef);
      if (!sessionDoc.exists()) throw "Session not found";

      const sessionData = sessionDoc.data() as GameSession;
      const updates: any = {
        startedAt: Date.now(),
      };

      if (sessionData.mode === "TEACHER_PACED" || sessionData.mode === "PLICKERS") {
        updates.status = "QUESTION";
        updates.currentQuestionIndex = 0;
        updates.questionStartTime = Date.now();
      } else if (sessionData.mode === "BATTLE") {
        updates.status = "PLAYING";
      } else {
        updates.status = "PLAYING";
      }

      transaction.update(sessionRef, updates);
    });
    
    // Initialize Battle Stats for all players outside transaction to avoid read/write limits
    const sessionDoc = await getDoc(sessionRef);
    if (sessionDoc.exists() && sessionDoc.data().mode === "BATTLE") {
      const playersSnap = await getDocs(collection(db, "sessions", sessionId, "players"));
      if (!playersSnap.empty) {
        const batch = writeBatch(db);
        playersSnap.docs.forEach(playerDoc => {
          batch.update(playerDoc.ref, {
            hp: 100,
            maxHp: 100,
            items: [],
            statusEffects: [],
          });
        });
        await batch.commit();
      }
    }
  },

  // Battle Mode: Use Item
  useBattleItem: async (
    sessionId: string,
    sourcePlayerId: string,
    targetPlayerId: string,
    itemType: string,
  ) => {
    const sessionRef = doc(db, "sessions", sessionId);
    const sourcePlayerRef = doc(db, "sessions", sessionId, "players", sourcePlayerId);
    const targetPlayerRef = doc(db, "sessions", sessionId, "players", targetPlayerId);

    await runTransaction(db, async (transaction) => {
      const sessionDoc = await transaction.get(sessionRef);
      if (!sessionDoc.exists()) throw "Session not found";
      const data = sessionDoc.data();

      const sourceDoc = await transaction.get(sourcePlayerRef);
      if (!sourceDoc.exists()) throw "Source player not found";
      const sourcePlayer = sourceDoc.data() as Player;

      // Handle self-targeting or separate targets
      let targetPlayer: Player;
      if (sourcePlayerId === targetPlayerId) {
        targetPlayer = sourcePlayer;
      } else {
        const targetDoc = await transaction.get(targetPlayerRef);
        if (!targetDoc.exists()) throw "Target player not found";
        targetPlayer = targetDoc.data() as Player;
      }

      // Remove item from source
      if (!sourcePlayer.items?.includes(itemType)) throw "Item not found";
      const itemIndex = sourcePlayer.items.indexOf(itemType);
      sourcePlayer.items.splice(itemIndex, 1);

      // Apply effect to target
      const now = timeService.now();
      if (!targetPlayer.statusEffects) targetPlayer.statusEffects = [];

      // Cleanup expired effects to keep document small
      targetPlayer.statusEffects = targetPlayer.statusEffects.filter(
        (e) => e.expiresAt > now,
      );

      const baseDuration = (data.settings?.effectDuration || 10) * 1000;
      let duration = baseDuration;
      let effectType = "";

      switch (itemType) {
        case "ATTACK":
          targetPlayer.hp = Math.max(0, (targetPlayer.hp || 100) - 25);
          break;
        case "HEAL":
          targetPlayer.hp = Math.min(
            targetPlayer.maxHp || 100,
            (targetPlayer.hp || 100) + 35,
          );
          targetPlayer.statusEffects = targetPlayer.statusEffects.filter(
            (e) => e.type !== "POISONED",
          );
          break;
        case "LIGHTNING":
          targetPlayer.hp = Math.max(0, (targetPlayer.hp || 100) - 15);
          effectType = "PARALYZED";
          duration = baseDuration;
          break;
        case "POISON":
          targetPlayer.hp = Math.max(0, (targetPlayer.hp || 100) - 10);
          effectType = "POISONED";
          duration = baseDuration * 1.5; // Poison lasts 50% longer
          break;
        case "BLIND":
          effectType = "BLINDED";
          duration = baseDuration * 1.2; // Blind lasts 20% longer
          break;
        case "FREEZE":
          effectType = "FROZEN";
          duration = baseDuration;
          break;
        case "SWAP":
          const tempScore = sourcePlayer.score;
          sourcePlayer.score = targetPlayer.score;
          targetPlayer.score = tempScore;
          break;
      }

      if (effectType) {
        // Remove existing effect of same type if any to refresh duration
        targetPlayer.statusEffects = targetPlayer.statusEffects.filter(
          (e) => e.type !== effectType,
        );
        targetPlayer.statusEffects.push({
          type: effectType as any,
          expiresAt: now + duration,
          sourceId: sourcePlayerId,
        });
      }

      transaction.set(sourcePlayerRef, sourcePlayer, { merge: true });
      if (sourcePlayerId !== targetPlayerId) {
        transaction.set(targetPlayerRef, targetPlayer, { merge: true });
      }
    });
  },

  // Hồi sinh người chơi (Battle Mode)
  revivePlayer: async (sessionId: string, playerId: string) => {
    const sessionRef = doc(db, "sessions", sessionId);
    const playerRef = doc(db, "sessions", sessionId, "players", playerId);

    await runTransaction(db, async (transaction) => {
      const sessionDoc = await transaction.get(sessionRef);
      if (!sessionDoc.exists()) throw "Session not found";
      const data = sessionDoc.data();

      const playerDoc = await transaction.get(playerRef);
      if (!playerDoc.exists()) throw "Player not found";

      const player = playerDoc.data() as Player;
      const cost = data.settings?.reviveCost || 1000; // Mặc định 1000 điểm

      // Trừ điểm (chấp nhận âm)
      player.score -= cost;

      // Hồi 50% máu
      player.hp = (player.maxHp || 100) * 0.5;

      // Xóa hiệu ứng xấu
      player.statusEffects = [];

      transaction.set(playerRef, player, { merge: true });
    });
  },

  // Xóa người chơi khỏi phòng
  removePlayer: async (sessionId: string, playerId: string): Promise<void> => {
    const playerRef = doc(db, "sessions", sessionId, "players", playerId);
    await deleteDoc(playerRef);
  },

  // Chuyển sang câu hỏi tiếp theo
  nextQuestion: async (sessionId: string, nextIndex: number): Promise<void> => {
    const sessionRef = doc(db, "sessions", sessionId);
    await updateDoc(sessionRef, {
      status: "QUESTION",
      currentQuestionIndex: nextIndex,
      questionStartTime: Date.now(),
    });
  },

  // Hiện bảng xếp hạng (sau mỗi câu trong Teacher-paced)
  showLeaderboard: async (sessionId: string): Promise<void> => {
    const sessionRef = doc(db, "sessions", sessionId);
    await updateDoc(sessionRef, {
      status: "LEADERBOARD",
    });
  },

  // Cập nhật trạng thái game
  updateGameState: async (
    sessionId: string,
    status: GameStatus,
  ): Promise<void> => {
    const sessionRef = doc(db, "sessions", sessionId);
    await updateDoc(sessionRef, { status });
  },

  // Kết thúc game
  endGame: async (sessionId: string): Promise<void> => {
    try {
      const sessionRef = doc(db, "sessions", sessionId);
      await updateDoc(sessionRef, {
        status: "FINISHED",
        finishedAt: Date.now(),
      });
      
      // Invalidate cache
      teacherSessionsCache.clear();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `sessions/${sessionId}`);
    }
  },

  // Xóa session
  deleteSession: async (sessionId: string): Promise<void> => {
    try {
      const docRef = doc(db, "sessions", sessionId);
      let session: GameSession | null = null;
      
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        session = { id: snap.id, ...snap.data() } as GameSession;
      }

      // Xóa file JSON nếu có
      if (session?.settings?.jsonDeliveryMode && storage) {
        try {
          const { deleteObject } = await import('firebase/storage');
          const storageRef = ref(storage, `quizzes/${session.quizId}_${sessionId}.json`);
          await deleteObject(storageRef);
        } catch (e) {
          console.warn("Could not delete JSON file or it doesn't exist", e);
        }
      }

      await deleteDoc(docRef);
      if (session) {
        teacherSessionsCache.delete(session.hostId);
      } else {
        teacherSessionsCache.clear();
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `sessions/${sessionId}`);
    }
  },

  // Oral Quiz Mode: Submit Answer
  submitOralAnswer: async (
    sessionId: string,
    playerId: string,
    questionId: string,
    isCorrect: boolean,
    points: number = 1000,
    optionId?: string
  ) => {
    const playerRef = doc(db, "sessions", sessionId, "players", playerId);

    await runTransaction(db, async (transaction) => {
      const playerDoc = await transaction.get(playerRef);
      if (!playerDoc.exists()) throw "Player not found";

      const player = playerDoc.data() as Player;
      if (!player.answers) player.answers = {};

      const pointsAwarded = isCorrect ? points : 0;
      
      const answerRecord: any = {
        isCorrect,
        pointsAwarded,
        timeTaken: 0
      };
      if (optionId !== undefined) {
        answerRecord.optionId = optionId;
      }
      
      player.answers[questionId] = answerRecord;

      player.score += pointsAwarded;
      if (isCorrect) {
        player.streak = (player.streak || 0) + 1;
      } else {
        player.streak = 0;
      }

      transaction.set(playerRef, player, { merge: true });
    });
  },

  // Nộp câu trả lời (Quan trọng: Xử lý Transaction để cộng điểm chính xác)
  submitAnswer: async (
    sessionId: string,
    playerId: string,
    questionId: string,
    answerData: any,
  ) => {
    const sessionRef = doc(db, "sessions", sessionId);
    const playerRef = doc(db, "sessions", sessionId, "players", playerId);

    try {
      await runTransaction(db, async (transaction) => {
        const sessionDoc = await transaction.get(sessionRef);
        if (!sessionDoc.exists()) throw "Session not found";
        const data = sessionDoc.data();

        const playerDoc = await transaction.get(playerRef);
        if (!playerDoc.exists()) throw "Player not found";
        const player = playerDoc.data() as Player;

        // BATTLE MODE: Check for status effects
        if (data.mode === "BATTLE" && player.statusEffects) {
          const now = timeService.now();
          // Cleanup expired effects
          player.statusEffects = player.statusEffects.filter(
            (e) => e.expiresAt > now,
          );
          const activeEffects = player.statusEffects;

          const isFrozen = activeEffects.some((e) => e.type === "FROZEN");

          if (isFrozen) {
            throw new Error("Bạn đang bị đóng băng, không thể trả lời!");
          }

          const isPoisoned = activeEffects.some((e) => e.type === "POISONED");
          if (isPoisoned) {
            player.hp = Math.max(0, (player.hp || 100) - 10); // Take 10 damage if poisoned when submitting
          }
        }

        // Logic tính điểm
        let points = 0;
        const settings = data.settings || {
          equalPoints: false,
          timeBasedPoints: true,
          streakBonus: true,
        };

        if (answerData.isCorrect === true) {
          // Tính điểm cơ bản
          let basePoints = settings.equalPoints ? 1000 : answerData.points || 0;

          // Tính điểm theo thời gian (nếu được bật và không phải chế độ điểm bằng nhau)
          if (settings.timeBasedPoints && !settings.equalPoints) {
            const timeLimit = answerData.timeLimit || 30;
            const timeTaken = answerData.timeTaken || 0;
            const timeRatio = Math.max(0, (timeLimit - timeTaken) / timeLimit);
            basePoints = Math.round(basePoints * (0.5 + 0.5 * timeRatio));
          }

          // Tính điểm thưởng chuỗi đúng
          const streakBonus = settings.streakBonus ? player.streak * 100 : 0;

          points = basePoints + streakBonus;
          player.streak += 1;

          // BATTLE MODE: Grant Item (Only on correct answer)
          if (data.mode === "BATTLE") {
            const itemPool = [
              "ATTACK",
              "HEAL",
              "LIGHTNING",
              "POISON",
              "BLIND",
              "FREEZE",
            ];
            if (answerData.isFirstHalf) {
              itemPool.push("SWAP");
            }
            const randomItem =
              itemPool[Math.floor(Math.random() * itemPool.length)];

            // Ensure items array exists and is unique to this player
            if (!player.items) {
              player.items = [];
            } else {
              // Create a copy to avoid any potential reference sharing
              player.items = [...player.items];
            }

            if (player.items.length < 3) {
              // Max 3 items
              player.items.push(randomItem);
            }
          }
        } else {
          player.streak = 0;
        }

        player.score += points;
        player.progress += 1;
        
        const sanitizedAnswerData = removeUndefined(answerData);

        player.answers = {
          ...player.answers,
          [questionId]: {
            ...sanitizedAnswerData,
            pointsAwarded: points,
          },
        };

        transaction.set(playerRef, player, { merge: true });
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `sessions/${sessionId}/players/${playerId}`);
      throw error;
    }
  },

  // Đánh dấu người chơi đã hoàn thành bài thi
  finishPlayerSession: async (sessionId: string, playerId: string) => {
    const playerRef = doc(db, "sessions", sessionId, "players", playerId);
    await updateDoc(playerRef, { finished: true });
  },

  // Nộp toàn bộ tiến độ (dành cho Eco Mode)
  submitEcoModeProgress: async (
    sessionId: string,
    playerId: string,
    playerData: Partial<Player>
  ) => {
    const sessionRef = doc(db, "sessions", sessionId);
    const playerRef = doc(db, "sessions", sessionId, "players", playerId);

    await runTransaction(db, async (transaction) => {
      const sessionDoc = await transaction.get(sessionRef);
      if (!sessionDoc.exists()) throw new Error("Session not found");
      const data = sessionDoc.data();
      const settings = data.settings || {};

      const playerDoc = await transaction.get(playerRef);
      
      // If saveDetailedAnswers is false, strip the answers object from the incoming data
      const finalPlayerData = removeUndefined({ ...playerData });
      if (settings.saveDetailedAnswers === false) {
        finalPlayerData.answers = {};
      }

      if (!playerDoc.exists()) {
        const newPlayer: Player = {
          id: playerId,
          name: finalPlayerData.name || "Unknown",
          studentIds: finalPlayerData.studentIds || [playerId],
          score: 0,
          streak: 0,
          progress: 0,
          finished: false,
          answers: {},
          ...finalPlayerData
        };
        transaction.set(playerRef, newPlayer);
      } else {
        const existingPlayer = playerDoc.data() as Player;
        const updatedPlayer = {
          ...existingPlayer,
          ...finalPlayerData,
          answers: settings.saveDetailedAnswers === false ? {} : {
            ...existingPlayer.answers,
            ...finalPlayerData.answers
          }
        };
        transaction.update(playerRef, updatedPlayer);
      }
    });
  },

  // Cập nhật avatar của người chơi
  updatePlayerAvatar: async (
    sessionId: string,
    playerId: string,
    avatarConfig: any,
  ) => {
    const playerRef = doc(db, "sessions", sessionId, "players", playerId);
    await updateDoc(playerRef, { avatarConfig: removeUndefined(avatarConfig) });
  },

  // Lắng nghe thay đổi của phòng (Real-time)
  subscribeToSession: (
    sessionId: string,
    callback: (data: GameSession) => void,
  ) => {
    return onSnapshot(doc(db, "sessions", sessionId), (doc) => {
      if (doc.exists()) {
        callback({ id: doc.id, ...doc.data() } as GameSession);
      }
    }, (error) => {
      if (error.message?.includes('Quota exceeded')) {
        console.warn(`[GameService] Quota exceeded for session listener: ${sessionId}`);
        return;
      }
      handleFirestoreError(error, OperationType.GET, `sessions/${sessionId}`);
    });
  },

  // Lắng nghe danh sách người chơi (Real-time)
  subscribeToPlayers: (
    sessionId: string,
    callback: (players: Player[]) => void,
  ) => {
    return onSnapshot(collection(db, "sessions", sessionId, "players"), (snapshot) => {
      const players = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Player));
      callback(players);
    }, (error) => {
      if (error.message?.includes('Quota exceeded')) {
        console.warn(`[GameService] Quota exceeded for players listener: ${sessionId}`);
        return;
      }
      handleFirestoreError(error, OperationType.LIST, `sessions/${sessionId}/players`);
    });
  },

  // Lắng nghe một người chơi cụ thể (Real-time)
  subscribeToPlayer: (
    sessionId: string,
    playerId: string,
    callback: (player: Player | null) => void,
  ) => {
    return onSnapshot(doc(db, "sessions", sessionId, "players", playerId), (doc) => {
      if (doc.exists()) {
        callback({ id: doc.id, ...doc.data() } as Player);
      } else {
        callback(null);
      }
    }, (error) => {
      if (error.message?.includes('Quota exceeded')) {
        console.warn(`[GameService] Quota exceeded for player listener: ${sessionId}/${playerId}`);
        return;
      }
      handleFirestoreError(error, OperationType.GET, `sessions/${sessionId}/players/${playerId}`);
    });
  },
};
