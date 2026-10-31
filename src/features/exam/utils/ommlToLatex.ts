/**
 * Utility to parse Office Math Markup Language (OMML) inside Word (.docx) files
 * and convert equations into clean LaTeX math syntax ($...$ or $$...$$).
 */
import JSZip from 'jszip';

const SYMBOL_MAP: Record<string, string> = {
  '±': '\\pm ',
  '∓': '\\mp ',
  '×': '\\times ',
  '÷': '\\div ',
  '·': '\\cdot ',
  '•': '\\cdot ',
  '≤': '\\le ',
  '⩽': '\\le ',
  '≥': '\\ge ',
  '⩾': '\\ge ',
  '≠': '\\ne ',
  '≈': '\\approx ',
  '≡': '\\equiv ',
  '∞': '\\infty ',
  '∈': '\\in ',
  '∉': '\\notin ',
  '⊂': '\\subset ',
  '⊆': '\\subseteq ',
  '∪': '\\cup ',
  '∩': '\\cap ',
  '∅': '\\emptyset ',
  '∀': '\\forall ',
  '∃': '\\exists ',
  '→': '\\to ',
  '⟶': '\\longrightarrow ',
  '←': '\\leftarrow ',
  '⟵': '\\longleftarrow ',
  '⇒': '\\implies ',
  '⟹': '\\implies ',
  '⇔': '\\iff ',
  '⟺': '\\iff ',
  '⊥': '\\perp ',
  '∥': '\\parallel ',
  '∠': '\\angle ',
  '△': '\\triangle ',
  '°': '^\\circ ',
  'α': '\\alpha ',
  'β': '\\beta ',
  'γ': '\\gamma ',
  'δ': '\\delta ',
  'ε': '\\varepsilon ',
  'ϵ': '\\epsilon ',
  'ζ': '\\zeta ',
  'η': '\\eta ',
  'θ': '\\theta ',
  'ϑ': '\\vartheta ',
  'ι': '\\iota ',
  'κ': '\\kappa ',
  'λ': '\\lambda ',
  'μ': '\\mu ',
  'ν': '\\nu ',
  'ξ': '\\xi ',
  'π': '\\pi ',
  'ϖ': '\\varpi ',
  'ρ': '\\rho ',
  'ϱ': '\\varrho ',
  'σ': '\\sigma ',
  'ς': '\\varsigma ',
  'τ': '\\tau ',
  'υ': '\\upsilon ',
  'φ': '\\varphi ',
  'ϕ': '\\phi ',
  'χ': '\\chi ',
  'ψ': '\\psi ',
  'ω': '\\omega ',
  'Γ': '\\Gamma ',
  'Δ': '\\Delta ',
  'Θ': '\\Theta ',
  'Λ': '\\Lambda ',
  'Ξ': '\\Xi ',
  'Π': '\\Pi ',
  'Σ': '\\Sigma ',
  'Υ': '\\Upsilon ',
  'Φ': '\\Phi ',
  'Ψ': '\\Psi ',
  'Ω': '\\Omega '
};

function getLocalName(node: Node): string {
  if (!node) return '';
  return (node as Element).localName || node.nodeName.split(':').pop() || '';
}

function getChildren(node: Node): Element[] {
  const result: Element[] = [];
  for (let i = 0; i < node.childNodes.length; i++) {
    const c = node.childNodes[i];
    if (c.nodeType === Node.ELEMENT_NODE) result.push(c as Element);
  }
  return result;
}

function getFirstChildByLocalName(node: Node, name: string): Element | null {
  for (let i = 0; i < node.childNodes.length; i++) {
    const c = node.childNodes[i];
    if (c.nodeType === Node.ELEMENT_NODE && getLocalName(c) === name) return c as Element;
  }
  return null;
}

function getAttribute(el: Element, attrName: string): string {
  return el.getAttribute(attrName) || 
         el.getAttribute('m:' + attrName) || 
         el.getAttribute('w:' + attrName) || '';
}

function cleanMathText(txt: string): string {
  let res = '';
  for (const ch of txt) {
    if (SYMBOL_MAP[ch]) {
      res += SYMBOL_MAP[ch];
    } else {
      res += ch;
    }
  }
  return res;
}

