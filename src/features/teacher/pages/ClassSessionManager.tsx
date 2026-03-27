import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../../../config/firebase';
import { classService } from '../../random-selector/services/classService';
import { classSessionService } from '../../../services/classSessionService';
import { ClassGroup, ClassSession } from '../../../types';
import { Play, Clock, CheckCircle, Users } from 'lucide-react';

export default function ClassSessionManager() {
  const navigate = useNavigate();
  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [activeSessions, setActiveSessions] = useState<Record<string, ClassSession>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      loadData(user.uid);
    } else {
      setLoading(false);
    }
  }, []);

  const loadData = async (userId: string) => {
    try {
      const classList = await classService.getClassesByTeacher(userId);
      setClasses(classList);

      const sessions: Record<string, ClassSession> = {};
      for (const cls of classList) {
        const activeSession = await classSessionService.getActiveSessionForClass(cls.id);
        if (activeSession) {
          sessions[cls.id] = activeSession;
        }
      }
      setActiveSessions(sessions);
    } catch (error) {
      console.error('Error loading class sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartSession = async (classId: string) => {
    const user = auth.currentUser;
    if (!user) return;
    try {
      const sessionId = await classSessionService.createSession(classId, user.uid);
      navigate(`/teacher/class-session/${sessionId}`);
    } catch (error) {
      console.error('Error starting session:', error);
      alert('Không thể bắt đầu tiết học. Vui lòng thử lại.');
    }
  };

  const handleResumeSession = (sessionId: string) => {
    navigate(`/teacher/class-session/${sessionId}`);
  };

  if (loading) {
    return <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Quản lý Tiết học</h2>
        <p className="text-gray-500">Bắt đầu một tiết học để theo dõi điểm số và thi đấu</p>
      </div>

      {classes.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <Users className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Chưa có lớp học</h3>
          <p className="mt-1 text-sm text-gray-500">Vui lòng tạo lớp học trong phần Quản lý nhóm trước.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {classes.map((cls) => {
            const activeSession = activeSessions[cls.id];
            return (
              <div key={cls.id} className="bg-white overflow-hidden shadow rounded-lg border border-gray-200">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <Users className="h-6 w-6 text-gray-400" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Lớp học</dt>
                        <dd className="text-lg font-medium text-gray-900">{cls.name}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-5 py-3">
                  {activeSession ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-sm text-green-600">
                        <Clock className="h-4 w-4 mr-1" />
                        Đang diễn ra
                      </div>
                      <button
                        onClick={() => handleResumeSession(activeSession.id)}
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                      >
                        Tiếp tục
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleStartSession(cls.id)}
                      className="w-full flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Bắt đầu tiết học
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
