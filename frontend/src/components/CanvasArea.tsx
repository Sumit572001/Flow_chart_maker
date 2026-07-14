import React, { useRef, useState, useEffect } from 'react';
import { useCanvas, IShape, IConnection, ShapeType, StrokeDashType } from '../context/CanvasContext';
import ContextMenu from './ContextMenu';

interface CanvasAreaProps {
  svgRef: React.RefObject<SVGSVGElement>;
}

interface DragInfo {
  shapeId: string;
  startX: number;
  startY: number;
  initialX: number;
  initialY: number;
}

interface ResizeInfo {
  shapeId: string;
  handle: 'tl' | 'tr' | 'bl' | 'br';
  startX: number;
  startY: number;
  initialX: number;
  initialY: number;
  initialW: number;
  initialH: number;
}

interface ConnectionDragInfo {
  fromId: string;
  fromPort: 'top' | 'right' | 'bottom' | 'left';
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

const CanvasArea: React.FC<CanvasAreaProps> = ({ svgRef }) => {
  const {
    shapes, connections, selectedShapeId, selectedConnectionId,
    setSelectedShapeId, setSelectedConnectionId, toolMode, setToolMode,
    addShape, updateShape, deleteSelected, addConnection, updateConnection,
    zoom, panOffset, setPanOffset, copySelection, pasteSelection, undo, redo
  } = useCanvas();

  const containerRef = useRef<HTMLDivElement>(null);

  // Interaction States
  const [dragInfo, setDragInfo] = useState<DragInfo | null>(null);
  const [resizeInfo, setResizeInfo] = useState<ResizeInfo | null>(null);
  const [connDragInfo, setConnDragInfo] = useState<ConnectionDragInfo | null>(null);
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [hoveredShapeId, setHoveredShapeId] = useState<string | null>(null);
  const [editingTextShapeId, setEditingTextShapeId] = useState<string | null>(null);
  const [editingConnLabelId, setEditingConnLabelId] = useState<string | null>(null);

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    targetId: string | null;
    targetType: 'shape' | 'connection' | 'canvas';
  }>({ visible: false, x: 0, y: 0, targetId: null, targetType: 'canvas' });