export function ommlNodeToLatex(node: Node): string {
  if (!node) return '';
  const tag = getLocalName(node);

  switch (tag) {
    case 'oMathPara': {
      const parts = getChildren(node).map(ommlNodeToLatex).filter(Boolean);
      return parts.join(' ');
    }
    case 'oMath':
    case 'e': {
      const parts = getChildren(node).map(ommlNodeToLatex).filter(Boolean);
      return parts.join('');
    }
    case 'r': {
      let runText = '';
      for (const child of getChildren(node)) {
        if (getLocalName(child) === 't') {
          runText += child.textContent || '';
        }
      }
      return cleanMathText(runText);
    }
    case 'f': {
      const fPr = getFirstChildByLocalName(node, 'fPr');
      const typeEl = fPr ? getFirstChildByLocalName(fPr, 'type') : null;
      const typeVal = typeEl ? getAttribute(typeEl, 'val') : '';
      const num = getFirstChildByLocalName(node, 'num');
      const den = getFirstChildByLocalName(node, 'den');
      const numLatex = num ? ommlNodeToLatex(num) : '';
      const denLatex = den ? ommlNodeToLatex(den) : '';
      if (typeVal === 'noBar') {
        return `\\binom{${numLatex}}{${denLatex}}`;
      } else if (typeVal === 'skw') {
        return `{${numLatex}}/{${denLatex}}`;
      }
      return `\\frac{${numLatex}}{${denLatex}}`;
    }
    case 'rad': {
      const radPr = getFirstChildByLocalName(node, 'radPr');
      const degHideEl = radPr ? getFirstChildByLocalName(radPr, 'degHide') : null;
      const isDegHidden = degHideEl && (getAttribute(degHideEl, 'val') === 'on' || getAttribute(degHideEl, 'val') === '1' || !getAttribute(degHideEl, 'val'));
      const deg = getFirstChildByLocalName(node, 'deg');
      const e = getFirstChildByLocalName(node, 'e');
      const eLatex = e ? ommlNodeToLatex(e) : '';
      const degLatex = deg && !isDegHidden ? ommlNodeToLatex(deg).trim() : '';
      if (degLatex) {
        return `\\sqrt[${degLatex}]{${eLatex}}`;
      }
      return `\\sqrt{${eLatex}}`;
    }
    case 'sSup': {
      const e = getFirstChildByLocalName(node, 'e');
      const sup = getFirstChildByLocalName(node, 'sup');
      return `{${e ? ommlNodeToLatex(e) : ''}}^{${sup ? ommlNodeToLatex(sup) : ''}}`;
    }
    case 'sSub': {
      const e = getFirstChildByLocalName(node, 'e');
      const sub = getFirstChildByLocalName(node, 'sub');
      return `{${e ? ommlNodeToLatex(e) : ''}}_{${sub ? ommlNodeToLatex(sub) : ''}}`;
    }
    case 'sSubSup': {
      const e = getFirstChildByLocalName(node, 'e');
      const sub = getFirstChildByLocalName(node, 'sub');
      const sup = getFirstChildByLocalName(node, 'sup');
      return `{${e ? ommlNodeToLatex(e) : ''}}_{${sub ? ommlNodeToLatex(sub) : ''}}^{${sup ? ommlNodeToLatex(sup) : ''}}`;
    }
    case 'sPre': {
      const e = getFirstChildByLocalName(node, 'e');
      const sub = getFirstChildByLocalName(node, 'sub');
      const sup = getFirstChildByLocalName(node, 'sup');
      return `{}_{${sub ? ommlNodeToLatex(sub) : ''}}^{${sup ? ommlNodeToLatex(sup) : ''}}{${e ? ommlNodeToLatex(e) : ''}}`;
    }
    case 'd': {
      const dPr = getFirstChildByLocalName(node, 'dPr');
      const begEl = dPr ? getFirstChildByLocalName(dPr, 'begChr') : null;
      const endEl = dPr ? getFirstChildByLocalName(dPr, 'endChr') : null;
      const sepEl = dPr ? getFirstChildByLocalName(dPr, 'sepChr') : null;
      const begChr = begEl ? getAttribute(begEl, 'val') : '(';
      const endChr = endEl ? getAttribute(endEl, 'val') : ')';
      const sepChr = sepEl ? getAttribute(sepEl, 'val') : '|';

      const mapOpen = (c: string) => {
        if (!c) return '\\left.';
        if (c === '(') return '\\left(';
        if (c === '[') return '\\left[';
        if (c === '{') return '\\left\\{';
        if (c === '|') return '\\left|';
        if (c === '‖') return '\\left\\|';
        if (c === '⟨' || c === '<') return '\\left\\langle ';
        return `\\left${c}`;
      };

      const mapClose = (c: string) => {
        if (!c) return '\\right.';
        if (c === ')') return '\\right)';
        if (c === ']') return '\\right]';
        if (c === '}') return '\\right\\}';
        if (c === '|') return '\\right|';
        if (c === '‖') return '\\right\\|';
        if (c === '⟩' || c === '>') return '\\right\\rangle ';
        return `\\right${c}`;
      };

      const eList = getChildren(node).filter(c => getLocalName(c) === 'e');
      const contents = eList.map(ommlNodeToLatex).join(sepChr ? ` ${sepChr} ` : ', ');
      return `${mapOpen(begChr)} ${contents} ${mapClose(endChr)}`;
    }
    case 'nary': {
      const naryPr = getFirstChildByLocalName(node, 'naryPr');
      const chrEl = naryPr ? getFirstChildByLocalName(naryPr, 'chr') : null;
      const opChar = chrEl ? getAttribute(chrEl, 'val') : '∫';
      const sub = getFirstChildByLocalName(node, 'sub');
      const sup = getFirstChildByLocalName(node, 'sup');
      const e = getFirstChildByLocalName(node, 'e');

      let opLatex = '\\int';
      if (opChar === '∑') opLatex = '\\sum';
      else if (opChar === '∏') opLatex = '\\prod';
      else if (opChar === '∬') opLatex = '\\iint';
      else if (opChar === '∭') opLatex = '\\iiint';
      else if (opChar === '∮') opLatex = '\\oint';
      else if (opChar === '⋃') opLatex = '\\bigcup';
      else if (opChar === '⋂') opLatex = '\\bigcap';

      const subLatex = sub ? ommlNodeToLatex(sub) : '';
      const supLatex = sup ? ommlNodeToLatex(sup) : '';
      const eLatex = e ? ommlNodeToLatex(e) : '';

      return `${opLatex}${subLatex ? `_{${subLatex}}` : ''}${supLatex ? `^{${supLatex}}` : ''} {${eLatex}}`;
    }
    case 'func': {
      const fName = getFirstChildByLocalName(node, 'fName');
      const e = getFirstChildByLocalName(node, 'e');
      let nameStr = fName ? ommlNodeToLatex(fName).trim() : '';
      const funcs = ['sin','cos','tan','cot','sec','csc','arcsin','arccos','arctan','ln','log','exp','lim','min','max','det','gcd'];
      if (funcs.includes(nameStr.toLowerCase())) {
        nameStr = `\\${nameStr.toLowerCase()}`;
      }
      return `${nameStr} {${e ? ommlNodeToLatex(e) : ''}}`;
    }
    case 'limLow': {
      const e = getFirstChildByLocalName(node, 'e');
      const lim = getFirstChildByLocalName(node, 'lim');
      return `\\lim_{${lim ? ommlNodeToLatex(lim) : ''}} {${e ? ommlNodeToLatex(e) : ''}}`;
    }
    case 'limUpp': {
      const e = getFirstChildByLocalName(node, 'e');
      const lim = getFirstChildByLocalName(node, 'lim');
      return `\\underset{${lim ? ommlNodeToLatex(lim) : ''}}{${e ? ommlNodeToLatex(e) : ''}}`;
    }
    case 'bar': {
      const barPr = getFirstChildByLocalName(node, 'barPr');
      const posEl = barPr ? getFirstChildByLocalName(barPr, 'pos') : null;
      const isBot = posEl && getAttribute(posEl, 'val') === 'bot';
      const e = getFirstChildByLocalName(node, 'e');
      const eLatex = e ? ommlNodeToLatex(e) : '';
      return isBot ? `\\underline{${eLatex}}` : `\\overline{${eLatex}}`;
    }
    case 'acc': {
      const accPr = getFirstChildByLocalName(node, 'accPr');
      const chrEl = accPr ? getFirstChildByLocalName(accPr, 'chr') : null;
      const accChr = chrEl ? getAttribute(chrEl, 'val') : '⃗';
      const e = getFirstChildByLocalName(node, 'e');
      const eLatex = e ? ommlNodeToLatex(e) : '';
      if (accChr === '⃗' || accChr === '→') return `\\vec{${eLatex}}`;
      if (accChr === '^' || accChr === 'ˆ') return `\\hat{${eLatex}}`;
      if (accChr === '~' || accChr === '˜') return `\\tilde{${eLatex}}`;
      if (accChr === '.' || accChr === '˙') return `\\dot{${eLatex}}`;
      if (accChr === '..' || accChr === '¨') return `\\ddot{${eLatex}}`;
      if (accChr === '¯' || accChr === '‾') return `\\bar{${eLatex}}`;
      return `\\vec{${eLatex}}`;
    }
    case 'm': {
      const rows = getChildren(node).filter(c => getLocalName(c) === 'mr');
      const rowStrings = rows.map(r => {
        const cells = getChildren(r).filter(c => getLocalName(c) === 'e');
        return cells.map(ommlNodeToLatex).join(' & ');
      });
      return `\\begin{matrix} ${rowStrings.join(' \\\\ ')} \\end{matrix}`;
    }
    case 'eqArr': {
      const lines = getChildren(node).filter(c => getLocalName(c) === 'e');
      return `\\begin{aligned} ${lines.map(ommlNodeToLatex).join(' \\\\ ')} \\end{aligned}`;
    }
    case 'box':
    case 'borderBox': {
      const e = getFirstChildByLocalName(node, 'e');
      return e ? ommlNodeToLatex(e) : '';
    }
    case 'groupChr': {
      const groupChrPr = getFirstChildByLocalName(node, 'groupChrPr');
      const posEl = groupChrPr ? getFirstChildByLocalName(groupChrPr, 'pos') : null;
      const isTop = posEl && getAttribute(posEl, 'val') === 'top';
      const e = getFirstChildByLocalName(node, 'e');
      const eLatex = e ? ommlNodeToLatex(e) : '';
      return isTop ? `\\overbrace{${eLatex}}` : `\\underbrace{${eLatex}}`;
    }
    default: {
      const parts = getChildren(node).map(ommlNodeToLatex).filter(Boolean);
      return parts.join('');
    }
  }
}

