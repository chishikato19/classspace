import React, { useRef, useState, useEffect } from 'react';
import { Stage, Layer, Line, Rect, Circle, Image as KonvaImage, Text, Transformer, Group } from 'react-konva';
import { useWhiteboard } from '../state/WhiteboardContext';
import { PenObject, WhiteboardObject, Point, ImageObject, TextObject } from '../types';
import { v4 as uuidv4 } from 'uuid';

// Helper component to load and render images
const URLImage = ({ image, isSelected, onSelect, onChange, activeTool }: { image: ImageObject, isSelected: boolean, onSelect: () => void, onChange: (newAttrs: any) => void, activeTool: string }) => {
  const [img] = useState(() => {
    const i = new window.Image();
    i.src = image.src;
    return i;
  });
  const shapeRef = useRef<any>(null);
  const trRef = useRef<any>(null);

  useEffect(() => {
    if (isSelected && trRef.current && shapeRef.current) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer().batchDraw();
    }
  }, [isSelected]);

  const isSelectTool = activeTool === 'select';
  const isEraserTool = activeTool === 'eraser';
  const isSplitTool = activeTool === 'split';

  return (
    <React.Fragment>
      <KonvaImage
        onClick={onSelect}
        onTap={onSelect}
        ref={shapeRef}
        image={img}
        x={image.x}
        y={image.y}
        width={image.width}
        height={image.height}
        rotation={image.rotation || 0}
        scaleX={image.scaleX || 1}
        scaleY={image.scaleY || 1}
        crop={image.crop}
        draggable={isSelectTool && isSelected}
        listening={isSelectTool || isEraserTool || isSplitTool}
        onDragEnd={(e) => {
          onChange({
            ...image,
            x: e.target.x(),
            y: e.target.y(),
          });
        }}
        onTransformEnd={(e) => {
          const node = shapeRef.current;
          const scaleX = node.scaleX();
          const scaleY = node.scaleY();
          node.scaleX(1);
          node.scaleY(1);
          onChange({
            ...image,
            x: node.x(),
            y: node.y(),
            rotation: node.rotation(),
            width: Math.max(5, node.width() * scaleX),
            height: Math.max(5, node.height() * scaleY),
          });
        }}
      />
      {isSelected && (
        <Transformer
          ref={trRef}
          boundBoxFunc={(oldBox, newBox) => {
            if (newBox.width < 5 || newBox.height < 5) {
              return oldBox;
            }
            return newBox;
          }}
        />
      )}
    </React.Fragment>
  );
};

