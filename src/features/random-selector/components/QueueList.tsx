import { X, Check, Clock, SkipForward } from 'lucide-react';
import { StudentData } from '../services/classService';
import { StudentAvatar } from '../../../components/Avatar/StudentAvatar';

interface QueueListProps {
  queue: StudentData[];
  onRemove: (studentId: string) => void;
  onAwardPoints: (studentId: string, points: number) => void;
  onSkip: (studentId: string) => void;
}

export default function QueueList({ queue, onRemove, onAwardPoints, onSkip }: QueueListProps) {
  if (queue.length === 0) return null;

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
      <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
        <Clock className="w-5 h-5 text-yellow-500" />
        Hàng chờ ({queue.length})
      </h2>
      
      <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
        {queue.map((student) => (
          <div key={student.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-indigo-200 transition-colors group">
            <div className="flex items-center gap-3">
              <StudentAvatar 
                student={student}
                avatarConfig={student.avatarConfig}
                size={32}
              />
              <span className="font-medium text-gray-700 truncate max-w-[120px]">{student.name}</span>
            </div>
            
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => onAwardPoints(student.id, 10)}
                className="p-1.5 bg-green-100 text-green-600 rounded hover:bg-green-200"
                title="Cộng điểm"
              >
                <Check size={14} />
              </button>
              <button
                onClick={() => onAwardPoints(student.id, -5)}
                className="p-1.5 bg-red-100 text-red-600 rounded hover:bg-red-200"
                title="Trừ điểm"
              >
                <X size={14} />
              </button>
              <button
                onClick={() => onSkip(student.id)}
                className="p-1.5 bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
                title="Bỏ qua"
              >
                <SkipForward size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
