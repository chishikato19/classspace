/**
 * Simple obfuscator to prevent average students from finding the answer easily via F12.
 * It's not cryptographically secure, but enough for client-side obfuscation.
 */
export const obfuscateAnswer = (index: number, questionId: string): string => {
  return obfuscateStringAnswer(index.toString(), questionId);
};

export const deobfuscateAnswer = (obfuscated: string, questionId: string): number => {
  const str = deobfuscateStringAnswer(obfuscated, questionId);
  const parsed = parseInt(str, 10);
  return isNaN(parsed) ? -1 : parsed;
};

export const obfuscateStringAnswer = (answer: string, questionId: string): string => {
  const secret = questionId.substring(0, 5) + "azota";
  let encoded = "";
  for (let i = 0; i < answer.length; i++) {
    encoded += String.fromCharCode(answer.charCodeAt(i) ^ secret.charCodeAt(i % secret.length));
  }
  return btoa(encoded);
};

export const deobfuscateStringAnswer = (obfuscated: string, questionId: string): string => {
  try {
    const decoded = atob(obfuscated);
    const secret = questionId.substring(0, 5) + "azota";
    let answerStr = "";
    for (let i = 0; i < decoded.length; i++) {
      answerStr += String.fromCharCode(decoded.charCodeAt(i) ^ secret.charCodeAt(i % secret.length));
    }
    return answerStr;
  } catch (e) {
    return "";
  }
};
