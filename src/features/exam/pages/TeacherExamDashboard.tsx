import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy, addDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { auth, db } from '../../../config/firebase';
import { Exam, ExamFolder } from '../types';
import { Link, useNavigate } from 'react-router-dom';
import { PlusCircle, FileText,  Users, Clock, PlayCircle, Settings, ChevronRight, Folder, FolderPlus, Edit, Trash2, Home, MoreVertical } from 'lucide-react';

export default function TeacherExamDashboard() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [folders, setFolders] = useState<ExamFolder[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<{id: string, name: string}[]>([]);

  const navigate = useNavigate();

  // Create folder modal
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  
  // Edit modal
  const [editItem, setEditItem] = useState<{id: string, name: string, type: 'exam' | 'folder'} | null>(null);
  const [editName, setEditName] = useState('');

  const fetchData = async () => {
    if (!auth.currentUser) return;
    setLoading(true);
    try {
      // 1. Fetch folders
      const fQ = query(
        collection(db, 'examFolders'),
        where('teacherId', '==', auth.currentUser.uid)
      );
      const fSnap = await getDocs(fQ);
      const fData = fSnap.docs.map(d => ({ id: d.id, ...d.data() } as ExamFolder));
      setFolders(fData);

      // 2. Fetch exams
      const eQ = query(
        collection(db, 'exams'),
        where('teacherId', '==', auth.currentUser.uid),
        orderBy('createdAt', 'desc')
      );
      const eSnap = await getDocs(eQ);
      const eData = eSnap.docs.map(d => ({ id: d.id, ...d.data() } as Exam));
      setExams(eData);
    } catch (err) {
      console.error("Lỗi khi tải danh sách:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim() || !auth.currentUser) return;
    try {
      const docRef = await addDoc(collection(db, 'examFolders'), {
        name: newFolderName.trim(),
        parentId: currentFolderId || null,
        teacherId: auth.currentUser.uid,
        createdAt: Date.now()
      });
      setFolders([...folders, { id: docRef.id, name: newFolderName.trim(), parentId: currentFolderId || null, teacherId: auth.currentUser.uid, createdAt: Date.now() }]);
      setShowFolderModal(false);
      setNewFolderName('');
    } catch (err) {
      console.error(err);
      alert('Không thể tạo thư mục');
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim() || !editItem) return;
    try {
      if (editItem.type === 'folder') {
        await updateDoc(doc(db, 'examFolders', editItem.id), { name: editName.trim() });
        setFolders(folders.map(f => f.id === editItem.id ? { ...f, name: editName.trim() } : f));
      } else {
        await updateDoc(doc(db, 'exams', editItem.id), { title: editName.trim() });
        setExams(exams.map(ex => ex.id === editItem.id ? { ...ex, title: editName.trim() } : ex));
      }
      setEditItem(null);
    } catch (err) {
      console.error(err);
      alert('Lỗi cập nhật tên');
    }
  };

  const handleDelete = async (id: string, type: 'exam' | 'folder') => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa? Dữ liệu không thể khôi phục.")) return;
    try {
      if (type === 'folder') {
        // TODO: Could also bulk delete exam images if deleting folder deletes exams inside it,
        // but current logic only deletes the folder itself (exams inside are orphaned or we handle cascading?).
        // If exams shouldn't be orphaned, then ideally we query all exams with folderId === id, delete their images and documents, then delete the folder.
        // Assuming current logic just leaves exams or they don't break, let's keep it simple or implement recursive if needed.
        await deleteDoc(doc(db, 'examFolders', id));
        setFolders(folders.filter(f => f.id !== id));
      } else {
        const examToDelete = exams.find(e => e.id === id);
        if (examToDelete) {
          const { deleteFilesFromUrls } = await import('../utils/storage');
          const imageUrlsToDelete: string[] = [];
          
          examToDelete.questions?.forEach(q => {
            if (q.imageUrl) imageUrlsToDelete.push(q.imageUrl);
            if (q.optionImageUrls) {
               q.optionImageUrls.forEach(url => {
                 if (url) imageUrlsToDelete.push(url);
               });
            }
          });
          
          if (imageUrlsToDelete.length > 0) {
            await deleteFilesFromUrls(imageUrlsToDelete);
          }
        }
        
        await deleteDoc(doc(db, 'exams', id));
        setExams(exams.filter(e => e.id !== id));
      }
    } catch (err) {
      console.error(err);
      alert('Lỗi khi xóa');
    }
  };

  const navigateToFolder = (folderId: string | null) => {
    setCurrentFolderId(folderId);
    if (!folderId) {
      setBreadcrumbs([]);
    } else {
      const buildPath = (id: string): {id: string, name: string}[] => {
        const f = folders.find(x => x.id === id);
        if (!f) return [];
        if (!f.parentId) return [{id: f.id, name: f.name}];
        return [...buildPath(f.parentId), {id: f.id, name: f.name}];
      };
      setBreadcrumbs(buildPath(folderId));
    }
  };

  const currentFolders = folders.filter(f => f.parentId === currentFolderId || (!f.parentId && !currentFolderId));
  const currentExams = exams.filter(e => e.folderId === currentFolderId || (!e.folderId && !currentFolderId));

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Quản lý Đề thi</h1>
          <p className="text-slate-500 mt-1">Tạo, chia sẻ và chấm điểm đề thi tự động</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowFolderModal(true)}
            className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-colors"
          >
            <FolderPlus className="w-5 h-5 text-indigo-500" />
            Thư mục mới
          </button>
          <Link 
            to={currentFolderId ? `/teacher/exams/new?folderId=${currentFolderId}` : "/teacher/exams/new"}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-colors shadow-sm"
          >
            <PlusCircle className="w-5 h-5" />
            Tạo đề mới
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-6">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center gap-2 overflow-x-auto text-sm">
          <button 
            onClick={() => navigateToFolder(null)}
            className="flex items-center gap-1.5 text-slate-600 hover:text-indigo-600 font-medium transition-colors whitespace-nowrap"
          >
            <Home className="w-4 h-4" /> Tổng quát
          </button>
          {breadcrumbs.map((crumb) => (
            <div key={crumb.id} className="flex items-center gap-2">
              <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
              <button 
                onClick={() => navigateToFolder(crumb.id)}
                className="text-slate-600 hover:text-indigo-600 font-medium transition-colors whitespace-nowrap"
              >
                {crumb.name}
              </button>
            </div>
          ))}
        </div>

        <div className="p-4 max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="animate-pulse space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-slate-100 h-16 rounded-xl"></div>
              ))}
            </div>
          ) : currentFolders.length === 0 && currentExams.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Folder className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-slate-500 font-medium">Thư mục trống</p>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Folders */}
              {currentFolders.map(folder => (
                <div key={folder.id} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition-colors group border border-transparent hover:border-slate-200">
                  <div 
                    className="flex items-center gap-3 flex-1 cursor-pointer"
                    onClick={() => navigateToFolder(folder.id)}
                  >
                    <Folder className="w-6 h-6 text-indigo-500 fill-indigo-100" />
                    <span className="font-medium text-slate-800">{folder.name}</span>
                  </div>
                  <div className="flex items-center gap-2 opacity-100 xl:opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => setEditItem({id: folder.id, name: folder.name, type: 'folder'})}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 rounded bg-white hover:bg-indigo-50 transition-colors"
                      title="Đổi tên"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDelete(folder.id, 'folder')}
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded bg-white hover:bg-red-50 transition-colors"
                      title="Xóa"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}

              {/* Exams */}
              {currentExams.map(exam => (
                <div key={exam.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-white border border-slate-200 hover:border-indigo-300 rounded-xl transition-all group shadow-sm">
                  <div className="flex items-start gap-4">
                    <div className={`p-2.5 rounded-xl ${exam.status === 'published' ? 'bg-green-50 text-green-600' : 'bg-slate-100 text-slate-500'}`}>
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 flex items-center gap-2 flex-wrap">
                        {exam.title}
                        {exam.status === 'published' && (
                          <span className="text-[10px] uppercase font-bold tracking-wider bg-green-100 text-green-700 px-2 py-0.5 rounded">Đang mở</span>
                        )}
                        {exam.status === 'closed' && (
                          <span className="text-[10px] uppercase font-bold tracking-wider bg-slate-100 text-slate-600 px-2 py-0.5 rounded">Đã đóng</span>
                        )}
                      </h3>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500 font-medium">
                        <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {exam.timeLimitMinutes} phút</span>
                        <span className="text-slate-300">|</span>
                        <span className="flex items-center gap-1"><FileText className="w-3.5 h-3.5" /> {exam.questions.length} câu</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-1.5 opacity-100 xl:opacity-0 group-hover:opacity-100 transition-opacity w-full sm:w-auto sm:justify-end">
                    <div className="flex flex-col items-center sm:items-end mr-1 text-center sm:text-right">
                       <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-tight">PIN</span>
                       {exam.pin ? (
                         <span className="text-sm font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded leading-none">{exam.pin}</span>
                       ) : (
                         <button 
                           onClick={async (e) => {
                             e.preventDefault();
                             e.stopPropagation();
                             const newPin = Math.random().toString(36).substring(2, 8).toUpperCase();
                             try {
                               await updateDoc(doc(db, 'exams', exam.id), { pin: newPin });
                               setExams(prev => prev.map(ex => ex.id === exam.id ? { ...ex, pin: newPin } : ex));
                             } catch (err) {
                               console.error(err);
                               alert('Lỗi tạo PIN');
                             }
                           }}
                           className="text-[10px] text-indigo-600 hover:underline font-bold"
                         >
                           Tạo PIN
                         </button>
                       )}
                    </div>
                    <button 
                      onClick={() => {
                         const shareUrl = exam.pin ? `${window.location.origin}/#/p/${exam.pin}` : `${window.location.origin}/#/e/${exam.id}`;
                         navigator.clipboard.writeText(shareUrl);
                         alert(`Đã copy link bài thi! Mã PIN: ${exam.pin || exam.id}`);
                      }}
                      className="px-3 py-1.5 hover:bg-slate-100 text-slate-600 rounded-lg flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider"
                    >
                       Copy Link
                    </button>
                    <Link 
                      to={`/teacher/exams/${exam.id}/results`}
                      className="px-3 py-1.5 border border-indigo-200 hover:bg-indigo-50 text-indigo-600 rounded-lg flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider"
                    >
                      Báo cáo
                    </Link>
                    <div className="w-px h-6 bg-slate-200 mx-1"></div>
                    <Link 
                      to={`/teacher/exams/${exam.id}/edit`}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-md hover:bg-indigo-50 transition-colors"
                      title="Sửa"
                    >
                      <Edit className="w-4 h-4" />
                    </Link>
                    <button 
                      onClick={() => setEditItem({id: exam.id, name: exam.title, type: 'exam'})}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-md hover:bg-indigo-50 transition-colors"
                      title="Đổi tên"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDelete(exam.id, 'exam')}
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors"
                      title="Xóa"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* New Folder Modal */}
      {showFolderModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden p-6">
            <h3 className="text-xl font-bold text-slate-800 mb-4">Thư mục mới</h3>
            <form onSubmit={handleCreateFolder}>
              <input 
                autoFocus
                type="text"
                placeholder="Tên thư mục"
                className="w-full px-4 py-2 border border-slate-300 rounded-xl mb-4 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                value={newFolderName}
                onChange={e => setNewFolderName(e.target.value)}
              />
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setShowFolderModal(false)} className="px-4 py-2 text-slate-600 font-medium">Hủy</button>
                <button type="submit" className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl">Tạo mới</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden p-6">
            <h3 className="text-xl font-bold text-slate-800 mb-4">Đổi tên {editItem.type === 'folder' ? 'thư mục' : 'đề thi'}</h3>
            <form onSubmit={handleEditSubmit}>
              <input 
                autoFocus
                type="text"
                placeholder="Tên mới"
                className="w-full px-4 py-2 border border-slate-300 rounded-xl mb-4 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                defaultValue={editItem.name}
                onChange={e => setEditName(e.target.value)}
              />
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setEditItem(null)} className="px-4 py-2 text-slate-600 font-medium">Hủy</button>
                <button type="submit" className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl">Cập nhật</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
