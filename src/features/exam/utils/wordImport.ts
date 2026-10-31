import * as mammoth from 'mammoth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../../config/firebase';
import { EditorQuestionData } from '../components/QuestionEditorCard';
import { preprocessDocxForMath } from './ommlToLatex';

/**
 * Parses questions from Word .docx file supporting:
 * 1. Multiple Choice (Trắc nghiệm nhiều lựa chọn A, B, C, D)
 * 2. True/False Cluster (Câu trắc nghiệm Đúng/Sai chùm - 4 ý a, b, c, d theo chuẩn GDPT 2018 / 2025)
 * 3. Short Answer (Câu trắc nghiệm trả lời ngắn)
 * 4. Word OMML Equation math conversion to LaTeX
 * 5. Inline images extraction & Firebase storage upload
 */
export async function importQuestionsFromWord(file: File, uid: string): Promise<{questions: EditorQuestionData[], images: string[]}> {
  const rawArrayBuffer = await file.arrayBuffer();
  const arrayBuffer = await preprocessDocxForMath(rawArrayBuffer);
  const result = await mammoth.convertToHtml({ arrayBuffer });
  const htmlString = result.value;
  
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, 'text/html');
  const uploadedImages: string[] = [];
  
  // Helper to process a node to Markdown and upload inline images
  const processNodeToMarkdown = async (node: Node): Promise<string> => {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent || '';
    if (node.nodeType !== Node.ELEMENT_NODE) return '';
    
    const el = node as HTMLElement;
    let md = '';
    
    if (el.tagName.toLowerCase() === 'img') {
       const src = el.getAttribute('src');
       if (src && src.startsWith('data:image')) {
          try {
            const response = await fetch(src);
            const blob = await response.blob();
            const ext = blob.type.split('/')[1] || 'png';
            const fileName = `users/${uid}/exams/word_imports/${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
            const fileRef = ref(storage, fileName);
            await uploadBytes(fileRef, blob);
            const url = await getDownloadURL(fileRef);
            uploadedImages.push(url);
            return `![Image](${url})`;
          } catch (err) {
            console.error("Failed to upload inline image", err);
            return '';
          }
       }
    }
    
    if (el.tagName.toLowerCase() === 'br') return '\n';
    if (el.tagName.toLowerCase() === 'p') {
       for (const child of Array.from(el.childNodes)) {
          md += await processNodeToMarkdown(child);
       }
       md += '\n'; // paragraph break
       return md;
    }
    
    for (const child of Array.from(el.childNodes)) {
        md += await processNodeToMarkdown(child);
    }
    
    return md;
  };

  const importedQuestions: EditorQuestionData[] = [];
  let currentQuestion: EditorQuestionData | null = null;
  let currentSection: 'multiple_choice' | 'true_false_cluster' | 'short_answer' | null = null;

  // Collect all text lines with paragraph info
  const allLines: { text: string; hasUnderline: boolean }[] = [];
  for (const el of Array.from(doc.body.children)) {
    const hasUnderline = el.querySelector('u') !== null;
    const rawMdText = await processNodeToMarkdown(el);
    const lines = rawMdText.split('\n').map(s => s.trim()).filter(Boolean);
    for (const line of lines) {
      allLines.push({ text: line, hasUnderline });
    }
  }

  // Helper to parse cluster answers string (e.g. "a.Đ, b.S, c.Đ, d.S" or "Đúng, Sai, Đúng, Sai")
  const parseClusterAnswers = (ansStr: string, optionsCount: number): boolean[] => {
    const results: boolean[] = Array(optionsCount || 4).fill(false);
    
    // Check if format has letter keys: a.Đ, b.S or a) Đúng, b) Sai or a: Đ or a-Đ
    const letterMatches = Array.from(ansStr.matchAll(/([a-d])\s*[\.\:\)\-]?\s*([ĐSđsTFtf]|đúng|sai|true|false)/gi));
    if (letterMatches.length > 0) {
      letterMatches.forEach(m => {
        const letter = m[1].toLowerCase();
        const val = m[2].toLowerCase();
        const idx = letter.charCodeAt(0) - 97;
        if (idx >= 0 && idx < results.length) {
          results[idx] = val.startsWith('đ') || val.startsWith('t');
        }
      });
      return results;
    }

    // Positional format: "Đúng, Sai, Đúng, Sai" or "Đ, S, Đ, S"
    const tokens = ansStr.split(/[,;\s]+/).map(s => s.trim().toLowerCase()).filter(Boolean);
    for (let i = 0; i < Math.min(tokens.length, results.length); i++) {
      const tok = tokens[i];
      results[i] = tok === 'đúng' || tok === 'đ' || tok === 't' || tok === 'true';
    }
    return results;
  };

  // Helper to split a line if multiple options are placed horizontally: "A. 1   B. 2   C. 3   D. 4"
  const splitHorizontalOptions = (line: string): string[] => {
    // Check if line contains multiple options like A. ... B. ... or a) ... b) ...
    const optRegex = /(?:^|\s+)((\*|[uU]\s*)?(?:\([a-dA-D]\)|[a-dA-D][\.\:\)]))\s+/g;
    const matches = Array.from(line.matchAll(optRegex));
    if (matches.length > 1) {
      const parts: string[] = [];
      for (let i = 0; i < matches.length; i++) {
        const start = matches[i].index!;
        const end = i < matches.length - 1 ? matches[i + 1].index! : line.length;
        parts.push(line.substring(start, end).trim());
      }
      return parts;
    }
    return [line];
  };

  for (let i = 0; i < allLines.length; i++) {
    const { text: rawLine, hasUnderline } = allLines[i];
    const mdText = rawLine.trim();

    // 1. Check Section headers
    // PHẦN I: Trắc nghiệm nhiều lựa chọn
    // PHẦN II: Trắc nghiệm đúng sai (Cluster)
    // PHẦN III: Trắc nghiệm trả lời ngắn
    if (/^PHẦN\s+(?:I|1)\b/i.test(mdText) || /nhiều\s*phương\s*án\s*lựa\s*chọn/i.test(mdText)) {
      currentSection = 'multiple_choice';
      continue;
    }
    if (/^PHẦN\s+(?:II|2)\b/i.test(mdText) || /trắc\s*nghiệm\s*đúng\s*[\/-]?\s*sai/i.test(mdText)) {
      currentSection = 'true_false_cluster';
      continue;
    }
    if (/^PHẦN\s+(?:III|3)\b/i.test(mdText) || /trả\s*lời\s*ngắn/i.test(mdText)) {
      currentSection = 'short_answer';
      continue;
    }

    // Ignore standalone global header words
    if (/^(?:BẢNG\s*ĐÁP\s*ÁN|HƯỚNG\s*DẪN\s*CHẤM|ĐÁP\s*ÁN\s*CHI\s*TIẾT)[:\.]?$/i.test(mdText)) {
      continue;
    }

    // 2. Check if this line is the start of a Question:
    // "Câu 1:", "Câu 1.", "Câu 1 (chùm đúng sai):", "Bài 1:", "Question 1:"
    const isQuestionMatch = mdText.match(/^(?:Câu|Bài|Question)\s*\d+\s*(\([^\)]*\))?\s*[:\.]/i);

    if (isQuestionMatch) {
      if (currentQuestion) {
        importedQuestions.push(currentQuestion);
      }

      const tagMatch = isQuestionMatch[1] ? isQuestionMatch[1].toLowerCase() : '';
      let type: 'multiple_choice' | 'true_false' | 'short_answer' | 'true_false_cluster' = 'multiple_choice';

      if (tagMatch.includes('chùm') || tagMatch.includes('đúng sai chùm') || tagMatch.includes('đúng/sai chùm')) {
        type = 'true_false_cluster';
      } else if (tagMatch.includes('trả lời ngắn') || tagMatch.includes('tln') || tagMatch.includes('tự luận ngắn') || tagMatch.includes('điền')) {
        type = 'short_answer';
      } else if (tagMatch.includes('đúng') && tagMatch.includes('sai')) {
        type = currentSection === 'true_false_cluster' ? 'true_false_cluster' : 'true_false_cluster';
      } else if (currentSection) {
        type = currentSection;
      }

      const cleanText = mdText.replace(/^(?:Câu|Bài|Question)\s*\d+\s*(\([^\)]*\))?\s*[:\.]\s*/i, '');
      currentQuestion = {
        type,
        text: cleanText,
        options: [],
        correctIndex: 0,
        shortAnswerText: '',
        clusterAnswers: [false, false, false, false],
        points: 0
      };
      continue;
    }

    if (!currentQuestion) continue;

    // 3. Process lines within currentQuestion
    // Check if it's an answer indicator: "Đáp án: ...", "Trả lời: ...", "Key: ..."
    const isAnswerLine = /^(?:Đáp\s*án|Trả\s*lời|Key)\s*[:\.]/i.test(mdText);

    if (isAnswerLine) {
      const ansPayload = mdText.replace(/^(?:Đáp\s*án|Trả\s*lời|Key)\s*[:\.]\s*/i, '').trim();

      // Check if cluster answer format detected regardless of explicit type
      const looksLikeClusterAns = /([a-d])\s*[\.\:\)\-]?\s*([ĐSđsTFtf]|đúng|sai)/i.test(ansPayload) ||
        /^(?:đúng|sai|đ|s)[\s,;]+(?:đúng|sai|đ|s)/i.test(ansPayload);

      if (currentQuestion.type === 'true_false_cluster' || looksLikeClusterAns) {
        currentQuestion.type = 'true_false_cluster';
        currentQuestion.clusterAnswers = parseClusterAnswers(ansPayload, currentQuestion.options.length || 4);
      } else if (currentQuestion.type === 'short_answer' || (currentQuestion.options.length === 0 && !/^[A-D]$/i.test(ansPayload))) {
        currentQuestion.type = 'short_answer';
        currentQuestion.shortAnswerText = ansPayload;
      } else {
        // Standard MCQ answer: e.g. "A", "B.", "*C"
        const cleanLetter = ansPayload.replace(/[\*\.\:\)]/g, '').trim().toUpperCase();
        const mcqMatch = cleanLetter.match(/^[A-D]/);
        if (mcqMatch) {
          currentQuestion.correctIndex = mcqMatch[0].charCodeAt(0) - 65;
        }
      }
      continue;
    }

    // 4. Check if it's an Option: e.g. "A.", "B.", "*A.", "a)", "a.", "(A)", "(a)"
    const optSubLines = splitHorizontalOptions(mdText);

    for (const optLine of optSubLines) {
      const optionPrefixMatch = optLine.match(/^(\*|[uU]\s*)?(?:\(([a-dA-D])\)|([a-dA-D])[\.\:\)])\s*(.*)$/);
      
      if (optionPrefixMatch && currentQuestion.type !== 'short_answer') {
        const isStarred = !!optionPrefixMatch[1]?.includes('*');
        const letter = (optionPrefixMatch[2] || optionPrefixMatch[3]).toUpperCase();
        const optText = (optionPrefixMatch[4] || '').trim();
        const optIdx = currentQuestion.options.length;

        currentQuestion.options.push(optText);

        const isMarkedCorrect = isStarred || hasUnderline;
        if (currentQuestion.type === 'true_false_cluster') {
          if (!currentQuestion.clusterAnswers) currentQuestion.clusterAnswers = [false, false, false, false];
          if (optIdx < 4) {
            currentQuestion.clusterAnswers[optIdx] = isMarkedCorrect;
          }
        } else {
          if (isMarkedCorrect) {
            currentQuestion.correctIndex = optIdx;
          }
        }
      } else {
        // Not an option prefix.
        if (currentQuestion.type === 'short_answer') {
          if (!currentQuestion.shortAnswerText && isAnswerLine) {
            currentQuestion.shortAnswerText = optLine;
          } else {
            currentQuestion.text += '\n' + optLine;
          }
        } else {
          if (currentQuestion.options.length === 0) {
            currentQuestion.text += '\n' + optLine;
          } else {
            // Append line to the last option
            currentQuestion.options[currentQuestion.options.length - 1] += '\n' + optLine;
          }
        }
      }
    }
  }

  if (currentQuestion) {
    importedQuestions.push(currentQuestion);
  }

  // Post-processing & Sanity check:
  // If a question ended up having 4 options a,b,c,d and no clear single answer, or labeled with cluster, ensure clusterAnswers has 4 items
  importedQuestions.forEach(q => {
    if (q.type === 'true_false_cluster') {
      if (!q.clusterAnswers || q.clusterAnswers.length < 4) {
        const cur = q.clusterAnswers || [];
        q.clusterAnswers = [cur[0] || false, cur[1] || false, cur[2] || false, cur[3] || false];
      }
    }
    if (q.type === 'short_answer' && !q.shortAnswerText && q.options.length > 0) {
      q.shortAnswerText = q.options.join(' || ');
      q.options = [];
    }
  });

  return { questions: importedQuestions, images: uploadedImages };
}
