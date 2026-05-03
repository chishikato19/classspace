const txt = "Đáp án: Đúng, Sai, Đúng, đúng";
const ansStr = txt.replace(/^Đáp\s*án\s*[:\.]\s*/i, '').trim();
const ansArray = ansStr.split(/[,;]/).map(s => s.trim().toLowerCase());
console.log(ansArray);
console.log(ansArray.map(a => a === 'đúng' || a === 'đ' || a === 't' || a === 'true'));
