import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import 'mathlive';

export interface MathInputRef {
  getLatex: () => string;
  getAsciiMath: () => string;
  setLatex: (latex: string) => void;
  executeCommand: (command: any) => void;
  focus: () => void;
}

interface MathInputProps {
  value: string;
  onChange: (value: string) => void;
  onEnter?: () => void;
  readOnly?: boolean;
  className?: string;
  onFocus?: () => void;
  style?: React.CSSProperties;
}

export const MathInput = forwardRef<MathInputRef, MathInputProps>(({ value, onChange, onEnter, readOnly, className, onFocus, style }, ref) => {
  const mfRef = useRef<any>(null);

  useImperativeHandle(ref, () => ({
    getLatex: () => mfRef.current?.getValue('latex') || '',
    getAsciiMath: () => mfRef.current?.getValue('ascii-math') || '',
    setLatex: (latex: string) => {
      if (mfRef.current) mfRef.current.value = latex;
    },
    executeCommand: (command: any) => {
      if (mfRef.current) mfRef.current.executeCommand(command);
    },
    focus: () => {
      if (mfRef.current) mfRef.current.focus();
    }
  }));

  useEffect(() => {
    const mf = mfRef.current;
    if (!mf) return;

    mf.value = value;

    const handleInput = (ev: Event) => {
      onChange((ev.target as any).value);
    };

    const handleKeyDown = (ev: KeyboardEvent) => {
      if (ev.key === 'Enter' && onEnter) {
        onEnter();
      }
    };

    const handleFocus = () => {
      if (onFocus) onFocus();
    };

    mf.addEventListener('input', handleInput);
    mf.addEventListener('keydown', handleKeyDown);
    mf.addEventListener('focusin', handleFocus);

    return () => {
      mf.removeEventListener('input', handleInput);
      mf.removeEventListener('keydown', handleKeyDown);
      mf.removeEventListener('focusin', handleFocus);
    };
  }, [onChange, onEnter, onFocus]);

  useEffect(() => {
    if (mfRef.current && mfRef.current.value !== value) {
      mfRef.current.value = value;
    }
  }, [value]);

  const MathField = 'math-field' as any;

  return (
    <MathField
      ref={mfRef}
      class={className}
      style={{
        backgroundColor: 'transparent',
        border: 'none',
        outline: 'none',
        fontSize: '1.2rem',
        width: '100%',
        padding: '0',
        ...style
      }}
      read-only={readOnly ? "true" : undefined}
    />
  );
});

MathInput.displayName = 'MathInput';
