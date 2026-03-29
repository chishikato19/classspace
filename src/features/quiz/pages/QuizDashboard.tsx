import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Quiz, Folder, GameSession } from '../../../types';
import { quizService } from '../services/quizService';
import { gameService } from '../../game/services/gameService';
import { auth } from '../../../config/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { HomeworkModal } from '../components/HomeworkModal';
import { Play, Clock, Trash2, Swords, Folder as FolderIcon, FolderPlus, ArrowLeft, MoveRight, Camera, Mic } from 'lucide-react';

export default function QuizDashboard() {
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activePlickersSession, setActivePlickersSession] = useState<GameSession | null>(null);
  
  // Modals State
  const [showHomeworkModal, setShowHomeworkModal] = useState(false);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [quizToMove, setQuizToMove] = useState<Quiz | null>(null);

  const loadData = async (userId: string) => {
    try {
      setLoading(true);
      setError(null);
      const [quizzesData, foldersData] = await Promise.all([
        quizService.getQuizzesByTeacher(userId),
        quizService.getFoldersByTeacher(userId)
      ]);
      setQuizzes(quizzesData);
      setFolders(foldersData);
    } catch (err: any) {
      console.error("Failed to load data", err);
      if (err.message?.includes('Quota exceeded')) {
        setError("Giới hạn truy cập hàng ngày (Quota) đã hết. Vui lòng quay lại vào ngày mai.");
      } else {
        setError("Không thể tải dữ liệu. Vui lòng thử lại sau.");
      }
    } finally {
      setLoading(false);
    }
  };

  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
        loadData(user.uid);
      } else {
        setUserId(null);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!userId) return;

    // Lắng nghe các phiên Plickers đang hoạt động
    const unsubscribeSessions = gameService.subscribeToActivePlickersSessions(userId, (activeSession) => {
      setActivePlickersSession(activeSession);
      
      // Tự động chuyển hướng nếu là thiết bị di động
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      if (isMobile && activeSession) {
        navigate(`/game/scanner/${activeSession.id}`);
      }
    });
    
    return () => unsubscribeSessions();
  }, [userId, navigate]);

  const handleDeleteQuiz = async (quizId: string) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa bộ câu hỏi này? Hành động này không thể hoàn tác.")) return;
    
    try {
      await quizService.deleteQuiz(quizId);
      setQuizzes(quizzes.filter(q => q.id !== quizId));
    } catch (error) {
      console.error("Failed to delete quiz", error);
      alert("Lỗi khi xóa bộ câu hỏi");
    }
  };

  const handleStartGame = (quizId: string) => {
    navigate(`/game/host/${quizId}`);
  };

  const handleAssignHomework = (quiz: Quiz) => {
    setSelectedQuiz(quiz);
    setShowHomeworkModal(true);
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim() || !auth.currentUser) return;
    try {
      const folderId = await quizService.createFolder({
        name: newFolderName.trim(),
        teacherId: auth.currentUser.uid,
        createdAt: Date.now()
      });
      setFolders([{
        id: folderId,
        name: newFolderName.trim(),
        teacherId: auth.currentUser.uid,
        createdAt: Date.now()
      }, ...folders]);
      setNewFolderName('');
      setShowCreateFolderModal(false);
    } catch (error) {
      console.error("Failed to create folder", error);
      alert("Lỗi khi tạo thư mục");
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa thư mục này? Các bộ câu hỏi bên trong sẽ được chuyển ra ngoài.")) return;
    try {
      // Move quizzes out of folder
      const quizzesInFolder = quizzes.filter(q => q.folderId === folderId);
      for (const q of quizzesInFolder) {
        await quizService.updateQuiz(q.id, { folderId: '' });
      }
      
      await quizService.deleteFolder(folderId);
      setFolders(folders.filter(f => f.id !== folderId));
      setQuizzes(quizzes.map(q => q.folderId === folderId ? { ...q, folderId: undefined } : q));
    } catch (error) {
      console.error("Failed to delete folder", error);
      alert("Lỗi khi xóa thư mục");
    }
  };

  const handleMoveQuiz = async (targetFolderId: string | null) => {
    if (!quizToMove) return;
    try {
      await quizService.updateQuiz(quizToMove.id, { folderId: targetFolderId || '' });
      setQuizzes(quizzes.map(q => q.id === quizToMove.id ? { ...q, folderId: targetFolderId || undefined } : q));
      setShowMoveModal(false);
      setQuizToMove(null);
    } catch (error) {
      console.error("Failed to move quiz", error);
      alert("Lỗi khi di chuyển bộ câu hỏi");
    }
  };

  const displayedQuizzes = quizzes.filter(q => currentFolderId ? q.folderId === currentFolderId : !q.folderId);
  const currentFolder = folders.find(f => f.id === currentFolderId);

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg relative mb-6" role="alert">
          <strong className="font-bold">Lỗi: </strong>
          <span className="block sm:inline">{error}</span>
          {error.includes('Quota') && (
            <p className="text-sm mt-1 opacity-80">Đây là giới hạn của gói Firebase miễn phí. Hệ thống sẽ tự động khôi phục vào ngày mai.</p>
          )}
        </div>
      )}

      {activePlickersSession && (
        <div className="bg-indigo-600 rounded-xl p-4 text-white shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg">
              <Camera className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold">Đang có phòng Plickers hoạt động</h3>
              <p className="text-indigo-100 text-sm">Bạn có muốn mở máy quét cho phòng này không?</p>
            </div>
          </div>
          <button 
            onClick={() => navigate(`/game/scanner/${activePlickersSession.id}`)}
            className="w-full sm:w-auto bg-white text-indigo-600 px-6 py-2 rounded-lg font-bold hover:bg-indigo-50 transition-colors shadow-sm"
          >
            Mở máy quét ngay
          </button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {currentFolderId && (
            <button 
              onClick={() => setCurrentFolderId(null)}
              className="p-2 rounded-full hover:bg-gray-200 text-gray-600"
            >
              <ArrowLeft size={24} />
            </button>
          )}
          <h1 className="text-2xl font-bold text-gray-900">
            {currentFolderId ? `Thư mục: ${currentFolder?.name}` : 'Thư viện câu hỏi của tôi'}
          </h1>
        </div>
        <div className="flex gap-2">
          {!currentFolderId && (
            <button 
              onClick={() => setShowCreateFolderModal(true)}
              className="rounded-md bg-white border border-gray-300 px-3.5 py-2.5 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 flex items-center gap-2"
            >
              <FolderPlus size={18} /> Tạo thư mục
            </button>
          )}
          <button 
            onClick={() => navigate(`/teacher/quiz/new${currentFolderId ? `?folderId=${currentFolderId}` : ''}`)}
            className="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            + Tạo bộ câu hỏi mới
          </button>
        </div>
      </div>
      
      {loading ? (
        <div className="text-center py-10">Đang tải...</div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {/* Folders (only show in root) */}
          {!currentFolderId && folders.map((folder) => (
            <div key={folder.id} className="flex flex-col overflow-hidden rounded-lg bg-indigo-50 shadow-sm border border-indigo-100 hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex-1 p-6 flex flex-col justify-between">
                <div className="flex items-center gap-4" onClick={() => setCurrentFolderId(folder.id)}>
                  <div className="p-3 bg-indigo-100 rounded-lg text-indigo-600">
                    <FolderIcon size={32} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-indigo-900">{folder.name}</h3>
                    <p className="text-sm text-indigo-600">{quizzes.filter(q => q.folderId === folder.id).length} bộ câu hỏi</p>
                  </div>
                </div>
                <div className="mt-4 flex justify-end">
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder.id); }}
                    className="p-1.5 rounded-md text-red-500 hover:bg-red-100"
                    title="Xóa thư mục"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {/* Quizzes */}
          {displayedQuizzes.map((quiz) => (
            <div key={quiz.id} className="flex flex-col overflow-hidden rounded-lg bg-white shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
              <div className="flex-1 p-6 flex flex-col justify-between">
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                      Sẵn sàng
                    </span>
                    <span className="text-sm text-gray-500">{quiz.questions.length} câu hỏi</span>
                  </div>
                  <div className="mt-2 block">
                    <p className="text-xl font-semibold text-gray-900">{quiz.title}</p>
                    <p className="mt-3 text-base text-gray-500 line-clamp-2">{quiz.description || 'Không có mô tả'}</p>
                  </div>
                </div>
                  <div className="mt-6 flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleStartGame(quiz.id)}
                        className="flex-1 rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 flex items-center justify-center gap-2"
                      >
                        <Play size={16} /> Thi Trực Tiếp
                      </button>
                      <button 
                        onClick={() => handleAssignHomework(quiz)}
                        className="flex-1 rounded-md bg-white border border-indigo-600 px-3 py-2 text-sm font-semibold text-indigo-600 shadow-sm hover:bg-indigo-50 flex items-center justify-center gap-2"
                      >
                        <Clock size={16} /> Giao Bài Tập
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => navigate(`/game/local-battle/${quiz.id}`)}
                        className="flex-1 rounded-md bg-yellow-500 px-3 py-2 text-sm font-semibold text-black shadow-sm hover:bg-yellow-400 flex items-center justify-center gap-2"
                      >
                        <Swords size={16} /> Đấu trường tốc độ
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => navigate(`/game/oral-quiz-setup/${quiz.id}`)}
                        className="flex-1 rounded-md bg-orange-500 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-orange-400 flex items-center justify-center gap-2"
                      >
                        <Mic size={16} /> Kiểm tra miệng
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => navigate(`/teacher/quiz/edit/${quiz.id}`)}
                        className="flex-1 rounded-md bg-gray-50 px-2.5 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 border border-gray-200"
                      >
                        Chỉnh sửa
                      </button>
                      <button 
                        onClick={() => { setQuizToMove(quiz); setShowMoveModal(true); }}
                        className="p-1.5 rounded-md bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200"
                        title="Di chuyển"
                      >
                        <MoveRight size={18} />
                      </button>
                      <button 
                        onClick={() => handleDeleteQuiz(quiz.id)}
                        className="p-1.5 rounded-md bg-red-50 text-red-600 hover:bg-red-100 border border-red-200"
                        title="Xóa bộ câu hỏi"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
              </div>
            </div>
          ))}
          {displayedQuizzes.length === 0 && (!currentFolderId ? folders.length === 0 : true) && (
            <div className="col-span-full text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <p className="text-gray-500">Chưa có nội dung nào. Hãy tạo mới ngay!</p>
            </div>
          )}
        </div>
      )}

      {/* Create Folder Modal */}
      {showCreateFolderModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-xl">
            <h2 className="text-xl font-bold mb-4">Tạo thư mục mới</h2>
            <input 
              type="text" 
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Tên thư mục..."
              className="w-full p-3 border border-gray-300 rounded-lg mb-6 focus:ring-2 focus:ring-indigo-500"
              autoFocus
            />
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setShowCreateFolderModal(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium"
              >
                Hủy
              </button>
              <button 
                onClick={handleCreateFolder}
                disabled={!newFolderName.trim()}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50"
              >
                Tạo mới
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Move Quiz Modal */}
      {showMoveModal && quizToMove && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-xl">
            <h2 className="text-xl font-bold mb-4">Di chuyển "{quizToMove.title}"</h2>
            <div className="space-y-2 max-h-60 overflow-y-auto mb-6">
              <button
                onClick={() => handleMoveQuiz(null)}
                className={`w-full text-left p-3 rounded-lg border ${!quizToMove.folderId ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:bg-gray-50'}`}
              >
                📁 Thư mục gốc
              </button>
              {folders.map(folder => (
                <button
                  key={folder.id}
                  onClick={() => handleMoveQuiz(folder.id)}
                  className={`w-full text-left p-3 rounded-lg border ${quizToMove.folderId === folder.id ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:bg-gray-50'}`}
                >
                  📁 {folder.name}
                </button>
              ))}
            </div>
            <div className="flex justify-end">
              <button 
                onClick={() => { setShowMoveModal(false); setQuizToMove(null); }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {showHomeworkModal && selectedQuiz && (
        <HomeworkModal 
          quizId={selectedQuiz.id}
          quizTitle={selectedQuiz.title}
          onClose={() => setShowHomeworkModal(false)}
        />
      )}
    </div>
  );
}
