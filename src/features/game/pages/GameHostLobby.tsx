import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { GameMode, GameSession, GameSettings } from '../../../types';
import { gameService } from '../services/gameService';
import { auth } from '../../../config/firebase';
import { StudentAvatar } from '../../../components/Avatar/StudentAvatar';
import { classService, ClassData } from '../../random-selector/services/classService';

export default function GameHostLobby() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState<GameSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [setupMode, setSetupMode] = useState(true);
  const [gameMode, setGameMode] = useState<GameMode>('STUDENT_PACED');
  const [settings, setSettings] = useState<GameSettings>({
    shuffleQuestions: false,
    shuffleAnswers: false,
    equalPoints: false,
    timeBasedPoints: true,
    streakBonus: true,
    effectDuration: 10, // Default 10s as requested
  });
  const [sessionTitle, setSessionTitle] = useState('');
  
  // New settings
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [nameInputType, setNameInputType] = useState<'MANUAL' | 'CLASS_LIST'>('MANUAL');
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [isGroupPlay, setIsGroupPlay] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        try {
          const data = await classService.getClassesByTeacher(user.uid);
          setClasses(data);
        } catch (error) {
          console.error("Error fetching classes:", error);
        }
      }
    });
    
    return () => unsubscribe();
  }, []);

  const handleCreateSession = async () => {
    if (!quizId) return;
    
    if (nameInputType === 'CLASS_LIST' && !selectedClassId) {
      alert('Vui lòng chọn lớp học!');
      return;
    }

    setLoading(true);
    try {
      // const hostId = auth?.currentUser?.uid || 'admin'; // Removed hostId param
      const { id: sessionId } = await gameService.createSession(
        quizId, 
        settings, 
        gameMode, 
        undefined, 
        sessionTitle,
        {
          type: nameInputType,
          classId: selectedClassId || undefined,
          isGroupPlay
        }
      );
      
      // Lắng nghe thay đổi
      gameService.subscribeToSession(sessionId, (data) => {
        setSession(data);
        setLoading(false);
        setSetupMode(false);
      });
    } catch (error) {
      console.error("Error creating session:", error);
      setLoading(false);
    }
  };

  const handleStartGame = async () => {
    if (!session) return;
    await gameService.startGame(session.id);
    navigate(`/game/dashboard/${session.id}`);
  };

  if (setupMode) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-indigo-600 p-6 text-white text-center">
            <h1 className="text-2xl font-bold">Cài đặt phòng thi</h1>
            <p className="opacity-80 mt-2">Tùy chỉnh các luật chơi trước khi bắt đầu</p>
          </div>
          
          <div className="p-6 space-y-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tên phiên thi (Tùy chọn)</label>
                <input 
                  type="text" 
                  placeholder="VD: Lớp 12A1 - Kiểm tra 15p"
                  value={sessionTitle}
                  onChange={(e) => setSessionTitle(e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Chế độ chơi</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setGameMode('STUDENT_PACED')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium border transition ${
                      gameMode === 'STUDENT_PACED'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    Học sinh tự làm
                  </button>
                  <button
                    type="button"
                    onClick={() => setGameMode('TEACHER_PACED')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium border transition ${
                      gameMode === 'TEACHER_PACED'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    Giáo viên điều khiển
                  </button>
                  <button
                    type="button"
                    onClick={() => setGameMode('BATTLE')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium border transition ${
                      gameMode === 'BATTLE'
                        ? 'bg-red-600 text-white border-red-600 shadow-sm'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    Đấu trường sinh tồn
                  </button>
                </div>
                <p className="text-xs text-gray-500 italic">
                  {gameMode === 'STUDENT_PACED' 
                    ? 'Học sinh tự hoàn thành bài thi theo tốc độ cá nhân.' 
                    : gameMode === 'TEACHER_PACED'
                    ? 'Cả lớp cùng làm một câu hỏi. Giáo viên bấm nút để sang câu tiếp theo.'
                    : 'Chế độ chiến đấu nhiều người chơi. Sử dụng vật phẩm để tấn công đối thủ!'}
                </p>
              </div>

              <div className="space-y-2 mt-4 border-t border-gray-200 pt-4">
                <label className="block text-sm font-medium text-gray-700">Cài đặt người chơi</label>
                
                <div className="flex items-center gap-4 mb-2">
                  <label className="flex items-center cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      className="form-checkbox h-5 w-5 text-indigo-600 rounded focus:ring-indigo-500 mr-2"
                      checked={isGroupPlay}
                      onChange={(e) => setIsGroupPlay(e.target.checked)}
                    />
                    <span className="text-gray-700 font-medium">Chế độ chơi nhóm</span>
                  </label>
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-gray-600">Cách nhập tên:</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setNameInputType('MANUAL')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium border transition ${
                        nameInputType === 'MANUAL'
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      Tự nhập tên {isGroupPlay ? 'nhóm' : ''}
                    </button>
                    <button
                      type="button"
                      onClick={() => setNameInputType('CLASS_LIST')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium border transition ${
                        nameInputType === 'CLASS_LIST'
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      Chọn từ danh sách lớp
                    </button>
                  </div>
                </div>

                {nameInputType === 'CLASS_LIST' && (
                  <div className="mt-2 animate-fadeIn">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Chọn lớp học</label>
                    <select
                      value={selectedClassId}
                      onChange={(e) => setSelectedClassId(e.target.value)}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 py-2 px-3 bg-white border"
                    >
                      <option value="">-- Chọn lớp --</option>
                      {classes.map((cls) => (
                        <option key={cls.id} value={cls.id}>{cls.name}</option>
                      ))}
                    </select>
                    {classes.length === 0 && (
                      <p className="text-xs text-red-500 mt-1">Bạn chưa có lớp học nào. Vui lòng tạo lớp trước.</p>
                    )}
                  </div>
                )}
              </div>

              <div className="border-t border-gray-200 pt-4"></div>

              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-gray-700 font-medium">Đảo thứ tự câu hỏi</span>
                <input 
                  type="checkbox" 
                  className="form-checkbox h-5 w-5 text-indigo-600 rounded focus:ring-indigo-500"
                  checked={settings.shuffleQuestions}
                  onChange={(e) => setSettings({...settings, shuffleQuestions: e.target.checked})}
                />
              </label>
              
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-gray-700 font-medium">Đảo thứ tự đáp án</span>
                <input 
                  type="checkbox" 
                  className="form-checkbox h-5 w-5 text-indigo-600 rounded focus:ring-indigo-500"
                  checked={settings.shuffleAnswers}
                  onChange={(e) => setSettings({...settings, shuffleAnswers: e.target.checked})}
                />
              </label>

              <div className="border-t border-gray-200 pt-4"></div>

              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-gray-700 font-medium">Tính điểm các câu như nhau</span>
                <input 
                  type="checkbox" 
                  className="form-checkbox h-5 w-5 text-indigo-600 rounded focus:ring-indigo-500"
                  checked={settings.equalPoints}
                  onChange={(e) => setSettings({...settings, equalPoints: e.target.checked})}
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer">
                <div className="pr-4">
                  <span className="text-gray-700 font-medium block">Điểm theo thời gian</span>
                  <span className="text-xs text-gray-500">Trả lời càng nhanh điểm càng cao</span>
                </div>
                <input 
                  type="checkbox" 
                  className="form-checkbox h-5 w-5 text-indigo-600 rounded focus:ring-indigo-500"
                  checked={settings.timeBasedPoints}
                  onChange={(e) => setSettings({...settings, timeBasedPoints: e.target.checked})}
                  disabled={settings.equalPoints}
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer">
                <div className="pr-4">
                  <span className="text-gray-700 font-medium block">Điểm thưởng chuỗi đúng (Streak)</span>
                  <span className="text-xs text-gray-500">Cộng thêm điểm khi trả lời đúng liên tiếp</span>
                </div>
                <input 
                  type="checkbox" 
                  className="form-checkbox h-5 w-5 text-indigo-600 rounded focus:ring-indigo-500"
                  checked={settings.streakBonus}
                  onChange={(e) => setSettings({...settings, streakBonus: e.target.checked})}
                />
              </label>

              {/* Battle Mode Settings */}
              {session?.mode === 'BATTLE' && (
                <div className="bg-red-50 p-4 rounded-lg border border-red-200 mt-4">
                  <h3 className="text-sm font-bold text-red-800 mb-3 uppercase tracking-wider">Cài đặt Đấu trường</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Chế độ chơi</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => setSettings({ ...settings, pacing: 'STUDENT' })}
                          className={`p-2 rounded border text-sm text-left transition-colors ${
                            settings.pacing !== 'TEACHER'
                              ? 'bg-red-600 text-white border-red-600'
                              : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          <div className="font-bold">Tốc độ (Tự do)</div>
                          <div className="text-xs opacity-80">Học sinh tự làm bài</div>
                        </button>
                        <button
                          onClick={() => setSettings({ ...settings, pacing: 'TEACHER' })}
                          className={`p-2 rounded border text-sm text-left transition-colors ${
                            settings.pacing === 'TEACHER'
                              ? 'bg-red-600 text-white border-red-600'
                              : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          <div className="font-bold">Đồng loạt</div>
                          <div className="text-xs opacity-80">GV điều khiển</div>
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Phí hồi sinh (Điểm)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="100"
                        value={settings.reviveCost || 1000}
                        onChange={(e) => setSettings({ ...settings, reviveCost: parseInt(e.target.value) || 0 })}
                        className="w-full border-gray-300 rounded-md shadow-sm focus:ring-red-500 focus:border-red-500 sm:text-sm"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Điểm bị trừ khi học sinh chọn hồi sinh (lấy lại 50% HP).
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Thời gian tác dụng vật phẩm (giây)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="60"
                        value={settings.effectDuration || 10}
                        onChange={(e) => setSettings({ ...settings, effectDuration: parseInt(e.target.value) || 1 })}
                        className="w-full border-gray-300 rounded-md shadow-sm focus:ring-red-500 focus:border-red-500 sm:text-sm"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Thời gian các hiệu ứng như Tê liệt, Đóng băng, Mù... kéo dài.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={handleCreateSession}
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-xl shadow-md transition disabled:opacity-50"
            >
              {loading ? 'Đang tạo phòng...' : 'Tạo phòng thi'}
            </button>
            <button
              onClick={() => navigate('/teacher/dashboard')}
              className="w-full bg-white hover:bg-gray-50 text-gray-700 font-medium py-3 px-4 rounded-xl border border-gray-300 transition mt-2"
            >
              Hủy
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) return <div className="flex h-screen items-center justify-center text-2xl font-bold">Đang tạo phòng...</div>;
  if (!session) return <div className="flex h-screen items-center justify-center text-red-500">Lỗi tạo phòng!</div>;

  return (
    <div className="min-h-screen bg-indigo-900 text-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-6 bg-indigo-800 shadow-lg">
        <h1 className="text-2xl font-bold">Phòng chờ</h1>
        <div className="text-center">
          <p className="text-sm uppercase tracking-widest opacity-70">Mã PIN tham gia</p>
          <p className="text-6xl font-black tracking-widest bg-white text-indigo-900 px-8 py-2 rounded-xl shadow-2xl mt-2">
            {session.pin}
          </p>
        </div>
        <button
          onClick={handleStartGame}
          disabled={session.players?.length === 0}
          className="bg-green-500 hover:bg-green-600 text-white font-bold py-4 px-8 rounded-xl text-xl shadow-lg transform transition hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          BẮT ĐẦU ({session.players?.length || 0})
        </button>
      </div>

      {/* Player List */}
      <div className="flex-1 p-8 overflow-y-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {session.players?.map((player, index) => (
            <div 
              key={index} 
              className="bg-indigo-700 p-4 rounded-lg text-center font-bold text-lg animate-bounce shadow-md border border-indigo-500 flex flex-col items-center gap-2"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <StudentAvatar 
                name={player.name} 
                avatarConfig={player.avatarConfig} 
                size={64} 
                className="border-2 border-white/50"
              />
              <span className="truncate w-full">{player.name}</span>
            </div>
          ))}
          {(!session.players || session.players.length === 0) && (
            <div className="col-span-full text-center text-indigo-300 text-xl mt-20 animate-pulse">
              Đang chờ người chơi tham gia...
            </div>
          )}
        </div>
      </div>
      
      <div className="p-4 text-center text-indigo-300 text-sm">
        Hãy truy cập vào trang web và nhập mã PIN ở trên để tham gia.
      </div>
    </div>
  );
}
