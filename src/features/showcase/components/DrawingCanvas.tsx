import React, { useRef, useState, useEffect } from 'react';

interface Point {
  x: number;
  y: number;
}

export type ToolType = 'pen' | 'laser' | 'circle' | 'line' | 'text';

export interface Stroke {
  type?: ToolType;
  color: string;
  points: Point[];
  width: number;
  text?: string;
}

interface DrawingCanvasProps {
  annotations: string; // JSON string of Stroke[]
  onAddStroke?: (newAnnotations: string) => void;
  readOnly?: boolean;
  color?: string;
  lineWidth?: number;
  tool?: ToolType;
}

export default function DrawingCanvas({
  annotations,
  onAddStroke,
  readOnly = false,
  color = '#ef4444', // Default red
  lineWidth = 3,
  tool = 'pen',
}: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentStroke, setCurrentStroke] = useState<Stroke | null>(null);
  const [textInput, setTextInput] = useState<{ x: number; y: number; value: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const pendingStrokesRef = useRef<Stroke[]>([]);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Parse annotations safely
  const parsedStrokes: Stroke[] = React.useMemo(() => {
    try {
      return annotations ? JSON.parse(annotations) : [];
    } catch (e) {
      return [];
    }
  }, [annotations]);

  const parsedStrokesRef = useRef<Stroke[]>(parsedStrokes);
  useEffect(() => {
    parsedStrokesRef.current = parsedStrokes;
    
    // If annotations are cleared externally, clear pending strokes and timeout
    if (annotations === '[]' || annotations === '') {
      pendingStrokesRef.current = [];
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    }
  }, [parsedStrokes, annotations]);

  // Handle Resize and Redraw
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resizeObserver = new ResizeObserver(() => {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      drawAllStrokes();
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, [parsedStrokes, currentStroke]);

  // Draw all strokes
  const drawAllStrokes = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const allStrokes = [...parsedStrokes, ...pendingStrokesRef.current];
    if (currentStroke) {
      allStrokes.push(currentStroke);
    }

    allStrokes.forEach((stroke) => {
      if (stroke.points.length === 0) return;
      ctx.beginPath();
      ctx.strokeStyle = stroke.color;
      ctx.fillStyle = stroke.color;
      ctx.lineWidth = stroke.width;

      const t = stroke.type || 'pen';

      if (t === 'pen' || t === 'laser') {
        if (t === 'laser' && stroke !== currentStroke) return; // Don't draw old laser strokes
        const startX = stroke.points[0].x * canvas.width;
        const startY = stroke.points[0].y * canvas.height;
        ctx.moveTo(startX, startY);

        for (let i = 1; i < stroke.points.length; i++) {
          const x = stroke.points[i].x * canvas.width;
          const y = stroke.points[i].y * canvas.height;
          ctx.lineTo(x, y);
        }
        if (t === 'laser') {
          ctx.shadowBlur = 10;
          ctx.shadowColor = stroke.color;
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
      } else if (t === 'line') {
        const startX = stroke.points[0].x * canvas.width;
        const startY = stroke.points[0].y * canvas.height;
        const endX = stroke.points[stroke.points.length - 1].x * canvas.width;
        const endY = stroke.points[stroke.points.length - 1].y * canvas.height;
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
      } else if (t === 'circle') {
        const startX = stroke.points[0].x * canvas.width;
        const startY = stroke.points[0].y * canvas.height;
        const endX = stroke.points[stroke.points.length - 1].x * canvas.width;
        const endY = stroke.points[stroke.points.length - 1].y * canvas.height;
        const radiusX = Math.abs(endX - startX) / 2;
        const radiusY = Math.abs(endY - startY) / 2;
        const centerX = startX + (endX - startX) / 2;
        const centerY = startY + (endY - startY) / 2;
        ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
        ctx.stroke();
      } else if (t === 'text' && stroke.text) {
        ctx.font = `${Math.max(16, stroke.width * 5)}px Arial`;
        const x = stroke.points[0].x * canvas.width;
        const y = stroke.points[0].y * canvas.height;
        ctx.fillText(stroke.text, x, y);
      }
    });
  };

  useEffect(() => {
    drawAllStrokes();
  }, [parsedStrokes, currentStroke]);

  useEffect(() => {
    if (textInput && inputRef.current) {
      inputRef.current.focus();
    }
  }, [textInput]);

  const getRelativeCoordinates = (e: React.PointerEvent | PointerEvent): Point | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    };
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (readOnly) return;
    if (textInput) {
      handleTextSubmit();
      return;
    }
    e.preventDefault();
    const point = getRelativeCoordinates(e);
    if (!point) return;

    if (tool === 'text') {
      setTextInput({ x: point.x, y: point.y, value: '' });
      return;
    }

    setIsDrawing(true);
    setCurrentStroke({
      type: tool,
      color,
      width: lineWidth,
      points: [point],
    });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDrawing || readOnly || !currentStroke) return;
    e.preventDefault();
    const point = getRelativeCoordinates(e);
    if (!point) return;

    setCurrentStroke((prev) => {
      if (!prev) return prev;
      if (tool === 'line' || tool === 'circle') {
        return { ...prev, points: [prev.points[0], point] };
      }
      return { ...prev, points: [...prev.points, point] };
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDrawing || readOnly || !currentStroke) return;
    e.preventDefault();
    setIsDrawing(false);

    if (tool === 'laser') {
      setCurrentStroke(null);
      return;
    }

    if (currentStroke.points.length > 1 && onAddStroke) {
      pendingStrokesRef.current.push(currentStroke);
      
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      
      saveTimeoutRef.current = setTimeout(() => {
        const newStrokes = [...parsedStrokesRef.current, ...pendingStrokesRef.current];
        onAddStroke(JSON.stringify(newStrokes));
        pendingStrokesRef.current = [];
      }, 1000);
    }
    setCurrentStroke(null);
  };

  const handleTextSubmit = () => {
    if (textInput && textInput.value.trim() && onAddStroke) {
      const newStroke: Stroke = {
        type: 'text',
        color,
        width: lineWidth,
        points: [{ x: textInput.x, y: textInput.y }],
        text: textInput.value,
      };
      pendingStrokesRef.current.push(newStroke);
      
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      
      saveTimeoutRef.current = setTimeout(() => {
        const newStrokes = [...parsedStrokesRef.current, ...pendingStrokesRef.current];
        onAddStroke(JSON.stringify(newStrokes));
        pendingStrokesRef.current = [];
      }, 1000);
    }
    setTextInput(null);
  };

  return (
    <div ref={containerRef} className="absolute inset-0 w-full h-full touch-none">
      <canvas
        ref={canvasRef}
        className={`w-full h-full ${readOnly ? '' : tool === 'text' ? 'cursor-text' : 'cursor-crosshair'}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerOut={handlePointerUp}
      />
      {textInput && (
        <input
          ref={inputRef}
          type="text"
          value={textInput.value}
          onChange={(e) => setTextInput({ ...textInput, value: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleTextSubmit();
            if (e.key === 'Escape') setTextInput(null);
          }}
          onBlur={handleTextSubmit}
          className="absolute bg-transparent outline-none border-b border-dashed border-gray-400"
          style={{
            left: `${textInput.x * 100}%`,
            top: `${textInput.y * 100}%`,
            color: color,
            fontSize: `${Math.max(16, lineWidth * 5)}px`,
            transform: 'translateY(-100%)',
          }}
        />
      )}
    </div>
  );
}
