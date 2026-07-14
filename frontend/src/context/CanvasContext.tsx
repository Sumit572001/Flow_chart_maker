import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type ShapeType = 'rectangle' | 'rounded-rect' | 'circle' | 'diamond' | 'parallelogram' | 'text-box';
export type LineStyle = 'straight' | 'orthogonal' | 'curved';
export type StrokeDashType = 'solid' | 'dashed' | 'dotted';
export type ArrowHeadType = 'none' | 'single' | 'double';

export interface IShape {
  id: string;
  type: ShapeType;
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  strokeDash: StrokeDashType;
  text: string;
  fontFamily: string;
  fontSize: number;
  fontBold: boolean;
  fontItalic: boolean;
  fontUnderline: boolean;
  textColor: string;
  textAlign: 'left' | 'center' | 'right';
}

export interface IConnection {
  id: string;
  fromId: string;
  fromPort: 'top' | 'right' | 'bottom' | 'left';
  toId: string;
  toPort: 'top' | 'right' | 'bottom' | 'left';
  lineStyle: LineStyle;
  stroke: string;
  strokeWidth: number;
  strokeDash: StrokeDashType;
  arrowHead: ArrowHeadType;
  label?: string;
}

interface CanvasHistoryState {
  shapes: IShape[];
  connections: IConnection[];
}

interface CanvasContextType {
  // Metadata
  flowchartId: string | null;
  flowchartName: string;
  setFlowchartName: (name: string) => void;
  isSaved: boolean;
  setIsSaved: (val: boolean) => void;
  isLoading: boolean;

  // State elements
  shapes: IShape[];
  connections: IConnection[];
  selectedShapeId: string | null;
  selectedConnectionId: string | null;
  
  // Toolbar configuration defaults
  toolMode: 'select' | ShapeType | 'connector';
  setToolMode: (mode: 'select' | ShapeType | 'connector') => void;
  
  defaultFill: string;
  setDefaultFill: (color: string) => void;
  defaultStroke: string;
  setDefaultStroke: (color: string) => void;
  defaultStrokeWidth: number;
  setDefaultStrokeWidth: (width: number) => void;
  defaultStrokeDash: StrokeDashType;
  setDefaultStrokeDash: (dash: StrokeDashType) => void;
  defaultLineStyle: LineStyle;
  setDefaultLineStyle: (style: LineStyle) => void;
  defaultArrowHead: ArrowHeadType;
  setDefaultArrowHead: (arrow: ArrowHeadType) => void;

  defaultFontFamily: string;
  setDefaultFontFamily: (font: string) => void;
  defaultFontSize: number;
  setDefaultFontSize: (size: number) => void;
  defaultTextColor: string;
  setDefaultTextColor: (color: string) => void;

  // View Port
  zoom: number;
  setZoom: (zoom: number) => void;
  panOffset: { x: number; y: number };
  setPanOffset: (offset: { x: number; y: number }) => void;

  // Clipboard
  clipboard: { shapes: IShape[]; connections: IConnection[] } | null;
  copySelection: () => void;
  pasteSelection: () => void;

  // Operations
  addShape: (type: ShapeType, x: number, y: number) => void;
  updateShape: (id: string, updates: Partial<IShape>) => void;
  deleteSelected: () => void;
  addConnection: (fromId: string, fromPort: any, toId: string, toPort: any) => void;
  updateConnection: (id: string, updates: Partial<IConnection>) => void;
  setSelectedShapeId: (id: string | null) => void;
  setSelectedConnectionId: (id: string | null) => void;
  clearCanvas: () => void;
  bringToFront: (id: string) => void;
  sendToBack: (id: string) => void;
  duplicateShape: (id: string) => void;
  
  // History
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;

  // API Persistence
  saveFlowchart: () => Promise<{ success: boolean; error?: string }>;
  loadFlowchart: (id: string) => Promise<void>;
  resetCanvasState: () => void;
}

const CanvasContext = createContext<CanvasContextType | undefined>(undefined);

const DEFAULT_SHAPES: IShape[] = [];
const DEFAULT_CONNECTIONS: IConnection[] = [];

