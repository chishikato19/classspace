import React, { useRef, useState } from 'react';
import { TextEditorToolbar } from './TextEditorToolbar';

interface RichTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  value: string;
  onChangeValue: (value: string) => void;
}

export const RichTextarea: React.FC<RichTextareaProps> = ({ value, onChangeValue, className, onFocus, onBlur, ...props }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div className="flex flex-col relative w-full">
      <div className={`transition-all duration-200 overflow-hidden ${isFocused ? 'max-h-20 opacity-100 mb-1' : 'max-h-0 opacity-0'}`}>
        <TextEditorToolbar textareaRef={textareaRef} value={value} onChange={onChangeValue} />
      </div>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChangeValue(e.target.value)}
        onFocus={(e) => {
          setIsFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setIsFocused(false);
          onBlur?.(e);
        }}
        className={className}
        {...props}
      />
    </div>
  );
};
