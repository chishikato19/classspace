import React, { useEffect, useRef } from 'react';
import 'katex/dist/katex.min.css';
import renderMathInElement from 'katex/dist/contrib/auto-render';

interface MathTextProps {
  text: string;
  className?: string;
}

export const MathText: React.FC<MathTextProps> = ({ text, className }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current && text) {
      // Reset the HTML first so we start fresh
      // Do NOT replace \n with <br/> here, because it breaks math blocks that span multiple lines.
      // Instead, we use CSS white-space: pre-wrap to preserve newlines.
      containerRef.current.textContent = text;
      
      // Then render math
      renderMathInElement(containerRef.current, {
        delimiters: [
          { left: '$$', right: '$$', display: true },
          { left: '\\[', right: '\\]', display: true },
          { left: '$', right: '$', display: false },
          { left: '\\(', right: '\\)', display: false }
        ],
        throwOnError: false,
        errorColor: '#cc0000',
        strict: false
      });
    }
  }, [text]);

  if (!text) return null;

  return (
    <div 
      ref={containerRef} 
      className={`whitespace-pre-wrap ${className || ''}`}
    />
  );
};