/**
 * Preprocesses a Word .docx ArrayBuffer by finding all OMML math elements
 * (<m:oMathPara> or <m:oMath>) in word/document.xml and converting them into
 * standard Word text runs <w:r><w:t> $LATEX$ </w:t></w:r>.
 * This enables mammoth.js to read the equations cleanly as text with LaTeX delimiters!
 */
export async function preprocessDocxForMath(arrayBuffer: ArrayBuffer): Promise<ArrayBuffer> {
  try {
    const zip = await JSZip.loadAsync(arrayBuffer);
    const xmlFiles = ['word/document.xml', 'word/footnotes.xml', 'word/endnotes.xml'];
    let modified = false;

    for (const xmlPath of xmlFiles) {
      const file = zip.file(xmlPath);
      if (!file) continue;

      const xmlText = await file.async('string');
      // Quick check if OMML tags exist in this XML
      if (!xmlText.includes('oMath') && !xmlText.includes('m:oMath')) {
        continue;
      }

      const parser = new DOMParser();
      const doc = parser.parseFromString(xmlText, 'text/xml');

      // Find top-level math nodes: oMathPara or standalone oMath
      const mathNodes: Element[] = [];
      const allElements = doc.getElementsByTagName('*');
      
      for (let i = 0; i < allElements.length; i++) {
        const el = allElements[i];
        const local = getLocalName(el);
        if (local === 'oMathPara') {
          mathNodes.push(el);
        } else if (local === 'oMath') {
          // Only add oMath if it's not nested inside an oMathPara
          let parent = el.parentElement;
          let insidePara = false;
          while (parent) {
            if (getLocalName(parent) === 'oMathPara') {
              insidePara = true;
              break;
            }
            parent = parent.parentElement;
          }
          if (!insidePara) {
            mathNodes.push(el);
          }
        }
      }

      if (mathNodes.length === 0) continue;

      for (const mathNode of mathNodes) {
        const latex = ommlNodeToLatex(mathNode).trim();
        if (!latex) continue;

        // Wrap as inline math $ ... $ (with surrounding spaces so words don't stick)
        const formattedLatex = ` $${latex}$ `;

        // Create replacement Word run element: <w:r><w:t xml:space="preserve"> $...$ </w:t></w:r>
        const runEl = doc.createElementNS('http://schemas.openxmlformats.org/wordprocessingml/2006/main', 'w:r');
        const textEl = doc.createElementNS('http://schemas.openxmlformats.org/wordprocessingml/2006/main', 'w:t');
        textEl.setAttribute('xml:space', 'preserve');
        textEl.textContent = formattedLatex;
        runEl.appendChild(textEl);

        mathNode.parentNode?.replaceChild(runEl, mathNode);
      }

      const serializer = new XMLSerializer();
      const newXmlText = serializer.serializeToString(doc);
      zip.file(xmlPath, newXmlText);
      modified = true;
    }

    if (modified) {
      return await zip.generateAsync({ type: 'arraybuffer' });
    }
  } catch (error) {
    console.warn('Could not preprocess DOCX for OMML equations:', error);
  }

  return arrayBuffer;
}
