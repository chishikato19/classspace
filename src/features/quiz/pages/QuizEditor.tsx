import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { Question, QuestionType } from '../../../types';
import { quizService } from '../services/quizService';
import { auth } from '../../../config/firebase';
import { Trash2, Eye, Image as ImageIcon, Upload, Plus, X, FileText } from 'lucide-react';
import { MathText } from '../../../components/MathText';
import { compressImage } from '../../../utils/fileUtils';
import ImportQuestionsModal from '../components/ImportQuestionsModal';

export default function QuizEditor() {
  const navigate = useNavigate();
  const { quizId } = useParams();
  const [searchParams] = useSearchParams();
  const folderId = searchParams.get('folderId');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [questions, setQuestions] = useState<Question[]>([
    {
      id: uuidv4(),
      type: 'MULTIPLE_CHOICE',
      text: '',
      imageUrl: '',
      timeLimit: 30,
      points: 1000,
      options: [
        { id: uuidv4(), text: '', imageUrl: '', isCorrect: false },
        { id: uuidv4(), text: '', imageUrl: '', isCorrect: false },
        { id: uuidv4(), text: '', imageUrl: '', isCorrect: false },
        { id: uuidv4(), text: '', imageUrl: '', isCorrect: false },
      ],
    },
  ]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!!quizId);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  useEffect(() => {
    if (quizId) {
      loadQuiz(quizId);
    }
  }, [quizId]);

  const loadQuiz = async (id: string) => {
    try {
      const quiz = await quizService.getQuizById(id);
      if (quiz) {
        setTitle(quiz.title);
        setDescription(quiz.description || '');
        // Ensure compatibility with old data
        const loadedQuestions = quiz.questions.length > 0 ? quiz.questions.map(q => ({
          ...q,
          type: q.type || 'MULTIPLE_CHOICE'
        })) : questions;
        setQuestions(loadedQuestions);
      } else {
        alert('Không tìm thấy bộ câu hỏi!');
        navigate('/teacher/dashboard');
      }
    } catch (error) {
      console.error('Error loading quiz:', error);
      alert('Lỗi khi tải bộ câu hỏi');
    } finally {
      setLoading(false);
    }
  };

  const handleAddQuestion = () => {
    setQuestions([
      ...questions,
      {
        id: uuidv4(),
        type: 'MULTIPLE_CHOICE',
        text: '',
        imageUrl: '',
        timeLimit: 30,
        points: 1000,
        options: [
          { id: uuidv4(), text: '', imageUrl: '', isCorrect: false },
          { id: uuidv4(), text: '', imageUrl: '', isCorrect: false },
          { id: uuidv4(), text: '', imageUrl: '', isCorrect: false },
          { id: uuidv4(), text: '', imageUrl: '', isCorrect: false },
        ],
      },
    ]);
  };

  const handleQuestionChange = (index: number, field: keyof Question, value: any) => {
    const newQuestions = [...questions];
    newQuestions[index] = { ...newQuestions[index], [field]: value };
    setQuestions(newQuestions);
  };

  const handleTypeChange = (index: number, newType: QuestionType) => {
    const newQuestions = [...questions];
    const currentQuestion = newQuestions[index];
    
    // Reset options based on type
    let newOptions = [];
    if (newType === 'TRUE_FALSE') {
      newOptions = [
        { id: uuidv4(), text: 'Đúng', isCorrect: true },
        { id: uuidv4(), text: 'Sai', isCorrect: false },
      ];
    } else if (newType === 'SHORT_ANSWER') {
      newOptions = [
        { id: uuidv4(), text: '', isCorrect: true },
      ];
    } else {
      // MULTIPLE_CHOICE
      newOptions = [
        { id: uuidv4(), text: '', imageUrl: '', isCorrect: false },
        { id: uuidv4(), text: '', imageUrl: '', isCorrect: false },
        { id: uuidv4(), text: '', imageUrl: '', isCorrect: false },
        { id: uuidv4(), text: '', imageUrl: '', isCorrect: false },
      ];
    }

    newQuestions[index] = { 
      ...currentQuestion, 
      type: newType, 
      options: newOptions 
    };
    setQuestions(newQuestions);
  };

  const handleOptionChange = (qIndex: number, oIndex: number, field: 'text' | 'imageUrl', value: string) => {
    const newQuestions = [...questions];
    // @ts-ignore
    newQuestions[qIndex].options[oIndex][field] = value;
    setQuestions(newQuestions);
  };

  const handleCorrectOptionSelect = (qIndex: number, oIndex: number) => {
    const newQuestions = [...questions];
    const type = newQuestions[qIndex].type;

    if (type === 'MULTIPLE_CHOICE' || type === 'TRUE_FALSE') {
      // Single correct answer logic for these types
      newQuestions[qIndex].options.forEach((opt, idx) => {
        opt.isCorrect = idx === oIndex;
      });
    } else {
      // For SHORT_ANSWER, all added options are correct variations
      // Logic handled in adding/removing options
    }
    setQuestions(newQuestions);
  };

  const handleImageUpload = async (file: File, callback: (base64: string) => void) => {
    try {
      const base64 = await compressImage(file);
      callback(base64);
    } catch (error) {
      console.error("Error processing image", error);
      alert("Lỗi xử lý ảnh. Vui lòng thử lại.");
    }
  };

  const handleAddShortAnswerOption = (qIndex: number) => {
    const newQuestions = [...questions];
    newQuestions[qIndex].options.push({
      id: uuidv4(),
      text: '',
      isCorrect: true
    });
    setQuestions(newQuestions);
  };

  const handleRemoveOption = (qIndex: number, oIndex: number) => {
    const newQuestions = [...questions];
    if (newQuestions[qIndex].options.length > 1) {
      newQuestions[qIndex].options.splice(oIndex, 1);
      setQuestions(newQuestions);
    }
  };

  const handleDeleteQuestion = (index: number) => {
    if (questions.length <= 1) {
      alert('Bộ câu hỏi phải có ít nhất 1 câu');
      return;
    }
    const newQuestions = questions.filter((_, i) => i !== index);
    setQuestions(newQuestions);
  };

  const handleMoveQuestion = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === questions.length - 1) return;

    const newQuestions = [...questions];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    const temp = newQuestions[index];
    newQuestions[index] = newQuestions[targetIndex];
    newQuestions[targetIndex] = temp;
    
    setQuestions(newQuestions);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      alert('Vui lòng nhập tên bộ câu hỏi');
      return;
    }
    // Validate questions
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.text.trim() && !q.imageUrl) {
        alert(`Câu hỏi số ${i + 1} chưa có nội dung (văn bản hoặc hình ảnh)`);
        return;
      }
      
      if (q.type === 'SHORT_ANSWER') {
        if (q.options.length === 0 || !q.options.some(o => o.text.trim())) {
          alert(`Câu hỏi số ${i + 1} (Trả lời ngắn) chưa có đáp án đúng nào`);
          return;
        }
      } else {
        if (!q.options.some(o => o.isCorrect)) {
          alert(`Câu hỏi số ${i + 1} chưa chọn đáp án đúng`);
          return;
        }
      }
    }

    const currentUser = auth?.currentUser;
    if (!currentUser) {
      alert('Bạn cần đăng nhập để lưu bộ câu hỏi!');
      return;
    }

    setSaving(true);
    try {
      if (quizId) {
        await quizService.updateQuiz(quizId, {
          title,
          description,
          questions,
        });
      } else {
        await quizService.createQuiz({
          title,
          description,
          teacherId: currentUser.uid,
          folderId: folderId || undefined,
          questions,
          createdAt: Date.now(),
        });
      }
      navigate('/teacher/dashboard');
    } catch (error: any) {
      console.error(error);
      if (error.code === 'permission-denied') {
        alert('Lỗi quyền truy cập: Vui lòng kiểm tra lại Firestore Rules (Cần cho phép read/write).');
      } else {
        alert(`Lỗi khi lưu bộ câu hỏi: ${error.message}`);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleImportQuestions = (importedQuestions: Question[]) => {
    // Append imported questions to current list
    // If current list has only 1 empty question, replace it
    if (questions.length === 1 && !questions[0].text && !questions[0].imageUrl) {
      setQuestions(importedQuestions);
    } else {
      setQuestions([...questions, ...importedQuestions]);
    }
  };

  if (loading) {
    return <div className="text-center py-20">Đang tải...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <ImportQuestionsModal 
        isOpen={isImportModalOpen} 
        onClose={() => setIsImportModalOpen(false)} 
        onImport={handleImportQuestions} 
      />

      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex justify-between items-start mb-6">
          <h1 className="text-2xl font-bold">{quizId ? 'Chỉnh sửa bộ câu hỏi' : 'Tạo bộ câu hỏi mới'}</h1>
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg font-bold hover:bg-indigo-100 transition-colors"
          >
            <FileText size={20} />
            Nhập từ Word/Text
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Tên bộ câu hỏi</label>
            <input
              type="text"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="VD: Kiểm tra 15 phút - Đại số"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Mô tả (Tùy chọn)</label>
            <textarea
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {questions.map((q, qIndex) => (
          <div key={q.id} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 relative">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-4">
                <div className="text-sm text-gray-400 font-bold">Câu {qIndex + 1}</div>
                <select
                  value={q.type}
                  onChange={(e) => handleTypeChange(qIndex, e.target.value as QuestionType)}
                  className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-1"
                >
                  <option value="MULTIPLE_CHOICE">Trắc nghiệm</option>
                  <option value="TRUE_FALSE">Đúng / Sai</option>
                  <option value="SHORT_ANSWER">Trả lời ngắn</option>
                </select>
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700">Thời gian (giây):</label>
                  <input
                    type="number"
                    min="5"
                    max="600"
                    value={q.timeLimit || 30}
                    onChange={(e) => handleQuestionChange(qIndex, 'timeLimit', parseInt(e.target.value) || 30)}
                    className="w-20 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-1"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleMoveQuestion(qIndex, 'up')}
                  disabled={qIndex === 0}
                  className="text-gray-400 hover:text-indigo-600 transition-colors p-1 disabled:opacity-30 disabled:hover:text-gray-400"
                  title="Di chuyển lên"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6"/></svg>
                </button>
                <button
                  onClick={() => handleMoveQuestion(qIndex, 'down')}
                  disabled={qIndex === questions.length - 1}
                  className="text-gray-400 hover:text-indigo-600 transition-colors p-1 disabled:opacity-30 disabled:hover:text-gray-400"
                  title="Di chuyển xuống"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                </button>
                <button
                  onClick={() => handleDeleteQuestion(qIndex)}
                  className="text-red-400 hover:text-red-600 transition-colors p-1 ml-2"
                  title="Xóa câu hỏi"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            </div>
            
            <div className="mb-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nội dung câu hỏi (Hỗ trợ LaTeX: $...$ hoặc $$...$$)
                </label>
                <textarea
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2 mb-2"
                  value={q.text}
                  onChange={(e) => handleQuestionChange(qIndex, 'text', e.target.value)}
                  rows={2}
                  placeholder="Nhập câu hỏi tại đây... Ví dụ: Giải phương trình $x^2 + 2x + 1 = 0$"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                  <ImageIcon size={16} /> Hình ảnh (Tùy chọn)
                </label>
                <div className="flex items-center gap-2">
                  <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                    <Upload size={16} />
                    Chọn ảnh từ máy
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageUpload(file, (base64) => handleQuestionChange(qIndex, 'imageUrl', base64));
                      }}
                    />
                  </label>
                  {q.imageUrl && (
                    <button
                      onClick={() => handleQuestionChange(qIndex, 'imageUrl', '')}
                      className="text-red-500 text-sm hover:underline"
                    >
                      Xóa ảnh
                    </button>
                  )}
                </div>
                {q.imageUrl && (
                  <div className="mt-2">
                    <img src={q.imageUrl} alt="Preview" className="h-32 object-contain rounded border border-gray-200" referrerPolicy="no-referrer" onError={(e) => (e.currentTarget.style.display = 'none')} />
                  </div>
                )}
              </div>

              {q.text && (
                <div className="p-3 bg-gray-50 rounded-md border border-gray-200 text-sm">
                  <div className="text-xs text-gray-500 mb-1 font-bold flex items-center gap-1">
                    <Eye size={12} /> Xem trước:
                  </div>
                  <MathText text={q.text} />
                </div>
              )}
            </div>

            {/* Render Options based on Type */}
            {q.type === 'SHORT_ANSWER' ? (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Các đáp án chấp nhận được:</label>
                {q.options.map((opt, oIndex) => (
                  <div key={opt.id} className="flex items-center gap-2">
                    <input
                      type="text"
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 sm:text-sm border p-2"
                      value={opt.text}
                      onChange={(e) => handleOptionChange(qIndex, oIndex, 'text', e.target.value)}
                      placeholder="Nhập đáp án đúng..."
                    />
                    <button
                      onClick={() => handleRemoveOption(qIndex, oIndex)}
                      className="text-gray-400 hover:text-red-500"
                      disabled={q.options.length <= 1}
                    >
                      <X size={18} />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => handleAddShortAnswerOption(qIndex)}
                  className="text-indigo-600 text-sm font-medium flex items-center gap-1 hover:underline"
                >
                  <Plus size={16} /> Thêm đáp án chấp nhận
                </button>
                <p className="text-xs text-gray-500 mt-1">
                  * Học sinh trả lời đúng một trong các đáp án trên sẽ được tính điểm (không phân biệt hoa thường).
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {q.options.map((opt, oIndex) => (
                  <div key={opt.id} className={`flex flex-col gap-2 p-3 border rounded-md ${opt.isCorrect ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name={`correct-${q.id}`}
                        checked={opt.isCorrect}
                        onChange={() => handleCorrectOptionSelect(qIndex, oIndex)}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                      />
                      <input
                        type="text"
                        className={`block w-full rounded-md shadow-sm focus:ring-indigo-500 sm:text-sm border p-2 ${opt.isCorrect ? 'border-green-500 font-medium' : 'border-gray-300'}`}
                        value={opt.text}
                        onChange={(e) => handleOptionChange(qIndex, oIndex, 'text', e.target.value)}
                        placeholder={q.type === 'TRUE_FALSE' ? (oIndex === 0 ? 'Đúng' : 'Sai') : `Đáp án ${oIndex + 1}`}
                        readOnly={q.type === 'TRUE_FALSE'} // True/False text is fixed
                      />
                    </div>
                    
                    {q.type === 'MULTIPLE_CHOICE' && (
                      <>
                        <div className="flex items-center gap-2 pl-6">
                          <ImageIcon size={14} className="text-gray-400" />
                          <label className="cursor-pointer text-xs text-indigo-600 hover:underline">
                            Chọn ảnh
                            <input
                              type="file"
                              className="hidden"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleImageUpload(file, (base64) => handleOptionChange(qIndex, oIndex, 'imageUrl', base64));
                              }}
                            />
                          </label>
                          {opt.imageUrl && (
                            <button
                              onClick={() => handleOptionChange(qIndex, oIndex, 'imageUrl', '')}
                              className="text-xs text-red-500 hover:underline ml-2"
                            >
                              Xóa
                            </button>
                          )}
                        </div>
                        {opt.imageUrl && (
                           <div className="pl-6">
                              <img src={opt.imageUrl} alt="Option Preview" className="h-16 object-contain rounded border border-gray-200" referrerPolicy="no-referrer" onError={(e) => (e.currentTarget.style.display = 'none')} />
                           </div>
                        )}
                      </>
                    )}

                    {opt.text && (opt.text.includes('$') || opt.text.includes('\\')) && (
                      <div className="pl-6 text-xs text-gray-600">
                        <MathText text={opt.text} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 flex items-center gap-4 text-sm">
              <div>
                <label className="mr-2 text-gray-700">Thời gian (giây):</label>
                <select
                  value={q.timeLimit}
                  onChange={(e) => handleQuestionChange(qIndex, 'timeLimit', Number(e.target.value))}
                  className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-1"
                >
                  <option value={10}>10s</option>
                  <option value={20}>20s</option>
                  <option value={30}>30s</option>
                  <option value={60}>60s</option>
                  <option value={120}>120s</option>
                </select>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-center pb-10">
        <button
          onClick={handleAddQuestion}
          className="rounded-full bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-200"
        >
          + Thêm câu hỏi
        </button>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 flex justify-end gap-4 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <button
          onClick={() => navigate('/teacher/dashboard')}
          className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
        >
          Hủy
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50"
        >
          {saving ? 'Đang lưu...' : 'Lưu bộ câu hỏi'}
        </button>
      </div>
    </div>
  );
}
