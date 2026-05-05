import React, { useState, useRef } from 'react';
import { ArrowUp, ArrowDown, Trash2, ImagePlus, X, Type } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

import { QuestionType } from '../types';

export interface EditorQuestionData {
  id?: string;
  type?: QuestionType; // undefined corresponds to multiple_choice
  text: string;
  imageUrl?: string | null;
  options: string[];
  optionImageUrls?: (string | null)[];
  correctIndex: number;
  clusterAnswers?: boolean[];
  shortAnswerText?: string;
  points: number;
}

const COMMON_SYMBOLS = [
  'α', 'β', 'γ', 'δ', 'ε', 'λ', 'μ', 'π', 'σ', 'τ', 'φ', 'ω', 
  'Δ', 'Ω', 'θ', 'η', '±', '×', '÷', '√', '∞', '≈', '≠', '≤', 
  '≥', '°', '²', '³', '⁰', '¹', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹',
  '₀', '₁', '₂', '₃', '₄', '₅', '₆', '₇', '₈', '₉',
  '→', '←', '↑', '↓', '⊥', '∥', '∠', '△'
];

interface SymbolPickerProps {
  onSelect: (symbol: string) => void;
}

function SymbolPicker({ onSelect }: SymbolPickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative inline-block text-left">
      <button
        type="button"
        onPointerDown={(e) => e.preventDefault()}
        onMouseDown={(e) => e.preventDefault()}
        onClick={(e) => {
          e.preventDefault();
          setIsOpen(!isOpen);
        }}
        className="text-xs font-medium text-slate-600 hover:bg-slate-200 px-2 py-1 flex items-center gap-1 rounded bg-slate-100 border border-slate-200 transition-colors"
        title="Chèn kí tự đặc biệt (Ω, λ, Δ...)"
      >
        <Type className="w-3.5 h-3.5" />
        Kí tự
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)} 
          />
          <div className="absolute right-0 mt-1 w-64 bg-white border border-slate-200 rounded-lg shadow-xl z-20 p-2 grid grid-cols-8 gap-1">
            {COMMON_SYMBOLS.map(symbol => (
              <button
                key={symbol}
                type="button"
                onPointerDown={(e) => e.preventDefault()}
                onMouseDown={(e) => e.preventDefault()}
                onClick={(e) => {
                  e.preventDefault();
                  onSelect(symbol);
                }}
                className="w-7 h-7 flex items-center justify-center text-sm border border-slate-100 rounded hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-all"
              >
                {symbol}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

interface QuestionEditorCardProps {
  q: EditorQuestionData;
  qIndex: number;
  totalQuestions: number;
  onChange: (qIndex: number, newQ: EditorQuestionData) => void;
  onMoveUp: (qIndex: number) => void;
  onMoveDown: (qIndex: number) => void;
  onDelete: (qIndex: number) => void;
  onRequestImageUpload: (qIndex: number, optIndex?: number) => void;
  onImageRemoved?: (url: string) => void;
}

export function QuestionEditorCard({
  q, qIndex, totalQuestions, onChange, onMoveUp, onMoveDown, onDelete, onRequestImageUpload, onImageRemoved
}: QuestionEditorCardProps) {
  
  const questionTextareaRef = useRef<HTMLTextAreaElement>(null);
  const optionRefs = useRef<(HTMLTextAreaElement | null)[]>([]);

  const updateQuestion = (updates: Partial<EditorQuestionData>) => {
    onChange(qIndex, { ...q, ...updates });
  };

  const updateOption = (optIndex: number, newValue: string) => {
    const newOptions = [...q.options];
    newOptions[optIndex] = newValue;
    updateQuestion({ options: newOptions });
  };

  const insertAtCursor = (ref: React.RefObject<HTMLTextAreaElement | null>, currentText: string, symbol: string, onUpdate: (newVal: string) => void) => {
    if (!ref.current) {
      onUpdate(currentText + symbol);
      return;
    }

    const { selectionStart, selectionEnd } = ref.current;
    const newText = 
      currentText.substring(0, selectionStart) + 
      symbol + 
      currentText.substring(selectionEnd);
    
    onUpdate(newText);

    // Set cursor position after the symbol
    setTimeout(() => {
      if (ref.current) {
        ref.current.focus();
        ref.current.setSelectionRange(selectionStart + symbol.length, selectionStart + symbol.length);
      }
    }, 0);
  };

  const removeImage = () => {
    if (q.imageUrl && onImageRemoved) {
      onImageRemoved(q.imageUrl);
    }
    updateQuestion({ imageUrl: null });
  };

  const removeOptionImage = (optIndex: number) => {
    if (!q.optionImageUrls) return;
    const url = q.optionImageUrls[optIndex];
    if (url && onImageRemoved) {
      onImageRemoved(url);
    }
    const newUrls = [...q.optionImageUrls];
    newUrls[optIndex] = null;
    updateQuestion({ optionImageUrls: newUrls });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col lg:flex-row relative">
      {/* Editor Side */}
      <div className="flex-1 p-6 border-b lg:border-b-0 lg:border-r border-slate-200 relative">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <div className="text-slate-600 font-bold text-sm bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
              Câu {qIndex + 1}
            </div>
            <button
              type="button"
              onClick={() => onMoveUp(qIndex)}
              disabled={qIndex === 0}
              className="p-1.5 bg-slate-50 border border-slate-200 rounded text-slate-500 hover:text-indigo-600 disabled:opacity-30 transition-colors"
              title="Di chuyển lên"
            >
              <ArrowUp className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onMoveDown(qIndex)}
              disabled={qIndex === totalQuestions - 1}
              className="p-1.5 bg-slate-50 border border-slate-200 rounded text-slate-500 hover:text-indigo-600 disabled:opacity-30 transition-colors"
              title="Di chuyển xuống"
            >
              <ArrowDown className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onDelete(qIndex)}
              className="p-1.5 bg-red-50 border border-red-200 rounded text-red-500 hover:text-red-700 hover:bg-red-100 transition-colors ml-2"
              title="Xóa câu hỏi"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-3">
             <div className="flex items-center gap-2 border-r border-slate-200 pr-3">
               <label className="text-sm font-medium text-slate-600">Loại:</label>
               <select 
                 value={q.type || 'multiple_choice'}
                 onChange={e => {
                     const t = e.target.value as QuestionType;
                     if (t === 'true_false') {
                       updateQuestion({ type: t, options: ['Đúng', 'Sai'], optionImageUrls: [null, null], correctIndex: Math.min(q.correctIndex, 1) });
                     } else if (t === 'true_false_cluster') {
                       const baseOpts = q.options.length >= 4 ? q.options.slice(0, 4) : ['', '', '', ''];
                       updateQuestion({ type: t, options: baseOpts, clusterAnswers: [false, false, false, false] });
                     } else if (t === 'short_answer') {
                       updateQuestion({ type: t, options: [], optionImageUrls: [] });
                     } else {
                       updateQuestion({ type: t, options: q.options.length >= 2 ? q.options.concat(['', '']).slice(0, 4) : ['', '', '', ''], correctIndex: Math.min(q.correctIndex, 3) });
                     }
                 }}
                 className="text-sm px-2 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 font-medium bg-white"
               >
                 <option value="multiple_choice">Nhiều lựa chọn</option>
                 <option value="true_false">Đúng / Sai</option>
                 <option value="true_false_cluster">Câu chùm Đúng / Sai</option>
                 <option value="short_answer">Trả lời ngắn</option>
               </select>
             </div>
            <label className="text-sm font-medium text-slate-600">Điểm:</label>
            <input 
              type="number"
              step="0.01"
              value={q.points || 0}
              onChange={e => updateQuestion({ points: parseFloat(e.target.value) || 0 })}
              className="w-20 px-2 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 font-medium"
            />
          </div>
        </div>

        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-4">
              <label className="block text-sm font-medium text-slate-700">Nội dung câu hỏi</label>
              <SymbolPicker onSelect={(s) => insertAtCursor(questionTextareaRef as any, q.text, s, (val) => updateQuestion({ text: val }))} />
            </div>
            <button
              type="button"
              onClick={() => onRequestImageUpload(qIndex)}
              className="text-xs font-medium text-indigo-600 hover:bg-indigo-100 px-3 py-1.5 flex items-center gap-1.5 rounded-lg bg-indigo-50 border border-indigo-100 transition-colors"
            >
              <ImagePlus className="w-4 h-4" />
              Chèn ảnh
            </button>
          </div>
          <textarea 
            ref={questionTextareaRef}
            value={q.text}
            onChange={e => updateQuestion({ text: e.target.value })}
            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 min-h-[100px]"
            placeholder="Nhập nội dung câu hỏi (hỗ trợ Markdown)..."
          />
        </div>
        
        <div className="space-y-3">
          <label className="block text-sm font-medium text-slate-700">Các đáp án</label>
          {q.type === 'short_answer' ? (
             <div className="flex flex-col gap-2">
               <input 
                 type="text" 
                 value={q.shortAnswerText || ''}
                 onChange={e => updateQuestion({ shortAnswerText: e.target.value })}
                 placeholder="Nhập đáp án đúng (có thể nhập nhiều đáp án cách nhau bởi dấu ||)"
                 className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
               />
               <p className="text-xs text-slate-500">Học sinh cần nhập chính xác (không phân biệt hoa/thường). Có thể cung cấp nhiều cách viết đúng bằng cách tách nhau với kí hiệu || (ví dụ: Hà Nội || Thu do Ha Noi)</p>
             </div>
          ) : (
            q.options.map((opt, optIndex) => (
            <div key={optIndex} className="flex items-start gap-3">
               {q.type === 'true_false_cluster' ? (
                 <div className="flex flex-col items-center mt-1 gap-1">
                   <select 
                     value={q.clusterAnswers?.[optIndex] ? 'true' : 'false'}
                     onChange={(e) => {
                       const newAnswers = [...(q.clusterAnswers || [false, false, false, false])];
                       newAnswers[optIndex] = e.target.value === 'true';
                       updateQuestion({ clusterAnswers: newAnswers });
                     }}
                     className={`text-xs px-1 py-1 border rounded font-semibold cursor-pointer ${q.clusterAnswers?.[optIndex] ? 'bg-green-100 text-green-700 border-green-300' : 'bg-red-100 text-red-700 border-red-300'}`}
                   >
                     <option value="true">Đ</option>
                     <option value="false">S</option>
                   </select>
                 </div>
               ) : (
                 <input 
                    type="radio" 
                    name={`correct-${qIndex}`}
                    checked={q.correctIndex === optIndex}
                    onChange={() => updateQuestion({ correctIndex: optIndex })}
                    className="w-5 h-5 mt-2 text-green-600 focus:ring-green-500 cursor-pointer"
                    title="Đánh dấu đáp án đúng"
                 />
               )}
               <div className="flex-1 flex flex-col gap-2">
                  <div className="flex gap-2 items-center">
                    <div className="flex flex-col items-center">
                      <span className="font-bold text-slate-500">{String.fromCharCode(65 + optIndex)}.</span>
                      <div className="mt-1">
                        <SymbolPicker onSelect={(s) => {
                          const refWrapper = { current: optionRefs.current[optIndex] };
                          insertAtCursor(refWrapper as any, opt, s, (val) => updateOption(optIndex, val));
                        }} />
                      </div>
                    </div>
                    {q.type === 'true_false' ? (
                       <input 
                         value={opt}
                         readOnly
                         className={`flex-1 px-3 py-2 border rounded-lg min-h-[44px] bg-slate-50 font-medium ${q.correctIndex === optIndex ? 'border-green-300 text-green-700' : 'border-slate-300 text-slate-700'}`}
                       />
                    ) : (
                      <>
                        <textarea 
                          ref={el => { optionRefs.current[optIndex] = el; }}
                          value={opt}
                          onChange={e => updateOption(optIndex, e.target.value)}
                          className={`flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 min-h-[44px] ${(q.type === 'true_false_cluster' ? false : q.correctIndex === optIndex) ? 'border-green-300 bg-green-50' : 'border-slate-300'}`}
                          placeholder={`Đáp án ${String.fromCharCode(65 + optIndex)}`}
                        />
                        <button
                          type="button"
                          onClick={() => onRequestImageUpload(qIndex, optIndex)}
                          className="text-slate-400 hover:text-indigo-600 p-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
                          title="Chèn ảnh cho đáp án"
                        >
                          <ImagePlus className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
               </div>
            </div>
            ))
          )}
        </div>
      </div>

      {/* Preview Side */}
      <div className="flex-1 p-6 bg-slate-50 flex flex-col border-t lg:border-t-0">
         <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Xem trước</div>
         <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm min-h-[200px]">
            <div className="prose prose-slate max-w-none prose-sm prose-p:my-1 prose-img:my-4 prose-img:rounded-md prose-img:border prose-img:border-slate-200 prose-img:max-h-64 prose-img:object-contain mb-4">
               {q.text ? <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{q.text}</ReactMarkdown> : <span className="text-slate-300 italic">Nội dung câu hỏi rỗng...</span>}
            </div>
            
            {q.imageUrl && (
              <div className="relative inline-block mb-6">
                <img src={q.imageUrl} alt="Question" className="max-h-56 rounded border border-slate-200 shadow-sm" />
                <button 
                  onClick={removeImage}
                  className="absolute -top-2 -right-2 bg-white text-red-500 rounded-full shadow p-0.5 hover:bg-red-50"
                  title="Xóa ảnh câu hỏi"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            <div className="space-y-2 mt-4">
               {q.type === 'short_answer' ? (
                  <div className="p-3 rounded-lg border bg-slate-50 border-slate-200">
                    <span className="font-semibold text-slate-700 block mb-2">Đáp án (Trả lời ngắn):</span>
                    <div className="text-sm font-medium text-green-700 bg-green-50 p-2 rounded">
                      {q.shortAnswerText || <span className="text-slate-400 italic">Chưa nhập đáp án</span>}
                    </div>
                  </div>
               ) : (
                 q.options.map((opt, optIndex) => {
                    let isCorrect = q.correctIndex === optIndex;
                    let extraLabel = null;
                    if (q.type === 'true_false_cluster') {
                       isCorrect = q.clusterAnswers?.[optIndex] === true;
                       extraLabel = (
                         <span className={`text-xs font-semibold px-2 py-0.5 rounded uppercase shrink-0 whitespace-nowrap mt-0.5 ${q.clusterAnswers?.[optIndex] ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                           {q.clusterAnswers?.[optIndex] ? 'Đúng' : 'Sai'}
                         </span>
                       );
                    } else if (isCorrect) {
                       extraLabel = <span className="text-xs text-green-700 font-semibold uppercase shrink-0 pt-0.5 whitespace-nowrap">Đúng</span>;
                    }

                    return (
                        <div key={optIndex} className={`p-3 rounded-lg border ${isCorrect && q.type !== 'true_false_cluster' ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-100'} flex items-start gap-3`}>
                           <span className={`font-bold flex-shrink-0 ${isCorrect && q.type !== 'true_false_cluster' ? 'text-green-700' : 'text-slate-500'}`}>{String.fromCharCode(65 + optIndex)}.</span>
                           <div className="flex-1 w-full overflow-hidden">
                              <div className="prose prose-slate prose-sm max-w-none prose-p:my-0 prose-img:my-2 prose-img:rounded lg:prose-img:max-h-32 w-full">
                                <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{opt}</ReactMarkdown>
                              </div>
                              {q.optionImageUrls?.[optIndex] && (
                                <div className="mt-2 relative inline-block">
                                  <img src={q.optionImageUrls[optIndex]!} alt="Option" className="max-h-32 rounded border border-slate-200 bg-white" />
                                  <button 
                                    type="button"
                                    onClick={() => removeOptionImage(optIndex)}
                                    className="absolute -top-2 -right-2 bg-white text-red-500 rounded-full shadow p-0.5 hover:bg-red-50"
                                    title="Xóa ảnh đáp án"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              )}
                           </div>
                           {extraLabel}
                        </div>
                    );
                 })
               )}
            </div>
         </div>
      </div>
    </div>
  );
}