export default function WhiteboardCanvas() {
  const { state, dispatch } = useWhiteboard();
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentLine, setCurrentLine] = useState<PenObject | null>(null);
  const [currentShape, setCurrentShape] = useState<ShapeObject | null>(null);
  const [splitY, setSplitY] = useState<number | null>(null);
  const [selectionBox, setSelectionBox] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const stageRef = useRef<any>(null);
  const transformerRef = useRef<any>(null);

  // Handle window resize
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });
  useEffect(() => {
    const handleResize = () => setDimensions({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getPointerPosition = () => {
    const stage = stageRef.current;
    if (!stage) return { x: 0, y: 0 };
    const pos = stage.getPointerPosition();
    const transform = stage.getAbsoluteTransform().copy();
    transform.invert();
    return transform.point(pos);
  };

  const handleMouseDown = (e: any) => {
    const pos = getPointerPosition();
    const isBackground = e.target === e.target.getStage() || e.target.hasName('background');

    if (state.activeTool === 'pen') {
      setIsDrawing(true);
      setCurrentLine({
        id: uuidv4(),
        type: 'pen',
        x: 0,
        y: 0,
        points: [pos.x, pos.y],
        stroke: state.strokeColor,
        strokeWidth: state.strokeWidth,
        tension: 0.5,
      });
    } else if (state.activeTool === 'shape') {
      setIsDrawing(true);
      setCurrentShape({
        id: uuidv4(),
        type: 'shape',
        shapeType: 'rectangle', // Default to rectangle for now
        x: pos.x,
        y: pos.y,
        width: 0,
        height: 0,
        stroke: state.strokeColor,
        strokeWidth: state.strokeWidth,
        fill: state.fillColor !== 'transparent' ? state.fillColor : undefined,
      });
    } else if (state.activeTool === 'select') {
      // Clicked on empty space, start selection box
      if (isBackground) {
        dispatch({ type: 'SET_SELECTED_IDS', payload: [] });
        setSelectionBox({ x1: pos.x, y1: pos.y, x2: pos.x, y2: pos.y });
      }
    } else if (state.activeTool === 'text') {
      if (isBackground) {
        const text = prompt('Nhập nội dung văn bản:');
        if (text) {
          const newText: TextObject = {
            id: uuidv4(),
            type: 'text',
            x: pos.x,
            y: pos.y,
            text: text,
            fontSize: 24,
            fontFamily: 'Arial',
            fill: state.strokeColor,
          };
          dispatch({ type: 'ADD_OBJECT', payload: newText });
          dispatch({ type: 'SET_TOOL', payload: 'select' });
          dispatch({ type: 'SET_SELECTED_IDS', payload: [newText.id] });
        }
      }
    } else if (state.activeTool === 'split') {
      // Find the image under the cursor
      const clickedImage = state.objects.find(obj => 
        obj.type === 'image' && 
        pos.x >= obj.x && pos.x <= obj.x + (obj as ImageObject).width &&
        pos.y >= obj.y && pos.y <= obj.y + (obj as ImageObject).height
      ) as ImageObject | undefined;

      if (clickedImage) {
        // Split the image into two
        const relativeY = pos.y - clickedImage.y;
        
        // Calculate crop for top part
        const topCrop = clickedImage.crop ? {
          ...clickedImage.crop,
          height: relativeY * (clickedImage.crop.height / clickedImage.height)
        } : {
          x: 0, y: 0, width: clickedImage.width, height: relativeY
        };

        // Calculate crop for bottom part
        const bottomCrop = clickedImage.crop ? {
          ...clickedImage.crop,
          y: clickedImage.crop.y + relativeY * (clickedImage.crop.height / clickedImage.height),
          height: clickedImage.crop.height - relativeY * (clickedImage.crop.height / clickedImage.height)
        } : {
          x: 0, y: relativeY, width: clickedImage.width, height: clickedImage.height - relativeY
        };

        const topImage: ImageObject = {
          ...clickedImage,
          id: uuidv4(),
          height: relativeY,
          crop: topCrop
        };

        const bottomImage: ImageObject = {
          ...clickedImage,
          id: uuidv4(),
          y: clickedImage.y + relativeY + 50, // Add a gap of 50px
          height: clickedImage.height - relativeY,
          crop: bottomCrop
        };

        dispatch({ type: 'REMOVE_OBJECT', payload: clickedImage.id });
        dispatch({ type: 'ADD_OBJECT', payload: topImage });
        dispatch({ type: 'ADD_OBJECT', payload: bottomImage });
        dispatch({ type: 'SET_TOOL', payload: 'select' }); // Switch back to select
      }
    }
  };

  const handleMouseMove = () => {
    const pos = getPointerPosition();
    
    if (state.activeTool === 'split') {
      setSplitY(pos.y);
    } else {
      setSplitY(null);
    }

    if (selectionBox) {
      setSelectionBox({ ...selectionBox, x2: pos.x, y2: pos.y });
      return;
    }

    if (!isDrawing) return;

    if (state.activeTool === 'pen' && currentLine) {
      setCurrentLine({
        ...currentLine,
        points: [...currentLine.points, pos.x, pos.y],
      });
    } else if (state.activeTool === 'shape' && currentShape) {
      setCurrentShape({
        ...currentShape,
        width: pos.x - currentShape.x,
        height: pos.y - currentShape.y,
      });
    }
  };

  const handleMouseUp = () => {
    if (isDrawing) {
      if (state.activeTool === 'pen' && currentLine) {
        dispatch({ type: 'ADD_OBJECT', payload: currentLine });
        setCurrentLine(null);
      } else if (state.activeTool === 'shape' && currentShape) {
        // Only add if it has some size
        if (Math.abs(currentShape.width) > 5 || Math.abs(currentShape.height) > 5) {
          dispatch({ type: 'ADD_OBJECT', payload: currentShape });
        }
        setCurrentShape(null);
      }
      setIsDrawing(false);
    }

    if (selectionBox) {
      // Find objects inside the selection box
      const box = {
        x: Math.min(selectionBox.x1, selectionBox.x2),
        y: Math.min(selectionBox.y1, selectionBox.y2),
        width: Math.abs(selectionBox.x1 - selectionBox.x2),
        height: Math.abs(selectionBox.y1 - selectionBox.y2),
      };

      const selectedIds = state.objects.filter((obj) => {
        if (obj.type === 'image') {
          const img = obj as ImageObject;
          return (
            img.x >= box.x &&
            img.y >= box.y &&
            img.x + img.width <= box.x + box.width &&
            img.y + img.height <= box.y + box.height
          );
        }
        if (obj.type === 'text') {
          const txt = obj as TextObject;
          // Approximate text bounds
          const textWidth = txt.width || 100;
          const textHeight = txt.fontSize;
          return (
            txt.x >= box.x &&
            txt.y >= box.y &&
            txt.x + textWidth <= box.x + box.width &&
            txt.y + textHeight <= box.y + box.height
          );
        }
        if (obj.type === 'widget') {
          const widget = obj as WidgetObject;
          return (
            widget.x >= box.x &&
            widget.y >= box.y &&
            widget.x + widget.width <= box.x + box.width &&
            widget.y + widget.height <= box.y + box.height
          );
        }
        // For lines, just check if the first point is inside
        if (obj.type === 'pen') {
          const pen = obj as PenObject;
          if (pen.points.length >= 2) {
            const px = pen.points[0];
            const py = pen.points[1];
            return px >= box.x && px <= box.x + box.width && py >= box.y && py <= box.y + box.height;
          }
        }
        return false;
      }).map(obj => obj.id);

      dispatch({ type: 'SET_SELECTED_IDS', payload: selectedIds });
      setSelectionBox(null);
    }
  };

  const handleWheel = (e: any) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;

    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();

    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };

    const speed = 1.1;
    const newScale = e.evt.deltaY < 0 ? oldScale * speed : oldScale / speed;

    // Limit zoom
    if (newScale < 0.1 || newScale > 10) return;

    dispatch({ type: 'SET_ZOOM', payload: newScale });
    dispatch({
      type: 'SET_PAN',
      payload: {
        x: pointer.x - mousePointTo.x * newScale,
        y: pointer.y - mousePointTo.y * newScale,
      },
    });
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        state.selectedIds.forEach(id => {
          dispatch({ type: 'REMOVE_OBJECT', payload: id });
        });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state.selectedIds, dispatch]);

  // Background rendering
  const renderBackground = () => {
    const { backgroundColor, backgroundPattern } = state;
    const size = 20000; // Large enough background
    const offset = -size / 2;

    let fill = '#ffffff';
    if (backgroundColor === 'green') fill = '#1e4d2b';
    if (backgroundColor === 'black') fill = '#1a1a1a';
    if (backgroundColor === 'white') fill = '#ffffff';

    return (
      <Group listening={false}>
        <Rect x={offset} y={offset} width={size} height={size} fill={fill} />
        {backgroundPattern === 'grid' && renderGrid(offset, size, backgroundColor)}
        {backgroundPattern === 'lines' && renderLines(offset, size, backgroundColor)}
      </Group>
    );
  };

  const renderGrid = (offset: number, size: number, bgColor: string) => {
    const lines = [];
    const step = 40;
    const strokeColor = bgColor === 'green' || bgColor === 'black' ? 'rgba(255,255,255,0.15)' : '#e5e7eb';
    for (let i = 0; i <= size; i += step) {
      lines.push(
        <Line key={`h${i}`} points={[offset, offset + i, offset + size, offset + i]} stroke={strokeColor} strokeWidth={1} />,
        <Line key={`v${i}`} points={[offset + i, offset, offset + i, offset + size]} stroke={strokeColor} strokeWidth={1} />
      );
    }
    return lines;
  };

  const renderLines = (offset: number, size: number, bgColor: string) => {
    const lines = [];
    const step = 40;
    const strokeColor = bgColor === 'green' || bgColor === 'black' ? 'rgba(255,255,255,0.15)' : '#e5e7eb';
    for (let i = 0; i <= size; i += step) {
      lines.push(
        <Line key={`l${i}`} points={[offset, offset + i, offset + size, offset + i]} stroke={strokeColor} strokeWidth={1} />
      );
    }
    return lines;
  };

  return (
    <div className="w-full h-full overflow-hidden bg-gray-200 relative" style={{ touchAction: 'none' }}>
      <Stage
        width={dimensions.width}
        height={dimensions.height}
        onMouseDown={handleMouseDown}
        onMousemove={handleMouseMove}
        onMouseup={handleMouseUp}
        onWheel={handleWheel}
        onTouchStart={handleMouseDown}
        onTouchMove={handleMouseMove}
        onTouchEnd={handleMouseUp}
        ref={stageRef}
        scaleX={state.zoom}
        scaleY={state.zoom}
        x={state.pan.x}
        y={state.pan.y}
        draggable={state.activeTool === 'pan'}
        onDragEnd={(e) => {
          if (e.target === stageRef.current) {
            dispatch({
              type: 'SET_PAN',
              payload: { x: e.target.x(), y: e.target.y() }
            });
          }
        }}
      >
        <Layer>
          {renderBackground()}
          
          {state.objects.map((obj) => {
            const isSelected = state.selectedIds.includes(obj.id);
            const isSelectTool = state.activeTool === 'select';
            const isEraserTool = state.activeTool === 'eraser';

            if (obj.type === 'pen') {
              return (
                <Line
                  key={obj.id}
                  id={obj.id}
                  points={obj.points}
                  stroke={obj.stroke}
                  strokeWidth={obj.strokeWidth}
                  tension={obj.tension}
                  lineCap="round"
                  lineJoin="round"
                  draggable={isSelectTool && isSelected}
                  listening={isSelectTool || isEraserTool}
                  onClick={() => {
                    if (isSelectTool) {
                      dispatch({ type: 'SET_SELECTED_IDS', payload: [obj.id] });
                    } else if (isEraserTool) {
                      dispatch({ type: 'REMOVE_OBJECT', payload: obj.id });
                    }
                  }}
                  onTap={() => {
                    if (isSelectTool) {
                      dispatch({ type: 'SET_SELECTED_IDS', payload: [obj.id] });
                    } else if (isEraserTool) {
                      dispatch({ type: 'REMOVE_OBJECT', payload: obj.id });
                    }
                  }}
                  onDragEnd={(e) => {
                    const node = e.target;
                    // For lines, dragging changes x/y offset, we need to apply it to points
                    // Or just save x/y. Let's save x/y.
                    dispatch({
                      type: 'UPDATE_OBJECT',
                      payload: { id: obj.id, updates: { x: node.x(), y: node.y() } }
                    });
                  }}
                />
              );
            }
            if (obj.type === 'shape') {
              const shape = obj as ShapeObject;
              return (
                <Rect
                  key={shape.id}
                  id={shape.id}
                  x={shape.x}
                  y={shape.y}
                  width={shape.width}
                  height={shape.height}
                  fill={shape.fill}
                  stroke={shape.stroke}
                  strokeWidth={shape.strokeWidth}
                  rotation={shape.rotation || 0}
                  scaleX={shape.scaleX || 1}
                  scaleY={shape.scaleY || 1}
                  draggable={isSelectTool && isSelected}
                  listening={isSelectTool || isEraserTool}
                  onClick={() => {
                    if (isSelectTool) {
                      dispatch({ type: 'SET_SELECTED_IDS', payload: [shape.id] });
                    } else if (isEraserTool) {
                      dispatch({ type: 'REMOVE_OBJECT', payload: shape.id });
                    }
                  }}
                  onTap={() => {
                    if (isSelectTool) {
                      dispatch({ type: 'SET_SELECTED_IDS', payload: [shape.id] });
                    } else if (isEraserTool) {
                      dispatch({ type: 'REMOVE_OBJECT', payload: shape.id });
                    }
                  }}
                  onDragEnd={(e) => {
                    dispatch({
                      type: 'UPDATE_OBJECT',
                      payload: { id: shape.id, updates: { x: e.target.x(), y: e.target.y() } }
                    });
                  }}
                  onTransformEnd={(e) => {
                    const node = e.target;
                    dispatch({
                      type: 'UPDATE_OBJECT',
                      payload: {
                        id: shape.id,
                        updates: {
                          x: node.x(),
                          y: node.y(),
                          rotation: node.rotation(),
                          scaleX: node.scaleX(),
                          scaleY: node.scaleY(),
                        }
                      }
                    });
                  }}
                />
              );
            }
            if (obj.type === 'text') {
              const txt = obj as TextObject;
              return (
                <Text
                  key={txt.id}
                  id={txt.id}
                  x={txt.x}
                  y={txt.y}
                  text={txt.text}
                  fontSize={txt.fontSize}
                  fontFamily={txt.fontFamily}
                  fill={txt.fill}
                  width={txt.width}
                  rotation={txt.rotation || 0}
                  scaleX={txt.scaleX || 1}
                  scaleY={txt.scaleY || 1}
                  draggable={isSelectTool && isSelected}
                  listening={isSelectTool || isEraserTool}
                  onClick={() => {
                    if (isSelectTool) {
                      dispatch({ type: 'SET_SELECTED_IDS', payload: [txt.id] });
                    } else if (isEraserTool) {
                      dispatch({ type: 'REMOVE_OBJECT', payload: txt.id });
                    }
                  }}
                  onTap={() => {
                    if (isSelectTool) {
                      dispatch({ type: 'SET_SELECTED_IDS', payload: [txt.id] });
                    } else if (isEraserTool) {
                      dispatch({ type: 'REMOVE_OBJECT', payload: txt.id });
                    }
                  }}
                  onDragEnd={(e) => {
                    dispatch({
                      type: 'UPDATE_OBJECT',
                      payload: { id: txt.id, updates: { x: e.target.x(), y: e.target.y() } }
                    });
                  }}
                  onTransformEnd={(e) => {
                    const node = e.target;
                    dispatch({
                      type: 'UPDATE_OBJECT',
                      payload: {
                        id: txt.id,
                        updates: {
                          x: node.x(),
                          y: node.y(),
                          rotation: node.rotation(),
                          scaleX: node.scaleX(),
                          scaleY: node.scaleY(),
                        }
                      }
                    });
                  }}
                />
              );
            }
            if (obj.type === 'image') {
              return (
                <URLImage
                  key={obj.id}
                  image={obj as ImageObject}
                  isSelected={isSelected}
                  activeTool={state.activeTool}
                  onSelect={() => {
                    if (isSelectTool) {
                      dispatch({ type: 'SET_SELECTED_IDS', payload: [obj.id] });
                    } else if (isEraserTool) {
                      dispatch({ type: 'REMOVE_OBJECT', payload: obj.id });
                    }
                  }}
                  onChange={(newAttrs) => {
                    dispatch({ type: 'UPDATE_OBJECT', payload: { id: obj.id, updates: newAttrs } });
                  }}
                />
              );
            }
            return null;
          })}

          {currentLine && (
            <Line
              points={currentLine.points}
              stroke={currentLine.stroke}
              strokeWidth={currentLine.strokeWidth}
              tension={currentLine.tension}
              lineCap="round"
              lineJoin="round"
            />
          )}

          {currentShape && (
            <Rect
              x={currentShape.x}
              y={currentShape.y}
              width={currentShape.width}
              height={currentShape.height}
              fill={currentShape.fill}
              stroke={currentShape.stroke}
              strokeWidth={currentShape.strokeWidth}
            />
          )}

          {/* Transformer for selection */}
          {state.selectedIds.length > 0 && (
            <Transformer 
              ref={transformerRef} 
              nodes={state.selectedIds.map(id => stageRef.current?.findOne(`#${id}`)).filter(Boolean)}
            />
          )}

          {/* Split Tool Indicator */}
          {state.activeTool === 'split' && splitY !== null && (
            <Line
              points={[0, splitY, dimensions.width, splitY]}
              stroke="red"
              strokeWidth={2}
              dash={[10, 5]}
            />
          )}

          {/* Selection Box */}
          {selectionBox && (
            <Rect
              x={Math.min(selectionBox.x1, selectionBox.x2)}
              y={Math.min(selectionBox.y1, selectionBox.y2)}
              width={Math.abs(selectionBox.x1 - selectionBox.x2)}
              height={Math.abs(selectionBox.y1 - selectionBox.y2)}
              fill="rgba(59, 130, 246, 0.2)"
              stroke="#3B82F6"
              strokeWidth={1}
            />
          )}
        </Layer>
      </Stage>

      {/* HTML Overlays (Widgets) */}
      {state.objects.filter(obj => obj.type === 'widget').map(obj => {
        const widget = obj as any;
        const isSelected = state.selectedIds.includes(widget.id);
        const isMinimized = widget.isMinimized;
        
        return (
          <div
            key={widget.id}
            style={{
              position: 'absolute',
              left: widget.x * state.zoom + state.pan.x,
              top: widget.y * state.zoom + state.pan.y,
              width: widget.width * state.zoom,
              height: isMinimized ? 32 : widget.height * state.zoom,
              transformOrigin: 'top left',
              border: isSelected ? '2px solid #3B82F6' : '1px solid #e5e7eb',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
              borderRadius: '8px',
              overflow: 'hidden',
              backgroundColor: 'white',
              zIndex: isSelected ? 10 : 1,
              pointerEvents: state.activeTool === 'select' || state.activeTool === 'eraser' ? 'auto' : 'none',
            }}
            onClick={(e) => {
              if (state.activeTool === 'select') {
                dispatch({ type: 'SET_SELECTED_IDS', payload: [widget.id] });
                e.stopPropagation();
              } else if (state.activeTool === 'eraser') {
                dispatch({ type: 'REMOVE_OBJECT', payload: widget.id });
                e.stopPropagation();
              }
            }}
          >
            <div 
              className="w-full h-8 bg-gray-100 border-b border-gray-200 flex items-center justify-between px-3 cursor-move"
              onPointerDown={(e) => {
                if (state.activeTool !== 'select') return;
                e.stopPropagation();
                
                const startX = e.clientX;
                const startY = e.clientY;
                const startWidgetX = widget.x;
                const startWidgetY = widget.y;
                
                const handlePointerMove = (moveEvent: PointerEvent) => {
                  const dx = (moveEvent.clientX - startX) / state.zoom;
                  const dy = (moveEvent.clientY - startY) / state.zoom;
                  dispatch({
                    type: 'UPDATE_OBJECT',
                    payload: { id: widget.id, updates: { x: startWidgetX + dx, y: startWidgetY + dy } }
                  });
                };
                
                const handlePointerUp = () => {
                  window.removeEventListener('pointermove', handlePointerMove);
                  window.removeEventListener('pointerup', handlePointerUp);
                };
                
                window.addEventListener('pointermove', handlePointerMove);
                window.addEventListener('pointerup', handlePointerUp);
              }}
            >
              <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">GeoGebra</span>
              <div className="flex items-center gap-2">
                <button 
                  className="text-gray-400 hover:text-indigo-500 transition-colors text-lg leading-none"
                  onClick={(e) => {
                    e.stopPropagation();
                    dispatch({ 
                      type: 'UPDATE_OBJECT', 
                      payload: { id: widget.id, updates: { isMinimized: !isMinimized } } 
                    });
                  }}
                  title={isMinimized ? "Mở rộng" : "Thu gọn"}
                >
                  {isMinimized ? '+' : '−'}
                </button>
                <button 
                  className="text-gray-400 hover:text-red-500 transition-colors text-lg leading-none"
                  onClick={(e) => {
                    e.stopPropagation();
                    dispatch({ type: 'REMOVE_OBJECT', payload: widget.id });
                  }}
                  title="Đóng"
                >
                  ×
                </button>
              </div>
            </div>
            
            {/* Iframe container */}
            {!isMinimized && (
              <div style={{ width: '100%', height: 'calc(100% - 32px)', position: 'relative' }}>
                {/* Overlay to prevent iframe from stealing mouse events when not selected */}
                {!isSelected && state.activeTool === 'select' && (
                  <div className="absolute inset-0 z-10 cursor-pointer" />
                )}
                <iframe
                  src={widget.url}
                  width="100%"
                  height="100%"
                  style={{ border: 'none' }}
                  title="GeoGebra"
                  allowFullScreen
                />
              </div>
            )}

            {/* Resize Handle */}
            {isSelected && state.activeTool === 'select' && !isMinimized && (
              <div
                className="absolute bottom-0 right-0 w-4 h-4 bg-blue-500 cursor-se-resize rounded-tl-md"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  const startX = e.clientX;
                  const startY = e.clientY;
                  const startWidth = widget.width;
                  const startHeight = widget.height;
                  
                  const handlePointerMove = (moveEvent: PointerEvent) => {
                    const dx = (moveEvent.clientX - startX) / state.zoom;
                    const dy = (moveEvent.clientY - startY) / state.zoom;
                    dispatch({
                      type: 'UPDATE_OBJECT',
                      payload: { 
                        id: widget.id, 
                        updates: { 
                          width: Math.max(200, startWidth + dx), 
                          height: Math.max(150, startHeight + dy) 
                        } 
                      }
                    });
                  };
                  
                  const handlePointerUp = () => {
                    window.removeEventListener('pointermove', handlePointerMove);
                    window.removeEventListener('pointerup', handlePointerUp);
                  };
                  
                  window.addEventListener('pointermove', handlePointerMove);
                  window.addEventListener('pointerup', handlePointerUp);
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
