import React from 'react';
import { Superscript, Subscript, Table } from 'lucide-react';

interface TextEditorToolbarProps {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  value: string;
  onChange: (value: string) => void;
}

export const TextEditorToolbar: React.FC<TextEditorToolbarProps> = ({ textareaRef, value, onChange }) => {
  const insertText = (before: string, after: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);

    const newText = value.substring(0, start) + before + selectedText + after + value.substring(end);
    onChange(newText);

    // Set cursor position after React re-renders
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + selectedText.length);
    }, 0);
  };

  const insertTable = () => {
    const tableSnippet = `\n$$\n\\begin{array}{|c|c|c|}\n\\hline\n\\text{Cột 1} & \\text{Cột 2} & \\text{Cột 3} \\\\\n\\hline\n\\text{Hàng 1} & \\text{Hàng 1} & \\text{Hàng 1} \\\\\n\\hline\n\\text{Hàng 2} & \\text{Hàng 2} & \\text{Hàng 2} \\\\\n\\hline\n\\end{array}\n$$\n`;
    insertText(tableSnippet);
  };

  return (
    <div 
      className="flex items-center gap-1 p-1 border border-gray-300 rounded-md bg-gray-50"
      onMouseDown={(e) => e.preventDefault()}
    >
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => insertText('$^{', '}$')}
        className="p-1.5 text-gray-600 hover:bg-gray-200 rounded-md transition-colors flex items-center gap-1 text-sm"
        title="Chỉ số trên (Superscript)"
      >
        <Superscript size={16} />
        <span className="hidden sm:inline">Chỉ số trên</span>
      </button>
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => insertText('_{', '}$')}
        className="p-1.5 text-gray-600 hover:bg-gray-200 rounded-md transition-colors flex items-center gap-1 text-sm"
        title="Chỉ số dưới (Subscript)"
      >
        <Subscript size={16} />
        <span className="hidden sm:inline">Chỉ số dưới</span>
      </button>
      <div className="w-px h-4 bg-gray-300 mx-1"></div>
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={insertTable}
        className="p-1.5 text-gray-600 hover:bg-gray-200 rounded-md transition-colors flex items-center gap-1 text-sm"
        title="Chèn bảng (LaTeX Array)"
      >
        <Table size={16} />
        <span className="hidden sm:inline">Chèn bảng</span>
      </button>
    </div>
  );
};
