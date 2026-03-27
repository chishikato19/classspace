import { useState, useEffect } from 'react';
import { Users, UserPlus, Trash2, Shuffle, Save, Plus, Award, ChevronRight, ChevronDown } from 'lucide-react';
import { classService, ClassData, StudentData } from '../../random-selector/services/classService';
import { groupService } from '../services/groupService';
import { StudentGroup } from '../../../types';
import { auth } from '../../../config/firebase';

export default function GroupManager() {
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [students, setStudents] = useState<StudentData[]>([]);
  const [groups, setGroups] = useState<StudentGroup[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Random grouping settings
  const [numGroups, setNumGroups] = useState(4);
  const [groupingMethod, setGroupingMethod] = useState<'count' | 'size'>('count');
  const [studentsPerGroup, setStudentsPerGroup] = useState(4);

  useEffect(() => {
    const fetchClasses = async () => {
      if (!auth.currentUser) return;
      const fetchedClasses = await classService.getClassesByTeacher(auth.currentUser.uid);
      setClasses(fetchedClasses);
      if (fetchedClasses.length > 0) {
        setSelectedClassId(fetchedClasses[0].id);
      }
    };
    fetchClasses();
  }, []);

  useEffect(() => {
    if (selectedClassId) {
      fetchData();
    }
  }, [selectedClassId]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [fetchedStudents, fetchedGroups] = await Promise.all([
        classService.getStudentsByClass(selectedClassId),
        groupService.getGroupsByClass(selectedClassId)
      ]);
      setStudents(fetchedStudents);
      setGroups(fetchedGroups);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRandomGrouping = async () => {
    if (!selectedClassId || students.length === 0 || !auth.currentUser) return;
    
    setIsGenerating(true);
    try {
      // Delete existing groups first
      await groupService.deleteAllGroupsInClass(selectedClassId);
      
      const shuffledStudents = [...students].sort(() => Math.random() - 0.5);
      let actualNumGroups = numGroups;
      
      if (groupingMethod === 'size') {
        actualNumGroups = Math.ceil(students.length / studentsPerGroup);
      }
      
      const newGroups: Omit<StudentGroup, 'id'>[] = [];
      for (let i = 0; i < actualNumGroups; i++) {
        newGroups.push({
          name: `Nhóm ${i + 1}`,
          classId: selectedClassId,
          studentIds: [],
          points: 0,
          teacherId: auth.currentUser.uid,
          createdAt: Date.now()
        });
      }
      
      // Distribute students
      shuffledStudents.forEach((student, index) => {
        const groupIndex = index % actualNumGroups;
        newGroups[groupIndex].studentIds.push(student.id);
      });
      
      // Save to Firestore
      await Promise.all(newGroups.filter(g => g.studentIds.length > 0).map(g => groupService.createGroup(g)));
      
      await fetchData();
    } catch (error) {
      console.error("Error generating groups:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa nhóm này?")) {
      await groupService.deleteGroup(groupId);
      await fetchData();
    }
  };

  const handleAwardPoints = async (group: StudentGroup, points: number) => {
    try {
      await groupService.awardPoints(group.id, points, group.studentIds);
      await fetchData();
    } catch (error) {
      console.error("Error awarding points:", error);
    }
  };

  const getStudentName = (id: string) => {
    return students.find(s => s.id === id)?.name || "Không xác định";
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Users className="w-6 h-6 text-indigo-600" />
              Quản lý nhóm học sinh
            </h2>
            <p className="text-sm text-gray-500">Chia nhóm và cộng điểm cho học sinh</p>
          </div>
          
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-700">Chọn lớp:</label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
            >
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Grouping Controls */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Shuffle className="w-5 h-5 text-indigo-500" />
              Chia nhóm ngẫu nhiên
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cách chia:</label>
                <div className="flex bg-gray-100 p-1 rounded-lg">
                  <button
                    onClick={() => setGroupingMethod('count')}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      groupingMethod === 'count' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500'
                    }`}
                  >
                    Số lượng nhóm
                  </button>
                  <button
                    onClick={() => setGroupingMethod('size')}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      groupingMethod === 'size' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500'
                    }`}
                  >
                    Số HS mỗi nhóm
                  </button>
                </div>
              </div>

              {groupingMethod === 'count' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Số lượng nhóm:</label>
                  <input
                    type="number"
                    min="2"
                    max="20"
                    value={numGroups}
                    onChange={(e) => setNumGroups(parseInt(e.target.value))}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Số học sinh mỗi nhóm:</label>
                  <input
                    type="number"
                    min="1"
                    max="40"
                    value={studentsPerGroup}
                    onChange={(e) => setStudentsPerGroup(parseInt(e.target.value))}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              )}

              <button
                onClick={handleRandomGrouping}
                disabled={isGenerating || students.length === 0}
                className="w-full py-3 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isGenerating ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Shuffle className="w-5 h-5" />
                )}
                Bắt đầu chia nhóm
              </button>
              
              <p className="text-xs text-gray-500 text-center italic">
                * Lưu ý: Chia nhóm mới sẽ xóa các nhóm hiện tại của lớp này.
              </p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-green-500" />
              Học sinh chưa có nhóm
            </h3>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
              {students.filter(s => !groups.some(g => g.studentIds.includes(s.id))).length > 0 ? (
                students.filter(s => !groups.some(g => g.studentIds.includes(s.id))).map(student => (
                  <div key={student.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-sm">
                    <span className="font-medium text-gray-700">{student.name}</span>
                    <button className="text-indigo-600 hover:text-indigo-800 p-1" title="Thêm vào nhóm">
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">Tất cả học sinh đã có nhóm</p>
              )}
            </div>
          </div>
        </div>

        {/* Groups Display */}
        <div className="lg:col-span-2 space-y-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-gray-200">
              <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-gray-500">Đang tải danh sách nhóm...</p>
            </div>
          ) : groups.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {groups.map(group => (
                <div key={group.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
                  <div className="bg-gray-50 p-4 border-b border-gray-200 flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-gray-900">{group.name}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-bold">
                          {group.points} điểm
                        </span>
                        <span className="text-xs text-gray-500">
                          {group.studentIds.length} thành viên
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteGroup(group.id)}
                      className="text-gray-400 hover:text-red-500 p-1 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="p-4 flex-grow space-y-2">
                    <div className="grid grid-cols-1 gap-1">
                      {group.studentIds.map(sid => (
                        <div key={sid} className="text-sm text-gray-600 flex items-center gap-2">
                          <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full" />
                          {getStudentName(sid)}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 bg-gray-50 border-t border-gray-200 grid grid-cols-3 gap-2">
                    <button
                      onClick={() => handleAwardPoints(group, 1)}
                      className="flex items-center justify-center gap-1 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-green-600 hover:bg-green-50 transition-colors"
                    >
                      <Plus className="w-3 h-3" /> 1đ
                    </button>
                    <button
                      onClick={() => handleAwardPoints(group, 5)}
                      className="flex items-center justify-center gap-1 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-green-600 hover:bg-green-50 transition-colors"
                    >
                      <Plus className="w-3 h-3" /> 5đ
                    </button>
                    <button
                      onClick={() => handleAwardPoints(group, 10)}
                      className="flex items-center justify-center gap-1 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-green-600 hover:bg-green-50 transition-colors"
                    >
                      <Plus className="w-3 h-3" /> 10đ
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-gray-200 text-center px-6">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Users className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Chưa có nhóm nào</h3>
              <p className="text-gray-500 max-w-sm">
                Sử dụng bảng điều khiển bên trái để chia nhóm ngẫu nhiên cho học sinh trong lớp này.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
