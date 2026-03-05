import { X, Check, SkipForward } from 'lucide-react';
import { StudentData } from '../services/classService';
import { StudentAvatar } from '../../../components/Avatar/StudentAvatar';

interface QueueListProps {
  queue: StudentData[];
  onAwardPoints: (studentId: string, points: number) => void;
  onSkip: (studentId: string) => void;
}

export default function QueueList({ queue, onAwardPoints, onSkip }: QueueListProps) {
  if (queue.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500 text-sm">
        Hàng chờ trống
      </div>
    );
  }

  return (
    <div className="space-y-2 p-2">
      {queue.map((student) => (
        <div key={student.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-200 hover:border-indigo-200 transition-colors group">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="flex-shrink-0">
              <StudentAvatar 
                student={student}
                avatarConfig={student.avatarConfig}
                size={32}
              />
            </div>
            <span className="font-medium text-gray-700 truncate text-sm">{student.name}</span>
          </div>
          
          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
            <button
              onClick={() => onAwardPoints(student.id, 10)}
              className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors shadow-sm"
              title="Cộng điểm"
            >
              <Check size={16} />
            </button>
            <button
              onClick={() => onAwardPoints(student.id, -5)}
              className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors shadow-sm"
              title="Trừ điểm"
            >
              <X size={16} />
            </button>
            <button
              onClick={() => onSkip(student.id)}
              className="p-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors shadow-sm"
              title="Bỏ qua"
            >
              <SkipForward size={16} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
