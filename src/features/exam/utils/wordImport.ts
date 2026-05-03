import * as mammoth from 'mammoth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../../config/firebase';
import { EditorQuestionData } from '../components/QuestionEditorCard';

export async function importQuestionsFromWord(file: File, uid: string): Promise<{questions: EditorQuestionData[], images: string[]}> {
  const arrayBuffer = await file.arrayBuffer();
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
          // Upload to Firebase
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
  let currentQuestion: any = null;

  // Iterate through root-level elements (usually paragraphs from mammoth)
  for (const el of Array.from(doc.body.children)) {
     // In mammoth, underline is <u> or inline style, but let's check for <u>
     const hasUnderline = el.querySelector('u') !== null;
     
     let rawMdText = await processNodeToMarkdown(el);
     const lines = rawMdText.split('\n').map(s => s.trim()).filter(s => s);
     
     for (let mdText of lines) {
       // Check if it's a question: "Câu 1:", "Câu 1.", "Câu 1: " or "Câu 1 (Đúng/Sai):"
       const isQuestion = /^Câu\s*\d+\s*(\([^\)]*\))?\s*[:\.]/i.test(mdText);
       
       if (isQuestion) {
          if (currentQuestion) importedQuestions.push(currentQuestion);
          
          let type: "multiple_choice" | "true_false" | "short_answer" | "true_false_cluster" = "multiple_choice";
          if (/\((chùm đúng\s*\/?\s*sai)\)/i.test(mdText)) {
            type = "true_false_cluster";
          } else if (/\((đúng\s*\/?\s*sai)\)/i.test(mdText)) {
            type = "true_false";
          } else if (/\((trả lời ngắn)\)/i.test(mdText)) {
            type = "short_answer";
          }

          // Remove "Câu 1: " prefix
          const cleanText = mdText.replace(/^Câu\s*\d+\s*(\([^\)]*\))?\s*[:\.]\s*/i, '');
          currentQuestion = {
            type,
            text: cleanText,
            options: [],
            correctIndex: 0,
            shortAnswerText: '',
            clusterAnswers: [],
            points: 0
          };
       } else if (currentQuestion) {
          if (currentQuestion.type === 'short_answer') {
             if (/^Đáp\s*án\s*[:\.]/i.test(mdText)) {
                currentQuestion.shortAnswerText = mdText.replace(/^Đáp\s*án\s*[:\.]\s*/i, '').trim();
             } else {
               if (!currentQuestion.shortAnswerText) {
                 currentQuestion.text += '\n' + mdText;
               } else {
                 currentQuestion.shortAnswerText += '\n' + mdText;
               }
             }
          } else {
            // Check if it's an option: "A.", "B.", "A:", "*A."
            const isOptionPrefix = /^(\*|[uU]\s*)?[A-D]\s*[\.\:]/i.test(mdText);
            // Ignore underline logic if it starts with "Đáp án"
            const isOption = isOptionPrefix || (hasUnderline && !/^Đáp\s*án\s*[:\.]/i.test(mdText));
            const startsWithStar = mdText.startsWith('*');
            
            if (/^Đáp\s*án\s*[:\.]/i.test(mdText)) {
               if (currentQuestion.type === 'true_false_cluster') {
                 const ansStr = mdText.replace(/^Đáp\s*án\s*[:\.]\s*/i, '').trim();
                 const ansArray = ansStr.split(/[,;]/).map(s => s.trim().toLowerCase());
                 currentQuestion.clusterAnswers = currentQuestion.options.map((_: any, i: number) => {
                   const a = ansArray[i] || '';
                   return a === 'đúng' || a === 'đ' || a === 't' || a === 'true';
                 });
               } else {
                   const ansM = mdText.match(/^Đáp\s*án\s*[:\.]\s*([A-D])/i);
                   if (ansM) {
                     const cIdx = ansM[1].toUpperCase().charCodeAt(0) - 65;
                     if (cIdx >= 0 && cIdx < currentQuestion.options.length) {
                       currentQuestion.correctIndex = cIdx;
                     }
                   }
               }
            } else if (isOption) {
               const cleanOpt = mdText.replace(/^(\*|[uU]\s*)?[A-D]\s*[\.\:]\s*/i, '').trim();
               currentQuestion.options.push(cleanOpt);
               const optIdx = currentQuestion.options.length - 1;
               
               if (currentQuestion.type === 'true_false_cluster') {
                  if (!currentQuestion.clusterAnswers) currentQuestion.clusterAnswers = [];
                  // We'll give it the underline flag since it's the option
                  // But note that hasUnderline applies to the whole element. 
                  // In cluster, we read answers from 'Đáp án', so this backup logic is okay.
                  currentQuestion.clusterAnswers[optIdx] = startsWithStar || hasUnderline;
               }
               
               if (startsWithStar || hasUnderline) {
                  currentQuestion.correctIndex = optIdx;
               }
            } else {
               // Append to question text if it doesn't look like an option
               if (currentQuestion.options.length === 0) {
                 currentQuestion.text += '\n' + mdText;
               } else {
                 // Or append to the last option
                 currentQuestion.options[currentQuestion.options.length - 1] += '\n' + mdText;
               }
            }
          }
       }
     }
  }
  
  if (currentQuestion) importedQuestions.push(currentQuestion);
  
  return { questions: importedQuestions, images: uploadedImages };
}
