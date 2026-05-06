import { Question, QuestionType } from '../types';

export const parseQuestionsFromText = (text: string): Question[] => {
  const questions: Question[] = [];
  
  // Helper to extract image marker
  const extractImage = (str: string): { text: string, imageUrl: string } => {
    const imgRegex = /\[IMG:(data:image\/[^\]]+)\]/i;
    const match = str.match(imgRegex);
    if (match) {
      return {
        text: str.replace(imgRegex, '').trim(),
        imageUrl: match[1]
      };
    }
    return { text: str.trim(), imageUrl: '' };
  };

  // 1. Split Questions and Answers block ONLY if there's a standalone "Trả lời:" or "Đáp án:" at the end
  // We should be careful not to split inline "Đáp án: A" attached to each question.
  // A global answer block usually has multiple lines like "1. A", "2. B" after it.
  let questionContent = text;
  let answerContent = '';
  
  // Look for a block at the bottom that starts with Trả lời or Đáp án, followed by numbered answers.
  const globalAnswerBlockRegex = /(?:Trả lời|Đáp án)[:\.\n]\s*(?:\d+[\.\s:\)]+[^\d\n]+[ \t\n]*)+$/i;
  const globalMatch = text.match(globalAnswerBlockRegex);
  if (globalMatch) {
    answerContent = globalMatch[0];
    questionContent = text.substring(0, text.length - answerContent.length);
  }

  // 2. Parse Answers Map from the global block
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

  // 3. Parse Questions
  // Regex to find start of a question: "Câu 1:", "Bài 1:", "1.", "Câu 1."
  const questionSplitRegex = /(?=(?:^|\n)(?:Câu|Bài|Question)\s*\d+[:\.]?|(?=(?:^|\n)\d+[\.:]))/i;
  
  const rawQuestions = questionContent
    .split(questionSplitRegex)
    .map(q => q.trim())
    .filter(q => q.length > 0);

  rawQuestions.forEach((rawQ, index) => {
    const qNumMatch = rawQ.match(/(?:Câu|Bài|Question)?\s*(\d+)[:\.]?/i);
    const qNum = qNumMatch ? parseInt(qNumMatch[1]) : index + 1;
    
    let qTextRaw = rawQ.replace(/^(?:Câu|Bài|Question)?\s*\d+[:\.]?\s*/i, '').trim();
    
    // Check for inline answer at the end of the question block: "Đáp án: A"
    const inlineAnswerRegex = /(?:^|\n)Đáp\s*án\s*[:\.]\s*(.*)$/i;
    const inlineMatch = qTextRaw.match(inlineAnswerRegex);
    let inlineAnswer = '';
    if (inlineMatch) {
      inlineAnswer = inlineMatch[1].trim();
      qTextRaw = qTextRaw.replace(inlineAnswerRegex, '').trim();
    }
    
    const correctAnswerStr = inlineAnswer || answerMap.get(qNum);

    const options: { id: string; text: string; isCorrect: boolean; imageUrl?: string }[] = [];
    let type: QuestionType = 'SHORT_ANSWER'; 
    let specifiedTypeMatch = rawQ.match(/^(?:Câu|Bài|Question)?\s*\d+[:\.]?\s*\((.*?)\)/i);
    if (specifiedTypeMatch) {
      const t = specifiedTypeMatch[1].toLowerCase();
      if (t.includes('chùm đúng')) type = 'TRUE_FALSE_CLUSTER';
      else if (t.includes('đúng') || t.includes('sai')) type = 'TRUE_FALSE';
      else if (t.includes('trả lời ngắn')) type = 'SHORT_ANSWER';
    }

    // Split by options: A., *A., A), *A)
    const optionSplitRegex = /(?:^|\n|\s+)(\*?[A-D a-d])[\.\)]/g;
    const optionMatches = Array.from(qTextRaw.matchAll(optionSplitRegex));
    
    if (optionMatches.length >= 2) {
      const isClusterAns = correctAnswerStr && (
        correctAnswerStr.toLowerCase().includes('a:') || 
        correctAnswerStr.toLowerCase().includes('a)') ||
        correctAnswerStr.toLowerCase().includes('a.')
      ) && (
        correctAnswerStr.toLowerCase().includes('đ') || 
        correctAnswerStr.toLowerCase().includes('s') ||
        correctAnswerStr.toLowerCase().includes('t') || 
        correctAnswerStr.toLowerCase().includes('f')
      );

      if (isClusterAns && optionMatches.length === 4) {
        type = 'TRUE_FALSE_CLUSTER';
      } else if (type === 'SHORT_ANSWER') { // If it wasn't explicitly set above
        type = 'MULTIPLE_CHOICE';
      }
      
      const parts = qTextRaw.split(optionSplitRegex);
      
      qTextRaw = parts[0].replace(/^(?:Câu|Bài|Question)?\s*\d+[:\.]?\s*(\(.*?\))?\s*/i, '').trim();
      
      for (let i = 1; i < parts.length; i += 2) {
        const rawLabel = parts[i];
        const isStarred = rawLabel.startsWith('*');
        const optLabel = rawLabel.replace('*', '').toUpperCase();
        const optTextRaw = parts[i+1].trim();
        
        const { text: optText, imageUrl: optImageUrl } = extractImage(optTextRaw);

        let isCorrect = isStarred;
        if (correctAnswerStr) {
           if (type === 'TRUE_FALSE_CLUSTER') {
             const clusterRegex = new RegExp(`${optLabel.toLowerCase()}[\\:\\.\\)]\\s*([ĐSđsTFtf])`, 'i');
             const clusterMatch = correctAnswerStr.match(clusterRegex);
             if (clusterMatch) {
               const val = clusterMatch[1].toUpperCase();
               isCorrect = isCorrect || (val === 'Đ' || val === 'T');
             }
           } else {
             const cleanAns = correctAnswerStr.split(/[,;\s]/)[0].replace(/[\.\)]/g, '').trim().toUpperCase();
             if (cleanAns === optLabel) isCorrect = true;
           }
        }

        options.push({
          id: crypto.randomUUID(),
          text: optText,
          imageUrl: optImageUrl,
          isCorrect
        });
      }
    } else {
      qTextRaw = qTextRaw.replace(/^(?:Câu|Bài|Question)?\s*\d+[:\.]?\s*(\(.*?\))?\s*/i, '').trim();
      if (correctAnswerStr) {
        const lowerAns = correctAnswerStr.toLowerCase();
        if (['đúng', 'sai', 'true', 'false'].includes(lowerAns)) {
          type = 'TRUE_FALSE';
          const isTrue = lowerAns === 'đúng' || lowerAns === 'true';
          
          options.push({ id: crypto.randomUUID(), text: 'Đúng', isCorrect: isTrue });
          options.push({ id: crypto.randomUUID(), text: 'Sai', isCorrect: !isTrue });
        } else if (type !== 'TRUE_FALSE_CLUSTER') {
          type = 'SHORT_ANSWER';
          options.push({
             id: crypto.randomUUID(),
             text: correctAnswerStr,
             isCorrect: true
          });
        }
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
