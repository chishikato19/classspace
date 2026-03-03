import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { Question } from '../../../types';
import { quizService } from '../services/quizService';
import { auth } from '../../../config/firebase';

export default function QuizEditor() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [questions, setQuestions] = useState<Question[]>([
    {
      id: uuidv4(),
      text: '',
      timeLimit: 30,
      points: 1000,
      options: [
        { id: uuidv4(), text: '', isCorrect: false },
        { id: uuidv4(), text: '', isCorrect: false },
        { id: uuidv4(), text: '', isCorrect: false },
        { id: uuidv4(), text: '', isCorrect: false },
      ],
    },
  ]);
  const [saving, setSaving] = useState(false);

  const handleAddQuestion = () => {
    setQuestions([
      ...questions,
      {
        id: uuidv4(),
        text: '',
        timeLimit: 30,
        points: 1000,
        options: [
          { id: uuidv4(), text: '', isCorrect: false },
          { id: uuidv4(), text: '', isCorrect: false },
          { id: uuidv4(), text: '', isCorrect: false },
          { id: uuidv4(), text: '', isCorrect: false },
        ],
      },
    ]);
  };

  const handleQuestionChange = (index: number, field: keyof Question, value: any) => {
    const newQuestions = [...questions];
    newQuestions[index] = { ...newQuestions[index], [field]: value };
    setQuestions(newQuestions);
  };

  const handleOptionChange = (qIndex: number, oIndex: number, text: string) => {
    const newQuestions = [...questions];
    newQuestions[qIndex].options[oIndex].text = text;
    setQuestions(newQuestions);
  };

  const handleCorrectOptionSelect = (qIndex: number, oIndex: number) => {
    const newQuestions = [...questions];
    newQuestions[qIndex].options.forEach((opt, idx) => {
      opt.isCorrect = idx === oIndex;
    });
    setQuestions(newQuestions);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      alert('Vui lòng nhập tên bộ câu hỏi');
      return;
    }
    // Validate questions
    for (let i = 0; i < questions.length; i++) {
      if (!questions[i].text.trim()) {
        alert(`Câu hỏi số ${i + 1} chưa có nội dung`);
        return;
      }
      if (!questions[i].options.some(o => o.isCorrect)) {
        alert(`Câu hỏi số ${i + 1} chưa chọn đáp án đúng`);
        return;
      }
    }

    const currentUser = auth?.currentUser;
    if (!currentUser) {
      alert('Bạn cần đăng nhập để lưu bộ câu hỏi!');
      return;
    }

    setSaving(true);
    try {
      await quizService.createQuiz({
        title,
        description,
        teacherId: currentUser.uid,
        questions,
        createdAt: Date.now(),
      });
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

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h1 className="text-2xl font-bold mb-6">Tạo bộ câu hỏi mới</h1>
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
            <div className="absolute top-4 right-4 text-sm text-gray-400 font-bold">Câu {qIndex + 1}</div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Nội dung câu hỏi</label>
              <textarea
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                value={q.text}
                onChange={(e) => handleQuestionChange(qIndex, 'text', e.target.value)}
                rows={2}
                placeholder="Nhập câu hỏi tại đây..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {q.options.map((opt, oIndex) => (
                <div key={opt.id} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={`correct-${q.id}`}
                    checked={opt.isCorrect}
                    onChange={() => handleCorrectOptionSelect(qIndex, oIndex)}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                  />
                  <input
                    type="text"
                    className={`block w-full rounded-md shadow-sm focus:ring-indigo-500 sm:text-sm border p-2 ${opt.isCorrect ? 'border-green-500 bg-green-50' : 'border-gray-300'}`}
                    value={opt.text}
                    onChange={(e) => handleOptionChange(qIndex, oIndex, e.target.value)}
                    placeholder={`Đáp án ${oIndex + 1}`}
                  />
                </div>
              ))}
            </div>

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
