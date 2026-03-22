import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from '../../../config/firebase';
import { GameSession, Quiz } from '../../../types';
import { quizService } from '../../quiz/services/quizService';
import { gameService } from '../../game/services/gameService';
import { Clock, Users, ChevronRight, BarChart2, Activity, Trash2, StopCircle, Link as LinkIcon } from 'lucide-react';

export default function ReportsDashboard() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<(GameSession & { quizTitle?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    if (!auth.currentUser) return;
    
    try {
      setLoading(true);
      setError(null);
      // Lấy danh sách các session do giáo viên này tạo
      const sessionData = await gameService.getSessionsByTeacher(auth.currentUser.uid);
      
      // Tối ưu hóa: Lấy tất cả quiz của giáo viên một lần duy nhất thay vì gọi N lần getQuizById
      const teacherQuizzes = await quizService.getQuizzesByTeacher(auth.currentUser.uid);
      const quizMap = new Map(teacherQuizzes.map(q => [q.id, q]));
      
      const sessionsWithQuiz = sessionData.map(session => {
        const quiz = session.quizId ? quizMap.get(session.quizId) : null;
        const quizTitle = quiz?.title || 'Bộ câu hỏi không xác định';
        // Nếu session có title riêng thì dùng, không thì dùng title của quiz
        return { ...session, quizTitle: session.title || quizTitle };
      });
      
      setSessions(sessionsWithQuiz);
    } catch (err: any) {
      console.error("Error fetching sessions:", err);
      if (err.message?.includes('Quota exceeded')) {
        setError("Giới hạn truy cập hàng ngày (Quota) đã hết. Vui lòng quay lại vào ngày mai.");
      } else {
        setError("Không thể tải dữ liệu. Vui lòng thử lại sau.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleViewResults = (sessionId: string) => {
    navigate(`/game/results/${sessionId}`);
  };

  const handleMonitorHomework = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    navigate(`/game/dashboard/${sessionId}`);
  };

  const handleDeleteSession = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    if (window.confirm('Bạn có chắc chắn muốn xóa lượt thi này? Hành động này không thể hoàn tác.')) {
      try {
        await gameService.deleteSession(sessionId);
        setSessions(prev => prev.filter(s => s.id !== sessionId));
      } catch (error) {
        console.error("Failed to delete session:", error);
        alert("Không thể xóa lượt thi. Vui lòng thử lại.");
      }
    }
  };

  const handleEndSession = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    if (window.confirm('Bạn có chắc chắn muốn kết thúc lượt thi này ngay lập tức?')) {
      try {
        await gameService.endGame(sessionId);
        setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, status: 'FINISHED' } : s));
      } catch (error) {
        console.error("Failed to end session:", error);
        alert("Không thể kết thúc lượt thi. Vui lòng thử lại.");
      }
    }
  };

  const handleCopyLink = (e: React.MouseEvent, pin: string) => {
    e.stopPropagation();
    const link = `${window.location.origin}/#/join?pin=${pin}`;
    navigator.clipboard.writeText(link).then(() => {
      alert('Đã sao chép đường dẫn bài tập!');
    }).catch(err => {
      console.error('Failed to copy link: ', err);
      alert('Không thể sao chép đường dẫn. Vui lòng thử lại.');
    });
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

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg relative mb-6" role="alert">
          <strong className="font-bold">Lỗi: </strong>
          <span className="block sm:inline">{error}</span>
          {error.includes('Quota') && (
            <p className="text-sm mt-1 opacity-80">Đây là giới hạn của gói Firebase miễn phí. Hệ thống sẽ tự động khôi phục vào ngày mai.</p>
          )}
        </div>
      )}

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
                  {session.mode === 'HOMEWORK' && session.status !== 'FINISHED' && (
                    <button
                      onClick={(e) => handleCopyLink(e, session.pin)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
                      title="Sao chép đường dẫn"
                    >
                      <LinkIcon className="w-4 h-4" />
                      Copy Link
                    </button>
                  )}

                  {session.mode === 'HOMEWORK' && (
                    <button
                      onClick={(e) => handleMonitorHomework(e, session.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-sm font-medium hover:bg-indigo-100 transition-colors"
                    >
                      <Activity className="w-4 h-4" />
                      Theo dõi
                    </button>
                  )}

                  {session.status !== 'FINISHED' && (
                    <button
                      onClick={(e) => handleEndSession(e, session.id)}
                      className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                      title="Kết thúc lượt thi"
                    >
                      <StopCircle className="w-5 h-5" />
                    </button>
                  )}
                  
                  <button
                    onClick={(e) => handleDeleteSession(e, session.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Xóa lượt thi"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>

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
