/**
 * Simple obfuscator to prevent average students from finding the answer easily via F12.
 * It's not cryptographically secure, but enough for client-side obfuscation.
 */
export const obfuscateAnswer = (index: number, questionId: string): string => {
  const secret = questionId.substring(0, 5) + "azota";
  const str = index.toString();
  let encoded = "";
  for (let i = 0; i < str.length; i++) {
    encoded += String.fromCharCode(str.charCodeAt(i) ^ secret.charCodeAt(i % secret.length));
  }
  return btoa(encoded);
};

export const deobfuscateAnswer = (obfuscated: string, questionId: string): number => {
  try {
    const decoded = atob(obfuscated);
    const secret = questionId.substring(0, 5) + "azota";
    let indexStr = "";
    for (let i = 0; i < decoded.length; i++) {
      indexStr += String.fromCharCode(decoded.charCodeAt(i) ^ secret.charCodeAt(i % secret.length));
    }
    return parseInt(indexStr, 10);
  } catch (e) {
    return -1;
  }
};
