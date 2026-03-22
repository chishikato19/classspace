import React from 'react';

interface RichTextareaProps {
  className?: string;
  value: string;
  onChangeValue: (value: string) => void;
  rows?: number;
  placeholder?: string;
}

export const RichTextarea: React.FC<RichTextareaProps> = ({
  className,
  value,
  onChangeValue,
  rows = 3,
  placeholder,
}) => {
  return (
    <textarea
      className={className}
      value={value}
      onChange={(e) => onChangeValue(e.target.value)}
      rows={rows}
      placeholder={placeholder}
    />
  );
};
