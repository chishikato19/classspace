import React from 'react';
import { Quiz } from '../../../types';
import { X, CheckCircle2, Circle } from 'lucide-react';

interface QuizPreviewModalProps {
  quiz: Quiz;
  onClose: () => void;
}

export const QuizPreviewModal: React.FC<QuizPreviewModalProps> = ({ quiz, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-300">
        <div className="flex justify-between items-center p-6 border-b shrink-0 bg-white">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Xem trước: {quiz.title}</h2>
            <p className="text-sm text-gray-500 mt-1">{quiz.questions.length} câu hỏi • {quiz.description || 'Không có mô tả'}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-gray-50">
          {quiz.questions.map((q, qIndex) => (
            <div key={q.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-start gap-4">
                <span className="flex-shrink-0 w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold text-sm">
                  {qIndex + 1}
                </span>
                <div className="flex-1">
                  <div className="text-lg font-medium text-gray-900 mb-4 prose prose-sm max-w-none">
                    {q.text}
                  </div>
                  
                  {q.imageUrl && (
                    <img src={q.imageUrl} alt="Question" className="max-w-full h-auto rounded-lg mb-4 border" />
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {q.options.map((opt, oIndex) => {
                      const isCorrect = opt.isCorrect;
                      return (
                        <div 
                          key={opt.id || oIndex}
                          className={`flex items-center gap-3 p-3 rounded-lg border text-sm transition-colors ${
                            isCorrect 
                              ? 'bg-green-50 border-green-200 text-green-700 font-medium' 
                              : 'bg-gray-50 border-gray-200 text-gray-600'
                          }`}
                        >
                          {isCorrect ? (
                            <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                          ) : (
                            <Circle className="w-5 h-5 text-gray-300 shrink-0" />
                          )}
                          <span>{opt.text}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 border-t bg-white flex justify-end shrink-0">
          <button 
            onClick={onClose}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
