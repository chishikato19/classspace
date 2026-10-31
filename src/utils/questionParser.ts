import { Question, QuestionType } from '../types';

export const parseQuestionsFromText = (text: string): Question[] => {
  const questions: Question[] = [];
  
  // Helper to extract image marker
  const extractImage = (str: string): { text: string; imageUrl: string } => {
    const imgRegex = /\[IMG:(data:image\/[^\]]+)\]/i;
    const match = str.match(imgRegex);
    if (match) {
      return {
        text: str.replace(imgRegex, '').trim(),
        imageUrl: match[1]
      };
    }
    const mdImgRegex = /!\[.*?\]\((.*?)\)/i;
    const mdMatch = str.match(mdImgRegex);
    if (mdMatch) {
      return {
        text: str.replace(mdMatch[0], '').trim(),
        imageUrl: mdMatch[1]
      };
    }
    return { text: str.trim(), imageUrl: '' };
  };

  // 1. Separate global answer block at the end if present
  let questionContent = text;
  let answerContent = '';
  
  const globalAnswerBlockRegex = /(?:Bảng\s*đáp\s*án|Đáp\s*án|Trả\s*lời)[:\.\n]\s*(?:\d+[\.\s:\)]+[^\d\n]+[ \t\n]*)+$/i;
  const globalMatch = text.match(globalAnswerBlockRegex);
  if (globalMatch) {
    answerContent = globalMatch[0];
    questionContent = text.substring(0, text.length - answerContent.length);
  }

  // Parse Answers Map from the global block
  const answerMap = new Map<number, string>();
  if (answerContent) {
    const answerRegex = /(\d+)[\.\s:\)]+([^\d\n]+)/g;
    let match;
    while ((match = answerRegex.exec(answerContent)) !== null) {
      const qIndex = parseInt(match[1]);
      const ans = match[2].trim();
      answerMap.set(qIndex, ans);
    }
  }

  // Split into question blocks
  // Matches "Câu 1:", "Bài 1:", "1.", "PHẦN I", "PHẦN II", "PHẦN III"
  const lines = questionContent.split('\n');
  let currentSection: QuestionType = 'MULTIPLE_CHOICE';

  const rawBlocks: { rawText: string; sectionDefault: QuestionType }[] = [];
  let currentBlockLines: string[] = [];
  let currentBlockSection: QuestionType = currentSection;

  for (const line of lines) {
    const trimmed = line.trim();
    if (/^PHẦN\s+(?:I|1)\b/i.test(trimmed) || /nhiều\s*phương\s*án\s*lựa\s*chọn/i.test(trimmed)) {
      currentSection = 'MULTIPLE_CHOICE';
      continue;
    }
    if (/^PHẦN\s+(?:II|2)\b/i.test(trimmed) || /trắc\s*nghiệm\s*đúng\s*[\/-]?\s*sai/i.test(trimmed)) {
      currentSection = 'TRUE_FALSE_CLUSTER';
      continue;
    }
    if (/^PHẦN\s+(?:III|3)\b/i.test(trimmed) || /trả\s*lời\s*ngắn/i.test(trimmed)) {
      currentSection = 'SHORT_ANSWER';
      continue;
    }

    const isQuestionStart = /^(?:Câu|Bài|Question)\s*\d+[:\.]?|^\d+[\.:]\s+/i.test(trimmed);
    if (isQuestionStart) {
      if (currentBlockLines.length > 0) {
        rawBlocks.push({ rawText: currentBlockLines.join('\n'), sectionDefault: currentBlockSection });
        currentBlockLines = [];
      }
      currentBlockSection = currentSection;
    }

    if (trimmed.length > 0 || currentBlockLines.length > 0) {
      currentBlockLines.push(line);
    }
  }

  if (currentBlockLines.length > 0) {
    rawBlocks.push({ rawText: currentBlockLines.join('\n'), sectionDefault: currentBlockSection });
  }

  // Process each block
  rawBlocks.forEach((block, index) => {
    const rawQ = block.rawText.trim();
    if (!rawQ) return;

    const qNumMatch = rawQ.match(/(?:Câu|Bài|Question)?\s*(\d+)[:\.]?/i);
    const qNum = qNumMatch ? parseInt(qNumMatch[1]) : index + 1;
    
    let qTextRaw = rawQ.replace(/^(?:Câu|Bài|Question)?\s*\d+[:\.]?\s*/i, '').trim();

    // Check for inline answer at the end of the question block: "Đáp án: ..."
    const inlineAnswerRegex = /(?:^|\n)(?:Đáp\s*án|Trả\s*lời)\s*[:\.]\s*(.*)$/i;
    const inlineMatch = qTextRaw.match(inlineAnswerRegex);
    let inlineAnswer = '';
    if (inlineMatch) {
      inlineAnswer = inlineMatch[1].trim();
      qTextRaw = qTextRaw.replace(inlineAnswerRegex, '').trim();
    }
    
    const correctAnswerStr = inlineAnswer || answerMap.get(qNum) || '';

    // Determine type from parenthetical tag or section
    let type: QuestionType = block.sectionDefault;
    const specifiedTypeMatch = rawQ.match(/^(?:Câu|Bài|Question)?\s*\d+[:\.]?\s*\((.*?)\)/i);
    if (specifiedTypeMatch) {
      const t = specifiedTypeMatch[1].toLowerCase();
      if (t.includes('chùm') || t.includes('đúng sai chùm') || t.includes('đúng/sai chùm')) {
        type = 'TRUE_FALSE_CLUSTER';
      } else if (t.includes('trả lời ngắn') || t.includes('tln') || t.includes('tự luận ngắn') || t.includes('điền')) {
        type = 'SHORT_ANSWER';
      } else if (t.includes('đúng') && t.includes('sai')) {
        type = 'TRUE_FALSE_CLUSTER';
      } else if (t.includes('trắc nghiệm') || t.includes('nhiều lựa chọn')) {
        type = 'MULTIPLE_CHOICE';
      }
    }

    // Check if options are present: A., B., C., D. or a), b), c), d) or *A.
    const optionSplitRegex = /(?:^|\n|\s+)((\*|[uU]\s*)?(?:\([a-dA-D]\)|[a-dA-D][\.\:\)]))\s+/g;
    const optionMatches = Array.from(qTextRaw.matchAll(optionSplitRegex));

    const options: { id: string; text: string; isCorrect: boolean; imageUrl?: string }[] = [];

    // Helper to test if answer string looks like cluster answers
    const isClusterAns = correctAnswerStr && (
      /([a-d])\s*[\.\:\)\-]?\s*([ĐSđsTFtf]|đúng|sai)/i.test(correctAnswerStr) ||
      /^(?:đúng|sai|đ|s)[\s,;]+(?:đúng|sai|đ|s)/i.test(correctAnswerStr)
    );

    if (optionMatches.length >= 2) {
      if (isClusterAns) {
        type = 'TRUE_FALSE_CLUSTER';
      }

      // Parse options
      const parts: { label: string; text: string; isStarred: boolean }[] = [];
      for (let i = 0; i < optionMatches.length; i++) {
        const currentMatch = optionMatches[i];
        const start = currentMatch.index! + currentMatch[0].length;
        const end = i < optionMatches.length - 1 ? optionMatches[i + 1].index! : qTextRaw.length;
        const optText = qTextRaw.substring(start, end).trim();
        const rawPrefix = currentMatch[1];
        const isStarred = rawPrefix.includes('*');
        const cleanLetter = rawPrefix.replace(/[\*\(\)\[\]\.\:\s]/g, '').toUpperCase();
        parts.push({ label: cleanLetter, text: optText, isStarred });
      }

      // The question text is everything before the first option
      const firstOptIndex = optionMatches[0].index!;
      qTextRaw = qTextRaw.substring(0, firstOptIndex)
        .replace(/^(?:Câu|Bài|Question)?\s*\d+[:\.]?\s*(\(.*?\))?\s*/i, '').trim();

      // Cluster answers parsed
      const clusterMap: Record<string, boolean> = {};
      if (type === 'TRUE_FALSE_CLUSTER' && correctAnswerStr) {
        const letterClusterMatches = Array.from(correctAnswerStr.matchAll(/([a-d])\s*[\.\:\)\-]?\s*([ĐSđsTFtf]|đúng|sai|true|false)/gi));
        if (letterClusterMatches.length > 0) {
          letterClusterMatches.forEach(m => {
            const l = m[1].toLowerCase();
            const v = m[2].toLowerCase();
            clusterMap[l] = v.startsWith('đ') || v.startsWith('t');
          });
        } else {
          // Positional
          const tokens = correctAnswerStr.split(/[,;\s]+/).map(s => s.trim().toLowerCase()).filter(Boolean);
          ['a', 'b', 'c', 'd'].forEach((letter, idx) => {
            if (idx < tokens.length) {
              const tok = tokens[idx];
              clusterMap[letter] = tok === 'đúng' || tok === 'đ' || tok === 't' || tok === 'true';
            }
          });
        }
      }

      parts.forEach((p, idx) => {
        const { text: optText, imageUrl: optImageUrl } = extractImage(p.text);
        let isCorrect = p.isStarred;

        if (type === 'TRUE_FALSE_CLUSTER') {
          const l = p.label.toLowerCase();
          if (l in clusterMap) {
            isCorrect = clusterMap[l];
          }
        } else {
          // Multiple choice
          if (correctAnswerStr) {
            const cleanAns = correctAnswerStr.split(/[,;\s]/)[0].replace(/[\.\:\)]/g, '').trim().toUpperCase();
            if (cleanAns === p.label) isCorrect = true;
          }
        }

        options.push({
          id: crypto.randomUUID(),
          text: optText,
          imageUrl: optImageUrl,
          isCorrect
        });
      });
    } else {
      // No standard A, B, C, D options found
      qTextRaw = qTextRaw.replace(/^(?:Câu|Bài|Question)?\s*\d+[:\.]?\s*(\(.*?\))?\s*/i, '').trim();

      if (correctAnswerStr) {
        const lowerAns = correctAnswerStr.toLowerCase();
        if (['đúng', 'sai', 'true', 'false'].includes(lowerAns)) {
          type = 'TRUE_FALSE';
          const isTrue = lowerAns === 'đúng' || lowerAns === 'true';
          options.push({ id: crypto.randomUUID(), text: 'Đúng', isCorrect: isTrue });
          options.push({ id: crypto.randomUUID(), text: 'Sai', isCorrect: !isTrue });
        } else {
          type = 'SHORT_ANSWER';
          // Split alternate answers by ||
          const alternates = correctAnswerStr.split('||').map(s => s.trim()).filter(Boolean);
          alternates.forEach(alt => {
            options.push({
              id: crypto.randomUUID(),
              text: alt,
              isCorrect: true
            });
          });
        }
      } else {
        type = 'SHORT_ANSWER';
      }
    }

    const { text: finalQText, imageUrl: qImageUrl } = extractImage(qTextRaw);

    questions.push({
      id: crypto.randomUUID(),
      type,
      text: finalQText,
      imageUrl: qImageUrl,
      options,
      timeLimit: 30,
      points: 100
    });
  });

  return questions;
};
