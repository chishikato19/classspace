import React, { useState, useEffect } from 'react';
import { ClassGroup, GameSettings, HomeworkConfig } from '../../../types';
import { adminService } from '../../admin/services/adminService';
import { gameService } from '../../game/services/gameService';
import { useNavigate } from 'react-router-dom';
import { X, Calendar, Users, Shield, Clock, RotateCcw, Copy, Check } from 'lucide-react';

interface HomeworkModalProps {
  quizId: string;
  quizTitle: string;
  onClose: () => void;
}

export const HomeworkModal: React.FC<HomeworkModalProps> = ({ quizId, quizTitle, onClose }) => {
  const navigate = useNavigate();
  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Homework Config State
  const [deadline, setDeadline] = useState<string>(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16) // Default 7 days
  );
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [sessionTitle, setSessionTitle] = useState('');
  const [createdPin, setCreatedPin] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  
  // Game Settings State
  const [settings, setSettings] = useState<GameSettings>({
    shuffleQuestions: true,
    shuffleAnswers: true,
    equalPoints: true,
    timeBasedPoints: false, // Homework usually doesn't use speed points
    streakBonus: true,
    showCorrectAnswers: 'AFTER_GAME',
    showScore: true,
    maxAttempts: 1,
    requirePasscode: false,
    allowRetry: false,
    redoWrongQuestions: false,
    forceTimeLimit: undefined,
    passingPercentage: 0,
    ecoMode: true // Mặc định bật chế độ tiết kiệm cho bài tập về nhà
  });

  useEffect(() => {
    const loadClasses = async () => {
      const data = await adminService.getAllClasses();
      setClasses(data);
    };
    loadClasses();
  }, []);

  const handleCreateHomework = async () => {
    setLoading(true);
    try {
      const homeworkConfig: HomeworkConfig = {
        deadline: new Date(deadline).getTime(),
      };
      
      if (selectedClassId) {
        homeworkConfig.classId = selectedClassId;
      }

      const { id: sessionId, pin } = await gameService.createSession(quizId, settings, 'HOMEWORK', homeworkConfig, sessionTitle);
      
      setCreatedPin(pin);
    } catch (error) {
      console.error("Failed to create homework", error);
      alert("Lỗi khi tạo bài tập về nhà");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (!createdPin) return;
    const link = `${window.location.origin}/#/join?pin=${createdPin}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (createdPin) {
    const link = `${window.location.origin}/#/join?pin=${createdPin}`;
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-8 text-center animate-in fade-in zoom-in duration-300">
          <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check size={32} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Đã giao bài tập!</h2>
          <p className="text-gray-500 mb-6">Học sinh có thể truy cập bằng mã PIN hoặc đường dẫn bên dưới.</p>
          
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6">
            <div className="text-sm text-gray-500 mb-1">Mã PIN</div>
            <div className="text-3xl font-mono font-bold text-indigo-600 tracking-widest">{createdPin}</div>
          </div>

          <div className="space-y-3">
            <button 
              onClick={handleCopyLink}
              className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-colors ${
                copied ? 'bg-green-500 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'
              }`}
            >
              {copied ? (
                <><Check size={20} /> Đã sao chép đường dẫn</>
              ) : (
                <><Copy size={20} /> Sao chép đường dẫn</>
              )}
            </button>
            <button 
              onClick={onClose}
              className="w-full py-3 px-4 rounded-lg font-medium text-gray-600 hover:bg-gray-100 transition-colors"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b sticky top-0 bg-white z-10">
          <h2 className="text-xl font-bold text-gray-900">Giao bài tập về nhà: {quizTitle}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-8">
          {/* 1. Thời hạn & Lớp học */}
          <section className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2 text-indigo-700">
              <Calendar size={20} /> Cấu hình cơ bản
            </h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tên bài tập (Tùy chọn)</label>
              <input 
                type="text" 
                placeholder="VD: Bài tập về nhà tuần 1"
                value={sessionTitle}
                onChange={(e) => setSessionTitle(e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hạn nộp bài</label>
                <input 
                  type="datetime-local" 
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Giao cho lớp</label>
                <select 
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                >
                  <option value="">Tự do (Ai có link cũng vào được)</option>
                  {classes.map(cls => (
                    <option key={cls.id} value={cls.id}>{cls.name}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {selectedClassId ? "Chỉ học sinh trong lớp này mới được tham gia." : "Học sinh sẽ nhập tên để tham gia."}
                </p>
              </div>
            </div>
          </section>

          {/* 2. Kiểm soát gian lận */}
          <section className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2 text-red-600">
              <Shield size={20} /> Kiểm soát gian lận
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border p-4 rounded-lg">
                <label className="block text-sm font-medium text-gray-900 mb-2">Hiển thị đáp án đúng</label>
                <select 
                  value={settings.showCorrectAnswers}
                  onChange={(e) => setSettings({...settings, showCorrectAnswers: e.target.value as any})}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                >
                  <option value="IMMEDIATELY">Ngay sau mỗi câu (Luyện tập)</option>
                  <option value="AFTER_GAME">Sau khi nộp bài (Kiểm tra)</option>
                  <option value="NEVER">Không hiển thị (Bảo mật)</option>
                </select>
              </div>

              <div className="border p-4 rounded-lg flex items-center justify-between">
                <div>
                  <label className="block text-sm font-medium text-gray-900">Hiển thị điểm số</label>
                  <p className="text-xs text-gray-500">Cho học sinh xem điểm sau khi hoàn thành</p>
                </div>
                <input 
                  type="checkbox"
                  checked={settings.showScore}
                  onChange={(e) => setSettings({...settings, showScore: e.target.checked})}
                  className="h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                />
              </div>

              <div className="border p-4 rounded-lg">
                <label className="block text-sm font-medium text-gray-900 mb-2">Số lần làm bài</label>
                <div className="flex items-center gap-4">
                  <input 
                    type="range" 
                    min="0" 
                    max="5" 
                    step="1"
                    value={settings.maxAttempts}
                    onChange={(e) => setSettings({...settings, maxAttempts: parseInt(e.target.value)})}
                    className="flex-1"
                  />
                  <span className="font-bold text-lg w-8 text-center">
                    {settings.maxAttempts === 0 ? "∞" : settings.maxAttempts}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">0 là không giới hạn</p>
              </div>

              <div className="border p-4 rounded-lg flex items-center justify-between">
                <div>
                  <label className="block text-sm font-medium text-gray-900">Yêu cầu Mật khẩu</label>
                  <p className="text-xs text-gray-500">Học sinh phải nhập Passcode riêng</p>
                </div>
                <input 
                  type="checkbox"
                  checked={settings.requirePasscode}
                  onChange={(e) => setSettings({...settings, requirePasscode: e.target.checked})}
                  className="h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                />
              </div>

              <div className="border p-4 rounded-lg flex items-center justify-between">
                <div>
                  <label className="block text-sm font-medium text-gray-900">Trộn câu hỏi & Đáp án</label>
                  <p className="text-xs text-gray-500">Mỗi học sinh có mã đề khác nhau</p>
                </div>
                <input 
                  type="checkbox"
                  checked={settings.shuffleQuestions}
                  onChange={(e) => setSettings({...settings, shuffleQuestions: e.target.checked, shuffleAnswers: e.target.checked})}
                  className="h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                />
              </div>

              <div className="border p-4 rounded-lg">
                <label className="block text-sm font-medium text-gray-900 mb-2">Thời gian trả lời</label>
                <select 
                  value={settings.forceTimeLimit === undefined ? 'default' : settings.forceTimeLimit}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSettings({...settings, forceTimeLimit: val === 'default' ? undefined : parseInt(val)});
                  }}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                >
                  <option value="default">Theo từng câu hỏi (Mặc định)</option>
                  <option value="0">Không giới hạn (∞)</option>
                  <option value="10">10 giây</option>
                  <option value="20">20 giây</option>
                  <option value="30">30 giây</option>
                  <option value="60">1 phút</option>
                  <option value="120">2 phút</option>
                  <option value="300">5 phút</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">Ghi đè thời gian của tất cả câu hỏi</p>
              </div>

              <div className="border p-4 rounded-lg flex items-center justify-between">
                <div>
                  <label className="block text-sm font-medium text-gray-900">Bắt buộc làm lại câu sai</label>
                  <p className="text-xs text-gray-500">Học sinh phải làm lại cho đúng (không tính điểm)</p>
                </div>
                <input 
                  type="checkbox"
                  checked={settings.redoWrongQuestions}
                  onChange={(e) => setSettings({...settings, redoWrongQuestions: e.target.checked})}
                  className="h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                />
              </div>

              <div className="border p-4 rounded-lg">
                <label className="block text-sm font-medium text-gray-900 mb-2">Yêu cầu hoàn thành (%)</label>
                <select 
                  value={settings.passingPercentage || 0}
                  onChange={(e) => setSettings({...settings, passingPercentage: parseInt(e.target.value)})}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                >
                  <option value="0">Không yêu cầu</option>
                  <option value="50">50%</option>
                  <option value="60">60%</option>
                  <option value="70">70%</option>
                  <option value="80">80%</option>
                  <option value="90">90%</option>
                  <option value="100">100%</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">Tỷ lệ trả lời đúng tối thiểu để đạt</p>
              </div>
            </div>
          </section>

          {/* 3. Cài đặt Game */}
          <section className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2 text-green-600">
              <RotateCcw size={20} /> Cài đặt Game
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="flex items-center gap-2">
                <input 
                  type="checkbox"
                  checked={settings.streakBonus}
                  onChange={(e) => setSettings({...settings, streakBonus: e.target.checked})}
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                />
                <label className="text-sm text-gray-700">Điểm thưởng chuỗi thắng (Streak Bonus)</label>
              </div>
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox"
                  checked={settings.allowRetry}
                  onChange={(e) => setSettings({...settings, allowRetry: e.target.checked})}
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                />
                <label className="text-sm text-gray-700">Cho phép làm lại câu sai (Redemption)</label>
              </div>
              <div className="flex items-center gap-2 md:col-span-2 p-3 bg-green-50 rounded-lg border border-green-200">
                <input 
                  type="checkbox"
                  checked={settings.ecoMode}
                  onChange={(e) => setSettings({...settings, ecoMode: e.target.checked})}
                  className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-600"
                />
                <div>
                  <label className="text-sm font-medium text-green-800 block">Chế độ Tiết kiệm dữ liệu (Eco Mode)</label>
                  <p className="text-xs text-green-600">Chỉ đồng bộ kết quả khi học sinh nộp bài. Giảm thiểu lượt ghi Firebase, phù hợp cho bài tập về nhà.</p>
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="p-6 border-t bg-gray-50 flex justify-end gap-3 sticky bottom-0 rounded-b-xl">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Hủy bỏ
          </button>
          <button 
            onClick={handleCreateHomework}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? 'Đang tạo...' : 'Giao bài tập'}
          </button>
        </div>
      </div>
    </div>
  );
};
