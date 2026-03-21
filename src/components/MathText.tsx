import React from 'react';
import 'katex/dist/katex.min.css';
import Latex from 'react-latex-next';

interface MathTextProps {
  text: string;
  className?: string;
}

export const MathText: React.FC<MathTextProps> = ({ text, className }) => {
  // Replace standard LaTeX delimiters with what react-latex-next expects if needed,
  // but react-latex-next usually handles $...$ and $$...$$ well.
  // We might want to ensure that the text is treated as a string.
  
  if (!text) return null;

  return (
    <div className={className}>
      <Latex>{text}</Latex>
    </div>
  );
};
