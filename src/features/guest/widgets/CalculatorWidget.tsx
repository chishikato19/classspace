import React, { useState, useRef, useEffect } from 'react';
import FloatingWindow from '../components/FloatingWindow';
import { WidgetState } from '../WidgetContext';
import { Trash2, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import * as math from 'mathjs';
import nerdamer from 'nerdamer';
import 'nerdamer/Solve.js';
import 'katex/dist/katex.min.css';
import { MathText } from '../../../components/MathText';
import { MathInput, MathInputRef } from '../../../components/MathInput';

type CalcMode = 'COMP' | 'EQN' | 'GRAPH';

export default function CalculatorWidget({ widget }: { widget: WidgetState }) {
  const [mode, setMode] = useState<CalcMode>('COMP');
  const [display, setDisplay] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  
  // Graphing state
  const [graphFunctions, setGraphFunctions] = useState<string[]>(['x^2']);
  const [activeGraphIndex, setActiveGraphIndex] = useState(0);
  const [graphOffset, setGraphOffset] = useState({ x: 0, y: 0 });
  const [graphScale, setGraphScale] = useState(20);
  const [isDragging, setIsDragging] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Result formatting
  const [resultFormat, setResultFormat] = useState<'decimal' | 'fraction'>('decimal');
  const displayRef = useRef<MathInputRef>(null);
  const freeEqnRef = useRef<MathInputRef>(null);

  // Equation state
  const [eqnType, setEqnType] = useState<'linear' | 'quadratic' | 'system' | 'free'>('quadratic');
  const [coeffs, setCoeffs] = useState({ a: '1', b: '0', c: '0', a1: '1', b1: '1', c1: '5', a2: '1', b2: '-1', c2: '1' });
  const [freeEqn, setFreeEqn] = useState('');
  const [focusedField, setFocusedField] = useState<'display' | 'graph' | 'a' | 'b' | 'c' | 'a1' | 'b1' | 'c1' | 'a2' | 'b2' | 'c2' | 'freeEqn'>('display');

  useEffect(() => {
    if (mode === 'GRAPH' && canvasRef.current) {
      drawGraph();
    }
  }, [mode, graphFunctions, graphOffset, graphScale]);

  useEffect(() => {
    // Reset focused field when mode changes
    if (mode === 'COMP') setFocusedField('display');
    else if (mode === 'GRAPH') setFocusedField('graph');
    else if (mode === 'EQN') {
      if (eqnType === 'system') setFocusedField('a1');
      else if (eqnType === 'free') setFocusedField('freeEqn');
      else setFocusedField('a');
    }
  }, [mode, eqnType]);

  const formatResult = (val: any) => {
    if (val === null || val === 'Error') return val;
    if (typeof val === 'string' && (val.includes('x=') || val.includes('Vô'))) return val;
    
    const num = typeof val === 'number' ? val : parseFloat(val);
    if (isNaN(num)) return val.toString();

    try {
      if (resultFormat === 'fraction') {
        // Try to detect radicals first
        const sq = num * num;
        const eps = 1e-9;
        
        for (let d = 1; d <= 100; d++) {
          const n = Math.round(sq * d * d);
          if (Math.abs(num - Math.sqrt(n) / d) < eps) {
            let outside = 1;
            let inside = n;
            for (let i = Math.floor(Math.sqrt(n)); i >= 2; i--) {
              if (n % (i * i) === 0) {
                outside = i;
                inside = n / (i * i);
                break;
              }
            }
            
            const common = math.gcd(outside, d);
            const finalOutside = outside / common;
            const finalD = d / common;
            
            let res = '';
            if (inside === 1) {
              if (finalD === 1) return (finalOutside * (num < 0 ? -1 : 1)).toString();
              return `$ \\frac{${finalOutside * (num < 0 ? -1 : 1)}}{${finalD}} $`;
            }
            
            const sign = num < 0 ? '-' : '';
            const outsideStr = finalOutside === 1 ? '' : finalOutside.toString();
            const numerator = `${sign}${outsideStr}\\sqrt{${inside}}`;
            
            if (finalD === 1) return `$ ${numerator} $`;
            return `$ \\frac{${numerator}}{${finalD}} $`;
          }
        }

        const frac = math.fraction(num);
        if (Number(frac.d) === 1) return num.toString();
        return `$ \\frac{${Number(frac.n) * Number(frac.s)}}{${Number(frac.d)}} $`;
      }
      return math.format(num, { precision: 10 });
    } catch (e) {
      return val.toString();
    }
  };

  const solveEquation = () => {
    try {
      if (eqnType === 'free') {
        let eq = freeEqnRef.current?.getAsciiMath() || freeEqn;
        eq = eq
          .replace(/cdot/g, '*')
          .replace(/times/g, '*')
          .replace(/div/g, '/')
          .replace(/pi/g, 'pi')
          .replace(/sqrt/g, 'sqrt');
          
        if (!eq.includes('=')) {
          eq = eq + '=0';
        }
        const sol = (nerdamer as any).solveEquations(eq, 'x');
        setResult(`x = ${sol.toString()}`);
        return;
      }

      if (eqnType === 'system') {
        const a1 = parseFloat(coeffs.a1);
        const b1 = parseFloat(coeffs.b1);
        const c1 = parseFloat(coeffs.c1);
        const a2 = parseFloat(coeffs.a2);
        const b2 = parseFloat(coeffs.b2);
        const c2 = parseFloat(coeffs.c2);

        const D = a1 * b2 - a2 * b1;
        const Dx = c1 * b2 - c2 * b1;
        const Dy = a1 * c2 - a2 * c1;

        if (D === 0) {
          if (Dx === 0 && Dy === 0) setResult('Vô số nghiệm');
          else setResult('Vô nghiệm');
        } else {
          const x = Dx / D;
          const y = Dy / D;
          setResult(`x=${formatResult(x)}, y=${formatResult(y)}`);
        }
        return;
      }

      const a = parseFloat(coeffs.a);
      const b = parseFloat(coeffs.b);
      const c = parseFloat(coeffs.c);

      if (eqnType === 'linear') {
        if (a === 0) {
          setResult(b === 0 ? 'Vô số nghiệm' : 'Vô nghiệm');
        } else {
          setResult(`x = ${formatResult(-b / a)}`);
        }
      } else {
        if (a === 0) {
          if (b === 0) {
            setResult(c === 0 ? 'Vô số nghiệm' : 'Vô nghiệm');
          } else {
            setResult(`x = ${formatResult(-c / b)}`);
          }
          return;
        }
        const delta = b * b - 4 * a * c;
        if (delta < 0) {
          setResult('Vô nghiệm thực');
        } else if (delta === 0) {
          setResult(`x = ${formatResult(-b / (2 * a))}`);
        } else {
          const x1 = (-b + Math.sqrt(delta)) / (2 * a);
          const x2 = (-b - Math.sqrt(delta)) / (2 * a);
          setResult(`x1=${formatResult(x1)}, x2=${formatResult(x2)}`);
        }
      }
    } catch (err) {
      setResult('Lỗi');
    }
  };

  const handleKeyPress = (key: string) => {
    if (key === '=') {
      if (mode === 'EQN') {
        solveEquation();
        return;
      }
      try {
        const latex = displayRef.current?.getLatex() || display;
        const asciiMath = displayRef.current?.getAsciiMath() || display;
        
        let expr = asciiMath
          .replace(/cdot/g, '*')
          .replace(/times/g, '*')
          .replace(/div/g, '/')
          .replace(/pi/g, 'pi')
          .replace(/sqrt/g, 'sqrt');
          
        const evaluated = math.evaluate(expr.replace(/\s/g, ''));
        setResult(evaluated.toString());
        setHistory([`${latex} = ${evaluated.toString()}`, ...history.slice(0, 9)]);
      } catch (err) {
        setResult('Error');
      }
      return;
    }

    if (key === 'AC') {
      if (mode === 'COMP') {
        setDisplay('');
        displayRef.current?.setLatex('');
        setResult(null);
      } else if (mode === 'GRAPH') {
        const newFuncs = [...graphFunctions];
        newFuncs[activeGraphIndex] = '';
        setGraphFunctions(newFuncs);
      } else if (mode === 'EQN') {
        setCoeffs({ a: '0', b: '0', c: '0', a1: '0', b1: '0', c1: '0', a2: '0', b2: '0', c2: '0' });
        setFreeEqn('');
        freeEqnRef.current?.setLatex('');
        setResult(null);
      }
      return;
    }

    if (key === 'DEL') {
      if (mode === 'COMP') {
        displayRef.current?.executeCommand(['deleteBackward']);
      } else if (focusedField === 'graph') {
        const newFuncs = [...graphFunctions];
        newFuncs[activeGraphIndex] = newFuncs[activeGraphIndex].slice(0, -1);
        setGraphFunctions(newFuncs);
      } else if (focusedField === 'freeEqn') {
        freeEqnRef.current?.executeCommand(['deleteBackward']);
      }
      else {
        const field = focusedField as keyof typeof coeffs;
        if (coeffs[field] !== undefined) {
          setCoeffs({ ...coeffs, [field]: coeffs[field].slice(0, -1) });
        }
      }
      return;
    }

    if (key === 'S<=>D') {
      setResultFormat(prev => prev === 'decimal' ? 'fraction' : 'decimal');
      return;
    }

    const insertMath = (latex: string) => {
      if (mode === 'COMP') {
        displayRef.current?.executeCommand(['insert', latex]);
        displayRef.current?.focus();
      } else if (mode === 'GRAPH') {
        const newFuncs = [...graphFunctions];
        newFuncs[activeGraphIndex] = newFuncs[activeGraphIndex] + latex;
        setGraphFunctions(newFuncs);
      } else if (focusedField === 'freeEqn') {
        freeEqnRef.current?.executeCommand(['insert', latex]);
        freeEqnRef.current?.focus();
      } else {
        const field = focusedField as keyof typeof coeffs;
        if (coeffs[field] !== undefined) {
          setCoeffs({ ...coeffs, [field]: coeffs[field] + latex });
        }
      }
    };

    const keyMap: Record<string, string> = {
      '(/)': '\\frac{#?}{#?}',
      'sqrt(': '\\sqrt{#?}',
      'sin(': '\\sin(',
      'cos(': '\\cos(',
      'tan(': '\\tan(',
      'log(': '\\log_{10}(',
      'ln(': '\\ln(',
      'pi': '\\pi',
      '*': '\\times',
      '/': '\\div',
      'ANS': (result && result !== 'Error' && !result.includes('x')) ? result : '',
    };

    if (keyMap[key] !== undefined) {
      insertMath(keyMap[key]);
    } else {
      insertMath(key);
    }
  };

  const drawGraph = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const scale = graphScale;
    const centerX = width / 2 + graphOffset.x;
    const centerY = height / 2 + graphOffset.y;

    ctx.strokeStyle = '#d1d5db33';
    ctx.lineWidth = 0.5;
    const startX = centerX % scale;
    const startY = centerY % scale;

    for (let x = startX; x < width; x += scale) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
    }
    for (let y = startY; y < height; y += scale) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
    }

    ctx.strokeStyle = '#4b5563';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, centerY); ctx.lineTo(width, centerY);
    ctx.moveTo(centerX, 0); ctx.lineTo(centerX, height);
    ctx.stroke();

    ctx.fillStyle = '#4b5563';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    let step = 1;
    if (scale < 15) step = 5;
    if (scale < 5) step = 10;
    if (scale > 50) step = 0.5;

    const xRange = Math.ceil(width / scale / 2) + Math.abs(Math.ceil(graphOffset.x / scale));
    const yRange = Math.ceil(height / scale / 2) + Math.abs(Math.ceil(graphOffset.y / scale));

    for (let i = -xRange * 2; i <= xRange * 2; i += step) {
      if (i === 0) continue;
      const xPos = centerX + i * scale;
      if (xPos < 0 || xPos > width) continue;
      ctx.beginPath();
      ctx.moveTo(xPos, centerY - 3);
      ctx.lineTo(xPos, centerY + 3);
      ctx.stroke();
      ctx.fillText(i.toString(), xPos, centerY + 15);
    }

    for (let i = -yRange * 2; i <= yRange * 2; i += step) {
      if (i === 0) continue;
      const yPos = centerY - i * scale;
      if (yPos < 0 || yPos > height) continue;
      ctx.beginPath();
      ctx.moveTo(centerX - 3, yPos);
      ctx.lineTo(centerX + 3, yPos);
      ctx.stroke();
      ctx.textAlign = 'right';
      ctx.fillText(i.toString(), centerX - 8, yPos);
      ctx.textAlign = 'center';
    }

    const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'];
    graphFunctions.forEach((func, index) => {
      if (!func) return;
      try {
        let cleanFunc = func.toLowerCase().replace(/\s/g, '');
        if (cleanFunc.startsWith('y=')) {
          cleanFunc = cleanFunc.substring(2);
        }
        const expr = math.compile(cleanFunc);
        ctx.strokeStyle = colors[index % colors.length];
        ctx.lineWidth = 2;
        ctx.beginPath();

        let first = true;
        for (let i = 0; i < width; i++) {
          const x = (i - centerX) / scale;
          try {
            const y = expr.evaluate({ x });
            const canvasY = centerY - y * scale;

            if (canvasY >= -10 && canvasY <= height + 10) {
              if (first) {
                ctx.moveTo(i, canvasY);
                first = false;
              } else {
                ctx.lineTo(i, canvasY);
              }
            } else {
              first = true;
            }
          } catch (e) {
            first = true;
          }
        }
        ctx.stroke();
      } catch (e) {
      }
    });
  };

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true);
    const pos = 'touches' in e ? e.touches[0] : e;
    setLastMousePos({ x: pos.clientX, y: pos.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging) return;
    const pos = 'touches' in e ? e.touches[0] : e;
    const dx = pos.clientX - lastMousePos.x;
    const dy = pos.clientY - lastMousePos.y;
    setGraphOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
    setLastMousePos({ x: pos.clientX, y: pos.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    setGraphScale(prev => Math.max(5, Math.min(100, prev * zoomFactor)));
  };

  const isFullscreen = widget.isMaximized;

  const containerClass = "w-full h-full bg-[#2c2c2c] flex flex-col font-sans overflow-hidden";

  return (
    <FloatingWindow widget={widget} title="Máy tính khoa học" minWidth={320} minHeight={500}>
      <div className={containerClass}>
        <div className={`flex flex-1 overflow-hidden ${isFullscreen ? 'flex-row' : 'flex-col'}`}>
          {/* Screen Area */}
          <div className={`bg-[#9eb0a3] m-2 rounded-sm shadow-inner border-2 border-[#8a9b8f] flex flex-col relative overflow-hidden ${isFullscreen ? 'w-3/5 order-2 p-6' : 'p-4 min-h-[200px] order-1'}`}>
            {/* Mode Indicator */}
          <div className="absolute top-1 left-1 text-[8px] font-bold text-gray-700 flex gap-2">
            <span className={mode === 'COMP' ? 'underline' : ''}>COMP</span>
            <span className={mode === 'EQN' ? 'underline' : ''}>EQN</span>
            <span className={mode === 'GRAPH' ? 'underline' : ''}>GRAPH</span>
            {resultFormat === 'fraction' && <span className="ml-2">[FRAC]</span>}
          </div>

          {mode === 'GRAPH' ? (
            <div className="flex-1 flex flex-col">
              <div className="space-y-1 mb-1 max-h-[60px] overflow-y-auto hide-scrollbar">
                {graphFunctions.map((func, idx) => (
                  <div key={idx} className="flex items-center gap-1">
                    <span className="text-[8px] font-bold text-gray-700 w-4">y{idx+1}=</span>
                    <input 
                      value={func.startsWith('y=') ? func.substring(2) : func}
                      onChange={(e) => {
                        const newFuncs = [...graphFunctions];
                        newFuncs[idx] = e.target.value;
                        setGraphFunctions(newFuncs);
                      }}
                      onFocus={() => {
                        setFocusedField('graph');
                        setActiveGraphIndex(idx);
                      }}
                      className={`bg-transparent border-b outline-none text-[10px] font-mono text-gray-800 flex-1 ${focusedField === 'graph' && activeGraphIndex === idx ? 'border-gray-800' : 'border-gray-600'}`}
                      placeholder="..."
                    />
                    {graphFunctions.length > 1 && (
                      <button 
                        onClick={() => {
                          const newFuncs = graphFunctions.filter((_, i) => i !== idx);
                          setGraphFunctions(newFuncs);
                          setActiveGraphIndex(0);
                        }}
                        className="text-red-700 hover:text-red-900"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
                {graphFunctions.length < 5 && (
                  <div className="flex justify-between items-center">
                    <button 
                      onClick={() => setGraphFunctions([...graphFunctions, ''])}
                      className="text-[8px] text-gray-700 hover:text-black font-bold flex items-center gap-1"
                    >
                      + Thêm hàm số
                    </button>
                    <button 
                      onClick={() => {
                        setGraphFunctions(['']);
                        setGraphOffset({x:0, y:0});
                        setGraphScale(20);
                      }}
                      className="text-[8px] text-red-700 hover:text-red-900 font-bold"
                    >
                      Xóa tất cả
                    </button>
                  </div>
                )}
              </div>
              <div className="relative flex-1 bg-white/10 rounded overflow-hidden cursor-move min-h-[140px]">
                <canvas 
                  ref={canvasRef} 
                  width={280} 
                  height={140} 
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  onTouchStart={handleMouseDown}
                  onTouchMove={handleMouseMove}
                  onTouchEnd={handleMouseUp}
                  onWheel={handleWheel}
                  className="w-full h-full"
                />
                <div className="absolute bottom-1 right-1 flex gap-1">
                  <button onClick={() => setGraphScale(prev => prev * 1.2)} className="bg-black/20 p-1 rounded hover:bg-black/40"><ZoomIn className="w-3 h-3 text-gray-800" /></button>
                  <button onClick={() => setGraphScale(prev => prev / 1.2)} className="bg-black/20 p-1 rounded hover:bg-black/40"><ZoomOut className="w-3 h-3 text-gray-800" /></button>
                  <button onClick={() => {setGraphOffset({x:0, y:0}); setGraphScale(20);}} className="bg-black/20 p-1 rounded hover:bg-black/40"><Maximize2 className="w-3 h-3 text-gray-800" /></button>
                </div>
              </div>
            </div>
          ) : mode === 'EQN' ? (
            <div className="flex-1 flex flex-col pt-2">
              <div className="flex justify-center gap-2 mb-2">
                <button 
                  onClick={() => setEqnType('linear')}
                  className={`text-[8px] px-2 py-0.5 rounded ${eqnType === 'linear' ? 'bg-gray-700 text-white' : 'bg-gray-400 text-gray-800'}`}
                >
                  ax + b = 0
                </button>
                <button 
                  onClick={() => setEqnType('quadratic')}
                  className={`text-[8px] px-2 py-0.5 rounded ${eqnType === 'quadratic' ? 'bg-gray-700 text-white' : 'bg-gray-400 text-gray-800'}`}
                >
                  ax² + bx + c = 0
                </button>
                <button 
                  onClick={() => setEqnType('system')}
                  className={`text-[8px] px-2 py-0.5 rounded ${eqnType === 'system' ? 'bg-gray-700 text-white' : 'bg-gray-400 text-gray-800'}`}
                >
                  Hệ PT
                </button>
                <button 
                  onClick={() => setEqnType('free')}
                  className={`text-[8px] px-2 py-0.5 rounded ${eqnType === 'free' ? 'bg-gray-700 text-white' : 'bg-gray-400 text-gray-800'}`}
                >
                  Tự do
                </button>
              </div>
              
              {eqnType === 'free' ? (
                <div className="flex flex-col items-center justify-center flex-1 w-full">
                  <span className="text-[10px] text-gray-600 mb-1">Nhập phương trình (ẩn x):</span>
                  <div 
                    className={`w-full bg-transparent border-b text-center text-sm font-mono ${focusedField === 'freeEqn' ? 'border-gray-800' : 'border-gray-600'} cursor-text`} 
                    onClick={() => { setFocusedField('freeEqn'); freeEqnRef.current?.focus(); }}
                  >
                    <MathInput
                      ref={freeEqnRef}
                      value={freeEqn}
                      onChange={setFreeEqn}
                      style={{ textAlign: 'center' }}
                      onEnter={() => handleKeyPress('=')}
                    />
                  </div>
                </div>
              ) : eqnType === 'system' ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-1 text-[10px] font-mono">
                    <input value={coeffs.a1} onFocus={() => setFocusedField('a1')} onChange={(e) => setCoeffs({...coeffs, a1: e.target.value})} className={`w-8 bg-transparent border-b text-center ${focusedField === 'a1' ? 'border-gray-800' : 'border-gray-600'}`} />
                    <span>x +</span>
                    <input value={coeffs.b1} onFocus={() => setFocusedField('b1')} onChange={(e) => setCoeffs({...coeffs, b1: e.target.value})} className={`w-8 bg-transparent border-b text-center ${focusedField === 'b1' ? 'border-gray-800' : 'border-gray-600'}`} />
                    <span>y =</span>
                    <input value={coeffs.c1} onFocus={() => setFocusedField('c1')} onChange={(e) => setCoeffs({...coeffs, c1: e.target.value})} className={`w-8 bg-transparent border-b text-center ${focusedField === 'c1' ? 'border-gray-800' : 'border-gray-600'}`} />
                  </div>
                  <div className="flex items-center gap-1 text-[10px] font-mono">
                    <input value={coeffs.a2} onFocus={() => setFocusedField('a2')} onChange={(e) => setCoeffs({...coeffs, a2: e.target.value})} className={`w-8 bg-transparent border-b text-center ${focusedField === 'a2' ? 'border-gray-800' : 'border-gray-600'}`} />
                    <span>x +</span>
                    <input value={coeffs.b2} onFocus={() => setFocusedField('b2')} onChange={(e) => setCoeffs({...coeffs, b2: e.target.value})} className={`w-8 bg-transparent border-b text-center ${focusedField === 'b2' ? 'border-gray-800' : 'border-gray-600'}`} />
                    <span>y =</span>
                    <input value={coeffs.c2} onFocus={() => setFocusedField('c2')} onChange={(e) => setCoeffs({...coeffs, c2: e.target.value})} className={`w-8 bg-transparent border-b text-center ${focusedField === 'c2' ? 'border-gray-800' : 'border-gray-600'}`} />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  <div className="flex flex-col items-center">
                    <span className="text-[8px] text-gray-600">a</span>
                    <input 
                      type="text" 
                      value={coeffs.a} 
                      onFocus={() => setFocusedField('a')}
                      onChange={(e) => setCoeffs({...coeffs, a: e.target.value})}
                      className={`w-full bg-transparent border-b text-center text-xs font-mono ${focusedField === 'a' ? 'border-gray-800' : 'border-gray-600'}`}
                    />
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-[8px] text-gray-600">b</span>
                    <input 
                      type="text" 
                      value={coeffs.b} 
                      onFocus={() => setFocusedField('b')}
                      onChange={(e) => setCoeffs({...coeffs, b: e.target.value})}
                      className={`w-full bg-transparent border-b text-center text-xs font-mono ${focusedField === 'b' ? 'border-gray-800' : 'border-gray-600'}`}
                    />
                  </div>
                  {eqnType === 'quadratic' && (
                    <div className="flex flex-col items-center">
                      <span className="text-[8px] text-gray-600">c</span>
                      <input 
                        type="text" 
                        value={coeffs.c} 
                        onFocus={() => setFocusedField('c')}
                        onChange={(e) => setCoeffs({...coeffs, c: e.target.value})}
                        className={`w-full bg-transparent border-b text-center text-xs font-mono ${focusedField === 'c' ? 'border-gray-800' : 'border-gray-600'}`}
                      />
                    </div>
                  )}
                </div>
              )}
              <div className="text-right text-sm font-bold text-gray-900 mt-auto flex justify-end">
                <MathText text={formatResult(result) || ''} />
              </div>
            </div>
          ) : (
            <>
              <div className="text-right text-sm font-mono text-gray-800 break-all overflow-y-auto max-h-[60px] hide-scrollbar">
                <MathInput
                  ref={displayRef}
                  value={display}
                  onChange={setDisplay}
                  style={{ textAlign: 'right' }}
                  onEnter={() => handleKeyPress('=')}
                />
              </div>
              <div className="text-right text-2xl font-mono font-bold text-gray-900 mt-2 flex justify-end">
                <MathText text={formatResult(result) || ''} />
              </div>
            </>
          )}
        </div>

        {/* Buttons Area */}
        <div className={`p-3 grid grid-cols-5 gap-2 bg-[#2c2c2c] ${isFullscreen ? 'w-2/5 overflow-y-auto content-start order-1' : 'order-2'}`}>
          {/* Top Row - Function Keys */}
          <button onClick={() => setMode('COMP')} className="bg-[#3d3d3d] text-white text-[10px] py-1 rounded shadow-md hover:bg-gray-600">COMP</button>
          <button onClick={() => setMode('EQN')} className="bg-[#3d3d3d] text-white text-[10px] py-1 rounded shadow-md hover:bg-gray-600">EQN</button>
          <button onClick={() => setMode('GRAPH')} className="bg-[#3d3d3d] text-white text-[10px] py-1 rounded shadow-md hover:bg-gray-600">GRAPH</button>
          <button onClick={() => handleKeyPress('DEL')} className="bg-[#b91c1c] text-white text-[10px] py-1 rounded shadow-md hover:bg-red-600">DEL</button>
          <button onClick={() => handleKeyPress('AC')} className="bg-[#b91c1c] text-white text-[10px] py-1 rounded shadow-md hover:bg-red-600">AC</button>

          {/* Scientific Row 1 */}
          <button onClick={() => handleKeyPress('sin(')} className="bg-[#3d3d3d] text-white text-[10px] py-1 rounded shadow-md hover:bg-gray-600">sin</button>
          <button onClick={() => handleKeyPress('cos(')} className="bg-[#3d3d3d] text-white text-[10px] py-1 rounded shadow-md hover:bg-gray-600">cos</button>
          <button onClick={() => handleKeyPress('tan(')} className="bg-[#3d3d3d] text-white text-[10px] py-1 rounded shadow-md hover:bg-gray-600">tan</button>
          <button onClick={() => handleKeyPress('sqrt(')} className="bg-[#3d3d3d] text-white text-[10px] py-1 rounded shadow-md hover:bg-gray-600">√</button>
          <button onClick={() => handleKeyPress('x')} className="bg-[#d97706] text-white font-bold py-1 rounded shadow-md hover:bg-amber-500">x</button>

          {/* Scientific Row 2 */}
          <button onClick={() => handleKeyPress('log(')} className="bg-[#3d3d3d] text-white text-[10px] py-1 rounded shadow-md hover:bg-gray-600">log</button>
          <button onClick={() => handleKeyPress('ln(')} className="bg-[#3d3d3d] text-white text-[10px] py-1 rounded shadow-md hover:bg-gray-600">ln</button>
          <button onClick={() => handleKeyPress('^')} className="bg-[#3d3d3d] text-white text-[10px] py-1 rounded shadow-md hover:bg-gray-600">^</button>
          <button onClick={() => handleKeyPress('(')} className="bg-[#3d3d3d] text-white text-[10px] py-1 rounded shadow-md hover:bg-gray-600">(</button>
          <button onClick={() => handleKeyPress(')')} className="bg-[#3d3d3d] text-white text-[10px] py-1 rounded shadow-md hover:bg-gray-600">)</button>

          {/* Number Pad Row 1 */}
          <button onClick={() => handleKeyPress('(/)')} className="bg-[#3d3d3d] text-white text-[10px] py-1 rounded shadow-md hover:bg-gray-600 flex flex-col items-center justify-center leading-none">
            <span className="border-b border-white px-1">□</span>
            <span className="px-1">□</span>
          </button>
          <button onClick={() => handleKeyPress('7')} className="bg-[#e5e7eb] text-gray-900 font-bold py-2 rounded shadow-md hover:bg-white">7</button>
          <button onClick={() => handleKeyPress('8')} className="bg-[#e5e7eb] text-gray-900 font-bold py-2 rounded shadow-md hover:bg-white">8</button>
          <button onClick={() => handleKeyPress('9')} className="bg-[#e5e7eb] text-gray-900 font-bold py-2 rounded shadow-md hover:bg-white">9</button>
          <button onClick={() => handleKeyPress('*')} className="bg-[#4b5563] text-white font-bold py-2 rounded shadow-md hover:bg-gray-500">×</button>

          {/* Number Pad Row 2 */}
          <button onClick={() => handleKeyPress('pi')} className="bg-[#3d3d3d] text-white text-[10px] py-2 rounded shadow-md hover:bg-gray-600">π</button>
          <button onClick={() => handleKeyPress('4')} className="bg-[#e5e7eb] text-gray-900 font-bold py-2 rounded shadow-md hover:bg-white">4</button>
          <button onClick={() => handleKeyPress('5')} className="bg-[#e5e7eb] text-gray-900 font-bold py-2 rounded shadow-md hover:bg-white">5</button>
          <button onClick={() => handleKeyPress('6')} className="bg-[#e5e7eb] text-gray-900 font-bold py-2 rounded shadow-md hover:bg-white">6</button>
          <button onClick={() => handleKeyPress('/')} className="bg-[#4b5563] text-white font-bold py-2 rounded shadow-md hover:bg-gray-500">÷</button>

          {/* Number Pad Row 3 */}
          <button onClick={() => handleKeyPress('S<=>D')} className="bg-[#d97706] text-white text-[8px] font-bold py-2 rounded shadow-md hover:bg-amber-500">S⇔D</button>
          <button onClick={() => handleKeyPress('1')} className="bg-[#e5e7eb] text-gray-900 font-bold py-2 rounded shadow-md hover:bg-white">1</button>
          <button onClick={() => handleKeyPress('2')} className="bg-[#e5e7eb] text-gray-900 font-bold py-2 rounded shadow-md hover:bg-white">2</button>
          <button onClick={() => handleKeyPress('3')} className="bg-[#e5e7eb] text-gray-900 font-bold py-2 rounded shadow-md hover:bg-white">3</button>
          <button onClick={() => handleKeyPress('+')} className="bg-[#4b5563] text-white font-bold py-2 rounded shadow-md hover:bg-gray-500">+</button>

          {/* Number Pad Row 4 */}
          <button onClick={() => handleKeyPress('ANS')} className="bg-[#4b5563] text-white text-[10px] font-bold py-2 rounded shadow-md hover:bg-gray-500">Ans</button>
          <button onClick={() => handleKeyPress('0')} className="bg-[#e5e7eb] text-gray-900 font-bold py-2 rounded shadow-md hover:bg-white">0</button>
          <button onClick={() => handleKeyPress('.')} className="bg-[#e5e7eb] text-gray-900 font-bold py-2 rounded shadow-md hover:bg-white">.</button>
          <button onClick={() => handleKeyPress('-')} className="bg-[#4b5563] text-white font-bold py-2 rounded shadow-md hover:bg-gray-500">-</button>
          <button onClick={() => handleKeyPress('=')} className="bg-[#4b5563] text-white font-bold py-2 rounded shadow-md hover:bg-gray-500">=</button>
        </div>
        </div>
        
        {/* Footer Info */}
        <div className="bg-[#1a1a1a] p-1 text-center">
          <div className="text-[6px] text-gray-600 uppercase tracking-widest">Natural-V.P.A.M.</div>
        </div>
      </div>
    </FloatingWindow>
  );
}
