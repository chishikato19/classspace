import React, { useRef, useState, useEffect } from 'react';

interface Point {
  x: number;
  y: number;
}

export interface Stroke {
  color: string;
  points: Point[];
  width: number;
}

interface DrawingCanvasProps {
  annotations: string; // JSON string of Stroke[]
  onAddStroke?: (newAnnotations: string) => void;
  readOnly?: boolean;
  color?: string;
  lineWidth?: number;
}

export default function DrawingCanvas({
  annotations,
  onAddStroke,
  readOnly = false,
  color = '#ef4444', // Default red
  lineWidth = 3,
}: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentStroke, setCurrentStroke] = useState<Stroke | null>(null);

  // Parse annotations safely
  const parsedStrokes: Stroke[] = React.useMemo(() => {
    try {
      return annotations ? JSON.parse(annotations) : [];
    } catch (e) {
      return [];
    }
  }, [annotations]);

  // Handle Resize and Redraw
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resizeObserver = new ResizeObserver(() => {
      // Match canvas internal resolution to its display size
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

    const allStrokes = currentStroke ? [...parsedStrokes, currentStroke] : parsedStrokes;

    allStrokes.forEach((stroke) => {
      if (stroke.points.length === 0) return;
      ctx.beginPath();
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width;

      // Points are stored as relative coordinates (0 to 1)
      const startX = stroke.points[0].x * canvas.width;
      const startY = stroke.points[0].y * canvas.height;
      ctx.moveTo(startX, startY);

      for (let i = 1; i < stroke.points.length; i++) {
        const x = stroke.points[i].x * canvas.width;
        const y = stroke.points[i].y * canvas.height;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    });
  };

  // Redraw when strokes change
  useEffect(() => {
    drawAllStrokes();
  }, [parsedStrokes, currentStroke]);

  // Drawing Handlers
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
    e.preventDefault();
    const point = getRelativeCoordinates(e);
    if (!point) return;

    setIsDrawing(true);
    setCurrentStroke({
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
      return {
        ...prev,
        points: [...prev.points, point],
      };
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDrawing || readOnly || !currentStroke) return;
    e.preventDefault();
    setIsDrawing(false);

    if (currentStroke.points.length > 1 && onAddStroke) {
      const newStrokes = [...parsedStrokes, currentStroke];
      onAddStroke(JSON.stringify(newStrokes));
    }
    setCurrentStroke(null);
  };

  return (
    <div ref={containerRef} className="absolute inset-0 w-full h-full touch-none">
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-crosshair"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerOut={handlePointerUp}
      />
    </div>
  );
}
