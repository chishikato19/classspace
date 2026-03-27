import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import QuizDashboard from '../../quiz/pages/QuizDashboard';
import ReportsDashboard from '../../quiz/pages/ReportsDashboard';
import GroupManager from '../components/GroupManager';
import ClassSessionManager from './ClassSessionManager';
import { BookOpen, BarChart2, Users, PlayCircle } from 'lucide-react';

export default function TeacherDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<'quizzes' | 'reports' | 'groups' | 'sessions'>((searchParams.get('tab') as any) || 'quizzes');

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'quizzes' || tab === 'reports' || tab === 'groups' || tab === 'sessions') {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const handleTabChange = (tab: 'quizzes' | 'reports' | 'groups' | 'sessions') => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => handleTabChange('quizzes')}
            className={`
              ${activeTab === 'quizzes'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }
              group inline-flex items-center border-b-2 py-4 px-1 text-sm font-medium
            `}
          >
            <BookOpen className={`
              ${activeTab === 'quizzes' ? 'text-indigo-500' : 'text-gray-400 group-hover:text-gray-500'}
              -ml-0.5 mr-2 h-5 w-5
            `} />
            Thư viện câu hỏi
          </button>
          <button
            onClick={() => handleTabChange('groups')}
            className={`
              ${activeTab === 'groups'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }
              group inline-flex items-center border-b-2 py-4 px-1 text-sm font-medium
            `}
          >
            <Users className={`
              ${activeTab === 'groups' ? 'text-indigo-500' : 'text-gray-400 group-hover:text-gray-500'}
              -ml-0.5 mr-2 h-5 w-5
            `} />
            Quản lý nhóm
          </button>
          <button
            onClick={() => handleTabChange('sessions')}
            className={`
              ${activeTab === 'sessions'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }
              group inline-flex items-center border-b-2 py-4 px-1 text-sm font-medium
            `}
          >
            <PlayCircle className={`
              ${activeTab === 'sessions' ? 'text-indigo-500' : 'text-gray-400 group-hover:text-gray-500'}
              -ml-0.5 mr-2 h-5 w-5
            `} />
            Tiết học
          </button>
          <button
            onClick={() => handleTabChange('reports')}
            className={`
              ${activeTab === 'reports'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }
              group inline-flex items-center border-b-2 py-4 px-1 text-sm font-medium
            `}
          >
            <BarChart2 className={`
              ${activeTab === 'reports' ? 'text-indigo-500' : 'text-gray-400 group-hover:text-gray-500'}
              -ml-0.5 mr-2 h-5 w-5
            `} />
            Báo cáo & Lịch sử
          </button>
        </nav>
      </div>

      <div className="mt-6">
        {activeTab === 'quizzes' && <QuizDashboard />}
        {activeTab === 'groups' && <GroupManager />}
        {activeTab === 'sessions' && <ClassSessionManager />}
        {activeTab === 'reports' && <ReportsDashboard />}
      </div>
    </div>
  );
}
