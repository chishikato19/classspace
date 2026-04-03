export type ToolType = 'select' | 'pan' | 'pen' | 'eraser' | 'shape' | 'split' | 'text' | 'widget';

export type ShapeType = 'rectangle' | 'circle' | 'triangle' | 'line' | 'arrow';

export type BackgroundColor = 'white' | 'green' | 'black';
export type BackgroundPattern = 'none' | 'grid' | 'lines';

export interface Point {
  x: number;
  y: number;
}

export interface BaseObject {
  id: string;
  type: string;
  x: number;
  y: number;
  rotation?: number;
  scaleX?: number;
  scaleY?: number;
  isLocked?: boolean;
}

export interface PenObject extends BaseObject {
  type: 'pen';
  points: number[];
  stroke: string;
  strokeWidth: number;
  tension?: number;
}

export interface ShapeObject extends BaseObject {
  type: 'shape';
  shapeType: ShapeType;
  width: number;
  height: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
}

export interface ImageObject extends BaseObject {
  type: 'image';
  src: string;
  width: number;
  height: number;
  crop?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface TextObject extends BaseObject {
  type: 'text';
  text: string;
  fontSize: number;
  fontFamily: string;
  fill: string;
  width?: number;
}

export interface WidgetObject extends BaseObject {
  type: 'widget';
  widgetType: 'geogebra';
  width: number;
  height: number;
  url: string;
  isMinimized?: boolean;
}

export type WhiteboardObject = PenObject | ShapeObject | ImageObject | TextObject | WidgetObject;

export interface WhiteboardState {
  objects: WhiteboardObject[];
  past: WhiteboardObject[][];
  future: WhiteboardObject[][];
  backgroundColor: BackgroundColor;
  backgroundPattern: BackgroundPattern;
  zoom: number;
  pan: Point;
  activeTool: ToolType;
  activeShapeType: ShapeType;
  strokeColor: string;
  strokeWidth: number;
  fillColor: string;
  selectedIds: string[];
}
