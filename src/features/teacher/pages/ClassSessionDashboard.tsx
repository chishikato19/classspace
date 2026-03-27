import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { auth } from '../../../config/firebase';
import { classSessionService } from '../../../services/classSessionService';
import { classService } from '../../random-selector/services/classService';
import { groupService } from '../services/groupService';
import { ClassSession, Student, StudentGroup, ClassGroup } from '../../../types';
import { Users, Award, Clock, ArrowLeft, Plus, Trophy, PlayCircle, Zap } from 'lucide-react';
import { timeService } from '../../../services/timeService';

export default function ClassSessionDashboard() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  const [session, setSession] = useState<ClassSession | null>(null);
  const [classGroup, setClassGroup] = useState<ClassGroup | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [groups, setGroups] = useState<StudentGroup[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<'students' | 'groups'>('students');
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  // Modal state
  const [isAwardModalOpen, setIsAwardModalOpen] = useState(false);
  const [awardTarget, setAwardTarget] = useState<{ id: string, type: 'student' | 'group', name: string } | null>(null);
  const [awardPoints, setAwardPoints] = useState<number>(10);
  const [awardReason, setAwardReason] = useState<string>('Phát biểu tốt');

  // Speed Arena Modal state
  const [isSpeedArenaModalOpen, setIsSpeedArenaModalOpen] = useState(false);
  const [isSpeedArenaActive, setIsSpeedArenaActive] = useState(false);
  const [team1Name, setTeam1Name] = useState('Đội Xanh');
  const [team2Name, setTeam2Name] = useState('Đội Đỏ');
  const [team1Groups, setTeam1Groups] = useState<string[]>([]);
  const [team2Groups, setTeam2Groups] = useState<string[]>([]);
  const [speedArenaPoints, setSpeedArenaPoints] = useState<number>(100);
  const [team1Score, setTeam1Score] = useState(0);
  const [team2Score, setTeam2Score] = useState(0);

  useEffect(() => {
    const user = auth.currentUser;
    if (!sessionId || !user) {
      setLoading(false);
      return;
    }

    const unsubscribe = classSessionService.subscribeToSession(sessionId, async (sessionData) => {
      if (sessionData) {
        setSession(sessionData);
        if (!classGroup) {
          // Load class data only once
          try {
            const cls = await classService.getClassById(sessionData.classId);
            setClassGroup(cls);
            const classStudents = await classService.getStudentsByClass(sessionData.classId);
            setStudents(classStudents);
            const classGroups = await groupService.getGroupsByClass(sessionData.classId);
            setGroups(classGroups);
          } catch (error) {
            console.error("Error loading class data:", error);
          }
        }
      } else {
        // Session not found or deleted
        navigate('/teacher/dashboard?tab=sessions');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [sessionId]);

  const handleEndSession = async () => {
    if (window.confirm('Bạn có chắc chắn muốn kết thúc tiết học này?')) {
      await classSessionService.endSession(sessionId!);
      navigate('/teacher/dashboard?tab=sessions');
    }
  };

  const openAwardModal = (id: string, type: 'student' | 'group', name: string) => {
    setAwardTarget({ id, type, name });
    setIsAwardModalOpen(true);
  };

  const handleAwardPoints = async () => {
    if (!awardTarget || !session) return;

    try {
      await classSessionService.addEvent(session.id, {
        type: awardTarget.type === 'student' ? 'INDIVIDUAL_POINT' : 'GROUP_POINT',
        targetId: awardTarget.id,
        points: awardPoints,
        reason: awardReason
      });
      setIsAwardModalOpen(false);
    } catch (error) {
      console.error("Error awarding points:", error);
      alert("Có lỗi xảy ra khi cộng điểm.");
    }
  };

  const handleStartSpeedArena = () => {
    if (team1Groups.length === 0 || team2Groups.length === 0) {
      alert("Vui lòng chọn ít nhất 1 nhóm cho mỗi đội.");
      return;
    }
    setTeam1Score(0);
    setTeam2Score(0);
    setIsSpeedArenaModalOpen(false);
    setIsSpeedArenaActive(true);
  };

  const handleEndSpeedArena = async () => {
    if (!session) return;
    
    let winningTeam: 1 | 2 | 0 = 0;
    if (team1Score > team2Score) winningTeam = 1;
    else if (team2Score > team1Score) winningTeam = 2;

    if (winningTeam === 0) {
      if (window.confirm("Hai đội hòa nhau. Kết thúc mà không cộng điểm?")) {
        setIsSpeedArenaActive(false);
      }
      return;
    }

    const winningGroups = winningTeam === 1 ? team1Groups : team2Groups;
    const winningName = winningTeam === 1 ? team1Name : team2Name;

    try {
      for (const groupId of winningGroups) {
        await classSessionService.addEvent(session.id, {
          type: 'SPEED_ARENA',
          targetId: groupId,
          points: speedArenaPoints,
          reason: `Thắng Đấu trường tốc độ (${winningName})`
        });
      }
      setIsSpeedArenaActive(false);
      alert(`Đã cộng ${speedArenaPoints} điểm cho các nhóm thuộc ${winningName}!`);
    } catch (error) {
      console.error("Error awarding speed arena points:", error);
      alert("Có lỗi xảy ra khi cộng điểm.");
    }
  };

  // Calculate scores
  const calculateScores = () => {
    const studentScores: Record<string, number> = {};
    const groupScores: Record<string, number> = {};

    students.forEach(s => studentScores[s.id] = 0);
    groups.forEach(g => groupScores[g.id] = 0);

    const getStudentGroup = (studentId: string) => groups.find(g => g.studentIds.includes(studentId));

    session?.events.forEach(event => {
      switch (event.type) {
        case 'INDIVIDUAL_POINT':
          if (studentScores[event.targetId] !== undefined) {
            studentScores[event.targetId] += event.points;
            const group = getStudentGroup(event.targetId);
            if (group && groupScores[group.id] !== undefined) {
              groupScores[group.id] += event.points;
            }
          }
          break;
        case 'QUIZ_SCORE':
          if (studentScores[event.targetId] !== undefined) {
            studentScores[event.targetId] += event.points;
          }
          break;
        case 'GROUP_POINT':
        case 'SPEED_ARENA':
          if (groupScores[event.targetId] !== undefined) {
            groupScores[event.targetId] += event.points;
            const group = groups.find(g => g.id === event.targetId);
            if (group) {
              group.studentIds.forEach(sId => {
                if (studentScores[sId] !== undefined) {
                  studentScores[sId] += event.points;
                }
              });
            }
          }
          break;
        case 'QUIZ_RANK':
          if (groupScores[event.targetId] !== undefined) {
            groupScores[event.targetId] += event.points;
          }
          break;
      }
    });

    return { studentScores, groupScores };
  };

  const { studentScores, groupScores } = calculateScores();

  if (loading || !session || !classGroup) {
    return <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>;
  }

  const sortedGroups = [...groups].sort((a, b) => (groupScores[b.id] || 0) - (groupScores[a.id] || 0));
  const sortedStudents = [...students].sort((a, b) => (studentScores[b.id] || 0) - (studentScores[a.id] || 0));

  if (isSpeedArenaActive) {
    return (
      <div className="fixed inset-0 z-50 bg-gray-900 flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 bg-gray-800 text-white shadow-md">
          <button onClick={() => setIsSpeedArenaActive(false)} className="flex items-center text-gray-300 hover:text-white transition-colors">
            <ArrowLeft className="h-6 w-6 mr-2" /> Thoát
          </button>
          <div className="text-2xl font-black tracking-wider text-yellow-400 flex items-center">
            <Zap className="h-8 w-8 mr-2" />
            ĐẤU TRƯỜNG TỐC ĐỘ
          </div>
          <button onClick={handleEndSpeedArena} className="bg-green-600 hover:bg-green-500 px-6 py-2 rounded-full font-bold shadow-lg transition-transform hover:scale-105">
            Kết thúc & Cộng điểm
          </button>
        </div>

        {/* Battle Area */}
        <div className="flex-1 flex relative">
          {/* VS Badge */}
          <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20 bg-yellow-500 text-gray-900 rounded-full w-28 h-28 flex items-center justify-center text-5xl font-black border-8 border-gray-900 shadow-2xl">
            VS
          </div>

          {/* Team 1 (Blue) */}
          <div className="flex-1 bg-blue-900 flex flex-col items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-400 to-transparent"></div>
            <h2 className="text-6xl font-black text-blue-300 mb-8 z-10 drop-shadow-lg">{team1Name}</h2>
            <div className="text-[12rem] leading-none font-black text-white z-10 drop-shadow-2xl">{team1Score}</div>
            <div className="mt-16 flex space-x-6 z-10">
              <button onClick={() => setTeam1Score(s => s - 10)} className="bg-blue-800 hover:bg-blue-700 text-white rounded-full w-20 h-20 text-3xl font-bold shadow-xl transition-transform hover:scale-110 active:scale-95 border-4 border-blue-600">-10</button>
              <button onClick={() => setTeam1Score(s => s + 10)} className="bg-blue-500 hover:bg-blue-400 text-white rounded-full w-24 h-24 text-4xl font-bold shadow-xl transition-transform hover:scale-110 active:scale-95 border-4 border-blue-300">+10</button>
            </div>
            <div className="absolute bottom-6 left-6 text-blue-200/70 text-lg font-medium z-10 max-w-md">
              <span className="block text-blue-400 text-sm uppercase tracking-wider mb-1">Thành viên:</span>
              {team1Groups.map(id => groups.find(g => g.id === id)?.name).join(', ')}
            </div>
          </div>

          {/* Team 2 (Red) */}
          <div className="flex-1 bg-red-900 flex flex-col items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-red-400 to-transparent"></div>
            <h2 className="text-6xl font-black text-red-300 mb-8 z-10 drop-shadow-lg">{team2Name}</h2>
            <div className="text-[12rem] leading-none font-black text-white z-10 drop-shadow-2xl">{team2Score}</div>
            <div className="mt-16 flex space-x-6 z-10">
              <button onClick={() => setTeam2Score(s => s - 10)} className="bg-red-800 hover:bg-red-700 text-white rounded-full w-20 h-20 text-3xl font-bold shadow-xl transition-transform hover:scale-110 active:scale-95 border-4 border-red-600">-10</button>
              <button onClick={() => setTeam2Score(s => s + 10)} className="bg-red-500 hover:bg-red-400 text-white rounded-full w-24 h-24 text-4xl font-bold shadow-xl transition-transform hover:scale-110 active:scale-95 border-4 border-red-300">+10</button>
            </div>
            <div className="absolute bottom-6 right-6 text-red-200/70 text-lg font-medium z-10 text-right max-w-md">
              <span className="block text-red-400 text-sm uppercase tracking-wider mb-1">Thành viên:</span>
              {team2Groups.map(id => groups.find(g => g.id === id)?.name).join(', ')}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center">
            <button onClick={() => navigate('/teacher/dashboard?tab=sessions')} className="mr-4 text-gray-500 hover:text-gray-700">
              <ArrowLeft className="h-6 w-6" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Tiết học: {classGroup.name}</h1>
              <div className="flex items-center text-sm text-gray-500 mt-1">
                <Clock className="h-4 w-4 mr-1" />
                Bắt đầu lúc: {new Date(session.startTime).toLocaleTimeString()}
              </div>
            </div>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => setShowLeaderboard(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200"
            >
              <Trophy className="h-5 w-5 mr-2" />
              Bảng xếp hạng
            </button>
            <button
              onClick={handleEndSession}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
            >
              Kết thúc tiết học
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Mini-games launcher */}
        <div className="mb-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Hoạt động & Trò chơi</h2>
          <div className="flex space-x-4">
            <button
              onClick={() => navigate('/teacher/dashboard?tab=quizzes')}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <PlayCircle className="h-5 w-5 mr-2 text-indigo-500" />
              Mở bài Quiz
            </button>
            <button
              onClick={() => setIsSpeedArenaModalOpen(true)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <Award className="h-5 w-5 mr-2 text-yellow-500" />
              Đấu trường tốc độ
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('students')}
              className={`${
                activeTab === 'students'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
            >
              <Users className="h-5 w-5 mr-2" />
              Cá nhân ({students.length})
            </button>
            <button
              onClick={() => setActiveTab('groups')}
              className={`${
                activeTab === 'groups'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
            >
              <Users className="h-5 w-5 mr-2" />
              Nhóm ({groups.length})
            </button>
          </nav>
        </div>

        {/* Content */}
        {activeTab === 'students' && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {students.map(student => (
              <div key={student.id} className="bg-white rounded-lg shadow p-4 flex flex-col items-center text-center">
                <div className="h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center mb-3">
                  <span className="text-indigo-800 font-bold text-lg">{student.name.charAt(0)}</span>
                </div>
                <h3 className="text-sm font-medium text-gray-900 truncate w-full">{student.name}</h3>
                <p className="text-xs text-gray-500 mt-1">{studentScores[student.id] || 0} điểm</p>
                <button
                  onClick={() => openAwardModal(student.id, 'student', student.name)}
                  className="mt-3 w-full inline-flex justify-center items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200"
                >
                  <Plus className="h-3 w-3 mr-1" /> Cộng điểm
                </button>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'groups' && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {groups.map(group => (
              <div key={group.id} className="bg-white rounded-lg shadow p-5">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">{group.name}</h3>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    {groupScores[group.id] || 0} điểm
                  </span>
                </div>
                <div className="text-sm text-gray-500 mb-4">
                  {group.studentIds.length} thành viên
                </div>
                <button
                  onClick={() => openAwardModal(group.id, 'group', group.name)}
                  className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  <Award className="h-4 w-4 mr-2" /> Thưởng nhóm
                </button>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Award Modal */}
      {isAwardModalOpen && awardTarget && (
        <div className="fixed z-50 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={() => setIsAwardModalOpen(false)}></div>
            </div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="relative inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div>
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-indigo-100">
                  <Award className="h-6 w-6 text-indigo-600" />
                </div>
                <div className="mt-3 text-center sm:mt-5">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    Cộng điểm cho {awardTarget.type === 'student' ? 'học sinh' : 'nhóm'} {awardTarget.name}
                  </h3>
                  <div className="mt-4 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 text-left">Số điểm</label>
                      <div className="mt-1 flex rounded-md shadow-sm">
                        <button onClick={() => setAwardPoints(5)} className="flex-1 px-4 py-2 bg-gray-50 border border-gray-300 rounded-l-md hover:bg-gray-100">+5</button>
                        <button onClick={() => setAwardPoints(10)} className="flex-1 px-4 py-2 bg-gray-50 border-t border-b border-gray-300 hover:bg-gray-100">+10</button>
                        <button onClick={() => setAwardPoints(20)} className="flex-1 px-4 py-2 bg-gray-50 border border-gray-300 rounded-r-md hover:bg-gray-100">+20</button>
                      </div>
                      <input
                        type="number"
                        value={awardPoints}
                        onChange={(e) => setAwardPoints(Number(e.target.value))}
                        className="mt-2 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 text-left">Lý do</label>
                      <input
                        type="text"
                        value={awardReason}
                        onChange={(e) => setAwardReason(e.target.value)}
                        className="mt-1 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                        placeholder="VD: Phát biểu tốt, Thảo luận sôi nổi..."
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                <button
                  type="button"
                  onClick={handleAwardPoints}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none sm:col-start-2 sm:text-sm"
                >
                  Xác nhận
                </button>
                <button
                  type="button"
                  onClick={() => setIsAwardModalOpen(false)}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:col-start-1 sm:text-sm"
                >
                  Hủy
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Speed Arena Modal */}
      {isSpeedArenaModalOpen && (
        <div className="fixed z-50 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={() => setIsSpeedArenaModalOpen(false)}></div>
            </div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="relative inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full sm:p-6">
              <div>
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100">
                  <Award className="h-6 w-6 text-yellow-600" />
                </div>
                <div className="mt-3 text-center sm:mt-5">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    Cộng điểm Đấu trường tốc độ
                  </h3>
                  <div className="mt-6 grid grid-cols-2 gap-6">
                    {/* Team 1 */}
                    <div className="border rounded-lg p-4 bg-blue-50">
                      <input
                        type="text"
                        value={team1Name}
                        onChange={(e) => setTeam1Name(e.target.value)}
                        className="text-center font-bold text-lg text-blue-800 bg-transparent border-b border-blue-300 focus:outline-none focus:border-blue-500 w-full mb-4"
                      />
                      <div className="space-y-2 text-left">
                        <p className="text-sm font-medium text-gray-700">Chọn nhóm:</p>
                        {groups.map(g => (
                          <label key={g.id} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={team1Groups.includes(g.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setTeam1Groups([...team1Groups, g.id]);
                                  setTeam2Groups(team2Groups.filter(id => id !== g.id));
                                } else {
                                  setTeam1Groups(team1Groups.filter(id => id !== g.id));
                                }
                              }}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700">{g.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Team 2 */}
                    <div className="border rounded-lg p-4 bg-red-50">
                      <input
                        type="text"
                        value={team2Name}
                        onChange={(e) => setTeam2Name(e.target.value)}
                        className="text-center font-bold text-lg text-red-800 bg-transparent border-b border-red-300 focus:outline-none focus:border-red-500 w-full mb-4"
                      />
                      <div className="space-y-2 text-left">
                        <p className="text-sm font-medium text-gray-700">Chọn nhóm:</p>
                        {groups.map(g => (
                          <label key={g.id} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={team2Groups.includes(g.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setTeam2Groups([...team2Groups, g.id]);
                                  setTeam1Groups(team1Groups.filter(id => id !== g.id));
                                } else {
                                  setTeam2Groups(team2Groups.filter(id => id !== g.id));
                                }
                              }}
                              className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                            />
                            <span className="text-sm text-gray-700">{g.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-6">
                    <label className="block text-sm font-medium text-gray-700 text-left">Số điểm thưởng cho đội thắng</label>
                    <input
                      type="number"
                      value={speedArenaPoints}
                      onChange={(e) => setSpeedArenaPoints(Number(e.target.value))}
                      className="mt-1 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:mt-6 flex space-x-3">
                <button
                  type="button"
                  onClick={handleStartSpeedArena}
                  className="flex-1 inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-yellow-500 text-base font-medium text-white hover:bg-yellow-600 focus:outline-none sm:text-sm"
                >
                  Bắt đầu Đấu trường
                </button>
                <button
                  type="button"
                  onClick={() => setIsSpeedArenaModalOpen(false)}
                  className="flex-1 inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:text-sm"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard Drawer */}
      {showLeaderboard && (
        <div className="fixed inset-0 overflow-hidden z-50">
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowLeaderboard(false)}></div>
            <section className="absolute inset-y-0 right-0 pl-10 max-w-full flex">
              <div className="w-screen max-w-md">
                <div className="h-full flex flex-col bg-white shadow-xl overflow-y-scroll">
                  <div className="px-4 py-6 bg-indigo-700 sm:px-6">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-medium text-white">Bảng xếp hạng</h2>
                      <button
                        onClick={() => setShowLeaderboard(false)}
                        className="text-indigo-200 hover:text-white"
                      >
                        <span className="sr-only">Close panel</span>
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div className="relative flex-1 px-4 py-6 sm:px-6">
                    <h3 className="text-md font-bold text-gray-900 mb-4 border-b pb-2">Top Nhóm</h3>
                    <ul className="space-y-3 mb-8">
                      {sortedGroups.map((group, index) => (
                        <li key={group.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                          <div className="flex items-center">
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white mr-3 ${index === 0 ? 'bg-yellow-400' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-yellow-600' : 'bg-indigo-200 text-indigo-800'}`}>
                              {index + 1}
                            </span>
                            <span className="font-medium text-gray-900">{group.name}</span>
                          </div>
                          <span className="font-bold text-indigo-600">{groupScores[group.id] || 0}</span>
                        </li>
                      ))}
                    </ul>

                    <h3 className="text-md font-bold text-gray-900 mb-4 border-b pb-2">Top Cá nhân</h3>
                    <ul className="space-y-3">
                      {sortedStudents.slice(0, 10).map((student, index) => (
                        <li key={student.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                          <div className="flex items-center">
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white mr-3 ${index === 0 ? 'bg-yellow-400' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-yellow-600' : 'bg-indigo-200 text-indigo-800'}`}>
                              {index + 1}
                            </span>
                            <span className="font-medium text-gray-900">{student.name}</span>
                          </div>
                          <span className="font-bold text-indigo-600">{studentScores[student.id] || 0}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
