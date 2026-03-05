import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from '../../../config/firebase';
import { GameSession, Quiz } from '../../../types';
import { quizService } from '../../quiz/services/quizService';
import { Clock, Users, ChevronRight, BarChart2, Activity } from 'lucide-react';

export default function ReportsDashboard() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<(GameSession & { quizTitle?: string })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSessions = async () => {
      if (!auth.currentUser) return;
      
      try {
        // Lấy danh sách các session do giáo viên này tạo
        const q = query(
          collection(db, 'sessions'),
          where('hostId', '==', auth.currentUser.uid)
        );
        
        const snapshot = await getDocs(q);
        const sessionData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GameSession));
        
        // Sắp xếp trên client để tránh lỗi thiếu index trên Firebase
        sessionData.sort((a, b) => b.createdAt - a.createdAt);
        
        // Lấy thông tin quiz (tiêu đề) cho mỗi session
        const sessionsWithQuiz = await Promise.all(sessionData.map(async (session) => {
          if (session.quizId) {
            const quiz = await quizService.getQuizById(session.quizId);
            return { ...session, quizTitle: quiz?.title || 'Bộ câu hỏi không xác định' };
          }
          return { ...session, quizTitle: 'Không có bộ câu hỏi' };
        }));
        
        setSessions(sessionsWithQuiz);
      } catch (error) {
        console.error("Error fetching sessions:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSessions();
  }, []);

  const handleViewResults = (sessionId: string) => {
    navigate(`/game/results/${sessionId}`);
  };

  const handleMonitorHomework = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    navigate(`/game/dashboard/${sessionId}`);
  };

  if (loading) {
    return <div className="flex h-64 items-center justify-center">Đang tải dữ liệu...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <BarChart2 className="w-6 h-6 text-indigo-600" />
          Báo cáo & Lịch sử thi
        </h1>
      </div>

      {sessions.length === 0 ? (
        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <BarChart2 className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Chưa có dữ liệu</h3>
          <p className="text-gray-500 max-w-md mx-auto">
            Bạn chưa tổ chức lượt thi nào. Hãy quay lại Thư viện câu hỏi và bắt đầu một lượt thi mới để xem báo cáo tại đây.
          </p>
          <button
            onClick={() => navigate('/teacher/dashboard')}
            className="mt-6 bg-indigo-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
          >
            Đến Thư viện câu hỏi
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <ul className="divide-y divide-gray-200">
            {sessions.map((session) => (
              <li 
                key={session.id}
                onClick={() => handleViewResults(session.id)}
                className="hover:bg-gray-50 cursor-pointer transition-colors p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-lg font-bold text-gray-900">{session.quizTitle}</h3>
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        session.status === 'FINISHED' ? 'bg-green-100 text-green-800' :
                        session.status === 'PLAYING' ? 'bg-blue-100 text-blue-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {session.status === 'FINISHED' ? 'Đã kết thúc' : session.status === 'PLAYING' ? 'Đang diễn ra' : 'Đang chờ'}
                      </span>
                      {session.mode === 'HOMEWORK' && (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          BTVN
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6 text-sm text-gray-500 mt-2">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4" />
                      {new Date(session.createdAt).toLocaleString('vi-VN')}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Users className="w-4 h-4" />
                      {session.players?.length || 0} người chơi
                    </div>
                    <div className="flex items-center gap-1.5 font-mono bg-gray-100 px-2 py-0.5 rounded text-gray-600">
                      PIN: {session.pin}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  {session.mode === 'HOMEWORK' && (
                    <button
                      onClick={(e) => handleMonitorHomework(e, session.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-sm font-medium hover:bg-indigo-100 transition-colors"
                    >
                      <Activity className="w-4 h-4" />
                      Theo dõi
                    </button>
                  )}
                  <div className="flex items-center text-gray-400 font-medium group">
                    <span className="hidden sm:inline">Xem kết quả</span>
                    <ChevronRight className="w-5 h-5 ml-1 transform group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
