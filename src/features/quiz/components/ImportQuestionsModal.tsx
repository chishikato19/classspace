import React, { useState } from 'react';
import { Question } from '../../../types';
import { parseQuestionsFromText } from '../../../utils/questionParser';
import { X, FileText, CheckCircle, AlertCircle, ArrowRight, Upload, ImagePlus, Copy, Check, BookOpen, Sparkles, HelpCircle } from 'lucide-react';
import { MathText } from '../../../components/MathText';
import { importQuestionsFromWord } from '../../exam/utils/wordImport';
import { auth, storage } from '../../../config/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

interface ImportQuestionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (questions: Question[]) => void;
}

const SAMPLE_TEXT_TEMPLATE = `PHẦN I. Câu trắc nghiệm nhiều phương án lựa chọn
Câu 1: Cho hàm số $y = x^3 - 3x^2 + 2$. Điểm cực đại của đồ thị hàm số là:
A. $(0; 2)$
*B. $(2; -2)$
C. $(1; 0)$
D. $(0; -2)$
Đáp án: B

PHẦN II. Câu trắc nghiệm đúng sai
Câu 2 (Đúng sai chùm): Cho hình chóp $S.ABCD$ có đáy $ABCD$ là hình vuông cạnh $a$, cạnh bên $SA \\perp (ABCD)$ và $SA = a\\sqrt{2}$. Xét tính đúng sai của các mệnh đề sau:
a) $SA \\perp BD$
b) Tam giác $SBC$ là tam giác vuông tại $B$
c) Góc giữa đường thẳng $SC$ và mặt phẳng $(ABCD)$ bằng $60^\\circ$
d) Thể tích khối chóp $S.ABCD$ bằng $\\frac{a^3\\sqrt{2}}{3}$
Đáp án: a.Đ, b.Đ, c.S, d.Đ

PHẦN III. Câu trắc nghiệm trả lời ngắn
Câu 3 (Trả lời ngắn): Cho hình nón có bán kính đáy $r = 3$ và đường sinh $l = 5$. Diện tích xung quanh của hình nón bằng bao nhiêu? (Lấy kết quả theo $\\pi$, ví dụ nhập: 15pi hoặc 15)
Đáp án: 15pi || 15`;

