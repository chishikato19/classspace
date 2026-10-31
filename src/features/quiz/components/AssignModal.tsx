import React from 'react';
import { Quiz } from '../../../types';
import { useNavigate } from 'react-router-dom';
import { X, Play, Clock, Swords, Mic, ArrowRight, Sparkles, Send, FileSpreadsheet } from 'lucide-react';

interface AssignModalProps {
  quiz: Quiz;
  onClose: () => void;
  onAssignHomework: (quiz: Quiz) => void;
}

export const AssignModal: React.FC<AssignModalProps> = ({ quiz, onClose, onAssignHomework }) => {
  const navigate = useNavigate();

  const modes = [
    {
      id: 'online-exam',
      title: 'Đề thi Online',
      badge: 'Báo cáo Excel chi tiết',
      badgeColor: 'bg-blue-100 text-blue-700',
      description: 'Giao đề kiểm tra có giám sát, hẹn giờ, mã PIN phòng thi, tự động chấm điểm và xuất báo cáo kết quả ra Excel chi tiết.',
      icon: <FileSpreadsheet className="w-6 h-6 text-blue-600" />,
      borderHover: 'hover:border-blue-400 hover:shadow-blue-100',
      actionText: 'Tạo đề thi online ngay',
      buttonBg: 'bg-blue-600 hover:bg-blue-700 text-white',
      action: () => {
        onClose();
        navigate(`/teacher/exams/new?fromQuiz=${quiz.id}`);
      }
    },
    {
      id: 'live',
      title: 'Thi trực tiếp (Live Quiz)',
      badge: 'Thời gian thực',
      badgeColor: 'bg-indigo-100 text-indigo-700',
      description: 'Học sinh tham gia bằng mã PIN, tranh tài trực tiếp trên màn hình máy chiếu của lớp.',
      icon: <Play className="w-6 h-6 text-indigo-600" />,
      borderHover: 'hover:border-indigo-400 hover:shadow-indigo-100',
      actionText: 'Tạo phòng thi ngay',
      buttonBg: 'bg-indigo-600 hover:bg-indigo-700 text-white',
      action: () => {
        onClose();
        navigate(`/game/host/${quiz.id}`);
      }
    },
    {
      id: 'homework',
      title: 'Giao bài tập về nhà',
      badge: 'Tự do theo hạn chót',
      badgeColor: 'bg-emerald-100 text-emerald-700',
      description: 'Học sinh làm bài linh hoạt theo hạn chót được định sẵn. Báo cáo điểm số tự động cập nhật.',
      icon: <Clock className="w-6 h-6 text-emerald-600" />,
      borderHover: 'hover:border-emerald-400 hover:shadow-emerald-100',
      actionText: 'Thiết lập hạn nộp',
      buttonBg: 'bg-emerald-600 hover:bg-emerald-700 text-white',
      action: () => {
        onClose();
        onAssignHomework(quiz);
      }
    },
    {
      id: 'battle',
      title: 'Đấu trường tốc độ (1vs1)',
      badge: 'Đối kháng',
      badgeColor: 'bg-amber-100 text-amber-700',
      description: 'Thi đấu đối kháng 1vs1 hoặc chia đội kịch tính trên cùng một máy với bàn phím.',
      icon: <Swords className="w-6 h-6 text-amber-600" />,
      borderHover: 'hover:border-amber-400 hover:shadow-amber-100',
      actionText: 'Vào đấu trường',
      buttonBg: 'bg-amber-600 hover:bg-amber-700 text-white',
      action: () => {
        onClose();
        navigate(`/game/local-battle/${quiz.id}`);
      }
    },
    {
      id: 'oral',
      title: 'Kiểm tra miệng (Vấn đáp)',
      badge: 'Vấn đáp',
      badgeColor: 'bg-purple-100 text-purple-700',
      description: 'Bốc thăm học sinh bất kỳ trả lời miệng từng câu hỏi với đồng hồ đếm ngược và chấm điểm.',
      icon: <Mic className="w-6 h-6 text-purple-600" />,
      borderHover: 'hover:border-purple-400 hover:shadow-purple-100',
      actionText: 'Bắt đầu vấn đáp',
      buttonBg: 'bg-purple-600 hover:bg-purple-700 text-white',
      action: () => {
        onClose();
        navigate(`/game/oral-quiz-setup/${quiz.id}`);
      }
    }
  ];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-gray-900">Chế độ giao bài</h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-semibold border border-indigo-100">
                  {quiz.questions.length} câu hỏi
                </span>
              </div>
              <p className="text-sm text-gray-500 truncate max-w-md mt-0.5">{quiz.title}</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-gray-200/60 rounded-full text-gray-400 hover:text-gray-700 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modes Grid */}
        <div className="p-6 overflow-y-auto space-y-3.5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Chọn phương thức tổ chức kiểm tra / luyện tập:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {modes.map((mode) => (
              <div
                key={mode.id}
                onClick={mode.action}
                className={`p-4 rounded-xl border border-gray-200 bg-white hover:bg-gray-50/70 transition-all duration-200 cursor-pointer flex flex-col justify-between shadow-xs hover:shadow-md ${mode.borderHover} group`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-100 group-hover:scale-105 transition-transform">
                      {mode.icon}
                    </div>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${mode.badgeColor}`}>
                      {mode.badge}
                    </span>
                  </div>
                  <h3 className="font-bold text-gray-900 text-sm group-hover:text-indigo-600 transition-colors">
                    {mode.title}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                    {mode.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                  <span className="font-semibold text-gray-600 group-hover:text-indigo-600 transition-colors flex items-center gap-1">
                    {mode.actionText}
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </span>
                  <span className={`px-2.5 py-1 rounded-md text-[11px] font-semibold ${mode.buttonBg} shadow-xs`}>
                    Bắt đầu
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-3.5 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-500" />
            Kết quả của học sinh sẽ được lưu tự động trong mục Báo cáo & Lịch sử
          </span>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800 font-medium px-3 py-1 hover:bg-gray-200/50 rounded-lg transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
