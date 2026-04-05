import { useState, useEffect, useRef } from 'react';
import { Users, Settings, Target, Shuffle, List, Maximize, Minimize } from 'lucide-react';
import WheelSpinner from '../components/WheelSpinner';
import RandomName from '../components/RandomName';
import TargetedSelector from '../components/TargetedSelector';
import CardDraw from '../components/CardDraw';
import MysteryBox from '../components/MysteryBox';
import MagicHat from '../components/MagicHat';
import SlotMachine from '../components/SlotMachine';
import Elimination from '../components/Elimination';
import ClawMachine from '../components/ClawMachine';
import BalloonPop from '../components/BalloonPop';
import MiniRace from '../components/MiniRace';
import ScratchCard from '../components/ScratchCard';
import DuckShoot from '../components/DuckShoot';
import BingoCage from '../components/BingoCage';
import MagicCardFlip from '../components/MagicCardFlip';
import StudentActionModal from '../components/StudentActionModal';
import QueueList from '../components/QueueList';
import { StudentData, ClassData, classService } from '../services/classService';
import { groupService } from '../../teacher/services/groupService';
import { StudentGroup } from '../../../types';
import { auth } from '../../../config/firebase';

type SelectionMode = 'random' | 'targeted';
type RandomMethod = 'wheel' | 'name' | 'card' | 'box' | 'magic' | 'slot' | 'elimination' | 'balloon' | 'race' | 'scratch' | 'duck' | 'bingo' | 'magiccard' | 'claw' | 'random';
type ListSource = 'manual' | 'class';

