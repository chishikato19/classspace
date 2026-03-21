import React, { useMemo } from 'react';
import JoditEditor from 'jodit-react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  small?: boolean;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({ value, onChange, placeholder, className, small = false }) => {
  const config = useMemo(() => ({
    readonly: false,
    placeholder: placeholder || 'Nhập nội dung...',
    toolbarAdaptive: false,
    buttons: small ? [
      'bold', 'italic', 'underline', 'strikethrough', '|',
      'superscript', 'subscript', '|',
      'font', 'fontsize', 'brush', '|',
      'table', 'undo', 'redo'
    ] : [
      'bold', 'italic', 'underline', 'strikethrough', '|',
      'superscript', 'subscript', '|',
      'ul', 'ol', '|',
      'font', 'fontsize', 'brush', '|',
      'table', 'link', '|',
      'align', 'undo', 'redo'
    ],
    height: small ? 150 : 250,
    style: {
      fontFamily: 'inherit',
    }
  }), [placeholder, small]);

  return (
    <div className={className}>
      <JoditEditor
        value={value}
        config={config}
        onBlur={newContent => onChange(newContent)}
        onChange={() => {}} // We use onBlur to prevent performance issues with continuous typing
      />
    </div>
  );
};
