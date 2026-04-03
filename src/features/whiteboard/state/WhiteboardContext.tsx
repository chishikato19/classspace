import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { WhiteboardState, WhiteboardObject, ToolType, BackgroundColor, BackgroundPattern, Point } from '../types';

type Action =
  | { type: 'SET_TOOL'; payload: ToolType }
  | { type: 'SET_BACKGROUND_COLOR'; payload: BackgroundColor }
  | { type: 'SET_BACKGROUND_PATTERN'; payload: BackgroundPattern }
  | { type: 'SET_ZOOM'; payload: number }
  | { type: 'SET_PAN'; payload: Point }
  | { type: 'SET_STROKE_COLOR'; payload: string }
  | { type: 'SET_STROKE_WIDTH'; payload: number }
  | { type: 'SET_FILL_COLOR'; payload: string }
  | { type: 'ADD_OBJECT'; payload: WhiteboardObject }
  | { type: 'UPDATE_OBJECT'; payload: { id: string; updates: Partial<WhiteboardObject> } }
  | { type: 'REMOVE_OBJECT'; payload: string }
  | { type: 'SET_SELECTED_IDS'; payload: string[] }
  | { type: 'CLEAR_BOARD' }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'SET_SHAPE_TYPE'; payload: ShapeType };

const initialState: WhiteboardState = {
  objects: [],
  past: [],
  future: [],
  backgroundColor: 'white',
  backgroundPattern: 'none',
  zoom: 1,
  pan: { x: 0, y: 0 },
  activeTool: 'pen',
  activeShapeType: 'rectangle',
  strokeColor: '#000000',
  strokeWidth: 4,
  fillColor: 'transparent',
  selectedIds: [],
};

function whiteboardReducer(state: WhiteboardState, action: Action): WhiteboardState {
  switch (action.type) {
    case 'SET_TOOL':
      return { ...state, activeTool: action.payload };
    case 'SET_SHAPE_TYPE':
      return { ...state, activeShapeType: action.payload, activeTool: 'shape' };
    case 'SET_BACKGROUND_COLOR':
      return { ...state, backgroundColor: action.payload };
    case 'SET_BACKGROUND_PATTERN':
      return { ...state, backgroundPattern: action.payload };
    case 'SET_ZOOM':
      return { ...state, zoom: action.payload };
    case 'SET_PAN':
      return { ...state, pan: action.payload };
    case 'SET_STROKE_COLOR':
      return { ...state, strokeColor: action.payload };
    case 'SET_STROKE_WIDTH':
      return { ...state, strokeWidth: action.payload };
    case 'SET_FILL_COLOR':
      return { ...state, fillColor: action.payload };
    case 'ADD_OBJECT':
      return { 
        ...state, 
        past: [...state.past, state.objects],
        future: [],
        objects: [...state.objects, action.payload] 
      };
    case 'UPDATE_OBJECT':
      return {
        ...state,
        past: [...state.past, state.objects],
        future: [],
        objects: state.objects.map((obj) =>
          obj.id === action.payload.id ? { ...obj, ...action.payload.updates } as WhiteboardObject : obj
        ),
      };
    case 'REMOVE_OBJECT':
      return {
        ...state,
        past: [...state.past, state.objects],
        future: [],
        objects: state.objects.filter((obj) => obj.id !== action.payload),
        selectedIds: state.selectedIds.filter((id) => id !== action.payload),
      };
    case 'SET_SELECTED_IDS':
      return { ...state, selectedIds: action.payload };
    case 'CLEAR_BOARD':
      return { 
        ...state, 
        past: [...state.past, state.objects],
        future: [],
        objects: [], 
        selectedIds: [] 
      };
    case 'UNDO':
      if (state.past.length === 0) return state;
      const previous = state.past[state.past.length - 1];
      const newPast = state.past.slice(0, state.past.length - 1);
      return {
        ...state,
        past: newPast,
        future: [state.objects, ...state.future],
        objects: previous,
        selectedIds: [],
      };
    case 'REDO':
      if (state.future.length === 0) return state;
      const next = state.future[0];
      const newFuture = state.future.slice(1);
      return {
        ...state,
        past: [...state.past, state.objects],
        future: newFuture,
        objects: next,
        selectedIds: [],
      };
    default:
      return state;
  }
}

const WhiteboardContext = createContext<{
  state: WhiteboardState;
  dispatch: React.Dispatch<Action>;
} | null>(null);

export function WhiteboardProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(whiteboardReducer, initialState);

  return (
    <WhiteboardContext.Provider value={{ state, dispatch }}>
      {children}
    </WhiteboardContext.Provider>
  );
}

export function useWhiteboard() {
  const context = useContext(WhiteboardContext);
  if (!context) {
    throw new Error('useWhiteboard must be used within a WhiteboardProvider');
  }
  return context;
}
