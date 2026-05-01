import { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, auth, storage } from '../../../config/firebase';
import { Exam, ExamQuestion } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { obfuscateAnswer, deobfuscateAnswer } from '../utils/obfuscator';
import { Pickaxe, Save, Upload, FileText, PlusCircle, CheckSquare, ImagePlus, X, Loader2, Info, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import { classService, ClassData } from '../../random-selector/services/classService';
import ReactMarkdown from 'react-markdown';
import { QuestionEditorCard, EditorQuestionData } from '../components/QuestionEditorCard';

export default function ExamEditor() {
  const navigate = useNavigate();
  const { examId: editExamId } = useParams();
  const [searchParams] = useSearchParams();
  const folderId = searchParams.get('folderId');

  const [title, setTitle] = useState('');
  const [timeLimit, setTimeLimit] = useState(45);
  const [allowStudentInputName, setAllowStudentInputName] = useState(true);
  const [allowedStudentNamesText, setAllowedStudentNamesText] = useState('');
  const [requireClassInput, setRequireClassInput] = useState(false);
  const [teacherClasses, setTeacherClasses] = useState<ClassData[]>([]);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [existingData, setExistingData] = useState<Partial<Exam>>({});

  const [questions, setQuestions] = useState<EditorQuestionData[]>([
    { text: 'Thủ đô của Việt Nam là gì?', options: ['Hồ Chí Minh', 'Đà Nẵng', 'Hà Nội', 'Huế'], correctIndex: 2, points: 10 }
  ]);
  const [sessionImages, setSessionImages] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadTarget, setUploadTarget] = useState<{ qIndex: number, optIndex?: number } | null>(null);

  const totalScore = questions.reduce((acc, q) => acc + (q.points || 0), 0);
  const [localTotalScoreStr, setLocalTotalScoreStr] = useState<string>('');

  useEffect(() => {
    const parsedLocal = parseFloat(localTotalScoreStr);
    if (isNaN(parsedLocal) || Math.abs(parsedLocal - totalScore) > 0.001) {
      setLocalTotalScoreStr(Number(totalScore.toFixed(2)).toString());
    }
  }, [totalScore]);

  const handleWordImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !auth.currentUser || !storage) return;
    
    setLoading(true);
    try {
      const { importQuestionsFromWord } = await import('../utils/wordImport');
      const { questions: importedQuestions, images: importedImages } = await importQuestionsFromWord(file, auth.currentUser.uid);
      
      if (importedQuestions.length > 0) {
          // Calculate points
          const pts = totalScore > 0 ? Number((totalScore / importedQuestions.length).toFixed(2)) : 0;
          const merged = importedQuestions.map(q => ({
             ...q,
             points: pts,
             options: q.options.length > 0 ? q.options : ['A', 'B', 'C', 'D'] // fallback
          }));
          setQuestions(prev => [...prev, ...merged]);
          setSessionImages(prev => [...prev, ...importedImages]);
          alert(`Đã nhập thành công ${importedQuestions.length} câu hỏi!`);
      } else {
          alert('Không tìm thấy định dạng câu hỏi nào hợp lệ trong file này.');
      }
      
    } catch (err) {
      console.error(err);
      alert('Lỗi khi xử lý file Word.');
    } finally {
      setLoading(false);
      // reset input
      e.target.value = '';
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadTarget || !storage || !auth.currentUser) return;
    setUploadingImage(true);
    try {
      const ext = file.name.split('.').pop() || 'png';
      const fileName = `users/${auth.currentUser.uid}/exams/${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
      const fileRef = ref(storage, fileName);
      await uploadBytes(fileRef, file);
      const url = await getDownloadURL(fileRef);

      setSessionImages(prev => [...prev, url]);

      const newQ = [...questions];
      if (uploadTarget.optIndex !== undefined) {
        if (!newQ[uploadTarget.qIndex].optionImageUrls) newQ[uploadTarget.qIndex].optionImageUrls = [];
        // @ts-ignore
        newQ[uploadTarget.qIndex].optionImageUrls[uploadTarget.optIndex] = url;
      } else {
        newQ[uploadTarget.qIndex].imageUrl = url;
      }
      setQuestions(newQ);
    } catch (err) {
      console.error(err);
      alert('Upload ảnh thất bại.');
    } finally {
      setUploadingImage(false);
      setUploadTarget(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  useEffect(() => {
    if (auth.currentUser) {
      classService.getClassesByTeacher(auth.currentUser.uid).then(setTeacherClasses);
    }

    if (editExamId) {
      setLoading(true);
      getDoc(doc(db, 'exams', editExamId)).then(snap => {
        if (snap.exists()) {
          const data = snap.data() as Exam;
          setTitle(data.title);
          setTimeLimit(data.timeLimitMinutes);
          setAllowStudentInputName(data.allowStudentInputName);
          setAllowedStudentNamesText(data.allowedStudentNames?.join('\n') || '');
          setRequireClassInput(data.requireClassInput || false);
          setSelectedClasses(data.allowedClasses || []);
          setExistingData({
            createdAt: data.createdAt,
            pin: data.pin,
            status: data.status,
            folderId: data.folderId
          });
          
          setQuestions(data.questions.map(q => ({
            id: q.id,
            text: q.text,
            imageUrl: q.imageUrl,
            options: q.options,
            optionImageUrls: q.optionImageUrls,
            correctIndex: deobfuscateAnswer(q.obfuscatedAnswer || '', q.id),
            points: q.points || 0
          })));
        }
      }).finally(() => setLoading(false));
    }
  }, [editExamId]);

  const handleAddQuestion = () => {
    const pointsPerQ = Number(((totalScore || 10) / (questions.length + 1)).toFixed(2));
    setQuestions(questions.map(q => ({...q, points: pointsPerQ })).concat([
      { text: '', options: ['', '', '', ''], correctIndex: 0, points: pointsPerQ }
    ]));
  };

  const handleSetTotalScoreFromLocal = () => {
    const newTotal = parseFloat(localTotalScoreStr) || 0;
    if (questions.length === 0) return;
    const pointsPerQ = Number((newTotal / questions.length).toFixed(2));
    setQuestions(questions.map(q => ({...q, points: pointsPerQ })));
  };

  const handleCancelEdit = async () => {
    if (sessionImages.length > 0) {
       // Delete newly uploaded images in this session if user cancels
       try {
          const { deleteFilesFromUrls } = await import('../utils/storage');
          await deleteFilesFromUrls(sessionImages);
       } catch (err) {
          console.error('Lỗi khi dọn dẹp file nháp', err);
       }
    }
    navigate('/teacher/exams');
  };

  const handleSave = async (status: 'published' | 'closed') => {
    if (!auth.currentUser) return;
    if (!title.trim() || questions.length === 0) {
      alert("Vui lòng nhập tên đề thi và ít nhất 1 câu hỏi.");
      return;
    }
    
    let allowedNames: string[] = [];
    if (!allowStudentInputName) {
      allowedNames = allowedStudentNamesText.split('\n').map(n => n.trim()).filter(n => n.length > 0);
      if (allowedNames.length === 0) {
        alert("Vui lòng nhập danh sách tên học sinh hợp lệ.");
        return;
      }
    }

    setLoading(true);
    const examId = editExamId || Math.random().toString(36).substring(2, 8).toUpperCase();
    const pin = (editExamId && existingData.pin) ? existingData.pin : Math.random().toString(36).substring(2, 8).toUpperCase();
    
    const formattedQuestions: ExamQuestion[] = questions.map(q => {
      const qId = q.id || uuidv4();
      return {
        id: qId,
        text: q.text,
        imageUrl: q.imageUrl,
        points: q.points || 0,
        options: q.options,
        optionImageUrls: q.optionImageUrls,
        obfuscatedAnswer: obfuscateAnswer(q.correctIndex, qId)
      };
    });

    const newExam: Exam = {
      id: examId,
      title: title.trim(),
      timeLimitMinutes: timeLimit,
      questions: formattedQuestions,
      allowStudentInputName,
      allowedStudentNames: allowStudentInputName ? [] : allowedNames,
      requireClassInput,
      allowedClasses: selectedClasses,
      status: status,
      teacherId: auth.currentUser.uid,
      createdAt: (editExamId && existingData.createdAt) ? existingData.createdAt : Date.now(),
      pin: pin,
      ...(folderId ? { folderId } : (existingData.folderId ? { folderId: existingData.folderId } : {}))
    };

    const cleanExam = JSON.parse(JSON.stringify(newExam));
    try {
      if (editExamId) {
        await updateDoc(doc(db, 'exams', examId), cleanExam);
        
        // Update all related examAttempts
        try {
          const { collection, query, where, getDocs } = await import('firebase/firestore');
          const attemptsQ = query(collection(db, 'examAttempts'), where('examId', '==', examId));
          const attemptSnaps = await getDocs(attemptsQ);
          
          if (!attemptSnaps.empty) {
            const updates = attemptSnaps.docs.map(attemptDoc => {
              const attemptData = attemptDoc.data();
              let newTotalCorrect = 0;
              let newScore = 0;
              
              const submissions = attemptData.submissions || {};
              
              // We use the new formattedQuestions to re-grade
              // since we need points, and we can deobfuscate the answer to check
              formattedQuestions.forEach(q => {
                const subInd = submissions[q.id];
                const realCorrectIndex = deobfuscateAnswer(q.obfuscatedAnswer || '', q.id);
                if (subInd !== undefined && subInd === realCorrectIndex) {
                   newTotalCorrect++;
                   newScore += (q.points || 0);
                }
              });
              
              return updateDoc(doc(db, 'examAttempts', attemptDoc.id), {
                totalCorrect: newTotalCorrect,
                score: newScore
              });
            });
            await Promise.all(updates);
            console.log(`Updated ${attemptSnaps.docs.length} attempts for new scoring.`);
          }
        } catch (updateErr) {
          console.error("Error updating exam attempts:", updateErr);
        }
        
      } else {
        await setDoc(doc(db, 'exams', examId), cleanExam);
      }
      alert(editExamId ? "Cập nhật đề thi thành công!" : "Tạo đề thi thành công!");
      navigate('/teacher/exams');
    } catch (err) {
      console.error(err);
      alert("Lỗi khi lưu đề thi!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Tạo đề thi mới</h1>
          <p className="text-slate-500">Soạn thảo hoặc nhập từ file Word</p>
        </div>
        <div className="flex gap-3">
          <button 
            type="button"
            onClick={handleCancelEdit}
            className="bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 px-5 py-2.5 rounded-xl font-medium transition-colors"
          >
            Hủy
          </button>
          <button 
            disabled={loading}
            onClick={() => handleSave('published')}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            <Save className="w-5 h-5" />
            Lưu & Mở ngay
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Tên đề thi</label>
            <input 
              type="text" 
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Ví dụ: Kiểm tra 15p Toán Hình..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Thời gian làm bài (Phút)</label>
            <input 
              type="number" 
              value={timeLimit}
              onChange={e => setTimeLimit(parseInt(e.target.value) || 0)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Tổng điểm bài thi</label>
            <input 
              type="number" 
              step="0.01"
              value={localTotalScoreStr}
              onChange={e => setLocalTotalScoreStr(e.target.value)}
              onBlur={handleSetTotalScoreFromLocal}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  handleSetTotalScoreFromLocal();
                }
              }}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input 
                type="checkbox" 
                checked={!allowStudentInputName} 
                onChange={e => setAllowStudentInputName(!e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded"
              />
              Yêu cầu học sinh chọn tên từ danh sách
            </label>
            {!allowStudentInputName && (
              <textarea 
                value={allowedStudentNamesText}
                onChange={e => setAllowedStudentNamesText(e.target.value)}
                placeholder="Nhập phần tên học sinh, mỗi người một dòng..."
                className="w-full mt-2 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 min-h-[100px] text-sm"
              />
            )}
          </div>
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input 
                type="checkbox" 
                checked={requireClassInput} 
                onChange={e => setRequireClassInput(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded"
              />
              Yêu cầu học sinh chọn thông tin lớp
            </label>
            <p className="text-xs text-slate-500 mt-1 ml-6">
              Giúp phân loại trong báo cáo kết quả thi.
            </p>
            {requireClassInput && (
              <div className="mt-4 ml-6">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Danh sách lớp cho phép:</label>
                <div className="flex flex-wrap gap-2">
                  {teacherClasses.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setSelectedClasses(prev => 
                          prev.includes(c.name) 
                            ? prev.filter(cn => cn !== c.name) 
                            : [...prev, c.name]
                        );
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors flex items-center gap-2 ${
                        selectedClasses.includes(c.name)
                          ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {selectedClasses.includes(c.name) && <CheckSquare className="w-3.5 h-3.5" />}
                      {c.name}
                    </button>
                  ))}
                  {teacherClasses.length === 0 && (
                    <p className="text-xs text-slate-400 italic">Bạn chưa tạo danh sách lớp nào.</p>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 mt-2 italic">* Nếu không chọn lớp nào, học sinh có thể tự nhập tên lớp tự do.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
         <div className="flex items-start gap-3">
            <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600 shrink-0">
               <Upload className="w-5 h-5" />
            </div>
            <div>
               <h4 className="font-semibold text-indigo-900">Nhập từ file Word (Tự động nhận diện)</h4>
               <p className="text-sm text-indigo-700">Hỗ trợ định dạng .docx. Hình ảnh trong dòng (inline) sẽ được tự động trích xuất.</p>
               <details className="mt-2 text-xs text-indigo-800">
                 <summary className="cursor-pointer font-medium hover:text-indigo-900">Xem mẫu nhận diện file Word</summary>
                 <div className="mt-2 bg-indigo-100/50 p-3 rounded border border-indigo-100">
                   <strong>Cấu trúc chuẩn:</strong><br />
                   Câu 1: Nội dung câu hỏi...<br />
                   A. Lựa chọn A<br />
                   <u>B. Lựa chọn B (Gạch chân đáp án đúng)</u><br />
                   C. Lựa chọn C<br />
                   D. Lựa chọn D<br />
                   <br />
                   <em>Hoặc đánh dấu sao trước đáp án đúng: *B. Lựa chọn B</em>
                 </div>
               </details>
            </div>
         </div>
         <label className="bg-white border text-center border-indigo-200 text-indigo-600 px-4 py-2 rounded-lg font-medium hover:bg-indigo-50 shadow-sm transition-colors text-sm cursor-pointer whitespace-nowrap">
            <span>Chọn File .docx</span>
            <input 
              type="file" 
              accept=".docx" 
              className="hidden" 
              onChange={handleWordImport}
            />
         </label>
      </div>

      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleImageUpload} 
        className="hidden" 
        accept="image/*" 
      />

      <div className="space-y-6">
        {questions.map((q, qIndex) => (
          <QuestionEditorCard 
            key={qIndex}
            q={q}
            qIndex={qIndex}
            totalQuestions={questions.length}
            onChange={(index, newQ) => {
              const qs = [...questions];
              qs[index] = newQ;
              setQuestions(qs);
            }}
            onMoveUp={(index) => {
              if (index > 0) {
                const qs = [...questions];
                [qs[index - 1], qs[index]] = [qs[index], qs[index - 1]];
                setQuestions(qs);
              }
            }}
            onMoveDown={(index) => {
              if (index < questions.length - 1) {
                const qs = [...questions];
                [qs[index], qs[index + 1]] = [qs[index + 1], qs[index]];
                setQuestions(qs);
              }
            }}
            onDelete={(index) => {
              // Delete images associated with this question from Storage
              const qToDelete = questions[index];
              const urlsToDelete: string[] = [];
              if (qToDelete.imageUrl) urlsToDelete.push(qToDelete.imageUrl);
              if (qToDelete.optionImageUrls) {
                qToDelete.optionImageUrls.forEach(url => {
                  if (url) urlsToDelete.push(url);
                });
              }
              if (urlsToDelete.length > 0) {
                import('../utils/storage').then(({ deleteFilesFromUrls }) => {
                  deleteFilesFromUrls(urlsToDelete);
                });
              }
              
              setQuestions(questions.filter((_, i) => i !== index));
            }}
            onRequestImageUpload={(index, optIndex) => {
              setUploadTarget({ qIndex: index, optIndex });
              fileInputRef.current?.click();
            }}
            onImageRemoved={(url) => {
              import('../utils/storage').then(({ deleteFileFromUrl }) => {
                deleteFileFromUrl(url);
              });
            }}
          />
        ))}
      </div>

      <button 
        onClick={handleAddQuestion}
        className="w-full mt-6 py-4 border-2 border-dashed border-slate-300 rounded-xl text-slate-600 font-medium hover:border-indigo-400 hover:text-indigo-600 transition-colors flex items-center justify-center gap-2"
      >
        <PlusCircle className="w-5 h-5" />
        Thêm câu hỏi
      </button>

    </div>
  )
}
