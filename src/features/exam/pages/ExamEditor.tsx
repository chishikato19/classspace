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
import * as mammoth from 'mammoth';
import ReactMarkdown from 'react-markdown';

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

  const [questions, setQuestions] = useState<{
    text: string;
    imageUrl?: string | null;
    options: string[];
    optionImageUrls?: (string | null)[];
    correctIndex: number;
    points: number;
  }[]>([
    { text: 'Thủ đô của Việt Nam là gì?', options: ['Hồ Chí Minh', 'Đà Nẵng', 'Hà Nội', 'Huế'], correctIndex: 2, points: 10 }
  ]);
  const [uploadingImage, setUploadingImage] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadTarget, setUploadTarget] = useState<{ qIndex: number, optIndex?: number } | null>(null);

  const handleWordImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !auth.currentUser || !storage) return;
    
    setLoading(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.convertToHtml({ arrayBuffer });
      const htmlString = result.value;
      
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlString, 'text/html');
      
      // Helper to process a node to Markdown and upload inline images
      const processNodeToMarkdown = async (node: Node): Promise<string> => {
        if (node.nodeType === Node.TEXT_NODE) return node.textContent || '';
        if (node.nodeType !== Node.ELEMENT_NODE) return '';
        
        const el = node as HTMLElement;
        let md = '';
        
        if (el.tagName.toLowerCase() === 'img') {
           const src = el.getAttribute('src');
           if (src && src.startsWith('data:image')) {
              // Upload to Firebase
              try {
                const response = await fetch(src);
                const blob = await response.blob();
                const ext = blob.type.split('/')[1] || 'png';
                const fileName = `users/${auth.currentUser.uid}/exams/word_imports/${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
                const fileRef = ref(storage, fileName);
                await uploadBytes(fileRef, blob);
                const url = await getDownloadURL(fileRef);
                return `![Image](${url})`;
              } catch (err) {
                console.error("Failed to upload inline image", err);
                return '';
              }
           }
        }
        
        if (el.tagName.toLowerCase() === 'br') return '\n';
        if (el.tagName.toLowerCase() === 'p') {
           for (const child of Array.from(el.childNodes)) {
              md += await processNodeToMarkdown(child);
           }
           md += '\n'; // paragraph break
           return md;
        }
        
        for (const child of Array.from(el.childNodes)) {
            md += await processNodeToMarkdown(child);
        }
        
        return md;
      };

      const importedQuestions: any[] = [];
      let currentQuestion: any = null;
      let currentOptIndex = 0;

      // Iterate through root-level elements (usually paragraphs from mammoth)
      for (const el of Array.from(doc.body.children)) {
         let isCorrectOption = false;
         
         // In mammoth, underline is <u> or inline style, but let's check for <u>
         const hasUnderline = el.querySelector('u') !== null;
         
         let mdText = await processNodeToMarkdown(el);
         mdText = mdText.trim();
         if (!mdText) continue;

         // Check if it's a question: "Câu 1:", "Câu 1.", "Câu 1: "
         const isQuestion = /^Câu\s*\d+\s*[:\.]/i.test(mdText);
         
         if (isQuestion) {
            if (currentQuestion) importedQuestions.push(currentQuestion);
            // Remove "Câu 1: " prefix
            const cleanText = mdText.replace(/^Câu\s*\d+\s*[:\.]\s*/i, '');
            currentQuestion = {
              text: cleanText,
              options: [],
              correctIndex: 0,
              points: 0
            };
         } else if (currentQuestion) {
            // Check if it's an option: "A.", "B.", "A:", "*A."
            const isOption = /^(\*|[uU]\s*)?[A-D]\s*[\.\:]/i.test(mdText) || hasUnderline;
            const startsWithStar = mdText.startsWith('*');
            if (isOption || /^[A-D]\s*[\.\:]/.test(mdText)) {
               const cleanOpt = mdText.replace(/^(\*|[uU]\s*)?[A-D]\s*[\.\:]\s*/i, '').trim();
               currentQuestion.options.push(cleanOpt);
               const optIdx = currentQuestion.options.length - 1;
               if (startsWithStar || hasUnderline) {
                  currentQuestion.correctIndex = optIdx;
               }
            } else {
               // Append to question text if it doesn't look like an option
               if (currentQuestion.options.length === 0) {
                 currentQuestion.text += '\n' + mdText;
               } else {
                 // Or append to the last option
                 currentQuestion.options[currentQuestion.options.length - 1] += '\n' + mdText;
               }
            }
         }
      }
      
      if (currentQuestion) importedQuestions.push(currentQuestion);
      
      if (importedQuestions.length > 0) {
          // Calculate points
          const pts = totalScore > 0 ? Number((totalScore / importedQuestions.length).toFixed(2)) : 0;
          const merged = importedQuestions.map(q => ({
             ...q,
             points: pts,
             options: q.options.length > 0 ? q.options : ['A', 'B', 'C', 'D'] // fallback
          }));
          setQuestions(prev => [...prev, ...merged]);
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
          
          setQuestions(data.questions.map(q => ({
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

  const totalScore = questions.reduce((acc, q) => acc + (q.points || 0), 0);

  const handleAddQuestion = () => {
    const pointsPerQ = Number(((totalScore || 10) / (questions.length + 1)).toFixed(2));
    setQuestions(questions.map(q => ({...q, points: pointsPerQ })).concat([
      { text: '', options: ['', '', '', ''], correctIndex: 0, points: pointsPerQ }
    ]));
  };

  const handleSetTotalScore = (newTotal: number) => {
    if (questions.length === 0) return;
    const pointsPerQ = Number((newTotal / questions.length).toFixed(2));
    setQuestions(questions.map(q => ({...q, points: pointsPerQ })));
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
    const pin = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    const formattedQuestions: ExamQuestion[] = questions.map(q => {
      const qId = uuidv4();
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
      createdAt: Date.now(),
      pin: pin,
      ...(folderId ? { folderId } : {})
    };

    try {
      if (editExamId) {
        await updateDoc(doc(db, 'exams', examId), newExam as any);
      } else {
        await setDoc(doc(db, 'exams', examId), newExam);
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
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Tạo đề thi mới</h1>
          <p className="text-slate-500">Soạn thảo hoặc nhập từ file Word</p>
        </div>
        <div className="flex gap-3">
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
              value={totalScore}
              onChange={e => handleSetTotalScore(parseFloat(e.target.value) || 0)}
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
          <div key={qIndex} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col lg:flex-row relative">
            
            {/* Editor Side */}
            <div className="flex-1 p-6 border-b lg:border-b-0 lg:border-r border-slate-200 relative">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                  <div className="text-slate-600 font-bold text-sm bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                    Câu {qIndex + 1}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (qIndex > 0) {
                        const newQ = [...questions];
                        [newQ[qIndex - 1], newQ[qIndex]] = [newQ[qIndex], newQ[qIndex - 1]];
                        setQuestions(newQ);
                      }
                    }}
                    disabled={qIndex === 0}
                    className="p-1.5 bg-slate-50 border border-slate-200 rounded text-slate-500 hover:text-indigo-600 disabled:opacity-30 transition-colors"
                    title="Di chuyển lên"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (qIndex < questions.length - 1) {
                        const newQ = [...questions];
                        [newQ[qIndex], newQ[qIndex + 1]] = [newQ[qIndex + 1], newQ[qIndex]];
                        setQuestions(newQ);
                      }
                    }}
                    disabled={qIndex === questions.length - 1}
                    className="p-1.5 bg-slate-50 border border-slate-200 rounded text-slate-500 hover:text-indigo-600 disabled:opacity-30 transition-colors"
                    title="Di chuyển xuống"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const newQ = questions.filter((_, i) => i !== qIndex);
                      setQuestions(newQ);
                    }}
                    className="p-1.5 bg-red-50 border border-red-200 rounded text-red-500 hover:text-red-700 hover:bg-red-100 transition-colors ml-2"
                    title="Xóa câu hỏi"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-slate-600">Điểm:</label>
                  <input 
                    type="number"
                    step="0.01"
                    value={q.points || 0}
                    onChange={e => {
                      const newQ = [...questions];
                      newQ[qIndex].points = parseFloat(e.target.value) || 0;
                      setQuestions(newQ);
                    }}
                    className="w-20 px-2 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 font-medium"
                  />
                </div>
              </div>

              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-slate-700">Nội dung câu hỏi</label>
                  <button
                    type="button"
                    onClick={() => {
                      setUploadTarget({ qIndex });
                      fileInputRef.current?.click();
                    }}
                    className="text-xs font-medium text-indigo-600 hover:bg-indigo-100 px-3 py-1.5 flex items-center gap-1.5 rounded-lg bg-indigo-50 border border-indigo-100 transition-colors"
                  >
                    <ImagePlus className="w-4 h-4" />
                    Chèn ảnh
                  </button>
                </div>
                <textarea 
                  value={q.text}
                  onChange={e => {
                    const newQ = [...questions];
                    newQ[qIndex].text = e.target.value;
                    setQuestions(newQ);
                  }}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 min-h-[100px]"
                  placeholder="Nhập nội dung câu hỏi (hỗ trợ Markdown)..."
                />
              </div>
              
              <div className="space-y-3">
                <label className="block text-sm font-medium text-slate-700">Các đáp án</label>
                {q.options.map((opt, optIndex) => (
                  <div key={optIndex} className="flex items-start gap-3">
                     <input 
                        type="radio" 
                        name={`correct-${qIndex}`}
                        checked={q.correctIndex === optIndex}
                        onChange={() => {
                          const newQ = [...questions];
                          newQ[qIndex].correctIndex = optIndex;
                          setQuestions(newQ);
                        }}
                        className="w-5 h-5 mt-2 text-green-600 focus:ring-green-500 cursor-pointer"
                        title="Đánh dấu đáp án đúng"
                     />
                     <div className="flex-1 flex flex-col gap-2">
                        <div className="flex gap-2 items-center">
                          <span className="font-bold text-slate-500">{String.fromCharCode(65 + optIndex)}.</span>
                          <textarea 
                            value={opt}
                            onChange={e => {
                              const newQ = [...questions];
                              newQ[qIndex].options[optIndex] = e.target.value;
                              setQuestions(newQ);
                            }}
                            className={`flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 min-h-[44px] ${q.correctIndex === optIndex ? 'border-green-300 bg-green-50' : 'border-slate-300'}`}
                            placeholder={`Đáp án ${String.fromCharCode(65 + optIndex)}`}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setUploadTarget({ qIndex, optIndex });
                              fileInputRef.current?.click();
                            }}
                            className="text-slate-400 hover:text-indigo-600 p-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
                            title="Chèn ảnh cho đáp án"
                          >
                            <ImagePlus className="w-4 h-4" />
                          </button>
                        </div>
                     </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Preview Side */}
            <div className="flex-1 p-6 bg-slate-50 flex flex-col border-t lg:border-t-0">
               <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Xem trước</div>
               <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm min-h-[200px]">
                  <div className="prose prose-slate max-w-none prose-sm prose-p:my-1 prose-img:my-4 prose-img:rounded-md prose-img:border prose-img:border-slate-200 prose-img:max-h-64 prose-img:object-contain mb-4">
                     {q.text ? <ReactMarkdown>{q.text}</ReactMarkdown> : <span className="text-slate-300 italic">Nội dung câu hỏi rỗng...</span>}
                  </div>
                  
                  {q.imageUrl && (
                    <div className="relative inline-block mb-6">
                      <img src={q.imageUrl} alt="Question" className="max-h-56 rounded border border-slate-200 shadow-sm" />
                      <button 
                        onClick={() => {
                          const newQ = [...questions];
                          newQ[qIndex].imageUrl = null;
                          setQuestions(newQ);
                        }}
                        className="absolute -top-2 -right-2 bg-white text-red-500 rounded-full shadow p-0.5 hover:bg-red-50"
                        title="Xóa ảnh câu hỏi"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  <div className="space-y-2 mt-4">
                     {q.options.map((opt, optIndex) => (
                        <div key={optIndex} className={`p-3 rounded-lg border ${q.correctIndex === optIndex ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-100'} flex items-start gap-3`}>
                           <span className={`font-bold flex-shrink-0 ${q.correctIndex === optIndex ? 'text-green-700' : 'text-slate-500'}`}>{String.fromCharCode(65 + optIndex)}.</span>
                           <div className="flex-1 w-full overflow-hidden">
                              <div className="prose prose-slate prose-sm max-w-none prose-p:my-0 prose-img:my-2 prose-img:rounded lg:prose-img:max-h-32 w-full">
                                <ReactMarkdown>{opt}</ReactMarkdown>
                              </div>
                              {q.optionImageUrls?.[optIndex] && (
                                <div className="mt-2 relative inline-block">
                                  <img src={q.optionImageUrls[optIndex]!} alt="Option" className="max-h-32 rounded border border-slate-200 bg-white" />
                                  <button 
                                    type="button"
                                    onClick={() => {
                                      const newQ = [...questions];
                                      if (newQ[qIndex].optionImageUrls) {
                                        newQ[qIndex].optionImageUrls![optIndex] = null;
                                      }
                                      setQuestions(newQ);
                                    }}
                                    className="absolute -top-2 -right-2 bg-white text-red-500 rounded-full shadow p-0.5 hover:bg-red-50"
                                    title="Xóa ảnh đáp án"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              )}
                           </div>
                           {q.correctIndex === optIndex && <span className="text-xs text-green-700 font-semibold uppercase shrink-0 pt-0.5 whitespace-nowrap">Đúng</span>}
                        </div>
                     ))}
                  </div>
               </div>
            </div>

          </div>
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