export const CanvasProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [flowchartId, setFlowchartId] = useState<string | null>(null);
  const [flowchartName, setFlowchartName] = useState<string>('Untitled Flowchart');
  const [isSaved, setIsSaved] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Layout Items
  const [shapes, setShapes] = useState<IShape[]>(DEFAULT_SHAPES);
  const [connections, setConnections] = useState<IConnection[]>(DEFAULT_CONNECTIONS);
  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null);
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);
  
  // Default drawing properties
  const [toolMode, setToolMode] = useState<'select' | ShapeType | 'connector'>('select');
  const [defaultFill, setDefaultFill] = useState<string>('#ffffff');
  const [defaultStroke, setDefaultStroke] = useState<string>('#475569');
  const [defaultStrokeWidth, setDefaultStrokeWidth] = useState<number>(2);
  const [defaultStrokeDash, setDefaultStrokeDash] = useState<StrokeDashType>('solid');
  
  const [defaultLineStyle, setDefaultLineStyle] = useState<LineStyle>('orthogonal');
  const [defaultArrowHead, setDefaultArrowHead] = useState<ArrowHeadType>('single');

  const [defaultFontFamily, setDefaultFontFamily] = useState<string>('Inter');
  const [defaultFontSize, setDefaultFontSize] = useState<number>(14);
  const [defaultTextColor, setDefaultTextColor] = useState<string>('#0f172a');

  // Zoom & Pan
  const [zoom, setZoom] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // History buffers
  const [history, setHistory] = useState<CanvasHistoryState[]>([{ shapes: [], connections: [] }]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);

  // Clipboard
  const [clipboard, setClipboard] = useState<{ shapes: IShape[]; connections: IConnection[] } | null>(null);

  // Helper to push to history
  const pushToHistory = useCallback((newShapes: IShape[], newConnections: IConnection[]) => {
    const updatedHistory = history.slice(0, historyIndex + 1);
    updatedHistory.push({
      shapes: JSON.parse(JSON.stringify(newShapes)),
      connections: JSON.parse(JSON.stringify(newConnections))
    });
    // Keep max 50 states in history
    if (updatedHistory.length > 50) {
      updatedHistory.shift();
    }
    setHistory(updatedHistory);
    setHistoryIndex(updatedHistory.length - 1);
    setIsSaved(false);
  }, [history, historyIndex]);

  const undo = () => {
    if (historyIndex > 0) {
      const targetIndex = historyIndex - 1;
      const state = history[targetIndex];
      setShapes(JSON.parse(JSON.stringify(state.shapes)));
      setConnections(JSON.parse(JSON.stringify(state.connections)));
      setHistoryIndex(targetIndex);
      setSelectedShapeId(null);
      setSelectedConnectionId(null);
      setIsSaved(false);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const targetIndex = historyIndex + 1;
      const state = history[targetIndex];
      setShapes(JSON.parse(JSON.stringify(state.shapes)));
      setConnections(JSON.parse(JSON.stringify(state.connections)));
      setHistoryIndex(targetIndex);
      setSelectedShapeId(null);
      setSelectedConnectionId(null);
      setIsSaved(false);
    }
  };

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  // Resets canvas to blank new drawing state
  const resetCanvasState = useCallback(() => {
    setFlowchartId(null);
    setFlowchartName('Untitled Flowchart');
    setShapes([]);
    setConnections([]);
    setSelectedShapeId(null);
    setSelectedConnectionId(null);
    setZoom(1);
    setPanOffset({ x: 0, y: 0 });
    setHistory([{ shapes: [], connections: [] }]);
    setHistoryIndex(0);
    setIsSaved(true);
    setToolMode('select');
  }, []);

  // CRUD commands
  const addShape = (type: ShapeType, x: number, y: number) => {
    const w = type === 'circle' ? 90 : type === 'diamond' ? 100 : type === 'parallelogram' ? 130 : 120;
    const h = type === 'circle' ? 90 : type === 'diamond' ? 100 : 70;
    const newShape: IShape = {
      id: 'shape_' + Math.random().toString(36).substring(2, 9),
      type,
      x: x - w / 2,
      y: y - h / 2,
      width: w,
      height: h,
      fill: defaultFill,
      stroke: defaultStroke,
      strokeWidth: defaultStrokeWidth,
      strokeDash: defaultStrokeDash,
      text: type === 'text-box' ? 'Double click to edit text' : 'Text',
      fontFamily: defaultFontFamily,
      fontSize: defaultFontSize,
      fontBold: false,
      fontItalic: false,
      fontUnderline: false,
      textColor: defaultTextColor,
      textAlign: 'center'
    };

    const newShapes = [...shapes, newShape];
    setShapes(newShapes);
    setSelectedShapeId(newShape.id);
    setSelectedConnectionId(null);
    pushToHistory(newShapes, connections);
  };

  const updateShape = (id: string, updates: Partial<IShape>) => {
    const newShapes = shapes.map(s => (s.id === id ? { ...s, ...updates } : s));
    setShapes(newShapes);
    pushToHistory(newShapes, connections);
  };

  const deleteSelected = () => {
    if (selectedShapeId) {
      const newShapes = shapes.filter(s => s.id !== selectedShapeId);
      // Automatically clean up dangling connections attached to this shape
      const newConnections = connections.filter(
        c => c.fromId !== selectedShapeId && c.toId !== selectedShapeId
      );
      setShapes(newShapes);
      setConnections(newConnections);
      setSelectedShapeId(null);
      pushToHistory(newShapes, newConnections);
    } else if (selectedConnectionId) {
      const newConnections = connections.filter(c => c.id !== selectedConnectionId);
      setConnections(newConnections);
      setSelectedConnectionId(null);
      pushToHistory(shapes, newConnections);
    }
  };

  const addConnection = (fromId: string, fromPort: any, toId: string, toPort: any) => {
    // Avoid connecting a shape to itself
    if (fromId === toId) return;

    // Check if the exact connection already exists
    const duplicate = connections.find(
      c => c.fromId === fromId && c.fromPort === fromPort && c.toId === toId && c.toPort === toPort
    );
    if (duplicate) return;

    const newConnection: IConnection = {
      id: 'conn_' + Math.random().toString(36).substring(2, 9),
      fromId,
      fromPort,
      toId,
      toPort,
      lineStyle: defaultLineStyle,
      stroke: defaultStroke,
      strokeWidth: defaultStrokeWidth,
      strokeDash: defaultStrokeDash,
      arrowHead: defaultArrowHead
    };

    const newConnections = [...connections, newConnection];
    setConnections(newConnections);
    setSelectedConnectionId(newConnection.id);
    setSelectedShapeId(null);
    pushToHistory(shapes, newConnections);
  };

  const updateConnection = (id: string, updates: Partial<IConnection>) => {
    const newConnections = connections.map(c => (c.id === id ? { ...c, ...updates } : c));
    setConnections(newConnections);
    pushToHistory(shapes, newConnections);
  };

  const clearCanvas = () => {
    if (window.confirm('Are you sure you want to clear the canvas?')) {
      setShapes([]);
      setConnections([]);
      setSelectedShapeId(null);
      setSelectedConnectionId(null);
      pushToHistory([], []);
    }
  };

  const bringToFront = (id: string) => {
    const selected = shapes.find(s => s.id === id);
    if (!selected) return;
    const newShapes = [...shapes.filter(s => s.id !== id), selected];
    setShapes(newShapes);
    pushToHistory(newShapes, connections);
  };

  const sendToBack = (id: string) => {
    const selected = shapes.find(s => s.id === id);
    if (!selected) return;
    const newShapes = [selected, ...shapes.filter(s => s.id !== id)];
    setShapes(newShapes);
    pushToHistory(newShapes, connections);
  };

  const duplicateShape = (id: string) => {
    const selected = shapes.find(s => s.id === id);
    if (!selected) return;
    const duplicate: IShape = {
      ...JSON.parse(JSON.stringify(selected)),
      id: 'shape_' + Math.random().toString(36).substring(2, 9),
      x: selected.x + 30,
      y: selected.y + 30
    };
    const newShapes = [...shapes, duplicate];
    setShapes(newShapes);
    setSelectedShapeId(duplicate.id);
    setSelectedConnectionId(null);
    pushToHistory(newShapes, connections);
  };

  // Clipboard functions
  const copySelection = () => {
    if (!selectedShapeId) return;
    const selectedShape = shapes.find(s => s.id === selectedShapeId);
    if (!selectedShape) return;

    // Grab the shape, and any connections where BOTH from and to are this shape (not possible since fromId !== toId)
    // So just copy the shape itself.
    setClipboard({
      shapes: [JSON.parse(JSON.stringify(selectedShape))],
      connections: []
    });
  };

  const pasteSelection = () => {
    if (!clipboard || clipboard.shapes.length === 0) return;

    const shapeToPaste = JSON.parse(JSON.stringify(clipboard.shapes[0])) as IShape;
    // Generate new unique ID
    const newId = 'shape_' + Math.random().toString(36).substring(2, 9);
    shapeToPaste.id = newId;
    // Offset position so it doesn't paste exactly on top
    shapeToPaste.x += 30;
    shapeToPaste.y += 30;

    const newShapes = [...shapes, shapeToPaste];
    setShapes(newShapes);
    setSelectedShapeId(newId);
    setSelectedConnectionId(null);
    pushToHistory(newShapes, connections);
  };

  // API integrations
  const saveFlowchart = async () => {
    const payload = {
      name: flowchartName,
      data: {
        shapes,
        connections,
        zoom,
        panOffset
      }
    };

    try {
      let res;
      if (flowchartId) {
        // PUT update
        res = await fetch(`/api/flowcharts/${flowchartId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });
      } else {
        // POST create
        res = await fetch('/api/flowcharts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });
      }

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.message || 'Failed to save diagram' };
      }

      setFlowchartId(data.id || data._id);
      setIsSaved(true);
      return { success: true };
    } catch (e) {
      console.error(e);
      return { success: false, error: 'Database connection failed. Saving locally is not available.' };
    }
  };

  const loadFlowchart = async (id: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/flowcharts/${id}`);
      const data = await res.json();
      if (res.ok && data) {
        setFlowchartId(data.id || data._id);
        setFlowchartName(data.name || 'Untitled Flowchart');
        
        const canvasData = data.data || {};
        const loadedShapes = canvasData.shapes || [];
        const loadedConnections = canvasData.connections || [];
        
        setShapes(loadedShapes);
        setConnections(loadedConnections);
        setZoom(canvasData.zoom || 1);
        setPanOffset(canvasData.panOffset || { x: 0, y: 0 });
        
        // Seed history with loaded state
        setHistory([{ shapes: loadedShapes, connections: loadedConnections }]);
        setHistoryIndex(0);
        
        setSelectedShapeId(null);
        setSelectedConnectionId(null);
        setIsSaved(true);
      }
    } catch (err) {
      console.error('Failed to load flowchart:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Autosave when changes occur (shapes, connections, flowchartName change)
  useEffect(() => {
    if (isSaved) return;

    // Don't auto-save if loading, or if canvas is completely empty and doesn't have an ID yet
    if (isLoading || (shapes.length === 0 && connections.length === 0 && !flowchartId)) {
      return;
    }

    const timer = setTimeout(async () => {
      await saveFlowchart();
    }, 1500);

    return () => clearTimeout(timer);
  }, [shapes, connections, flowchartName, isSaved, isLoading, flowchartId]);

  return (
    <CanvasContext.Provider
      value={{
        flowchartId,
        flowchartName,
        setFlowchartName,
        isSaved,
        setIsSaved,
        isLoading,
        shapes,
        connections,
        selectedShapeId,
        selectedConnectionId,
        toolMode,
        setToolMode,
        defaultFill,
        setDefaultFill,
        defaultStroke,
        setDefaultStroke,
        defaultStrokeWidth,
        setDefaultStrokeWidth,
        defaultStrokeDash,
        setDefaultStrokeDash,
        defaultLineStyle,
        setDefaultLineStyle,
        defaultArrowHead,
        setDefaultArrowHead,
        defaultFontFamily,
        setDefaultFontFamily,
        defaultFontSize,
        setDefaultFontSize,
        defaultTextColor,
        setDefaultTextColor,
        zoom,
        setZoom,
        panOffset,
        setPanOffset,
        clipboard,
        copySelection,
        pasteSelection,
        addShape,
        updateShape,
        deleteSelected,
        addConnection,
        updateConnection,
        setSelectedShapeId,
        setSelectedConnectionId,
        clearCanvas,
        bringToFront,
        sendToBack,
        duplicateShape,
        undo,
        redo,
        canUndo,
        canRedo,
        saveFlowchart,
        loadFlowchart,
        resetCanvasState
      }}
    >
      {children}
    </CanvasContext.Provider>
  );
};

export const useCanvas = () => {
  const context = useContext(CanvasContext);
  if (context === undefined) {
    throw new Error('useCanvas must be used within a CanvasProvider');
  }
  return context;
};
