import { useState } from 'react';
import { Question } from '../../../types';
import { parseQuestionsFromText } from '../../../utils/questionParser';
import { X, FileText, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react';

interface ImportQuestionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (questions: Question[]) => void;
}

export default function ImportQuestionsModal({ isOpen, onClose, onImport }: ImportQuestionsModalProps) {
  const [text, setText] = useState('');
  const [parsedQuestions, setParsedQuestions] = useState<Question[]>([]);
  const [step, setStep] = useState<'INPUT' | 'PREVIEW'>('INPUT');

  if (!isOpen) return null;

  const handleAnalyze = () => {
    const questions = parseQuestionsFromText(text);
    setParsedQuestions(questions);
    setStep('PREVIEW');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-300">
        
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-100 p-2 rounded-lg">
              <FileText className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Nhập câu hỏi từ văn bản</h2>
              <p className="text-sm text-gray-500">Copy từ Word, Google Docs hoặc file text</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {step === 'INPUT' ? (
            <div className="flex-1 p-6 flex flex-col gap-4">
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-sm text-blue-800">
                <p className="font-bold mb-2 flex items-center gap-2"><AlertCircle className="w-4 h-4"/> Hướng dẫn định dạng:</p>
                <ul className="list-disc pl-5 space-y-1 opacity-90">
                  <li>Câu hỏi bắt đầu bằng: <strong>Câu 1:, Bài 1:, 1.</strong></li>
                  <li>Đáp án trắc nghiệm: <strong>A. B. C. D.</strong> hoặc <strong>a) b) c) d)</strong></li>
                  <li>Phần đáp án đúng nằm ở cuối, sau từ khóa: <strong>Trả lời:</strong> hoặc <strong>Đáp án:</strong></li>
                  <li>Ví dụ: <em>1. A, 2. Đúng, 3. Hà Nội</em></li>
                </ul>
              </div>
              
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={`Ví dụ mẫu:
Câu 1: Thủ đô của Việt Nam là gì?
A. Hà Nội
B. TP.HCM
C. Đà Nẵng
D. Cần Thơ

Câu 2: 1 + 1 = 2 đúng không?

Trả lời:
1. A
2. Đúng`}
                className="flex-1 w-full p-4 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono text-sm resize-none"
              />
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
              <div className="space-y-4">
                {parsedQuestions.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    Không tìm thấy câu hỏi nào. Vui lòng kiểm tra lại định dạng.
                  </div>
                ) : (
                  parsedQuestions.map((q, idx) => (
                    <div key={idx} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                      <div className="flex justify-between items-start mb-2">
                        <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs font-bold uppercase">
                          {q.type === 'MULTIPLE_CHOICE' ? 'Trắc nghiệm' : q.type === 'TRUE_FALSE' ? 'Đúng/Sai' : 'Trả lời ngắn'}
                        </span>
                        {q.options.some(o => o.isCorrect) ? (
                          <span className="text-green-600 flex items-center gap-1 text-xs font-bold">
                            <CheckCircle className="w-3 h-3" /> Đã có đáp án
                          </span>
                        ) : (
                          <span className="text-orange-500 flex items-center gap-1 text-xs font-bold">
                            <AlertCircle className="w-3 h-3" /> Thiếu đáp án
                          </span>
                        )}
                      </div>
                      <h3 className="font-bold text-gray-900 mb-3">{idx + 1}. {q.text}</h3>
                      
                      <div className="space-y-2">
                        {q.options.map((opt, i) => (
                          <div key={i} className={`flex items-center gap-2 text-sm p-2 rounded-lg ${opt.isCorrect ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-gray-50 text-gray-600'}`}>
                            <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${opt.isCorrect ? 'border-green-600 bg-green-600 text-white' : 'border-gray-400'}`}>
                              {opt.isCorrect && <CheckCircle className="w-3 h-3" />}
                            </div>
                            {opt.text}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 bg-white flex justify-end gap-3">
          {step === 'INPUT' ? (
            <>
              <button onClick={onClose} className="px-6 py-2 text-gray-600 font-bold hover:bg-gray-100 rounded-xl transition-colors">
                Hủy
              </button>
              <button 
                onClick={handleAnalyze}
                disabled={!text.trim()}
                className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                Phân tích <ArrowRight className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setStep('INPUT')} className="px-6 py-2 text-gray-600 font-bold hover:bg-gray-100 rounded-xl transition-colors">
                Quay lại
              </button>
              <button 
                onClick={handleConfirm}
                disabled={parsedQuestions.length === 0}
                className="px-6 py-2 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                Nhập {parsedQuestions.length} câu hỏi
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
