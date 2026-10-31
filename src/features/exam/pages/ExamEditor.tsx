import { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, auth, storage } from '../../../config/firebase';
import { Exam, ExamQuestion } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { obfuscateAnswer, deobfuscateAnswer, obfuscateStringAnswer, deobfuscateStringAnswer } from '../utils/obfuscator';
import { Pickaxe, Save, Upload, FileText, PlusCircle, CheckSquare, ImagePlus, X, Loader2, Info, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import { classService, ClassData } from '../../random-selector/services/classService';
import ReactMarkdown from 'react-markdown';
import { QuestionEditorCard, EditorQuestionData } from '../components/QuestionEditorCard';
import ImportQuestionsModal from '../../quiz/components/ImportQuestionsModal';

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
  const [clusterScoringType, setClusterScoringType] = useState<'vietnamese_2025' | 'proportional'>('vietnamese_2025');
  const [isPracticeMode, setIsPracticeMode] = useState(false);
  const [passingPercentage, setPassingPercentage] = useState<number>(50);
  const [loading, setLoading] = useState(false);
  const [existingData, setExistingData] = useState<Partial<Exam>>({});

  const [questions, setQuestions] = useState<EditorQuestionData[]>([
    { text: 'Thủ đô của Việt Nam là gì?', options: ['Hồ Chí Minh', 'Đà Nẵng', 'Hà Nội', 'Huế'], correctIndex: 2, points: 10 }
  ]);
  const [sessionImages, setSessionImages] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadTarget, setUploadTarget] = useState<{ qIndex: number, optIndex?: number } | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);

  const totalScore = questions.reduce((acc, q) => acc + (q.points || 0), 0);
  const [localTotalScoreStr, setLocalTotalScoreStr] = useState<string>('');

  useEffect(() => {
    const parsedLocal = parseFloat(localTotalScoreStr);
    if (isNaN(parsedLocal) || Math.abs(parsedLocal - totalScore) > 0.001) {
      setLocalTotalScoreStr(Number(totalScore.toFixed(2)).toString());
    }
  }, [totalScore]);

  const handleImportedQuestions = (importedQuestions: any[]) => {
    if (importedQuestions.length > 0) {
      if (window.confirm(`Bạn muốn đưa khối ${importedQuestions.length} câu hỏi mới này vào đề thi? Các câu hỏi đã có sẽ được giữ nguyên.`)) {
        const pts = totalScore > 0 ? Number((totalScore / importedQuestions.length).toFixed(2)) : 0;
        
        const mappedExamData: EditorQuestionData[] = importedQuestions.map(q => {
          let type: any = 'multiple_choice';
          if (q.type === 'MULTIPLE_CHOICE') type = 'multiple_choice';
          else if (q.type === 'TRUE_FALSE') type = 'true_false';
          else if (q.type === 'TRUE_FALSE_CLUSTER') type = 'true_false_cluster';
          else if (q.type === 'SHORT_ANSWER') type = 'short_answer';

          const options = q.type === 'SHORT_ANSWER' ? [] : q.options.map((o: any) => o.text);
          const optionImageUrls = q.type === 'SHORT_ANSWER' ? [] : q.options.map((o: any) => o.imageUrl || null);
          
          let correctIndex = 0;
          let clusterAnswers = undefined;
          let shortAnswerText = undefined;

          if (type === 'true_false_cluster') {
             clusterAnswers = q.options.map((o: any) => !!o.isCorrect);
          } else if (type === 'short_answer') {
             shortAnswerText = q.options.map((o: any) => o.text).join(' || ');
          } else {
             correctIndex = q.options.findIndex((o: any) => o.isCorrect);
             if (correctIndex === -1) correctIndex = 0;
          }

          return {
            id: uuidv4(),
            type,
            text: q.text,
            imageUrl: q.imageUrl || null,
            options,
            optionImageUrls,
            correctIndex,
            clusterAnswers,
            shortAnswerText,
            points: q.points || pts
          };
        });

        setQuestions(prev => [...prev, ...mappedExamData]);
        alert(`Đã nhập thành công ${mappedExamData.length} câu hỏi!`);
      }
    }
  };

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
             options: q.options.length > 0 ? q.options : (q.type === 'short_answer' ? [] : ['A', 'B', 'C', 'D'])
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

    const fromQuizId = searchParams.get('fromQuiz');

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
          setClusterScoringType(data.clusterScoringType || 'vietnamese_2025');
          setIsPracticeMode(data.isPracticeMode || false);
          setPassingPercentage(data.passingPercentage || 50);
          setExistingData({
            createdAt: data.createdAt,
            pin: data.pin,
            status: data.status,
            folderId: data.folderId
          });
          
          setQuestions(data.questions.map(q => ({
            id: q.id,
            type: q.type || 'multiple_choice',
            text: q.text,
            imageUrl: q.imageUrl,
            options: q.options,
            optionImageUrls: q.optionImageUrls,
            correctIndex: deobfuscateAnswer(q.obfuscatedAnswer || '', q.id),
            shortAnswerText: q.type === 'short_answer' ? deobfuscateStringAnswer(q.obfuscatedAnswer || '', q.id) : '',
            clusterAnswers: q.type === 'true_false_cluster' ? deobfuscateStringAnswer(q.obfuscatedAnswer || '', q.id).split(',').map((s) => s === 'true') : [false, false, false, false],
            points: q.points || 0
          })));
        }
      }).finally(() => setLoading(false));
    } else if (fromQuizId) {
      setLoading(true);
      import('../../quiz/services/quizService').then(({ quizService }) => {
        quizService.getQuizById(fromQuizId).then(quiz => {
          if (quiz && quiz.questions && quiz.questions.length > 0) {
            setTitle(quiz.title ? `Đề thi: ${quiz.title}` : 'Đề thi Online');
            const pts = Number((10 / quiz.questions.length).toFixed(2));
            const mapped: EditorQuestionData[] = quiz.questions.map(q => {
              let type: any = 'multiple_choice';
              if (q.type === 'MULTIPLE_CHOICE') type = 'multiple_choice';
              else if (q.type === 'TRUE_FALSE') type = 'true_false';
              else if (q.type === 'TRUE_FALSE_CLUSTER') type = 'true_false_cluster';
              else if (q.type === 'SHORT_ANSWER') type = 'short_answer';

              const options = q.type === 'SHORT_ANSWER' ? [] : q.options.map(o => o.text);
              const optionImageUrls = q.type === 'SHORT_ANSWER' ? [] : q.options.map(o => o.imageUrl || null);
              let correctIndex = q.options.findIndex(o => o.isCorrect);
              if (correctIndex === -1) correctIndex = 0;
              const clusterAnswers = type === 'true_false_cluster' ? q.options.map(o => o.isCorrect) : undefined;
              const shortAnswerText = type === 'short_answer' ? (q.options[0]?.text || '') : undefined;

              return {
                id: uuidv4(),
                type,
                text: q.text,
                imageUrl: q.imageUrl || null,
                options,
                optionImageUrls,
                correctIndex,
                clusterAnswers,
                shortAnswerText,
                points: pts
              };
            });
            setQuestions(mapped);
          }
        }).finally(() => setLoading(false));
      });
    }
  }, [editExamId, searchParams]);

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
      const type = q.type || 'multiple_choice';
      let obfAns = '';
      if (type === 'true_false_cluster') {
        obfAns = obfuscateStringAnswer((q.clusterAnswers || []).join(','), qId);
      } else if (type === 'short_answer') {
        obfAns = obfuscateStringAnswer(q.shortAnswerText || '', qId);
      } else {
        obfAns = obfuscateAnswer(q.correctIndex, qId);
      }

      return {
        id: qId,
        type: type,
        text: q.text,
        imageUrl: q.imageUrl,
        points: q.points || 0,
        options: q.options,
        optionImageUrls: q.optionImageUrls,
        obfuscatedAnswer: obfAns
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
      clusterScoringType,
      isPracticeMode,
      passingPercentage,
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
                const subAns = submissions[q.id];
                if (subAns !== undefined) {
                   if (q.type === 'true_false_cluster') {
                      const realAnsStr = deobfuscateStringAnswer(q.obfuscatedAnswer || '', q.id);
                      const realAnswers = realAnsStr.split(','); // e.g. "true,false,true,true"
                      const studentAnswers = (String(subAns) || '').split(',');
                      let correctCount = 0;
                      realAnswers.forEach((ans, idx) => {
                         if (studentAnswers[idx] === ans) correctCount++;
                      });
                      if (correctCount > 0) {
                         let multiplier = 0;
                         if (clusterScoringType === 'proportional') {
                           multiplier = correctCount / 4;
                         } else {
                           if (correctCount === 1) multiplier = 0.1;
                           if (correctCount === 2) multiplier = 0.25;
                           if (correctCount === 3) multiplier = 0.5;
                           if (correctCount === 4) multiplier = 1.0;
                         }
                         newScore += (q.points || 0) * multiplier;
                         if (correctCount === 4) newTotalCorrect++;
                      }
                   } else if (q.type === 'short_answer') {
                      const realAns = deobfuscateStringAnswer(q.obfuscatedAnswer || '', q.id);
                      // split by || and check
                      const validAnswers = realAns.split('||').map(s => s.trim().toLowerCase());
                      const studentAns = String(subAns).trim().toLowerCase();
                      if (validAnswers.includes(studentAns)) {
                         newTotalCorrect++;
                         newScore += (q.points || 0);
                      }
                   } else {
                      const realCorrectIndex = deobfuscateAnswer(q.obfuscatedAnswer || '', q.id);
                      if (subAns === realCorrectIndex) {
                         newTotalCorrect++;
                         newScore += (q.points || 0);
                      }
                   }
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
            <label className="block text-sm font-medium text-slate-700 mb-2">Cách tính điểm câu chùm đúng/sai</label>
            <select
              value={clusterScoringType}
              onChange={e => setClusterScoringType(e.target.value as 'vietnamese_2025' | 'proportional')}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="vietnamese_2025">Hệ số riêng (1 ý: 0.1đ, 2 ý: 0.25đ, 3 ý: 0.5đ, 4 ý tối đa)</option>
              <option value="proportional">Chia đều (VD: 4 ý thì 25% điểm mỗi ý)</option>
            </select>
            <p className="text-xs text-slate-500 mt-1">Hệ số riêng sử dụng tỷ lệ chuẩn của Bộ GD&ĐT năm 2025.</p>
          </div>
          <div className="flex flex-col space-y-4">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input 
                type="checkbox" 
                checked={isPracticeMode} 
                onChange={e => setIsPracticeMode(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded"
              />
              Chế độ luyện tập
            </label>
            {isPracticeMode && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Tỷ lệ đỗ tối thiểu (%)</label>
                <input 
                  type="number" 
                  min="0"
                  max="100"
                  value={passingPercentage}
                  onChange={e => setPassingPercentage(parseFloat(e.target.value) || 0)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            )}
            <p className="text-xs text-slate-500">Chế độ luyện tập sẽ cho phép học sinh xem đáp án sau khi làm xong thay vì chỉ hiển thị kết quả cơ bản.</p>
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
               <p className="text-sm text-indigo-700">Hỗ trợ file .docx. Tự động nhận diện công thức Toán (Word Equation / LaTeX) và trích xuất ảnh nhúng.</p>
               <details className="mt-2 text-xs text-indigo-800">
                 <summary className="cursor-pointer font-medium hover:text-indigo-900 flex items-center gap-1.5">
                   <span>Xem hướng dẫn cú pháp & mẫu nhận diện 3 dạng câu hỏi (Chuẩn GDPT 2018)</span>
                 </summary>
                 <div className="mt-2.5 bg-white p-3.5 rounded-lg border border-indigo-200 shadow-xs space-y-3">
                   <div className="p-2.5 bg-indigo-50/60 rounded-md border border-indigo-100">
                     <strong className="text-indigo-900 block mb-1 font-bold">1. Dạng Trắc nghiệm 4 lựa chọn (Phần I):</strong>
                     <div className="text-slate-700 space-y-1">
                       <p>Bắt đầu bằng <code className="bg-white px-1 py-0.5 rounded font-mono font-semibold">Câu 1:</code> hoặc đặt dưới <code className="bg-white px-1 py-0.5 rounded font-mono font-semibold">PHẦN I</code>. Bốn phương án <code className="bg-white px-1 py-0.5 rounded font-mono">A. B. C. D.</code> (hoặc <code className="bg-white px-1 py-0.5 rounded font-mono">A) B) C) D)</code>).</p>
                       <div className="bg-white p-2 rounded border border-indigo-100 font-mono text-[11px] text-slate-700">
                         Câu 1: Cho hàm số y = f(x)...<br/>
                         A. Đồng biến trên (0; 1)<br/>
                         <u>B. Nghịch biến trên R (Gạch chân đáp án đúng)</u><br/>
                         C. Có 2 điểm cực trị<br/>
                         D. Giá trị nhỏ nhất bằng 0<br/>
                         <span className="text-indigo-600 font-sans italic">Hoặc đánh dấu sao trước đáp án: *B. Nghịch biến trên R, hoặc ghi: Đáp án: B</span>
                       </div>
                     </div>
                   </div>

                   <div className="p-2.5 bg-amber-50/60 rounded-md border border-amber-200">
                     <strong className="text-amber-900 block mb-1 font-bold">2. Dạng Đúng / Sai chùm (Phần II - Theo cấu trúc đề 2025):</strong>
                     <div className="text-slate-700 space-y-1">
                       <p>Dùng từ khóa <code className="bg-white px-1 py-0.5 rounded font-mono font-semibold text-amber-800">(Đúng sai chùm)</code> hoặc <code className="bg-white px-1 py-0.5 rounded font-mono font-semibold text-amber-800">(Chùm đúng/sai)</code> sau số câu, hoặc đặt dưới tiêu đề <code className="bg-white px-1 py-0.5 rounded font-mono font-semibold text-amber-800">PHẦN II. CÂU TRẮC NGHIỆM ĐÚNG SAI</code>. Gồm 4 ý <code className="bg-white px-1 py-0.5 rounded font-mono">a), b), c), d)</code> (hoặc <code className="bg-white px-1 py-0.5 rounded font-mono">a. b. c. d.</code>).</p>
                       <div className="bg-white p-2 rounded border border-amber-200 font-mono text-[11px] text-slate-700">
                         Câu 2 (Đúng sai chùm): Cho hình chóp S.ABCD...<br/>
                         a) SA vuông góc với (ABCD)<br/>
                         b) Tam giác SBC vuông tại B<br/>
                         c) Góc giữa SC và đáy bằng 60 độ<br/>
                         d) Thể tích khối chóp bằng 4<br/>
                         <span className="text-amber-800 font-semibold font-sans">Cách ghi đáp án chùm:</span><br/>
                         • Dạng chữ: <span className="font-bold text-amber-900">Đáp án: a.Đ, b.Đ, c.S, d.Đ</span> (hoặc a) Đúng, b) Đúng, c) Sai, d) Đúng)<br/>
                         • Dạng thứ tự: <span className="font-bold text-amber-900">Đáp án: Đúng, Đúng, Sai, Đúng</span> (hoặc Đ, Đ, S, Đ)<br/>
                         • Đánh dấu sao/gạch chân: Đặt <span className="font-bold text-amber-900">*a)</span> trước các ý Đúng.
                       </div>
                     </div>
                   </div>

                   <div className="p-2.5 bg-emerald-50/60 rounded-md border border-emerald-200">
                     <strong className="text-emerald-900 block mb-1 font-bold">3. Dạng Trả lời ngắn (Phần III - Tự luận điền kết quả):</strong>
                     <div className="text-slate-700 space-y-1">
                       <p>Dùng từ khóa <code className="bg-white px-1 py-0.5 rounded font-mono font-semibold text-emerald-800">(Trả lời ngắn)</code> sau số câu, hoặc đặt dưới tiêu đề <code className="bg-white px-1 py-0.5 rounded font-mono font-semibold text-emerald-800">PHẦN III. CÂU TRẮC NGHIỆM TRẢ LỜI NGẮN</code>. Dạng này không có các lựa chọn A, B, C, D.</p>
                       <div className="bg-white p-2 rounded border border-emerald-200 font-mono text-[11px] text-slate-700">
                         Câu 3 (Trả lời ngắn): Tính vận tốc của vật tại thời điểm t = 5s...<br/>
                         <span className="text-emerald-800 font-semibold font-sans">Đáp án: 32</span><br/>
                         <span className="text-slate-500 font-sans italic">Nếu có nhiều cách viết đúng, dùng dấu || ngăn cách: Đáp án: 12.5 || 12,5 || 25/2</span>
                       </div>
                     </div>
                   </div>

                   <div className="p-2.5 bg-slate-50 rounded-md border border-slate-200 text-slate-700">
                     <strong className="text-slate-900 block mb-1 font-bold">4. Công thức Toán học (Equation & LaTeX) & Hình ảnh:</strong>
                     <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
                       <li>Công thức tạo bằng <strong>Equation trong Word (Alt +=)</strong> sẽ được tự động nhận diện và chuyển sang mã LaTeX hiển thị sắc nét bằng KaTeX.</li>
                       <li>Có thể gõ mã LaTeX trực tiếp: <code className="bg-white px-1 rounded font-mono text-indigo-700">$...$</code> cho công thức nội dòng hoặc <code className="bg-white px-1 rounded font-mono text-indigo-700">$$...$$</code> cho khối công thức.</li>
                       <li>Mọi hình ảnh chèn trong file Word (.docx) được tự động trích xuất và tải lên đám mây.</li>
                     </ul>
                   </div>
                 </div>
               </details>
            </div>
         </div>
         <div className="flex flex-col sm:flex-row gap-2">
           <button
             type="button"
             onClick={() => setShowImportModal(true)}
             className="bg-white border text-center border-indigo-200 text-indigo-600 px-4 py-2 rounded-lg font-medium hover:bg-indigo-50 shadow-sm transition-colors text-sm cursor-pointer whitespace-nowrap"
           >
             Dán văn bản
           </button>
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
      </div>

      <ImportQuestionsModal 
        isOpen={showImportModal} 
        onClose={() => setShowImportModal(false)}
        onImport={handleImportedQuestions}
      />

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