export default function RandomSelector({ isGuestMode = false }: { isGuestMode?: boolean }) {
  const [mode, setMode] = useState<SelectionMode>('random');
  const [randomMethod, setRandomMethod] = useState<RandomMethod>('wheel');
  const [activeRandomMethod, setActiveRandomMethod] = useState<'wheel' | 'name' | 'card' | 'box' | 'magic' | 'slot' | 'elimination' | 'balloon' | 'race' | 'scratch' | 'duck' | 'bingo' | 'magiccard' | 'claw'>('wheel');
  const [isSelecting, setIsSelecting] = useState(false);
  const [students, setStudents] = useState<StudentData[]>([]);
  const [manualInput, setManualInput] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const [listSource, setListSource] = useState<ListSource>('manual');
  const [selectionTarget, setSelectionTarget] = useState<'student' | 'group'>('student');
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [isLoadingClasses, setIsLoadingClasses] = useState(false);
  const [groups, setGroups] = useState<StudentGroup[]>([]);

  // New state for Action Modal and Queue
  const [currentSelectedStudent, setCurrentSelectedStudent] = useState<StudentData | null>(null);
  const [queue, setQueue] = useState<StudentData[]>([]);
  const [isQueueOpen, setIsQueueOpen] = useState(true); // State for floating queue visibility

  // Settings state
  const [noDuplicate, setNoDuplicate] = useState(false);
  const [hideSelected, setHideSelected] = useState(true);
  const [selectedHistory, setSelectedHistory] = useState<string[]>([]);

  const containerRef = useRef<HTMLDivElement>(null);

  // Load settings
  useEffect(() => {
    const savedNoDuplicate = localStorage.getItem('randomSelector_noDuplicate');
    if (savedNoDuplicate) {
      setNoDuplicate(JSON.parse(savedNoDuplicate));
    }
    const savedHideSelected = localStorage.getItem('randomSelector_hideSelected');
    if (savedHideSelected) {
      setHideSelected(JSON.parse(savedHideSelected));
    }
  }, []);

  // Filter students based on No Duplicate setting
  const availableStudents = noDuplicate 
    ? students.filter(s => !selectedHistory.includes(s.id))
    : students;

  // Students to pass to components for rendering
  const displayStudents = (noDuplicate && hideSelected) 
    ? availableStudents 
    : students;

  // Fetch classes on mount
  useEffect(() => {
    if (isGuestMode) return;
    const fetchClasses = async () => {
      setIsLoadingClasses(true);
      try {
        const fetchedClasses = await classService.getAllClasses();
        setClasses(fetchedClasses);
        if (fetchedClasses.length > 0) {
          setSelectedClassId(fetchedClasses[0].id);
        }
      } catch (error) {
        console.error("Error fetching classes:", error);
      } finally {
        setIsLoadingClasses(false);
      }
    };
    fetchClasses();
  }, [isGuestMode]);

  // Update students based on source
  useEffect(() => {
    // Reset history when list changes
    setSelectedHistory([]);
    
    if (listSource === 'manual') {
      const lines = manualInput.split('\n').filter(line => line.trim() !== '');
      const newStudents: StudentData[] = lines.map((name, index) => ({
        id: `manual-${index}`,
        name: name.trim(),
        classId: 'manual'
      }));
      setStudents(newStudents);
    } else if (listSource === 'class' && selectedClassId) {
      const fetchStudents = async () => {
        try {
          const [fetchedStudents, fetchedGroups] = await Promise.all([
            classService.getStudentsByClass(selectedClassId),
            groupService.getGroupsByClass(selectedClassId)
          ]);
          setGroups(fetchedGroups);
          
          if (selectionTarget === 'group') {
            setStudents(fetchedGroups.map(g => ({
              id: g.id,
              name: g.name,
              classId: g.classId
            })));
          } else {
            setStudents(fetchedStudents);
          }
        } catch (error) {
          console.error("Error fetching students and groups:", error);
        }
      };
      fetchStudents();
    }
  }, [manualInput, listSource, selectedClassId, selectionTarget]);

  // Handle random method selection
  useEffect(() => {
    if (randomMethod !== 'random') {
      setActiveRandomMethod(randomMethod);
    }
  }, [randomMethod]);

  // Auto-change method after selection if 'random' is selected
  useEffect(() => {
    if (!currentSelectedStudent && isSelecting && randomMethod === 'random') {
      const methods: ('wheel' | 'name' | 'card' | 'box' | 'magic' | 'slot' | 'elimination' | 'balloon' | 'race' | 'scratch' | 'duck' | 'bingo' | 'magiccard' | 'claw')[] = ['wheel', 'name', 'card', 'box', 'magic', 'slot', 'elimination', 'balloon', 'race', 'scratch', 'duck', 'bingo', 'magiccard', 'claw'];
      const randomIndex = Math.floor(Math.random() * methods.length);
      setActiveRandomMethod(methods[randomIndex]);
    }
  }, [currentSelectedStudent, isSelecting, randomMethod]);

  const handleStartSelection = () => {
    if (availableStudents.length === 0) {
      if (noDuplicate && students.length > 0) {
        alert(`Đã chọn hết tất cả ${listSource === 'class' && selectionTarget === 'group' ? 'nhóm' : 'học sinh'} trong phiên làm việc này!`);
        return;
      }
      return;
    }

    if (randomMethod === 'random') {
      const methods: ('wheel' | 'name' | 'card' | 'box' | 'magic' | 'slot' | 'elimination' | 'balloon' | 'race' | 'scratch' | 'duck' | 'bingo' | 'magiccard' | 'claw')[] = ['wheel', 'name', 'card', 'box', 'magic', 'slot', 'elimination', 'balloon', 'race', 'scratch', 'duck', 'bingo', 'magiccard', 'claw'];
      const randomIndex = Math.floor(Math.random() * methods.length);
      setActiveRandomMethod(methods[randomIndex]);
    }
    setIsSelecting(true);
  };

  const handleNewSession = () => {
    if (window.confirm("Bạn có muốn kết thúc phiên làm việc hiện tại và bắt đầu phiên mới? (Lịch sử chọn sẽ được xóa)")) {
      setSelectedHistory([]);
      setQueue([]);
      setIsSelecting(false);
      setCurrentSelectedStudent(null);
    }
  };

  const handleBack = () => {
    setIsSelecting(false);
    setCurrentSelectedStudent(null);
  };

  // Fullscreen logic
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Default names for testing
  useEffect(() => {
    if (manualInput === '') {
      setManualInput('Nguyễn Văn A\nTrần Thị B\nLê Văn C\nPhạm Thị D\nHoàng Văn E\nNgô Thị F\nĐặng Văn G\nBùi Thị H');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Action Handlers
  const handleStudentSelected = (student: StudentData) => {
    // Add to history if no duplicate is on
    if (noDuplicate) {
      setSelectedHistory(prev => [...prev, student.id]);
    }

    // Delay showing the modal slightly to let the animation finish visually in the child component
    setTimeout(() => {
      setCurrentSelectedStudent(student);
    }, 500);
  };

  const handleAwardPoints = async (studentId: string, points: number, awardToGroup: boolean = false) => {
    if (selectionTarget === 'group') {
      const group = groups.find(g => g.id === studentId);
      if (group) {
        await groupService.awardPoints(group.id, points, group.studentIds);
      }
    } else {
      const studentGroup = groups.find(g => g.studentIds.includes(studentId));
      
      if (awardToGroup && studentGroup) {
        // Award points to the group and ALL members
        await groupService.awardPoints(studentGroup.id, points, studentGroup.studentIds);
      } else if (studentGroup) {
        // Award points to the student AND the group
        await groupService.awardIndividualAndGroupPoints(studentId, studentGroup.id, points);
      } else {
        // Just individual points
        await classService.updateStudentPoints(studentId, points);
      }
    }
    
    setCurrentSelectedStudent(null);
    
    // Also remove from queue if present
    setQueue(prev => prev.filter(s => s.id !== studentId));
  };

  const handleAddToQueue = () => {
    if (currentSelectedStudent) {
      // Check if already in queue
      if (!queue.some(s => s.id === currentSelectedStudent.id)) {
        setQueue(prev => [...prev, currentSelectedStudent]);
        setIsQueueOpen(true); // Open queue when adding
      }
      setCurrentSelectedStudent(null);
    }
  };

  const handleSkip = (studentId?: string) => {
    if (studentId) {
      // Remove from queue
      setQueue(prev => prev.filter(s => s.id !== studentId));
    } else {
      // Skip current selection
      setCurrentSelectedStudent(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 relative" ref={containerRef}>
      {!isFullscreen && (
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-600" />
            Chọn ngẫu nhiên
          </h1>
          <div className="flex items-center gap-2">
            <button
              onClick={handleNewSession}
              className="flex items-center gap-2 px-4 py-2 bg-orange-50 border border-orange-200 rounded-lg text-sm font-medium text-orange-700 hover:bg-orange-100 transition-colors"
              title="Làm mới phiên làm việc"
            >
              <Shuffle className="w-4 h-4" />
              Phiên mới
            </button>
            <button
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Settings className="w-4 h-4" />
              {isSettingsOpen ? 'Đóng cài đặt' : 'Cài đặt danh sách'}
            </button>
          </div>
        </div>
      )}

      <div className={`grid grid-cols-1 ${isFullscreen ? 'h-screen' : 'lg:grid-cols-3 gap-6'}`}>
        {/* Settings Sidebar */}
        {isSettingsOpen && !isFullscreen && (
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <List className="w-5 h-5 text-indigo-500" />
                Nguồn danh sách
              </h2>
              
              <div className="flex bg-gray-100 p-1 rounded-lg mb-4">
                <button
                  onClick={() => setListSource('manual')}
                  className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    listSource === 'manual' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Nhập tay
                </button>
                {!isGuestMode && (
                  <button
                    onClick={() => setListSource('class')}
                    className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${
                      listSource === 'class' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Từ lớp học
                  </button>
                )}
              </div>

              {listSource === 'manual' ? (
                <>
                  <p className="text-sm text-gray-500 mb-2">Nhập tên học sinh (mỗi dòng 1 tên):</p>
                  <textarea
                    value={manualInput}
                    onChange={(e) => setManualInput(e.target.value)}
                    className="w-full h-48 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none text-sm"
                    placeholder="Nguyễn Văn A&#10;Trần Thị B..."
                  />
                </>
              ) : (
                <>
                  <p className="text-sm text-gray-500 mb-2">Chọn lớp học:</p>
                  {isLoadingClasses ? (
                    <p className="text-sm text-gray-500">Đang tải danh sách lớp...</p>
                  ) : classes.length > 0 ? (
                    <div className="space-y-4">
                      <select
                        value={selectedClassId}
                        onChange={(e) => setSelectedClassId(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                      >
                        {classes.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                      
                      <div>
                        <p className="text-sm text-gray-500 mb-2">Đối tượng chọn:</p>
                        <div className="flex bg-gray-100 p-1 rounded-lg">
                          <button
                            onClick={() => setSelectionTarget('student')}
                            className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${
                              selectionTarget === 'student' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                            }`}
                          >
                            Cá nhân
                          </button>
                          <button
                            onClick={() => setSelectionTarget('group')}
                            className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${
                              selectionTarget === 'group' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                            }`}
                          >
                            Nhóm
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-red-500">Chưa có lớp học nào trên hệ thống.</p>
                  )}
                </>
              )}
              
              <div className="mt-4 text-sm text-gray-500 text-right">
                Tổng cộng: <span className="font-bold text-indigo-600">{students.length}</span> {listSource === 'class' && selectionTarget === 'group' ? 'nhóm' : 'học sinh'}
                {noDuplicate && (
                  <span className="block text-xs text-gray-400 mt-1">
                    (Còn lại: {availableStudents.length})
                  </span>
                )}
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Chế độ chọn</h2>
              <div className="space-y-3">
                <button
                  onClick={() => setMode('random')}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-colors ${
                    mode === 'random' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 hover:border-indigo-200 text-gray-700'
                  }`}
                >
                  <Shuffle className="w-5 h-5" />
                  <span className="font-medium">Ngẫu nhiên</span>
                </button>
                <button
                  onClick={() => setMode('targeted')}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-colors ${
                    mode === 'targeted' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 hover:border-indigo-200 text-gray-700'
                  }`}
                >
                  <Target className="w-5 h-5" />
                  <span className="font-medium">Chỉ định</span>
                </button>
              </div>

              {mode === 'random' && (
                <div className="mt-6">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wider">Cách chọn ngẫu nhiên</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setRandomMethod('wheel')}
                      className={`py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                        randomMethod === 'wheel' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Vòng quay
                    </button>
                    <button
                      onClick={() => setRandomMethod('name')}
                      className={`py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                        randomMethod === 'name' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Lật thẻ tên
                    </button>
                    <button
                      onClick={() => setRandomMethod('card')}
                      className={`py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                        randomMethod === 'card' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Bốc thăm
                    </button>
                    <button
                      onClick={() => setRandomMethod('box')}
                      className={`py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                        randomMethod === 'box' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Mở hộp
                    </button>
                    <button
                      onClick={() => setRandomMethod('magic')}
                      className={`py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                        randomMethod === 'magic' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Mũ ảo thuật
                    </button>
                    <button
                      onClick={() => setRandomMethod('slot')}
                      className={`py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                        randomMethod === 'slot' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Quay xèng
                    </button>
                    <button
                      onClick={() => setRandomMethod('elimination')}
                      className={`py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                        randomMethod === 'elimination' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Loại trừ
                    </button>
                    <button
                      onClick={() => setRandomMethod('balloon')}
                      className={`py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                        randomMethod === 'balloon' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Bắn bóng
                    </button>
                    <button
                      onClick={() => setRandomMethod('race')}
                      className={`py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                        randomMethod === 'race' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Đua xe
                    </button>
                    <button
                      onClick={() => setRandomMethod('scratch')}
                      className={`py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                        randomMethod === 'scratch' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Thẻ cào
                    </button>
                    <button
                      onClick={() => setRandomMethod('duck')}
                      className={`py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                        randomMethod === 'duck' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Bắn vịt
                    </button>
                    <button
                      onClick={() => setRandomMethod('bingo')}
                      className={`py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                        randomMethod === 'bingo' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Lồng cầu
                    </button>
                    <button
                      onClick={() => setRandomMethod('magiccard')}
                      className={`py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                        randomMethod === 'magiccard' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Bài ma thuật
                    </button>
                    <button
                      onClick={() => setRandomMethod('claw')}
                      className={`py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                        randomMethod === 'claw' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Gắp thú
                    </button>
                    <button
                      onClick={() => setRandomMethod('random')}
                      className={`py-2 px-3 rounded-md text-sm font-medium transition-colors col-span-2 ${
                        randomMethod === 'random' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Ngẫu nhiên
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Main Display Area */}
        <div className={`bg-white p-8 rounded-xl shadow-sm border border-gray-200 min-h-[600px] flex flex-col items-center justify-center relative ${isFullscreen ? 'h-full border-0 rounded-none' : (isSettingsOpen ? 'lg:col-span-2' : 'lg:col-span-3')}`}>
          <button
            onClick={toggleFullscreen}
            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors z-20"
            title={isFullscreen ? "Thu nhỏ" : "Toàn màn hình"}
          >
            {isFullscreen ? <Minimize className="w-6 h-6" /> : <Maximize className="w-6 h-6" />}
          </button>

          {mode === 'targeted' ? (
            <div className="w-full">
              <h2 className="text-2xl font-bold text-center text-gray-800 mb-8">Chế độ chọn chỉ định</h2>
              <TargetedSelector students={displayStudents} onSelect={handleStudentSelected} selectableIds={availableStudents.map(s => s.id)} hideSelected={hideSelected} />
            </div>
          ) : (
            !isSelecting ? (
              <div className="w-full h-full flex flex-col items-center justify-center space-y-6">
                <div className="text-center space-y-2">
                  <h2 className="text-3xl font-bold text-gray-900">Sẵn sàng chọn ngẫu nhiên?</h2>
                  <p className="text-gray-500">
                    Danh sách hiện tại có <span className="font-bold text-indigo-600">{availableStudents.length}</span> {listSource === 'class' && selectionTarget === 'group' ? 'nhóm' : 'học sinh'}.
                  </p>
                  {noDuplicate && (
                    <p className="text-xs text-orange-600 bg-orange-50 px-3 py-1 rounded-full inline-block">
                      Đang bật chế độ không trùng lặp
                    </p>
                  )}
                </div>
                
                <button
                  onClick={handleStartSelection}
                  disabled={availableStudents.length === 0}
                  className={`
                    group relative px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xl font-bold rounded-2xl shadow-lg transform transition-all duration-200
                    ${availableStudents.length === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 hover:shadow-xl active:scale-95'}
                  `}
                >
                  <span className="flex items-center gap-3">
                    <Shuffle className="w-6 h-6 group-hover:animate-spin" />
                    Bắt đầu chọn
                  </span>
                  <div className="absolute inset-0 rounded-2xl bg-white/20 blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                </button>

                {availableStudents.length === 0 && (
                  <p className="text-red-500 text-sm animate-bounce">
                    {noDuplicate && students.length > 0 
                      ? `Đã chọn hết ${listSource === 'class' && selectionTarget === 'group' ? 'nhóm' : 'học sinh'}! Vui lòng làm mới hoặc tắt chế độ không trùng lặp.`
                      : "Vui lòng nhập danh sách hoặc chọn lớp học để bắt đầu!"}
                  </p>
                )}
                
                {noDuplicate && students.length > 0 && availableStudents.length === 0 && (
                  <button 
                    onClick={() => setSelectedHistory([])}
                    className="mt-4 text-indigo-600 hover:text-indigo-800 text-sm font-medium underline"
                  >
                    Làm mới lịch sử chọn
                  </button>
                )}
              </div>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center relative">
                <button
                  onClick={handleBack}
                  className="absolute top-0 left-0 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium flex items-center gap-2 transition-colors z-10"
                >
                  ← Quay lại
                </button>
                
                <div className="w-full h-full flex items-center justify-center pt-12">
                  {activeRandomMethod === 'wheel' && <WheelSpinner students={displayStudents} onSelect={handleStudentSelected} selectableIds={availableStudents.map(s => s.id)} hideSelected={hideSelected} />}
                  {activeRandomMethod === 'name' && <RandomName students={displayStudents} onSelect={handleStudentSelected} selectableIds={availableStudents.map(s => s.id)} hideSelected={hideSelected} />}
                  {activeRandomMethod === 'card' && <CardDraw students={displayStudents} onSelect={handleStudentSelected} selectableIds={availableStudents.map(s => s.id)} hideSelected={hideSelected} />}
                  {activeRandomMethod === 'box' && <MysteryBox students={displayStudents} onSelect={handleStudentSelected} selectableIds={availableStudents.map(s => s.id)} hideSelected={hideSelected} />}
                  {activeRandomMethod === 'magic' && <MagicHat students={displayStudents} onSelect={handleStudentSelected} selectableIds={availableStudents.map(s => s.id)} hideSelected={hideSelected} />}
                  {activeRandomMethod === 'slot' && <SlotMachine students={displayStudents} onSelect={handleStudentSelected} selectableIds={availableStudents.map(s => s.id)} hideSelected={hideSelected} />}
                  {activeRandomMethod === 'elimination' && <Elimination students={displayStudents} onSelect={handleStudentSelected} selectableIds={availableStudents.map(s => s.id)} hideSelected={hideSelected} />}
                  {activeRandomMethod === 'balloon' && <BalloonPop students={displayStudents} onSelect={handleStudentSelected} selectableIds={availableStudents.map(s => s.id)} hideSelected={hideSelected} />}
                  {activeRandomMethod === 'race' && <MiniRace students={displayStudents} onSelect={handleStudentSelected} selectableIds={availableStudents.map(s => s.id)} hideSelected={hideSelected} />}
                  {activeRandomMethod === 'scratch' && <ScratchCard students={displayStudents} onSelect={handleStudentSelected} selectableIds={availableStudents.map(s => s.id)} hideSelected={hideSelected} />}
                  {activeRandomMethod === 'duck' && <DuckShoot students={displayStudents} onSelect={handleStudentSelected} selectableIds={availableStudents.map(s => s.id)} hideSelected={hideSelected} />}
                  {activeRandomMethod === 'bingo' && <BingoCage students={displayStudents} onSelect={handleStudentSelected} selectableIds={availableStudents.map(s => s.id)} hideSelected={hideSelected} />}
                  {activeRandomMethod === 'magiccard' && <MagicCardFlip students={displayStudents} onSelect={handleStudentSelected} selectableIds={availableStudents.map(s => s.id)} hideSelected={hideSelected} />}
                  {activeRandomMethod === 'claw' && <ClawMachine students={displayStudents} onSelect={handleStudentSelected} selectableIds={availableStudents.map(s => s.id)} hideSelected={hideSelected} />}
                </div>
              </div>
            )
          )}
        </div>
      </div>

      {/* Floating Queue List */}
      <div className={`fixed bottom-4 right-4 z-40 transition-all duration-300 ${isQueueOpen ? 'w-80' : 'w-auto'}`}>
        {isQueueOpen ? (
          <div className="bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
            <div className="bg-indigo-600 p-3 flex items-center justify-between text-white">
              <h3 className="font-bold flex items-center gap-2">
                <List className="w-4 h-4" />
                Hàng chờ ({queue.length})
              </h3>
              <button 
                onClick={() => setIsQueueOpen(false)}
                className="p-1 hover:bg-indigo-700 rounded transition-colors"
              >
                <Minimize className="w-4 h-4" />
              </button>
            </div>
            <div className="max-h-80 overflow-y-auto">
              <QueueList 
                queue={queue} 
                groups={groups}
                onAwardPoints={handleAwardPoints}
                onSkip={handleSkip}
              />
            </div>
          </div>
        ) : (
          <button
            onClick={() => setIsQueueOpen(true)}
            className="bg-indigo-600 text-white p-4 rounded-full shadow-lg hover:bg-indigo-700 transition-all hover:scale-110 flex items-center gap-2"
          >
            <List className="w-6 h-6" />
            {queue.length > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center border-2 border-white">
                {queue.length}
              </span>
            )}
          </button>
        )}
      </div>

      {/* Action Modal */}
      {currentSelectedStudent && (
        <StudentActionModal 
          student={currentSelectedStudent}
          groupName={groups.find(g => g.studentIds.includes(currentSelectedStudent.id))?.name}
          isGroup={selectionTarget === 'group'}
          onClose={() => handleSkip()}
          onAwardPoints={(points, toGroup) => handleAwardPoints(currentSelectedStudent.id, points, toGroup)}
          onAddToQueue={handleAddToQueue}
          onSkip={() => handleSkip()}
        />
      )}
    </div>
  );
}
