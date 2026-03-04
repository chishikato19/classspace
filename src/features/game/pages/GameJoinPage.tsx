import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { ClassGroup, Student, AvatarConfig } from '../../../types';
import { adminService } from '../../admin/services/adminService';
import { gameService } from '../services/gameService';
import { DEFAULT_AVATAR_STYLE, AvatarStyle } from '../../../utils/avatarUtils';

export default function GameJoinPage() {
  const [step, setStep] = useState<'PIN' | 'CLASS' | 'STUDENT'>('PIN');
  const [pin, setPin] = useState('');
  const [sessionId, setSessionId] = useState('');
  
  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const session = await gameService.findSessionByPin(pin);
      if (session) {
        setSessionId(session.id);
        // Fetch classes for the next step
        const classList = await adminService.getAllClasses();
        setClasses(classList);
        setStep('CLASS');
      } else {
        setError('Không tìm thấy phòng chơi với mã PIN này.');
      }
    } catch (err) {
      console.error(err);
      setError('Lỗi kết nối. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleClassSelect = async (classId: string) => {
    setSelectedClassId(classId);
    setLoading(true);
    setError('');
    try {
      const studentList = await adminService.getStudentsByClass(classId);
      setStudents(studentList);
      setStep('STUDENT');
    } catch (err) {
      console.error(err);
      setError('Lỗi khi tải danh sách học sinh.');
    } finally {
      setLoading(false);
    }
  };

  const toggleStudentSelection = (studentId: string) => {
    setSelectedStudentIds(prev => 
      prev.includes(studentId) 
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const handleJoin = async () => {
    if (selectedStudentIds.length === 0) return;
    
    setLoading(true);
    try {
      const playerId = uuidv4();
      
      // Lấy tên các học sinh đã chọn để ghép thành tên hiển thị
      const selectedStudents = students.filter(s => selectedStudentIds.includes(s.id));
      const displayName = selectedStudents.map(s => s.name).join(', ');

      // Determine avatar config
      let avatarConfig: AvatarConfig;
      if (selectedStudents.length === 1 && selectedStudents[0].avatarConfig) {
        avatarConfig = selectedStudents[0].avatarConfig;
      } else {
        // Generate a default avatar for the group or if student has no avatar
        avatarConfig = {
          style: DEFAULT_AVATAR_STYLE as AvatarStyle,
          seed: displayName,
          backgroundColor: 'transparent'
        };
      }

      localStorage.setItem('currentPlayerId', playerId);
      localStorage.setItem('currentPlayerName', displayName);
      localStorage.setItem('currentPlayerAvatar', JSON.stringify(avatarConfig));

      await gameService.joinSession(sessionId, {
        id: playerId,
        name: displayName,
        studentIds: selectedStudentIds,
        score: 0,
        streak: 0,
        progress: 0,
        finished: false,
        answers: {},
        avatarConfig: avatarConfig
      });
      
      navigate(`/game/lobby/${sessionId}`);
    } catch (err) {
      console.error(err);
      setError('Không thể tham gia phòng. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-indigo-600 p-4">
      <div className="w-full max-w-md space-y-8 bg-white p-8 rounded-2xl shadow-2xl">
        <div className="text-center">
          <h1 className="text-4xl font-black tracking-tight text-indigo-600">CLASS VERSE</h1>
          <p className="mt-2 text-lg font-medium text-gray-600">
            {step === 'PIN' && 'Nhập mã PIN để tham gia'}
            {step === 'CLASS' && 'Chọn lớp của bạn'}
            {step === 'STUDENT' && 'Chọn tên của bạn (Có thể chọn nhiều)'}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm text-center">
            {error}
          </div>
        )}

        {step === 'PIN' && (
          <form className="mt-8 space-y-6" onSubmit={handlePinSubmit}>
            <div>
              <input
                type="text"
                required
                maxLength={6}
                className="block w-full rounded-lg border-2 border-gray-300 py-4 text-center text-3xl font-bold tracking-widest text-gray-900 placeholder:text-gray-300 focus:border-indigo-600 focus:ring-0 uppercase"
                placeholder="000000"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                disabled={loading}
              />
            </div>
            <button
              type="submit"
              disabled={loading || pin.length < 6}
              className="w-full rounded-lg bg-green-500 px-4 py-4 text-xl font-bold text-white shadow-lg hover:bg-green-600 focus:outline-none focus:ring-4 focus:ring-green-300 transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'ĐANG KIỂM TRA...' : 'TIẾP TỤC'}
            </button>
          </form>
        )}

        {step === 'CLASS' && (
          <div className="mt-8 space-y-4">
            {classes.length === 0 ? (
              <p className="text-center text-gray-500">Chưa có lớp học nào được tạo.</p>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {classes.map(cls => (
                  <button
                    key={cls.id}
                    onClick={() => handleClassSelect(cls.id)}
                    disabled={loading}
                    className="p-4 border-2 border-indigo-100 rounded-xl hover:border-indigo-500 hover:bg-indigo-50 font-bold text-indigo-900 transition-colors disabled:opacity-50"
                  >
                    {cls.name}
                  </button>
                ))}
              </div>
            )}
            <button
              onClick={() => setStep('PIN')}
              className="w-full text-center text-sm text-gray-500 hover:text-gray-700 mt-4"
            >
              Quay lại
            </button>
          </div>
        )}

        {step === 'STUDENT' && (
          <div className="mt-8 space-y-6">
            <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg p-2 space-y-2">
              {students.length === 0 ? (
                <p className="text-center text-gray-500 py-4">Lớp này chưa có học sinh.</p>
              ) : (
                students.map(student => {
                  const isSelected = selectedStudentIds.includes(student.id);
                  return (
                    <button
                      key={student.id}
                      onClick={() => toggleStudentSelection(student.id)}
                      className={`w-full text-left px-4 py-3 rounded-lg border transition-colors flex justify-between items-center ${
                        isSelected 
                          ? 'bg-indigo-50 border-indigo-500 text-indigo-700 font-bold' 
                          : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      <span>{student.name}</span>
                      {isSelected && (
                        <span className="h-5 w-5 bg-indigo-600 rounded-full flex items-center justify-center text-white text-xs">✓</span>
                      )}
                    </button>
                  );
                })
              )}
            </div>

            <button
              onClick={handleJoin}
              disabled={loading || selectedStudentIds.length === 0}
              className="w-full rounded-lg bg-indigo-600 px-4 py-4 text-xl font-bold text-white shadow-lg hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-300 transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'ĐANG VÀO...' : `THAM GIA (${selectedStudentIds.length})`}
            </button>
            <button
              onClick={() => setStep('CLASS')}
              className="w-full text-center text-sm text-gray-500 hover:text-gray-700"
            >
              Quay lại chọn lớp
            </button>
          </div>
        )}
      </div>
      
      {/* Teacher Login Link */}
      <div className="mt-8 text-center flex flex-col gap-2">
        <button
          onClick={() => navigate('/login')}
          className="text-white/80 hover:text-white text-sm font-medium transition-colors"
        >
          Bạn là giáo viên? Đăng nhập tại đây
        </button>
        <button
          onClick={() => {
            const studentId = prompt('Nhập ID học sinh của bạn để vào cửa hàng:');
            if (studentId) navigate(`/student/shop/${studentId}`);
          }}
          className="text-yellow-300 hover:text-yellow-100 text-sm font-bold transition-colors"
        >
          🛍️ Vào Cửa Hàng Đổi Quà
        </button>
      </div>
    </div>
  );
}
