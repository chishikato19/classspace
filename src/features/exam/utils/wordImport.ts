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
     
     let mdText = await processNodeToMarkdown(el);
     mdText = mdText.trim();
     if (!mdText) continue;

     // Check if it's a question: "Câu 1:", "Câu 1.", "Câu 1: "
     const isQuestion = /^Câu\s*\d+\s*[:\.]/i.test(mdText);
     
     if (isQuestion) {
        if (currentQuestion) importedQuestions.push(currentQuestion);
        // Remove "Câu 1: " prefix
        const cleanText = mdText.replace(/^Câu\s*\d+\s*[:\.]\s*/i, '');
        currentQuestion = {
          text: cleanText,
          options: [],
          correctIndex: 0,
          points: 0
        };
     } else if (currentQuestion) {
        // Check if it's an option: "A.", "B.", "A:", "*A."
        const isOption = /^(\*|[uU]\s*)?[A-D]\s*[\.\:]/i.test(mdText) || hasUnderline;
        const startsWithStar = mdText.startsWith('*');
        if (isOption || /^[A-D]\s*[\.\:]/.test(mdText)) {
           const cleanOpt = mdText.replace(/^(\*|[uU]\s*)?[A-D]\s*[\.\:]\s*/i, '').trim();
           currentQuestion.options.push(cleanOpt);
           const optIdx = currentQuestion.options.length - 1;
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
  
  if (currentQuestion) importedQuestions.push(currentQuestion);
  
  return { questions: importedQuestions, images: uploadedImages };
}