  // Convert client page coords to canvas coordinate space (takes pan & zoom into account)
  const getCanvasCoords = (clientX: number, clientY: number) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const rect = svgRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    return {
      x: (x - panOffset.x) / zoom,
      y: (y - panOffset.y) / zoom
    };
  };

  // Keyboard Shortcuts handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing in a text field
      if (document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        document.activeElement?.getAttribute('contenteditable') === 'true') {
        return;
      }

      const isCtrl = e.ctrlKey || e.metaKey;

      if (isCtrl && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        undo();
      } else if (isCtrl && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      } else if (isCtrl && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        copySelection();
      } else if (isCtrl && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        pasteSelection();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        deleteSelected();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, copySelection, pasteSelection, deleteSelected]);

  // Dasharray mapping
  const getStrokeDashArray = (style: StrokeDashType, strokeWidth: number) => {
    switch (style) {
      case 'dashed': return `${strokeWidth * 4}, ${strokeWidth * 3}`;
      case 'dotted': return `${strokeWidth}, ${strokeWidth * 2}`;
      case 'solid':
      default: return 'none';
    }
  };

  // Snapping connection port locations for a shape
  const getPorts = (shape: IShape) => {
    if (shape.type === 'parallelogram') {
      return {
        top: { x: shape.x + shape.width / 2 + 10, y: shape.y, dir: 'top' },
        right: { x: shape.x + shape.width - 10, y: shape.y + shape.height / 2, dir: 'right' },
        bottom: { x: shape.x + shape.width / 2 - 10, y: shape.y + shape.height, dir: 'bottom' },
        left: { x: shape.x + 10, y: shape.y + shape.height / 2, dir: 'left' }
      };
    }
    return {
      top: { x: shape.x + shape.width / 2, y: shape.y, dir: 'top' },
      right: { x: shape.x + shape.width, y: shape.y + shape.height / 2, dir: 'right' },
      bottom: { x: shape.x + shape.width / 2, y: shape.y + shape.height, dir: 'bottom' },
      left: { x: shape.x, y: shape.y + shape.height / 2, dir: 'left' }
    };
  };

  // Compute routed path string for connections
  const getPathString = (conn: IConnection) => {
    const fromShape = shapes.find(s => s.id === conn.fromId);
    const toShape = shapes.find(s => s.id === conn.toId);
    if (!fromShape || !toShape) return '';

    const p1 = getPorts(fromShape)[conn.fromPort];
    const p2 = getPorts(toShape)[conn.toPort];

    const { x: x1, y: y1 } = p1;
    const { x: x2, y: y2 } = p2;

    if (conn.lineStyle === 'straight') {
      return `M ${x1} ${y1} L ${x2} ${y2}`;
    }

    if (conn.lineStyle === 'curved') {
      // Bezier curve using control points based on port directions
      let cp1x = x1;
      let cp1y = y1;
      let cp2x = x2;
      let cp2y = y2;
      const offset = Math.max(Math.abs(x2 - x1) / 2, 40);

      if (conn.fromPort === 'right') cp1x += offset;
      else if (conn.fromPort === 'left') cp1x -= offset;
      else if (conn.fromPort === 'bottom') cp1y += offset;
      else if (conn.fromPort === 'top') cp1y -= offset;

      if (conn.toPort === 'right') cp2x += offset;
      else if (conn.toPort === 'left') cp2x -= offset;
      else if (conn.toPort === 'bottom') cp2y += offset;
      else if (conn.toPort === 'top') cp2y -= offset;

      return `M ${x1} ${y1} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x2} ${y2}`;
    }

    // Orthogonal Routing algorithm
    if (conn.lineStyle === 'orthogonal') {
      const mx = (x1 + x2) / 2;
      const my = (y1 + y2) / 2;

      // Handle specific layout conditions based on port directions
      if ((conn.fromPort === 'left' || conn.fromPort === 'right') &&
        (conn.toPort === 'left' || conn.toPort === 'right')) {
        return `M ${x1} ${y1} H ${mx} V ${y2} H ${x2}`;
      }

      if ((conn.fromPort === 'top' || conn.fromPort === 'bottom') &&
        (conn.toPort === 'top' || conn.toPort === 'bottom')) {
        return `M ${x1} ${y1} V ${my} H ${x2} V ${y2}`;
      }

      if ((conn.fromPort === 'left' || conn.fromPort === 'right') &&
        (conn.toPort === 'top' || conn.toPort === 'bottom')) {
        return `M ${x1} ${y1} H ${x2} V ${y2}`;
      }

      if ((conn.fromPort === 'top' || conn.fromPort === 'bottom') &&
        (conn.toPort === 'left' || conn.toPort === 'right')) {
        return `M ${x1} ${y1} V ${y2} H ${x2}`;
      }
    }

    return `M ${x1} ${y1} L ${x2} ${y2}`;
  };

  // Get midpoint coordinates for line labels
  const getMidpoint = (conn: IConnection) => {
    const fromShape = shapes.find(s => s.id === conn.fromId);
    const toShape = shapes.find(s => s.id === conn.toId);
    if (!fromShape || !toShape) return { x: 0, y: 0 };

    const p1 = getPorts(fromShape)[conn.fromPort];
    const p2 = getPorts(toShape)[conn.toPort];

    // Average coordinates
    return {
      x: (p1.x + p2.x) / 2,
      y: (p1.y + p2.y) / 2
    };
  };

  // Mouse Down Event Handler
  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    setContextMenu({ ...contextMenu, visible: false });

    // Handle right-click context menu open
    if (e.button === 2) {
      e.preventDefault();
      const coords = getCanvasCoords(e.clientX, e.clientY);
      // Find if we right clicked a shape
      const shapeUnderMouse = [...shapes].reverse().find(
        s => coords.x >= s.x && coords.x <= s.x + s.width &&
          coords.y >= s.y && coords.y <= s.y + s.height
      );

      if (shapeUnderMouse) {
        setSelectedShapeId(shapeUnderMouse.id);
        setSelectedConnectionId(null);
        setContextMenu({
          visible: true,
          x: e.clientX,
          y: e.clientY,
          targetId: shapeUnderMouse.id,
          targetType: 'shape'
        });
      } else {
        setSelectedShapeId(null);
        setSelectedConnectionId(null);
        setContextMenu({
          visible: true,
          x: e.clientX,
          y: e.clientY,
          targetId: null,
          targetType: 'canvas'
        });
      }
      return;
    }

    // Single click on Canvas background (left click)
    if (e.target === svgRef.current || e.target instanceof SVGPathElement && e.target.classList.contains('bg-interactive')) {
      setSelectedShapeId(null);
      setSelectedConnectionId(null);

      // Create shape mode
      if (toolMode !== 'select' && toolMode !== 'connector') {
        const coords = getCanvasCoords(e.clientX, e.clientY);
        addShape(toolMode as ShapeType, coords.x, coords.y);
        setToolMode('select'); // Automatically revert back to select pointer
        return;
      }

      // Start Panning
      setIsPanning(true);
      setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
    }
  };

  // Mouse Move Event Handler
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const coords = getCanvasCoords(e.clientX, e.clientY);

    // 1. Panning Canvas
    if (isPanning) {
      setPanOffset({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      });
      return;
    }

    // 2. Dragging Shape
    if (dragInfo) {
      const deltaX = coords.x - dragInfo.startX;
      const deltaY = coords.y - dragInfo.startY;
      // Grid snapping (10px grid snap)
      const grid = 10;
      const nextX = Math.round((dragInfo.initialX + deltaX) / grid) * grid;
      const nextY = Math.round((dragInfo.initialY + deltaY) / grid) * grid;

      updateShape(dragInfo.shapeId, { x: nextX, y: nextY });
      return;
    }

    // 3. Resizing Shape
    if (resizeInfo) {
      const deltaX = coords.x - resizeInfo.startX;
      const deltaY = coords.y - resizeInfo.startY;
      const minSize = 30;

      const { handle, initialX, initialY, initialW, initialH, shapeId } = resizeInfo;
      let x = initialX;
      let y = initialY;
      let w = initialW;
      let h = initialH;

      if (handle === 'br') {
        w = Math.max(initialW + deltaX, minSize);
        h = Math.max(initialH + deltaY, minSize);
      } else if (handle === 'bl') {
        const nextW = initialW - deltaX;
        if (nextW > minSize) {
          x = initialX + deltaX;
          w = nextW;
        }
        h = Math.max(initialH + deltaY, minSize);
      } else if (handle === 'tr') {
        w = Math.max(initialW + deltaX, minSize);
        const nextH = initialH - deltaY;
        if (nextH > minSize) {
          y = initialY + deltaY;
          h = nextH;
        }
      } else if (handle === 'tl') {
        const nextW = initialW - deltaX;
        const nextH = initialH - deltaY;
        if (nextW > minSize) {
          x = initialX + deltaX;
          w = nextW;
        }
        if (nextH > minSize) {
          y = initialY + deltaY;
          h = nextH;
        }
      }

      updateShape(shapeId, { x, y, width: w, height: h });
      return;
    }

    // 4. Dragging Arrow connection line
    if (connDragInfo) {
      setConnDragInfo({
        ...connDragInfo,
        currentX: coords.x,
        currentY: coords.y
      });
      return;
    }
  };

  // Mouse Up Event Handler
  const handleMouseUp = () => {
    setIsPanning(false);
    setDragInfo(null);
    setResizeInfo(null);
    setConnDragInfo(null);
  };

  // Shape drag setup
  const startDrag = (e: React.MouseEvent, shapeId: string) => {
    e.stopPropagation();
    if (toolMode !== 'select') return;
    setSelectedShapeId(shapeId);
    setSelectedConnectionId(null);

    const shape = shapes.find(s => s.id === shapeId);
    if (!shape) return;

    const coords = getCanvasCoords(e.clientX, e.clientY);
    setDragInfo({
      shapeId,
      startX: coords.x,
      startY: coords.y,
      initialX: shape.x,
      initialY: shape.y
    });
  };

  // Resize anchor handle drag setup
  const startResize = (e: React.MouseEvent, shapeId: string, handle: 'tl' | 'tr' | 'bl' | 'br') => {
    e.stopPropagation();
    e.preventDefault();
    const shape = shapes.find(s => s.id === shapeId);
    if (!shape) return;

    const coords = getCanvasCoords(e.clientX, e.clientY);
    setResizeInfo({
      shapeId,
      handle,
      startX: coords.x,
      startY: coords.y,
      initialX: shape.x,
      initialY: shape.y,
      initialW: shape.width,
      initialH: shape.height
    });
  };

  // Connector port drag setup
  const startConnectionDrag = (e: React.MouseEvent, shapeId: string, port: 'top' | 'right' | 'bottom' | 'left') => {
    e.stopPropagation();
    e.preventDefault();
    const shape = shapes.find(s => s.id === shapeId);
    if (!shape) return;

    const portPos = getPorts(shape)[port];
    setConnDragInfo({
      fromId: shapeId,
      fromPort: port,
      startX: portPos.x,
      startY: portPos.y,
      currentX: portPos.x,
      currentY: portPos.y
    });
  };

  // Drop port mouseUp Snap connection
  const handlePortMouseUp = (e: React.MouseEvent, toId: string, toPort: 'top' | 'right' | 'bottom' | 'left') => {
    e.stopPropagation();
    if (connDragInfo && connDragInfo.fromId !== toId) {
      addConnection(connDragInfo.fromId, connDragInfo.fromPort, toId, toPort);
    }
  };

  // Shape double click edit text text box
  const handleShapeDoubleClick = (e: React.MouseEvent, shapeId: string) => {
    e.stopPropagation();
    setEditingTextShapeId(shapeId);
  };

  // Save shape text
  const handleTextBlur = (shapeId: string, text: string) => {
    updateShape(shapeId, { text });
    setEditingTextShapeId(null);
  };

  // Connection Double-click (Label Input)
  const handleConnDoubleClick = (e: React.MouseEvent, connId: string) => {
    e.stopPropagation();
    setEditingConnLabelId(connId);
  };

  // Save connection label
  const handleConnLabelBlur = (connId: string, label: string) => {
    updateConnection(connId, { label });
    setEditingConnLabelId(null);
  };

  // Drag over empty space to pan indicator style
  const cursorStyle = toolMode === 'select'
    ? (isPanning ? 'grabbing' : 'grab')
    : 'crosshair';

  return (
    <div
      ref={containerRef}
      className="canvas-grid"
      style={{
        flex: 1,
        position: 'relative',
        overflow: 'hidden',
        cursor: dragInfo || resizeInfo ? 'move' : cursorStyle,
        outline: 'none',
        height: '100%'
      }}
    >
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onContextMenu={(e) => e.preventDefault()}
      >
        {/* Define arrowhead markers */}
        <defs>
          <marker
            id="arrow-end"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="var(--text-secondary)" />
          </marker>
          <marker
            id="arrow-start"
            markerWidth="10"
            markerHeight="7"
            refX="1"
            refY="3.5"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <polygon points="10 0, 0 3.5, 10 7" fill="var(--text-secondary)" />
          </marker>

          {/* Active selection blue arrowheads */}
          <marker
            id="arrow-end-selected"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="var(--accent-primary)" />
          </marker>
        </defs>

        <g transform={`translate(${panOffset.x}, ${panOffset.y}) scale(${zoom})`}>
          {/* Render Connections */}
          {connections.map((conn) => {
            const isSelected = selectedConnectionId === conn.id;
            const pathStr = getPathString(conn);
            const mid = getMidpoint(conn);

            return (
              <g key={conn.id} onDoubleClick={(e) => handleConnDoubleClick(e, conn.id)}>
                {/* Thick invisible path background to make clicking connection lines easier */}
                <path
                  d={pathStr}
                  fill="none"
                  stroke="transparent"
                  strokeWidth={15}
                  className="bg-interactive"
                  style={{ cursor: 'pointer' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedConnectionId(conn.id);
                    setSelectedShapeId(null);
                  }}
                />

                {/* Visible Path line */}
                <path
                  d={pathStr}
                  fill="none"
                  stroke={isSelected ? 'var(--accent-primary)' : conn.stroke}
                  strokeWidth={isSelected ? conn.strokeWidth + 1 : conn.strokeWidth}
                  strokeDasharray={getStrokeDashArray(conn.strokeDash, conn.strokeWidth)}
                  markerEnd={conn.arrowHead === 'single' || conn.arrowHead === 'double'
                    ? `url(#${isSelected ? 'arrow-end-selected' : 'arrow-end'})`
                    : undefined}
                  markerStart={conn.arrowHead === 'double'
                    ? `url(#${isSelected ? 'arrow-end-selected' : 'arrow-start'})`
                    : undefined}
                  style={{ transition: 'stroke-width 0.1s' }}
                />

                {/* Connection label */}
                {conn.label && editingConnLabelId !== conn.id && (
                  <g transform={`translate(${mid.x}, ${mid.y})`}>
                    <rect
                      x={-25}
                      y={-10}
                      width={50}
                      height={20}
                      fill="var(--bg-secondary)"
                      rx={3}
                      stroke="var(--border-light)"
                      strokeWidth={1}
                    />
                    <text
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize={11}
                      fill="var(--text-secondary)"
                      fontWeight={500}
                    >
                      {conn.label}
                    </text>
                  </g>
                )}

                {/* Inline Editing for line label */}
                {editingConnLabelId === conn.id && (
                  <foreignObject
                    x={mid.x - 50}
                    y={mid.y - 15}
                    width={100}
                    height={30}
                  >
                    <input
                      type="text"
                      defaultValue={conn.label || ''}
                      onBlur={(e) => handleConnLabelBlur(conn.id, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleConnLabelBlur(conn.id, e.currentTarget.value);
                      }}
                      autoFocus
                      style={{
                        width: '100%',
                        height: '100%',
                        fontSize: '11px',
                        padding: '2px',
                        textAlign: 'center',
                        border: '1px solid var(--accent-primary)'
                      }}
                    />
                  </foreignObject>
                )}
              </g>
            );
          })}

          {/* Render Active connection line being dragged */}
          {connDragInfo && (
            <line
              x1={connDragInfo.startX}
              y1={connDragInfo.startY}
              x2={connDragInfo.currentX}
              y2={connDragInfo.currentY}
              stroke="var(--accent-primary)"
              strokeWidth={2}
              strokeDasharray="4, 4"
              markerEnd="url(#arrow-end-selected)"
            />
          )}

          {/* Render Shapes */}
          {shapes.map((shape) => {
            const isSelected = selectedShapeId === shape.id;
            const isHovered = hoveredShapeId === shape.id;
            const rx = shape.type === 'rounded-rect' ? 10 : 0;
            const ports = getPorts(shape);

            return (
              <g
                key={shape.id}
                onMouseEnter={() => setHoveredShapeId(shape.id)}
                onMouseLeave={() => setHoveredShapeId(null)}
                onDoubleClick={(e) => handleShapeDoubleClick(e, shape.id)}
              >
                {/* 1. Rectangle & Rounded Rectangle */}
                {(shape.type === 'rectangle' || shape.type === 'rounded-rect') && (
                  <rect
                    x={shape.x}
                    y={shape.y}
                    width={shape.width}
                    height={shape.height}
                    rx={rx}
                    ry={rx}
                    fill={shape.fill}
                    stroke={isSelected ? 'var(--accent-primary)' : shape.stroke}
                    strokeWidth={isSelected ? shape.strokeWidth + 1 : shape.strokeWidth}
                    strokeDasharray={getStrokeDashArray(shape.strokeDash, shape.strokeWidth)}
                    style={{ cursor: toolMode === 'select' ? 'move' : 'crosshair' }}
                    onMouseDown={(e) => startDrag(e, shape.id)}
                  />
                )}

                {/* 2. Circle / Ellipse */}
                {shape.type === 'circle' && (
                  <ellipse
                    cx={shape.x + shape.width / 2}
                    cy={shape.y + shape.height / 2}
                    rx={shape.width / 2}
                    ry={shape.height / 2}
                    fill={shape.fill}
                    stroke={isSelected ? 'var(--accent-primary)' : shape.stroke}
                    strokeWidth={isSelected ? shape.strokeWidth + 1 : shape.strokeWidth}
                    strokeDasharray={getStrokeDashArray(shape.strokeDash, shape.strokeWidth)}
                    style={{ cursor: toolMode === 'select' ? 'move' : 'crosshair' }}
                    onMouseDown={(e) => startDrag(e, shape.id)}
                  />
                )}

                {/* 3. Diamond */}
                {shape.type === 'diamond' && (
                  <polygon
                    points={`${shape.x + shape.width / 2},${shape.y} ${shape.x + shape.width},${shape.y + shape.height / 2} ${shape.x + shape.width / 2},${shape.y + shape.height} ${shape.x},${shape.y + shape.height / 2}`}
                    fill={shape.fill}
                    stroke={isSelected ? 'var(--accent-primary)' : shape.stroke}
                    strokeWidth={isSelected ? shape.strokeWidth + 1 : shape.strokeWidth}
                    strokeDasharray={getStrokeDashArray(shape.strokeDash, shape.strokeWidth)}
                    style={{ cursor: toolMode === 'select' ? 'move' : 'crosshair' }}
                    onMouseDown={(e) => startDrag(e, shape.id)}
                  />
                )}

                {/* 3.5. Parallelogram (Input/Output Symbol) */}
                {shape.type === 'parallelogram' && (
                  <polygon
                    points={`${shape.x + 20},${shape.y} ${shape.x + shape.width},${shape.y} ${shape.x + shape.width - 20},${shape.y + shape.height} ${shape.x},${shape.y + shape.height}`}
                    fill={shape.fill}
                    stroke={isSelected ? 'var(--accent-primary)' : shape.stroke}
                    strokeWidth={isSelected ? shape.strokeWidth + 1 : shape.strokeWidth}
                    strokeDasharray={getStrokeDashArray(shape.strokeDash, shape.strokeWidth)}
                    style={{ cursor: toolMode === 'select' ? 'move' : 'crosshair' }}
                    onMouseDown={(e) => startDrag(e, shape.id)}
                  />
                )}

                {/* 4. Text-Box (Dotted outline when selected, borderless fill otherwise) */}
                {shape.type === 'text-box' && (
                  <rect
                    x={shape.x}
                    y={shape.y}
                    width={shape.width}
                    height={shape.height}
                    fill="transparent"
                    stroke={isSelected ? 'var(--accent-primary)' : (isHovered ? 'var(--border-light)' : 'transparent')}
                    strokeWidth={1}
                    strokeDasharray="4, 4"
                    style={{ cursor: toolMode === 'select' ? 'move' : 'crosshair' }}
                    onMouseDown={(e) => startDrag(e, shape.id)}
                  />
                )}

                {/* Bounding box outline for selection indicator */}
                {isSelected && shape.type !== 'text-box' && (
                  <rect
                    x={shape.x - 4}
                    y={shape.y - 4}
                    width={shape.width + 8}
                    height={shape.height + 8}
                    className="selected-shape-outline"
                  />
                )}

                {/* Render Shape Text */}
                {editingTextShapeId !== shape.id ? (
                  <foreignObject
                    x={shape.type === 'parallelogram' ? shape.x + 20 : shape.x + 8}
                    y={shape.y + 8}
                    width={shape.type === 'parallelogram' ? shape.width - 40 : shape.width - 16}
                    height={shape.height - 16}
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: shape.textAlign === 'center' ? 'center' :
                          shape.textAlign === 'right' ? 'flex-end' : 'flex-start',
                        width: '100%',
                        height: '100%',
                        textAlign: shape.textAlign,
                        fontFamily: shape.fontFamily,
                        fontSize: `${shape.fontSize}px`,
                        fontWeight: shape.fontBold ? 'bold' : 'normal',
                        fontStyle: shape.fontItalic ? 'italic' : 'normal',
                        textDecoration: shape.fontUnderline ? 'underline' : 'none',
                        color: shape.textColor,
                        wordBreak: 'break-word',
                        overflow: 'hidden',
                        whiteSpace: 'pre-wrap'
                      }}
                    >
                      {shape.text}
                    </div>
                  </foreignObject>
                ) : (
                  // Inline Text Area Editor on Double Click
                  <foreignObject
                    x={shape.type === 'parallelogram' ? shape.x + 16 : shape.x + 4}
                    y={shape.y + 4}
                    width={shape.type === 'parallelogram' ? shape.width - 32 : shape.width - 8}
                    height={shape.height - 8}
                  >
                    <textarea
                      defaultValue={shape.text}
                      onBlur={(e) => handleTextBlur(shape.id, e.target.value)}
                      onKeyDown={(e) => {
                        // Enter saves text, Shift+Enter starts newline
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleTextBlur(shape.id, e.currentTarget.value);
                        }
                      }}
                      autoFocus
                      style={{
                        width: '100%',
                        height: '100%',
                        fontFamily: shape.fontFamily,
                        fontSize: `${shape.fontSize}px`,
                        fontWeight: shape.fontBold ? 'bold' : 'normal',
                        fontStyle: shape.fontItalic ? 'italic' : 'normal',
                        textDecoration: shape.fontUnderline ? 'underline' : 'none',
                        color: shape.textColor,
                        textAlign: shape.textAlign,
                        border: '1px solid var(--accent-primary)',
                        borderRadius: 'var(--radius-sm)',
                        resize: 'none',
                        background: 'white',
                        outline: 'none',
                        padding: '4px'
                      }}
                    />
                  </foreignObject>
                )}

                {/* Render Resize Handles (TL, TR, BL, BR) when shape is selected */}
                {isSelected && (
                  <g className="resize-handle-group">
                    <rect
                      x={shape.x - 6}
                      y={shape.y - 6}
                      width={8}
                      height={8}
                      fill="var(--accent-primary)"
                      style={{ cursor: 'nwse-resize' }}
                      onMouseDown={(e) => startResize(e, shape.id, 'tl')}
                    />
                    <rect
                      x={shape.x + shape.width - 2}
                      y={shape.y - 6}
                      width={8}
                      height={8}
                      fill="var(--accent-primary)"
                      style={{ cursor: 'nesw-resize' }}
                      onMouseDown={(e) => startResize(e, shape.id, 'tr')}
                    />
                    <rect
                      x={shape.x - 6}
                      y={shape.y + shape.height - 2}
                      width={8}
                      height={8}
                      fill="var(--accent-primary)"
                      style={{ cursor: 'nesw-resize' }}
                      onMouseDown={(e) => startResize(e, shape.id, 'bl')}
                    />
                    <rect
                      x={shape.x + shape.width - 2}
                      y={shape.y + shape.height - 2}
                      width={8}
                      height={8}
                      fill="var(--accent-primary)"
                      style={{ cursor: 'nwse-resize' }}
                      onMouseDown={(e) => startResize(e, shape.id, 'br')}
                    />
                  </g>
                )}

                {/* Render Snapping Port Anchors when hovered or connector mode is active */}
                {(isHovered || toolMode === 'connector') && !dragInfo && !resizeInfo && (
                  <g>
                    {Object.values(ports).map((port) => (
                      <circle
                        key={port.dir}
                        cx={port.x}
                        cy={port.y}
                        r={5}
                        className="snap-point"
                        onMouseDown={(e) => startConnectionDrag(e, shape.id, port.dir as any)}
                        onMouseUp={(e) => handlePortMouseUp(e, shape.id, port.dir as any)}
                      />
                    ))}
                  </g>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      {/* Render Right-Click Context Menu */}
      {contextMenu.visible && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          targetId={contextMenu.targetId}
          targetType={contextMenu.targetType}
          onClose={() => setContextMenu({ ...contextMenu, visible: false })}
        />
      )}
    </div>
  );
};

export default CanvasArea;
