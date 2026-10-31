import * as XLSX from 'xlsx';
import { Exam, ExamAttempt, ExamQuestion } from '../types';
import { deobfuscateAnswer, deobfuscateStringAnswer } from './obfuscator';

export const formatDateTime = (ts?: number) => {
  if (!ts) return '-';
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

export const formatDuration = (startTime: number, endTime?: number) => {
  if (!endTime) return 'Chưa nộp';
  const durationMs = Math.max(0, endTime - startTime);
  const totalSeconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

export const getQuestionAnswerDisplay = (q: ExamQuestion, sub: number | string | undefined): string => {
  if (sub === undefined || sub === null || sub === '') {
    return 'Chưa làm';
  }

  if (q.type === 'short_answer') {
    return String(sub).trim();
  }

  if (q.type === 'true_false_cluster') {
    const arr = String(sub).split(',');
    return arr
      .map((val, idx) => {
        const letter = String.fromCharCode(97 + idx); // a, b, c, d
        const displayVal = val === 'T' ? 'Đúng' : val === 'F' ? 'Sai' : '-';
        return `${letter}: ${displayVal}`;
      })
      .join('; ');
  }

  if (q.type === 'true_false') {
    const s = String(sub).toLowerCase().trim();
    if (s === '0' || s === 't' || s === 'true') return 'Đúng';
    if (s === '1' || s === 'f' || s === 'false') return 'Sai';
    return String(sub);
  }

  // Multiple choice (0 -> A, 1 -> B, 2 -> C, 3 -> D...)
  const num = Number(sub);
  if (!isNaN(num) && num >= 0 && num < 26) {
    return String.fromCharCode(65 + num);
  }
  return String(sub);
};

export const getQuestionCorrectAnswerDisplay = (q: ExamQuestion): string => {
  if (!q.obfuscatedAnswer) return '-';
  try {
    if (q.type === 'short_answer') {
      return deobfuscateStringAnswer(q.obfuscatedAnswer, q.id);
    }
    if (q.type === 'true_false_cluster') {
      const realAnsStr = deobfuscateStringAnswer(q.obfuscatedAnswer, q.id);
      const realAnswers = realAnsStr.split(',');
      return realAnswers
        .map((ans, idx) => {
          const letter = String.fromCharCode(97 + idx);
          return `${letter}: ${ans === 'true' ? 'Đúng' : 'Sai'}`;
        })
        .join('; ');
    }
    if (q.type === 'true_false') {
      const correctStr = deobfuscateStringAnswer(q.obfuscatedAnswer, q.id);
      return correctStr === 'true' || correctStr === 'T' ? 'Đúng' : 'Sai';
    }
    const correctIdx = deobfuscateAnswer(q.obfuscatedAnswer, q.id);
    if (correctIdx >= 0 && correctIdx < 26) {
      return String.fromCharCode(65 + correctIdx);
    }
    return String(correctIdx);
  } catch {
    return '-';
  }
};

export const exportExamReportToExcel = (
  exam: Exam,
  attempts: ExamAttempt[],
  options?: { selectedClass?: string }
) => {
  if (!exam || attempts.length === 0) {
    alert('Không có dữ liệu bài làm để xuất báo cáo!');
    return false;
  }

  const selectedClass = options?.selectedClass || 'all';
  const filteredAttempts = attempts.filter(a => {
    return selectedClass === 'all' || (a.studentClass || 'Khác') === selectedClass;
  });

  if (filteredAttempts.length === 0) {
    alert('Không có bài thi nào thuộc lớp đã chọn!');
    return false;
  }

  // Sắp xếp theo họ tên hoặc điểm
  const sorted = [...filteredAttempts].sort((a, b) => b.score - a.score);

  const questionHeaders = exam.questions.map((_, idx) => `Câu ${idx + 1}`);

  // 1. Headers theo đúng yêu cầu:
  // Họ tên, Lớp, Điểm, Số câu đúng/tổng số câu, Thời gian bắt đầu làm bài, Thời gian làm bài (tính bằng phút:giây), Phương án lựa chọn từng của từng câu hỏi
  const headers = [
    'STT',
    'Họ tên',
    'Lớp',
    'Điểm',
    'Số câu đúng/tổng số câu',
    'Thời gian bắt đầu làm bài',
    'Thời gian làm bài (phút:giây)',
    'Thời gian nộp bài',
    'Số lần rời tab',
    ...questionHeaders
  ];

  // Hàng đáp án chuẩn
  const answerKeyRow = [
    '-',
    'ĐÁP ÁN CHUẨN',
    '-',
    10,
    `${exam.questions.length}/${exam.questions.length}`,
    '-',
    '-',
    '-',
    0,
    ...exam.questions.map(q => getQuestionCorrectAnswerDisplay(q))
  ];

  // Dữ liệu từng học sinh
  const studentRows = sorted.map((a, idx) => {
    const qAnswers = exam.questions.map(q => getQuestionAnswerDisplay(q, a.submissions[q.id]));
    return [
      idx + 1,
      a.studentName,
      a.studentClass || 'Khác',
      typeof a.score === 'number' ? Number(a.score.toFixed(2)) : a.score,
      `${a.totalCorrect}/${exam.questions.length}`,
      formatDateTime(a.startTime),
      formatDuration(a.startTime, a.endTime),
      a.endTime ? formatDateTime(a.endTime) : 'Chưa nộp',
      a.tabSwitchCount || 0,
      ...qAnswers
    ];
  });

  const wb = XLSX.utils.book_new();

  // Sheet 1: Bảng Điểm
  const wsBangDiem = XLSX.utils.aoa_to_sheet([headers, answerKeyRow, ...studentRows]);
  wsBangDiem['!cols'] = [
    { wch: 6 },  // STT
    { wch: 26 }, // Họ tên
    { wch: 14 }, // Lớp
    { wch: 10 }, // Điểm
    { wch: 24 }, // Số câu đúng/tổng số câu
    { wch: 26 }, // Thời gian bắt đầu làm bài
    { wch: 28 }, // Thời gian làm bài (phút:giây)
    { wch: 22 }, // Thời gian nộp bài
    { wch: 16 }, // Số lần rời tab
    ...exam.questions.map(() => ({ wch: 12 }))
  ];
  XLSX.utils.book_append_sheet(wb, wsBangDiem, 'Bảng Điểm');

  // Sheet 2: Thống kê chi tiết từng câu hỏi
  const statsHeaders = [
    'Câu số',
    'Nội dung tóm tắt',
    'Loại câu hỏi',
    'Điểm số',
    'Đáp án chuẩn',
    'Số HS làm đúng',
    'Tổng số bài thi',
    'Tỷ lệ đúng (%)'
  ];

  const statsRows = exam.questions.map((q, idx) => {
    let correctCount = 0;
    filteredAttempts.forEach(a => {
      const sub = a.submissions[q.id];
      if (sub !== undefined && q.obfuscatedAnswer) {
        if (q.type === 'short_answer') {
          const correctAns = deobfuscateStringAnswer(q.obfuscatedAnswer, q.id);
          const validAnswers = correctAns.split('||').map((s: string) => s.trim().toLowerCase());
          if (validAnswers.includes(String(sub).trim().toLowerCase())) correctCount++;
        } else if (q.type === 'true_false_cluster') {
          const realAnsStr = deobfuscateStringAnswer(q.obfuscatedAnswer, q.id);
          const realAnswers = realAnsStr.split(',');
          const studentAnswers = (String(sub) || '').split(',');
          let cCount = 0;
          realAnswers.forEach((ans, aIdx) => {
            if (studentAnswers[aIdx] === (ans === 'true' ? 'T' : 'F')) cCount++;
          });
          if (cCount === 4) correctCount++;
        } else if (q.type === 'true_false') {
          const realAnsStr = deobfuscateStringAnswer(q.obfuscatedAnswer, q.id);
          const isTrue = realAnsStr === 'true' || realAnsStr === 'T';
          const s = String(sub).toLowerCase().trim();
          const isSubTrue = s === '0' || s === 't' || s === 'true';
          if (isTrue === isSubTrue) correctCount++;
        } else {
          const correctIdx = deobfuscateAnswer(q.obfuscatedAnswer, q.id);
          if (sub === correctIdx) correctCount++;
        }
      }
    });

    const accuracy = filteredAttempts.length > 0 ? Number(((correctCount / filteredAttempts.length) * 100).toFixed(1)) : 0;
    const typeName =
      q.type === 'short_answer'
        ? 'Tự luận ngắn'
        : q.type === 'true_false_cluster'
        ? 'Đúng/Sai chùm'
        : q.type === 'true_false'
        ? 'Đúng/Sai'
        : 'Trắc nghiệm';

    const shortContent = q.text ? q.text.replace(/<[^>]*>?/gm, '').substring(0, 50) : '';

    return [
      `Câu ${idx + 1}`,
      shortContent,
      typeName,
      typeof q.points === 'number' ? q.points : Number((10 / exam.questions.length).toFixed(2)),
      getQuestionCorrectAnswerDisplay(q),
      correctCount,
      filteredAttempts.length,
      `${accuracy}%`
    ];
  });

  const wsStats = XLSX.utils.aoa_to_sheet([statsHeaders, ...statsRows]);
  wsStats['!cols'] = [
    { wch: 10 },
    { wch: 35 },
    { wch: 18 },
    { wch: 10 },
    { wch: 18 },
    { wch: 16 },
    { wch: 16 },
    { wch: 16 }
  ];
  XLSX.utils.book_append_sheet(wb, wsStats, 'Phân Tích Câu Hỏi');

  // Sheet 3: Tổng quan bài thi
  const avgScore = filteredAttempts.length > 0
    ? (filteredAttempts.reduce((acc, curr) => acc + curr.score, 0) / filteredAttempts.length).toFixed(2)
    : '0';
  const maxScore = filteredAttempts.length > 0 ? Math.max(...filteredAttempts.map(a => a.score)).toFixed(2) : '0';
  const minScore = filteredAttempts.length > 0 ? Math.min(...filteredAttempts.map(a => a.score)).toFixed(2) : '0';
  const tabSwitchViolations = filteredAttempts.filter(a => a.tabSwitchCount > 0).length;

  const summaryData = [
    ['BÁO CÁO KẾT QUẢ ĐỀ THI ONLINE', ''],
    ['Tên đề thi:', exam.title],
    ['Mã PIN tham gia:', exam.pin || 'Không có'],
    ['Thời gian làm bài quy định:', `${exam.timeLimitMinutes} phút`],
    ['Tổng số câu hỏi:', `${exam.questions.length} câu`],
    ['Lọc theo lớp:', selectedClass === 'all' ? 'Tất cả các lớp' : selectedClass],
    ['Tổng số thí sinh nộp bài:', `${filteredAttempts.length} thí sinh`],
    ['Điểm trung bình:', `${avgScore} điểm`],
    ['Điểm cao nhất:', `${maxScore} điểm`],
    ['Điểm thấp nhất:', `${minScore} điểm`],
    ['Số lượt nghi vấn rời tab:', `${tabSwitchViolations} lượt`],
    ['Thời gian xuất file:', formatDateTime(Date.now())]
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  wsSummary['!cols'] = [{ wch: 28 }, { wch: 42 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Tổng Quan');

  const cleanTitle = (exam.title || 'de_thi').replace(/[/\\?%*:|"<>]/g, '_').trim();
  XLSX.writeFile(wb, `Bao_cao_de_thi_${cleanTitle}.xlsx`);
  return true;
};
