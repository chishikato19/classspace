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

  // 1. Split Questions and Answers block
  // Assuming answers block starts with "Trả lời" or "Đáp án"
  const answerBlockRegex = /(?:Trả lời|Đáp án)[:\.\n]/i;
  const parts = text.split(answerBlockRegex);
  
  const questionContent = parts[0];
  const answerContent = parts.length > 1 ? parts.slice(1).join(' ') : '';

  // 2. Parse Answers Map
  const answerMap = new Map<number, string>();
  if (answerContent) {
    // Matches "1. A", "1 A", "1: A", "1) A", "1. Đúng", "1. True"
    // Also handles cluster answers: "1. a:Đ, b:S, c:Đ, d:S"
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
  // We use a lookahead to split by question start, keeping the delimiter
  const questionSplitRegex = /(?=(?:^|\n)(?:Câu|Bài|Question)\s*\d+[:\.]?|(?=(?:^|\n)\d+[\.:]))/i;
  
  const rawQuestions = questionContent
    .split(questionSplitRegex)
    .map(q => q.trim())
    .filter(q => q.length > 0);

  rawQuestions.forEach((rawQ, index) => {
    // Extract Question Number (optional, for mapping answers)
    const qNumMatch = rawQ.match(/(?:Câu|Bài|Question)?\s*(\d+)[:\.]?/i);
    const qNum = qNumMatch ? parseInt(qNumMatch[1]) : index + 1;
    
    // Remove the "Câu 1:" prefix to get text
    let qTextRaw = rawQ.replace(/^(?:Câu|Bài|Question)?\s*\d+[:\.]?\s*/i, '').trim();
    
    // Extract Options
    // Options usually start with A. B. C. D. or a) b) c) d)
    const options: { id: string; text: string; isCorrect: boolean; imageUrl?: string }[] = [];
    let type: QuestionType = 'SHORT_ANSWER'; // Default

    // Split by options
    // Regex matches "A.", "A)", "a.", "a)" at start of line or after space
    const optionSplitRegex = /(?:^|\n|\s+)([A-D a-d])[\.\)]/g;
    
    // Check if options exist
    const optionMatches = Array.from(rawQ.matchAll(optionSplitRegex));
    
    if (optionMatches.length >= 2) {
      // Check if it's a cluster question (has A, B, C, D AND answer map shows cluster format)
      const correctAnswer = answerMap.get(qNum);
      const isClusterAns = correctAnswer && (
        correctAnswer.toLowerCase().includes('a:') || 
        correctAnswer.toLowerCase().includes('a)') ||
        correctAnswer.toLowerCase().includes('a.')
      ) && (
        correctAnswer.toLowerCase().includes('đ') || 
        correctAnswer.toLowerCase().includes('s') ||
        correctAnswer.toLowerCase().includes('t') || 
        correctAnswer.toLowerCase().includes('f')
      );

      if (isClusterAns && optionMatches.length === 4) {
        type = 'TRUE_FALSE_CLUSTER';
      } else {
        type = 'MULTIPLE_CHOICE';
      }
      
      // We need to split the text by these indices
      const parts = rawQ.split(optionSplitRegex);
      
      // Clean up question text again from parts[0]
      qTextRaw = parts[0].replace(/^(?:Câu|Bài|Question)?\s*\d+[:\.]?\s*/i, '').trim();
      
      for (let i = 1; i < parts.length; i += 2) {
        const optLabel = parts[i].toUpperCase(); // A, B, C, D
        const optTextRaw = parts[i+1].trim();
        
        // Extract image from option text if any
        const { text: optText, imageUrl: optImageUrl } = extractImage(optTextRaw);

        // Check correctness from answer map
        let isCorrect = false;
        if (correctAnswer) {
           if (type === 'TRUE_FALSE_CLUSTER') {
             // For cluster, look for "a:Đ" or "a:S" etc.
             const clusterRegex = new RegExp(`${optLabel.toLowerCase()}[\\:\\.\\)]\\s*([ĐSđsTFtf])`, 'i');
             const clusterMatch = correctAnswer.match(clusterRegex);
             if (clusterMatch) {
               const val = clusterMatch[1].toUpperCase();
               isCorrect = (val === 'Đ' || val === 'T');
             }
           } else {
             // If answer is "A", "A.", "A)"
             const cleanAns = correctAnswer.replace(/[\.\)]/g, '').trim().toUpperCase();
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
      // No options found. Check if True/False or Short Answer
      const correctAnswer = answerMap.get(qNum);
      
      if (correctAnswer) {
        const lowerAns = correctAnswer.toLowerCase();
        if (['đúng', 'sai', 'true', 'false'].includes(lowerAns)) {
          type = 'TRUE_FALSE';
          const isTrue = lowerAns === 'đúng' || lowerAns === 'true';
          
          options.push({ id: crypto.randomUUID(), text: 'Đúng', isCorrect: isTrue });
          options.push({ id: crypto.randomUUID(), text: 'Sai', isCorrect: !isTrue });
        } else {
          type = 'SHORT_ANSWER';
          // For short answer, we usually store the correct answer in options list as a valid answer
          options.push({
             id: crypto.randomUUID(),
             text: correctAnswer,
             isCorrect: true
          });
        }
      }
    }

    // Extract image from question text
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