export default function ImportQuestionsModal({ isOpen, onClose, onImport }: ImportQuestionsModalProps) {
  const [text, setText] = useState('');
  const [parsedQuestions, setParsedQuestions] = useState<Question[]>([]);
  const [step, setStep] = useState<'INPUT' | 'PREVIEW'>('INPUT');
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [activeGuideTab, setActiveGuideTab] = useState<'ALL' | 'MCQ' | 'CLUSTER' | 'SHORT' | 'MATH'>('ALL');
  const [copiedTemplate, setCopiedTemplate] = useState(false);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingFile(true);
    try {
      const uid = auth.currentUser?.uid || 'anonymous';
      const { questions: examQuestions } = await importQuestionsFromWord(file, uid);
      
      const mappedQuestions: Question[] = examQuestions.map(eq => {
        let qType = 'SHORT_ANSWER';
        if (eq.type === 'multiple_choice' || eq.type === undefined) qType = 'MULTIPLE_CHOICE';
        else if (eq.type === 'true_false') qType = 'TRUE_FALSE';
        else if (eq.type === 'true_false_cluster') qType = 'TRUE_FALSE_CLUSTER';

        const options = eq.options.map((opt, i) => {
          let isCorrect = false;
          if (qType === 'TRUE_FALSE_CLUSTER' && eq.clusterAnswers) {
            isCorrect = !!eq.clusterAnswers[i];
          } else {
            isCorrect = (i === eq.correctIndex);
          }
          
          return {
            id: crypto.randomUUID(),
            text: opt,
            imageUrl: '',
            isCorrect
          };
        });

        if (qType === 'SHORT_ANSWER' && eq.shortAnswerText) {
          const parts = eq.shortAnswerText.split('||').map(s => s.trim()).filter(Boolean);
          parts.forEach(p => {
            options.push({
              id: crypto.randomUUID(),
              text: p,
              imageUrl: '',
              isCorrect: true
            });
          });
        }

        // If there are images in the parsed text ![Image](url), extract the first one for question image
        let finalText = eq.text;
        let imageUrl = '';

        const imgMatch = finalText.match(/!\[.*?\]\((.*?)\)/);
        if (imgMatch) {
           imageUrl = imgMatch[1];
           finalText = finalText.replace(imgMatch[0], '').trim();
        }

        return {
          id: crypto.randomUUID(),
          type: qType as any,
          text: finalText,
          imageUrl: imageUrl || '',
          options,
          timeLimit: 30,
          points: 100
        };
      });

      setParsedQuestions(mappedQuestions);
      setStep('PREVIEW');
    } catch (error) {
      console.error("Error reading file:", error);
      alert("Không thể đọc file Word. Vui lòng kiểm tra file .docx hoặc copy nội dung dán vào ô nhập.");
    } finally {
      setIsProcessingFile(false);
      e.target.value = '';
    }
  };

  const handleImageInsert = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !storage || !auth.currentUser) return;
    
    try {
      const ext = file.name.split('.').pop() || 'png';
      const fileName = `users/${auth.currentUser.uid}/exams/word_imports/${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
      const fileRef = ref(storage, fileName);
      await uploadBytes(fileRef, file);
      const url = await getDownloadURL(fileRef);
      
      const textarea = document.getElementById('text-input') as HTMLTextAreaElement;
      const imgMarkdown = `\n![Hình ảnh](${url})\n`;
      
      if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const newText = text.substring(0, start) + imgMarkdown + text.substring(end);
        setText(newText);
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(start + imgMarkdown.length, start + imgMarkdown.length);
        }, 10);
      } else {
        setText(prev => prev + imgMarkdown);
      }
    } catch (err) {
      console.error(err);
      alert('Tải ảnh lên thất bại!');
    } finally {
      e.target.value = '';
    }
  };

  const handleApplyTemplate = () => {
    setText(SAMPLE_TEXT_TEMPLATE);
    setCopiedTemplate(true);
    setTimeout(() => setCopiedTemplate(false), 2500);
  };

  const handleAnalyze = () => {
    const questions = parseQuestionsFromText(text);
    setParsedQuestions(questions);
    setStep('PREVIEW');
  };

  const handleToggleClusterOption = (qIdx: number, optIdx: number) => {
    setParsedQuestions(prev => {
      const next = [...prev];
      const targetQ = { ...next[qIdx] };
      const targetOpts = [...targetQ.options];
      targetOpts[optIdx] = {
        ...targetOpts[optIdx],
        isCorrect: !targetOpts[optIdx].isCorrect
      };
      targetQ.options = targetOpts;
      next[qIdx] = targetQ;
      return next;
    });
  };

  const handleSetCorrectMcq = (qIdx: number, optIdx: number) => {
    setParsedQuestions(prev => {
      const next = [...prev];
      const targetQ = { ...next[qIdx] };
      targetQ.options = targetQ.options.map((opt, i) => ({
        ...opt,
        isCorrect: i === optIdx
      }));
      next[qIdx] = targetQ;
      return next;
    });
  };

  const handleConfirm = () => {
    onImport(parsedQuestions);
    onClose();
    // Reset
    setText('');
    setParsedQuestions([]);
    setStep('INPUT');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-3 md:p-6">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-300">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-100 p-2.5 rounded-xl text-indigo-600 shadow-sm">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                Nhập câu hỏi từ Word (.docx) & Văn bản
                <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">Chuẩn GDPT 2018</span>
              </h2>
              <p className="text-xs text-gray-500">Hỗ trợ tự động 3 dạng câu hỏi: Trắc nghiệm 4 lựa chọn, Đúng/Sai chùm, và Trả lời ngắn</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1.5 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {step === 'INPUT' ? (
            <div className="flex-1 p-5 flex flex-col gap-3 overflow-y-auto">
              
              {/* Guidance Box with Tabs */}
              <div className="bg-gradient-to-r from-indigo-50/70 via-blue-50/50 to-purple-50/40 rounded-xl border border-indigo-100 p-4 shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-100/80 pb-3 mb-3">
                  <div className="flex items-center gap-2 text-indigo-900 font-bold text-sm">
                    <BookOpen className="w-4 h-4 text-indigo-600" />
                    <span>Hướng dẫn định dạng & quy tắc nhận diện file Word:</span>
                  </div>

                  <div className="flex items-center gap-1 bg-white/80 p-0.5 rounded-lg border border-indigo-100 text-xs">
                    <button
                      type="button"
                      onClick={() => setActiveGuideTab('ALL')}
                      className={`px-2.5 py-1 rounded-md font-medium transition-all ${activeGuideTab === 'ALL' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-indigo-600'}`}
                    >
                      Tổng quan
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveGuideTab('MCQ')}
                      className={`px-2.5 py-1 rounded-md font-medium transition-all ${activeGuideTab === 'MCQ' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-indigo-600'}`}
                    >
                      1. Trắc nghiệm
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveGuideTab('CLUSTER')}
                      className={`px-2.5 py-1 rounded-md font-medium transition-all ${activeGuideTab === 'CLUSTER' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-indigo-600'}`}
                    >
                      2. Đúng/Sai chùm
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveGuideTab('SHORT')}
                      className={`px-2.5 py-1 rounded-md font-medium transition-all ${activeGuideTab === 'SHORT' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-indigo-600'}`}
                    >
                      3. Trả lời ngắn
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveGuideTab('MATH')}
                      className={`px-2.5 py-1 rounded-md font-medium transition-all ${activeGuideTab === 'MATH' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-indigo-600'}`}
                    >
                      Công thức Toán & Ảnh
                    </button>
                  </div>
                </div>

                {/* Tab 1: Tổng quan */}
                {activeGuideTab === 'ALL' && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-700">
                    <div className="bg-white/80 p-3 rounded-lg border border-indigo-100 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-1.5 font-bold text-indigo-700 mb-1.5">
                          <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[11px]">I</span>
                          Trắc nghiệm (4 lựa chọn)
                        </div>
                        <p className="text-slate-600 leading-relaxed mb-2">Bắt đầu bằng <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-700">Câu 1:</code>, các ý <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">A. B. C. D.</code></p>
                      </div>
                      <div className="bg-slate-50 p-2 rounded border border-slate-100 font-mono text-[11px] text-slate-600">
                        *A. Đáp án đúng<br/>
                        B. Lựa chọn sai<br/>
                        <span className="text-indigo-600">Hoặc ghi: Đáp án: A</span>
                      </div>
                    </div>

                    <div className="bg-white/80 p-3 rounded-lg border border-amber-200 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-1.5 font-bold text-amber-700 mb-1.5">
                          <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-[11px]">II</span>
                          Đúng / Sai chùm (4 ý a,b,c,d)
                        </div>
                        <p className="text-slate-600 leading-relaxed mb-2">Ghi <code className="bg-slate-100 px-1 py-0.5 rounded text-amber-700">(Đúng sai chùm)</code> hoặc đặt dưới <code className="bg-slate-100 px-1 py-0.5 rounded font-medium">PHẦN II</code>.</p>
                      </div>
                      <div className="bg-slate-50 p-2 rounded border border-slate-100 font-mono text-[11px] text-slate-600">
                        a) Mệnh đề 1<br/>
                        b) Mệnh đề 2<br/>
                        <span className="text-amber-700 font-semibold">Đáp án: a.Đ, b.S, c.Đ, d.S</span>
                      </div>
                    </div>

                    <div className="bg-white/80 p-3 rounded-lg border border-emerald-200 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-1.5 font-bold text-emerald-700 mb-1.5">
                          <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[11px]">III</span>
                          Trả lời ngắn (Điền số / từ)
                        </div>
                        <p className="text-slate-600 leading-relaxed mb-2">Ghi <code className="bg-slate-100 px-1 py-0.5 rounded text-emerald-700">(Trả lời ngắn)</code> hoặc đặt dưới <code className="bg-slate-100 px-1 py-0.5 rounded font-medium">PHẦN III</code>.</p>
                      </div>
                      <div className="bg-slate-50 p-2 rounded border border-slate-100 font-mono text-[11px] text-slate-600">
                        Câu 3 (Trả lời ngắn): Tính diện tích...<br/>
                        <span className="text-emerald-700 font-semibold">Đáp án: 12.5 || 25/2</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab 2: MCQ */}
                {activeGuideTab === 'MCQ' && (
                  <div className="bg-white/90 p-3.5 rounded-lg border border-indigo-100 text-xs text-slate-700 space-y-2">
                    <p className="font-bold text-indigo-900">Quy tắc định dạng Câu trắc nghiệm 4 lựa chọn (Phần I):</p>
                    <ul className="list-disc pl-5 space-y-1 leading-relaxed">
                      <li>Bắt đầu câu hỏi bằng: <strong>Câu 1:</strong> hoặc <strong>Bài 1:</strong> hoặc đặt dưới tiêu đề <strong>PHẦN I. CÂU TRẮC NGHIỆM NHIỀU PHƯƠNG ÁN LỰA CHỌN</strong>.</li>
                      <li>Các phương án bắt đầu bằng: <strong>A.</strong>, <strong>B.</strong>, <strong>C.</strong>, <strong>D.</strong> (hoặc <strong>A)</strong>, <strong>B)</strong>...). Có thể nằm trên từng dòng hoặc cùng dòng cách nhau khoảng trắng.</li>
                      <li><strong>Cách đánh dấu đáp án đúng:</strong>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-1 font-mono text-[11px]">
                          <span className="bg-indigo-50 p-1.5 rounded border border-indigo-100 text-indigo-800">1. Dấu sao: *A. Phương án đúng</span>
                          <span className="bg-indigo-50 p-1.5 rounded border border-indigo-100 text-indigo-800">2. Gạch chân trong Word: <u>A. Đúng</u></span>
                          <span className="bg-indigo-50 p-1.5 rounded border border-indigo-100 text-indigo-800">3. Dòng riêng: Đáp án: A</span>
                        </div>
                      </li>
                      <li>Hỗ trợ bảng đáp án ở cuối văn bản: <code className="bg-slate-100 px-1 rounded font-mono">BẢNG ĐÁP ÁN: 1.A  2.B  3.C  4.D</code></li>
                    </ul>
                  </div>
                )}

                {/* Tab 3: True/False Cluster */}
                {activeGuideTab === 'CLUSTER' && (
                  <div className="bg-white/90 p-3.5 rounded-lg border border-amber-200 text-xs text-slate-700 space-y-2">
                    <p className="font-bold text-amber-900">Quy tắc định dạng Câu hỏi Đúng / Sai chùm (Phần II - Theo chuẩn thi 2025):</p>
                    <ul className="list-disc pl-5 space-y-1 leading-relaxed">
                      <li>Bắt đầu bằng từ khóa: <strong>Câu 1 (chùm đúng sai):</strong> hoặc <strong>Câu 1 (đúng/sai chùm):</strong> hoặc đặt dưới tiêu đề <strong>PHẦN II. CÂU TRẮC NGHIỆM ĐÚNG SAI</strong>.</li>
                      <li>Nội dung gồm 4 ý lựa chọn bắt đầu bằng: <strong>a)</strong>, <strong>b)</strong>, <strong>c)</strong>, <strong>d)</strong> (hoặc <strong>a.</strong>, <strong>b.</strong>, <strong>c.</strong>, <strong>d.</strong>).</li>
                      <li><strong>Cách ghi đáp án Đúng/Sai cho từng ý:</strong>
                        <div className="mt-1 space-y-1 font-mono text-[11px]">
                          <div className="bg-amber-50 p-1.5 rounded border border-amber-200 text-amber-900">
                            <strong>Dạng chữ cái (Khuyên dùng):</strong> <code className="font-bold">Đáp án: a.Đ, b.S, c.Đ, d.S</code> (hoặc <code className="font-bold">a) Đúng, b) Sai, c) Đúng, d) Sai</code>)
                          </div>
                          <div className="bg-amber-50 p-1.5 rounded border border-amber-200 text-amber-900">
                            <strong>Dạng thứ tự:</strong> <code className="font-bold">Đáp án: Đúng, Sai, Đúng, Sai</code> (hoặc <code className="font-bold">Đ, S, Đ, S</code>)
                          </div>
                          <div className="bg-amber-50 p-1.5 rounded border border-amber-200 text-amber-900">
                            <strong>Dấu sao / gạch chân:</strong> Đặt dấu <code className="font-bold">*a)</code> trước những ý Đúng, các ý Sai không đánh dấu sao.
                          </div>
                        </div>
                      </li>
                    </ul>
                  </div>
                )}

                {/* Tab 4: Short Answer */}
                {activeGuideTab === 'SHORT' && (
                  <div className="bg-white/90 p-3.5 rounded-lg border border-emerald-200 text-xs text-slate-700 space-y-2">
                    <p className="font-bold text-emerald-900">Quy tắc định dạng Câu hỏi Trả lời ngắn (Phần III - Tự luận điền kết quả):</p>
                    <ul className="list-disc pl-5 space-y-1 leading-relaxed">
                      <li>Bắt đầu bằng từ khóa: <strong>Câu 1 (trả lời ngắn):</strong> hoặc <strong>Câu 1 (tln):</strong> hoặc đặt dưới tiêu đề <strong>PHẦN III. CÂU TRẮC NGHIỆM TRẢ LỜI NGẮN</strong>.</li>
                      <li>Câu hỏi loại này <strong>không có các lựa chọn A, B, C, D</strong>.</li>
                      <li>Ghi đáp án đúng ngay dưới câu hỏi: <strong>Đáp án: [kết quả]</strong>.</li>
                      <li>Nếu có nhiều cách viết đúng chấp nhận được, phân tách bằng dấu hai gạch đứng <code className="bg-emerald-100 text-emerald-800 px-1 py-0.5 rounded font-mono font-bold">||</code>.
                        <div className="mt-1 bg-emerald-50 p-2 rounded border border-emerald-200 font-mono text-[11px] text-emerald-900">
                          Ví dụ 1: <code>Đáp án: 12.5 || 12,5 || 25/2</code><br/>
                          Ví dụ 2: <code>Đáp án: Hà Nội || TP Hà Nội || thanh pho Ha Noi</code>
                        </div>
                      </li>
                    </ul>
                  </div>
                )}

                {/* Tab 5: Math & Images */}
                {activeGuideTab === 'MATH' && (
                  <div className="bg-white/90 p-3.5 rounded-lg border border-purple-200 text-xs text-slate-700 space-y-2">
                    <p className="font-bold text-purple-900">Hỗ trợ Công thức Toán học & Trích xuất Hình ảnh:</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-1">
                      <div className="bg-purple-50/60 p-2.5 rounded border border-purple-200">
                        <strong className="text-purple-800 block mb-1">Công thức Toán học (Equation & LaTeX):</strong>
                        <ul className="list-disc pl-4 space-y-1">
                          <li><strong>Equation trong file Word:</strong> Tự động nhận diện và chuyển đổi mọi công thức tạo bằng Word Equation (Alt +=) sang chuẩn LaTeX.</li>
                          <li><strong>Mã LaTeX gõ tay:</strong> Đặt giữa cặp dấu <code className="bg-white px-1 rounded font-mono text-purple-700">$...$</code> cho công thức trên dòng hoặc <code className="bg-white px-1 rounded font-mono text-purple-700">$$...$$</code> cho khối công thức.</li>
                          <li>Ví dụ: <code className="bg-white px-1 rounded font-mono text-purple-700">{'$\\sqrt{x^2+1} = \\frac{a}{b}$'}</code></li>
                        </ul>
                      </div>
                      <div className="bg-blue-50/60 p-2.5 rounded border border-blue-200">
                        <strong className="text-blue-800 block mb-1">Hình ảnh đính kèm:</strong>
                        <ul className="list-disc pl-4 space-y-1">
                          <li><strong>Từ file Word:</strong> Mọi hình ảnh nhúng trong file .docx sẽ được trích xuất tự động và tải trực tiếp lên kho lưu trữ Firebase.</li>
                          <li><strong>Dán văn bản thủ công:</strong> Bấm nút <i>"Chèn ảnh vào văn bản"</i> để tải ảnh từ máy tính và chèn mã ảnh vào vị trí con trỏ chuột.</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Bar */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm text-sm font-semibold transition-all">
                    <Upload className="w-4 h-4" />
                    {isProcessingFile ? 'Đang đọc & trích xuất file...' : 'Tải file Word (.docx)'}
                    <input 
                      type="file" 
                      accept=".docx" 
                      className="hidden" 
                      onChange={handleFileUpload}
                      disabled={isProcessingFile}
                    />
                  </label>

                  <button
                    type="button"
                    onClick={handleApplyTemplate}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg text-sm font-semibold text-amber-800 transition-colors shadow-xs"
                    title="Chèn mẫu văn bản chứa đầy đủ 3 dạng câu hỏi vào ô nhập để xem thử"
                  >
                    {copiedTemplate ? <Check className="w-4 h-4 text-green-600" /> : <Sparkles className="w-4 h-4 text-amber-600" />}
                    {copiedTemplate ? 'Đã điền mẫu!' : 'Chèn văn bản mẫu 3 dạng câu hỏi'}
                  </button>

                  <label className="cursor-pointer inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-xs">
                    <ImagePlus className="w-4 h-4 text-indigo-600" />
                    Chèn ảnh
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={handleImageInsert}
                    />
                  </label>
                </div>

                <div className="text-xs text-slate-500 flex items-center gap-1">
                  <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                  Bạn có thể dán nội dung từ Word hoặc tải file .docx trực tiếp
                </div>
              </div>
              
              {/* Textarea Input */}
              <div className="flex-1 flex flex-col min-h-[220px]">
                <textarea
                  id="text-input"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={`Dán nội dung câu hỏi từ Word hoặc Google Docs vào đây...

Ví dụ nhanh:
Câu 1: Hàm số nào sau đây nghịch biến trên R?
A. y = x^3
*B. y = -x^3 - x
C. y = x^2
D. y = 1/x
Đáp án: B

Câu 2 (Đúng sai chùm): Cho hình chóp S.ABC có đáy là tam giác vuông tại B...
a) SA vuông góc với đáy
b) Góc phẳng nhị diện [S, BC, A] bằng 45 độ
c) Thể tích bằng a^3 / 3
d) Bán kính mặt cầu ngoại tiếp bằng a
Đáp án: a.Đ, b.Đ, c.S, d.S

Câu 3 (Trả lời ngắn): Tính diện tích hình tròn có bán kính r = 3 (lấy pi = 3.14).
Đáp án: 28.26`}
                  className="flex-1 w-full p-4 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono text-xs sm:text-sm resize-none bg-slate-50/40 leading-relaxed"
                />
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="text-sm font-bold text-slate-700">
                    Kết quả nhận diện: <span className="text-indigo-600">{parsedQuestions.length} câu hỏi</span>
                  </span>
                  <span className="text-xs text-slate-500">
                    Nhấp vào các nhãn Đúng/Sai hoặc Đáp án để chỉnh sửa nhanh trước khi nhập
                  </span>
                </div>

                {parsedQuestions.length === 0 ? (
                  <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300 text-gray-500">
                    <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-2" />
                    <p className="font-semibold text-gray-700">Không tìm thấy câu hỏi nào hợp lệ</p>
                    <p className="text-xs text-gray-400 mt-1">Vui lòng kiểm tra lại định dạng câu hỏi bắt đầu bằng "Câu 1:" hoặc bấm "Quay lại".</p>
                  </div>
                ) : (
                  parsedQuestions.map((q, idx) => (
                    <div key={idx} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm transition-all hover:border-indigo-200">
                      <div className="flex justify-between items-start mb-2.5">
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-0.5 rounded text-xs font-bold uppercase tracking-wider ${
                            q.type === 'MULTIPLE_CHOICE' ? 'bg-indigo-100 text-indigo-700' :
                            q.type === 'TRUE_FALSE_CLUSTER' ? 'bg-amber-100 text-amber-800' :
                            q.type === 'SHORT_ANSWER' ? 'bg-emerald-100 text-emerald-800' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {q.type === 'MULTIPLE_CHOICE' ? 'Trắc nghiệm 4 lựa chọn' :
                             q.type === 'TRUE_FALSE_CLUSTER' ? 'Đúng / Sai chùm (4 ý)' :
                             q.type === 'SHORT_ANSWER' ? 'Trả lời ngắn' : 'Đúng / Sai'}
                          </span>
                          <span className="text-xs text-slate-400">Câu {idx + 1}</span>
                        </div>

                        {q.type === 'SHORT_ANSWER' ? (
                          q.options.length > 0 ? (
                            <span className="text-emerald-600 flex items-center gap-1 text-xs font-bold bg-emerald-50 px-2 py-0.5 rounded">
                              <CheckCircle className="w-3.5 h-3.5" /> Có {q.options.length} đáp án chấp nhận
                            </span>
                          ) : (
                            <span className="text-amber-500 flex items-center gap-1 text-xs font-bold bg-amber-50 px-2 py-0.5 rounded">
                              <AlertCircle className="w-3.5 h-3.5" /> Chưa có đáp án
                            </span>
                          )
                        ) : q.type === 'TRUE_FALSE_CLUSTER' ? (
                          <span className="text-amber-700 flex items-center gap-1 text-xs font-bold bg-amber-50 px-2 py-0.5 rounded">
                            <CheckCircle className="w-3.5 h-3.5" /> {q.options.filter(o => o.isCorrect).length} Đúng / {q.options.filter(o => !o.isCorrect).length} Sai
                          </span>
                        ) : (
                          q.options.some(o => o.isCorrect) ? (
                            <span className="text-green-600 flex items-center gap-1 text-xs font-bold bg-green-50 px-2 py-0.5 rounded">
                              <CheckCircle className="w-3.5 h-3.5" /> Đã chọn đáp án đúng
                            </span>
                          ) : (
                            <span className="text-red-500 flex items-center gap-1 text-xs font-bold bg-red-50 px-2 py-0.5 rounded">
                              <AlertCircle className="w-3.5 h-3.5" /> Chưa đánh dấu đáp án đúng
                            </span>
                          )
                        )}
                      </div>

                      <h3 className="font-bold text-gray-900 mb-3 text-sm leading-relaxed">
                        <span className="text-indigo-600 mr-1.5">{idx + 1}.</span>
                        <MathText text={q.text} />
                      </h3>

                      {q.imageUrl && (
                        <div className="mb-3">
                          <img src={q.imageUrl} alt="Question" className="max-h-40 rounded-lg border border-gray-200 shadow-xs" />
                        </div>
                      )}
                      
                      {/* Options / Sub-items based on question type */}
                      {q.type === 'TRUE_FALSE_CLUSTER' ? (
                        <div className="space-y-2 mt-2">
                          {q.options.map((opt, i) => (
                            <div 
                              key={i} 
                              className={`flex items-center justify-between gap-3 text-xs sm:text-sm p-2.5 rounded-lg border transition-all ${
                                opt.isCorrect 
                                  ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900' 
                                  : 'bg-rose-50/70 border-rose-200 text-rose-900'
                              }`}
                            >
                              <div className="flex items-start gap-2 flex-1">
                                <span className="font-bold uppercase tracking-wider text-slate-700">
                                  {String.fromCharCode(97 + i)})
                                </span>
                                <div className="flex-1">
                                  <MathText text={opt.text} />
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleToggleClusterOption(idx, i)}
                                className={`px-2.5 py-1 rounded text-xs font-bold uppercase transition-all shadow-xs cursor-pointer ${
                                  opt.isCorrect
                                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                    : 'bg-rose-600 hover:bg-rose-700 text-white'
                                }`}
                                title="Nhấp để chuyển đổi Đúng / Sai"
                              >
                                {opt.isCorrect ? 'ĐÚNG' : 'SAI'}
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : q.type === 'SHORT_ANSWER' ? (
                        <div className="bg-emerald-50/50 p-3 rounded-lg border border-emerald-100 text-xs sm:text-sm">
                          <span className="font-semibold text-emerald-900 block mb-1.5">Đáp án chấp nhận:</span>
                          <div className="flex flex-wrap gap-2">
                            {q.options.map((opt, i) => (
                              <span key={i} className="inline-flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-md border border-emerald-200 font-mono text-emerald-800 shadow-xs font-semibold">
                                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                                <MathText text={opt.text} />
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1.5 mt-2">
                          {q.options.map((opt, i) => (
                            <div 
                              key={i} 
                              onClick={() => handleSetCorrectMcq(idx, i)}
                              className={`flex items-center gap-2.5 text-xs sm:text-sm p-2 rounded-lg border cursor-pointer transition-all ${
                                opt.isCorrect 
                                  ? 'bg-green-50 text-green-900 border-green-300 font-medium' 
                                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 text-xs font-bold ${
                                opt.isCorrect 
                                  ? 'border-green-600 bg-green-600 text-white' 
                                  : 'border-slate-300 bg-white text-slate-500'
                              }`}>
                                {String.fromCharCode(65 + i)}
                              </div>
                              <div className="flex-1">
                                <MathText text={opt.text} />
                              </div>
                              {opt.isCorrect && (
                                <span className="text-xs text-green-700 font-bold bg-green-100 px-2 py-0.5 rounded">
                                  Đáp án đúng
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-white flex justify-between items-center gap-3">
          {step === 'INPUT' ? (
            <>
              <div className="text-xs text-slate-500">
                {text.trim() ? `${text.trim().split('\n').length} dòng văn bản` : 'Chưa có nội dung'}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={onClose} className="px-5 py-2 text-gray-600 font-bold hover:bg-gray-100 rounded-xl transition-colors text-sm">
                  Đóng
                </button>
                <button 
                  onClick={handleAnalyze}
                  disabled={!text.trim()}
                  className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2 text-sm shadow-sm"
                >
                  Phân tích câu hỏi <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </>
          ) : (
            <>
              <button 
                onClick={() => setStep('INPUT')} 
                className="px-5 py-2 text-gray-600 font-bold hover:bg-gray-100 rounded-xl transition-colors text-sm"
              >
                Quay lại sửa văn bản
              </button>
              <button 
                onClick={handleConfirm}
                disabled={parsedQuestions.length === 0}
                className="px-6 py-2 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center gap-2 text-sm shadow-sm"
              >
                <CheckCircle className="w-4 h-4" />
                Nhập {parsedQuestions.length} câu hỏi vào đề
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
