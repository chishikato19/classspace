import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { ClassGroup, Student, AvatarConfig, GameSession } from '../../../types';
import { adminService } from '../../admin/services/adminService';
import { gameService } from '../services/gameService';
import { DEFAULT_AVATAR_STYLE, AvatarStyle } from '../../../utils/avatarUtils';

export default function GameJoinPage() {
  const [step, setStep] = useState<'PIN' | 'CLASS' | 'STUDENT' | 'PASSCODE' | 'NAME_INPUT'>('PIN');
  const [pin, setPin] = useState('');
  const [session, setSession] = useState<GameSession | null>(null);
  
  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [passcode, setPasscode] = useState('');
  const [playerName, setPlayerName] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const foundSession = await gameService.findSessionByPin(pin);
      if (foundSession) {
        setSession(foundSession);
        
        // Prevent joining PLICKERS mode via web
        if (foundSession.mode === 'PLICKERS') {
          setError('Chế độ này không hỗ trợ tham gia qua điện thoại. Vui lòng sử dụng thẻ Plickers.');
          setLoading(false);
          return;
        }

        // Check deadline for Homework
        if (foundSession.mode === 'HOMEWORK' && foundSession.homeworkConfig?.deadline) {
          if (Date.now() > foundSession.homeworkConfig.deadline) {
            setError('Bài tập này đã hết hạn nộp.');
            setLoading(false);
            return;
          }
        }

        // Determine next step based on session configuration
        if (foundSession.nameInputType === 'CLASS_LIST') {
          if (foundSession.selectedClassId) {
             const studentList = await adminService.getStudentsByClass(foundSession.selectedClassId);
             setStudents(studentList);
             setStep('STUDENT');
          } else if (foundSession.homeworkConfig?.classId) {
             const studentList = await adminService.getStudentsByClass(foundSession.homeworkConfig.classId);
             setStudents(studentList);
             setStep('STUDENT');
          } else {
             // Fallback: Let student select class if no class is enforced
             // Only fetch classes belonging to the host
             const classList = await adminService.getClassesByTeacher(foundSession.hostId);
             setClasses(classList);
             setStep('CLASS');
          }
        } else {
          // MANUAL input
          setStep('NAME_INPUT');
        }
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
    if (session?.isGroupPlay) {
      setSelectedStudentIds(prev => 
        prev.includes(studentId) 
          ? prev.filter(id => id !== studentId)
          : [...prev, studentId]
      );
    } else {
      setSelectedStudentIds(prev => 
        prev.includes(studentId) ? [] : [studentId]
      );
    }
  };

  const handleStudentSubmit = () => {
    if (selectedStudentIds.length === 0) return;

    if (session?.isGroupPlay) {
      // If group play, we need a group name
      setStep('NAME_INPUT');
    } else {
      // Individual
      if (session?.settings?.requirePasscode) {
        setStep('PASSCODE');
      } else {
        handleJoin();
      }
    }
  };

  const handlePasscodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Verify passcode for each selected student
    // For simplicity, if multiple students are selected (Team mode), we might require all passcodes or just one.
    // But usually Homework is individual.
    // If multiple students, let's assume we check the first one or require all.
    // Let's implement individual check for now.
    
    try {
      const selectedStudents = students.filter(s => selectedStudentIds.includes(s.id));
      
      for (const student of selectedStudents) {
        if (student.passcode && student.passcode !== passcode) {
          throw new Error(`Mật khẩu không đúng cho học sinh ${student.name}`);
        }
        // If student has no passcode set, maybe allow? Or fail?
        // Let's assume if requirePasscode is ON, student MUST have a passcode.
        if (!student.passcode) {
           // If no passcode set in DB, maybe allow any passcode or specific default?
           // For now, fail if not set.
           // throw new Error(`Học sinh ${student.name} chưa được cấp mật khẩu.`);
        }
      }
      
      await handleJoin();
    } catch (err: any) {
      setError(err.message || 'Mật khẩu không đúng.');
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (step === 'STUDENT' && selectedStudentIds.length === 0) return;
    if (step === 'NAME_INPUT' && !playerName.trim()) return;
    if (!session) return;
    
    setLoading(true);
    try {
      let displayName = '';
      let playerId = uuidv4();
      let avatarConfig: AvatarConfig;
      let studentIds: string[] = [];

      if (step === 'NAME_INPUT') {
        displayName = playerName;
        
        // If coming from Class List selection in Group Mode
        if (session.nameInputType === 'CLASS_LIST' && session.isGroupPlay) {
           studentIds = selectedStudentIds;
        }

        avatarConfig = {
          style: DEFAULT_AVATAR_STYLE as AvatarStyle,
          seed: displayName,
          backgroundColor: 'transparent'
        };
      } else {
        // STUDENT selection (Individual)
        const selectedStudents = students.filter(s => selectedStudentIds.includes(s.id));
        // For individual mode, we take the first student
        if (selectedStudents.length > 0) {
           displayName = selectedStudents[0].name;
           studentIds = [selectedStudents[0].id];
           playerId = selectedStudents[0].id;
           
           if (selectedStudents[0].avatarConfig) {
              avatarConfig = selectedStudents[0].avatarConfig;
           } else {
              avatarConfig = { style: DEFAULT_AVATAR_STYLE as AvatarStyle, seed: displayName, backgroundColor: 'transparent' };
           }
        } else {
           // Should not happen
           throw new Error('Chưa chọn học sinh');
        }
      }

      sessionStorage.setItem('currentPlayerId', playerId);
      sessionStorage.setItem('currentPlayerName', displayName);
      sessionStorage.setItem('currentPlayerAvatar', JSON.stringify(avatarConfig));

      await gameService.joinSession(session.id, {
        id: playerId,
        name: displayName,
        studentIds: studentIds,
        score: 0,
        streak: 0,
        progress: 0,
        finished: false,
        answers: {},
        avatarConfig: avatarConfig
      });
      
      navigate(`/game/lobby/${session.id}`);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Không thể tham gia phòng. Vui lòng thử lại.');
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
            {step === 'STUDENT' && (session?.isGroupPlay ? 'Chọn thành viên nhóm' : 'Chọn tên của bạn')}
            {step === 'PASSCODE' && 'Nhập mật khẩu cá nhân'}
            {step === 'NAME_INPUT' && (session?.isGroupPlay ? 'Đặt tên nhóm' : 'Nhập tên hiển thị')}
          </p>
          {session?.mode === 'HOMEWORK' && (
             <div className="mt-2 text-sm text-orange-600 bg-orange-50 py-1 px-2 rounded-full inline-block">
               📚 Bài tập về nhà
             </div>
          )}
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
            
            <div className="border-t border-gray-200 pt-4 mt-4">
              <button
                onClick={() => setStep('NAME_INPUT')}
                className="w-full text-center text-indigo-600 font-bold hover:text-indigo-800 transition-colors"
              >
                Tham gia với tên tự do
              </button>
            </div>
          </div>
        )}

        {step === 'NAME_INPUT' && (
          <div className="mt-8 space-y-6">
            <div>
              <label htmlFor="playerName" className="block text-sm font-medium text-gray-700 mb-2">
                {session?.isGroupPlay ? 'Nhập tên nhóm của bạn' : 'Nhập tên hiển thị của bạn'}
              </label>
              <input
                type="text"
                id="playerName"
                required
                className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-3 border"
                placeholder={session?.isGroupPlay ? "Ví dụ: Nhóm Siêu Nhân" : "Ví dụ: Nguyễn Văn A"}
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                disabled={loading}
              />
            </div>
            <button
              onClick={handleJoin}
              disabled={loading || !playerName.trim()}
              className="w-full rounded-lg bg-indigo-600 px-4 py-4 text-xl font-bold text-white shadow-lg hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-300 transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'ĐANG XỬ LÝ...' : 'VÀO THI'}
            </button>
            {session?.nameInputType === 'CLASS_LIST' && (
              <button
                onClick={() => setStep('STUDENT')}
                className="w-full text-center text-sm text-gray-500 hover:text-gray-700"
              >
                Quay lại chọn thành viên
              </button>
            )}
            {session?.nameInputType !== 'CLASS_LIST' && (
               <button
                onClick={() => setStep('PIN')}
                className="w-full text-center text-sm text-gray-500 hover:text-gray-700"
              >
                Quay lại
              </button>
            )}
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
              onClick={handleStudentSubmit}
              disabled={loading || selectedStudentIds.length === 0}
              className="w-full rounded-lg bg-indigo-600 px-4 py-4 text-xl font-bold text-white shadow-lg hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-300 transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'ĐANG XỬ LÝ...' : `TIẾP TỤC`}
            </button>
            <button
              onClick={() => setStep('CLASS')}
              className="w-full text-center text-sm text-gray-500 hover:text-gray-700"
            >
              Quay lại chọn lớp
            </button>
          </div>
        )}

        {step === 'PASSCODE' && (
          <form className="mt-8 space-y-6" onSubmit={handlePasscodeSubmit}>
            <div>
              <p className="text-sm text-gray-500 mb-2 text-center">
                Vui lòng nhập mật khẩu cá nhân của bạn
              </p>
              <input
                type="password"
                required
                className="block w-full rounded-lg border-2 border-gray-300 py-3 text-center text-2xl font-bold tracking-widest text-gray-900 placeholder:text-gray-300 focus:border-indigo-600 focus:ring-0"
                placeholder="••••••"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                disabled={loading}
              />
            </div>
            <button
              type="submit"
              disabled={loading || !passcode}
              className="w-full rounded-lg bg-indigo-600 px-4 py-4 text-xl font-bold text-white shadow-lg hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-300 transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'ĐANG KIỂM TRA...' : 'VÀO THI'}
            </button>
            <button
              onClick={() => setStep('STUDENT')}
              className="w-full text-center text-sm text-gray-500 hover:text-gray-700"
            >
              Quay lại chọn tên
            </button>
          </form>
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
