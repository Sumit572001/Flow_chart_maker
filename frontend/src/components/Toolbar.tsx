import React, { useState } from 'react';
import { useCanvas, StrokeDashType, LineStyle, ArrowHeadType } from '../context/CanvasContext';
import {
  MousePointer, Square, Circle, HelpCircle, Type, Undo2, Redo2,
  ZoomIn, ZoomOut, Maximize, Save,
  Download, ArrowRight, Bold, Italic, Underline, AlignLeft,
  AlignCenter, AlignRight, FilePlus, LayoutDashboard
} from 'lucide-react';

interface ToolbarProps {
  onExportSVG: () => void;
  onExportPNG: () => void;
  onExportPDF: () => void;
  onBackToDashboard: () => void;
}

const COLOR_PALETTE = [
  '#ffffff', '#f8fafc', '#f1f5f9', '#cbd5e1', '#64748b', '#0f172a',
  '#ef4444', '#f97316', '#f59e0b', '#10b981', '#06b6d4', '#3b82f6',
  '#8b5cf6', '#d946ef', '#ec4899', '#fdf2f8', '#eff6ff', '#f0fdf4'
];

const FONTS = ['Inter', 'Outfit', 'Arial', 'Times New Roman', 'Courier New', 'Georgia'];
const FONT_SIZES = [12, 14, 16, 18, 20, 24, 28, 32];

const Toolbar: React.FC<ToolbarProps> = ({
  onExportPDF,
  onBackToDashboard
}) => {
  // Removed auth binding
  const {
    flowchartName, setFlowchartName, isSaved, saveFlowchart,
    toolMode, setToolMode,
    defaultFill, setDefaultFill,
    defaultStroke, setDefaultStroke,
    defaultStrokeWidth, setDefaultStrokeWidth,
    defaultStrokeDash, setDefaultStrokeDash,
    defaultLineStyle, setDefaultLineStyle,
    defaultArrowHead, setDefaultArrowHead,
    defaultFontFamily, setDefaultFontFamily,
    defaultFontSize, setDefaultFontSize,
    defaultTextColor, setDefaultTextColor,
    selectedShapeId, shapes, updateShape,
    undo, redo, canUndo, canRedo,
    zoom, setZoom, setPanOffset,
    resetCanvasState
  } = useCanvas();

  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [colorMode, setColorMode] = useState<'fill' | 'stroke' | 'text'>('fill');

  // Handle flowchart save
  const handleSave = async () => {
    setSaving(true);
    setSaveStatus('idle');
    const res = await saveFlowchart();
    setSaving(false);
    if (res.success) {
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } else {
      setSaveStatus('error');
      alert(res.error || 'Failed to save flowchart');
    }
  };

  // Check if there is an active shape selected to apply styles in real-time
  const activeShape = selectedShapeId ? shapes.find(s => s.id === selectedShapeId) : null;

  const handleFillChange = (color: string) => {
    setDefaultFill(color);
    if (activeShape) {
      updateShape(activeShape.id, { fill: color });
    }
  };

  const handleStrokeChange = (color: string) => {
    setDefaultStroke(color);
    if (activeShape) {
      updateShape(activeShape.id, { stroke: color });
    }
  };

  const handleTextColorChange = (color: string) => {
    setDefaultTextColor(color);
    if (activeShape) {
      updateShape(activeShape.id, { textColor: color });
    }
  };

  const handleStrokeWidthChange = (width: number) => {
    setDefaultStrokeWidth(width);
    if (activeShape) {
      updateShape(activeShape.id, { strokeWidth: width });
    }
  };

  const handleStrokeDashChange = (dash: StrokeDashType) => {
    setDefaultStrokeDash(dash);
    if (activeShape) {
      updateShape(activeShape.id, { strokeDash: dash });
    }
  };

  const handleFontFamilyChange = (font: string) => {
    setDefaultFontFamily(font);
    if (activeShape) {
      updateShape(activeShape.id, { fontFamily: font });
    }
  };

  const handleFontSizeChange = (size: number) => {
    setDefaultFontSize(size);
    if (activeShape) {
      updateShape(activeShape.id, { fontSize: size });
    }
  };

  const toggleBold = () => {
    const nextVal = activeShape ? !activeShape.fontBold : false;
    if (activeShape) {
      updateShape(activeShape.id, { fontBold: nextVal });
    }
  };

  const toggleItalic = () => {
    const nextVal = activeShape ? !activeShape.fontItalic : false;
    if (activeShape) {
      updateShape(activeShape.id, { fontItalic: nextVal });
    }
  };

  const toggleUnderline = () => {
    const nextVal = activeShape ? !activeShape.fontUnderline : false;
    if (activeShape) {
      updateShape(activeShape.id, { fontUnderline: nextVal });
    }
  };

  const handleTextAlign = (align: 'left' | 'center' | 'right') => {
    if (activeShape) {
      updateShape(activeShape.id, { textAlign: align });
    }
  };

  // Zoom handlers
  const handleZoomIn = () => setZoom(Math.min(zoom + 0.1, 2.5));
  const handleZoomOut = () => setZoom(Math.max(zoom - 0.1, 0.4));
  const handleZoomReset = () => {
    setZoom(1);
    setPanOffset({ x: 0, y: 0 });
  };

  return (
    <div className="toolbar-ribbon">
      {/* File & Dashboard group */}
      <div className="toolbar-group">
        <button
          onClick={onBackToDashboard}
          className="toolbar-button"
          title="Back to Dashboard"
        >
          <LayoutDashboard size={21} />
        </button>
        <button
          onClick={resetCanvasState}
          className="toolbar-button"
          title="New Flowchart"
        >
          <FilePlus size={21} />
        </button>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
          <input
            type="text"
            value={flowchartName}
            onChange={(e) => {
              setFlowchartName(e.target.value);
            }}
            placeholder="Untitled Flowchart"
            style={{
              padding: '0.2rem 0.4rem',
              fontWeight: 600,
              border: '1px solid transparent',
              borderRadius: 'var(--radius-sm)',
              maxWidth: '115px',
              fontSize: '0.95rem'
            }}
            onFocus={(e) => e.target.style.borderColor = 'var(--border-light)'}
            onBlur={(e) => e.target.style.borderColor = 'transparent'}
          />
          <span style={{ fontSize: '0.65rem', color: isSaved ? 'var(--text-muted)' : 'var(--warning)', paddingLeft: '0.2rem' }}>
            {isSaved ? 'Saved to DB' : '● Unsaved changes'}
          </span>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className={`toolbar-button ${saveStatus === 'success' ? 'active' : ''}`}
          style={{
            color: saveStatus === 'success' ? 'var(--success)' : 'inherit'
          }}
          title="Save Flowchart (Ctrl+S)"
        >
          <Save size={21} className={saving ? 'animate-pulse' : ''} />
        </button>
      </div>

      {/* Undo/Redo & Zoom group */}
      <div className="toolbar-group">
        <button
          onClick={undo}
          disabled={!canUndo}
          className="toolbar-button"
          title="Undo (Ctrl+Z)"
        >
          <Undo2 size={20} />
        </button>
        <button
          onClick={redo}
          disabled={!canRedo}
          className="toolbar-button"
          title="Redo (Ctrl+Y)"
        >
          <Redo2 size={20} />
        </button>
        <button onClick={handleZoomOut} className="toolbar-button" title="Zoom Out">
          <ZoomOut size={20} />
        </button>
        <span style={{ fontSize: '0.85rem', minWidth: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          {Math.round(zoom * 100)}%
        </span>
        <button onClick={handleZoomIn} className="toolbar-button" title="Zoom In">
          <ZoomIn size={20} />
        </button>
        <button onClick={handleZoomReset} className="toolbar-button" title="Fit to Screen">
          <Maximize size={20} />
        </button>
      </div>

      {/* Tool Mode selector */}
      <div className="toolbar-group">
        <button
          onClick={() => setToolMode('select')}
          className={`toolbar-button ${toolMode === 'select' ? 'active' : ''}`}
          title="Selection Tool"
        >
          <MousePointer size={20} />
        </button>
        <button
          onClick={() => setToolMode('rectangle')}
          className={`toolbar-button ${toolMode === 'rectangle' ? 'active' : ''}`}
          title="Rectangle"
        >
          <Square size={20} />
        </button>
        <button
          onClick={() => setToolMode('rounded-rect')}
          className={`toolbar-button ${toolMode === 'rounded-rect' ? 'active' : ''}`}
          title="Rounded Rectangle"
          style={{ display: 'flex', alignItems: 'center' }}
        >
          <div style={{ width: '20px', height: '15px', border: '2px solid currentColor', borderRadius: '3px' }} />
        </button>
        <button
          onClick={() => setToolMode('circle')}
          className={`toolbar-button ${toolMode === 'circle' ? 'active' : ''}`}
          title="Circle/Ellipse"
        >
          <Circle size={20} />
        </button>
        <button
          onClick={() => setToolMode('diamond')}
          className={`toolbar-button ${toolMode === 'diamond' ? 'active' : ''}`}
          title="Diamond (Decision Box)"
        >
          <HelpCircle size={20} />
        </button>
        <button
          onClick={() => setToolMode('parallelogram')}
          className={`toolbar-button ${toolMode === 'parallelogram' ? 'active' : ''}`}
          title="Parallelogram (Input/Output)"
          style={{ display: 'flex', alignItems: 'center' }}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="5,4 19,4 15,16 1,16" />
          </svg>
        </button>
        <button
          onClick={() => setToolMode('text-box')}
          className={`toolbar-button ${toolMode === 'text-box' ? 'active' : ''}`}
          title="Text Box"
        >
          <Type size={20} />
        </button>
        <button
          onClick={() => setToolMode('connector')}
          className={`toolbar-button ${toolMode === 'connector' ? 'active' : ''}`}
          title="Arrow Connector Link"
        >
          <ArrowRight size={20} />
        </button>
      </div>

      {/* Line & Arrow settings */}
      <div className="toolbar-group" style={{ display: 'flex', gap: '0.2rem' }}>
        {/* Stroke thickness */}
        <select
          value={activeShape ? activeShape.strokeWidth : defaultStrokeWidth}
          onChange={(e) => handleStrokeWidthChange(Number(e.target.value))}
          style={{ padding: '0.15rem 0.25rem', fontSize: '0.8rem', outline: 'none', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-secondary)', height: '32px', width: '54px' }}
          title="Outline Thickness"
        >
          <option value="1">1px</option>
          <option value="2">2px</option>
          <option value="3">3px</option>
          <option value="4">4px</option>
          <option value="6">6px</option>
        </select>

        {/* Dash Style */}
        <select
          value={activeShape ? activeShape.strokeDash : defaultStrokeDash}
          onChange={(e) => handleStrokeDashChange(e.target.value as StrokeDashType)}
          style={{ padding: '0.15rem 0.25rem', fontSize: '0.8rem', outline: 'none', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-secondary)', height: '32px', width: '62px' }}
          title="Stroke Dash Style"
        >
          <option value="solid">Solid</option>
          <option value="dashed">Dash</option>
          <option value="dotted">Dot</option>
        </select>

        {/* Connector Connector Type */}
        <select
          value={defaultLineStyle}
          onChange={(e) => setDefaultLineStyle(e.target.value as LineStyle)}
          style={{ padding: '0.15rem 0.25rem', fontSize: '0.8rem', outline: 'none', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-secondary)', height: '32px', width: '74px' }}
          title="Connector Line style"
        >
          <option value="orthogonal">Ortho</option>
          <option value="straight">Straight</option>
          <option value="curved">Curved</option>
        </select>

        {/* Arrow head */}
        <select
          value={defaultArrowHead}
          onChange={(e) => setDefaultArrowHead(e.target.value as ArrowHeadType)}
          style={{ padding: '0.15rem 0.25rem', fontSize: '0.8rem', outline: 'none', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-secondary)', height: '32px', width: '64px' }}
          title="Connector Arrowhead Style"
        >
          <option value="single">Single</option>
          <option value="double">Double</option>
          <option value="none">None</option>
        </select>
      </div>

      {/* Font & styling group */}
      <div className="toolbar-group" style={{ display: 'flex', gap: '0.2rem' }}>
        <select
          value={activeShape ? activeShape.fontFamily : defaultFontFamily}
          onChange={(e) => handleFontFamilyChange(e.target.value)}
          style={{ padding: '0.15rem 0.25rem', fontSize: '0.8rem', width: '78px', outline: 'none', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-secondary)', height: '32px' }}
          title="Font Family"
        >
          {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
        </select>

        <select
          value={activeShape ? activeShape.fontSize : defaultFontSize}
          onChange={(e) => handleFontSizeChange(Number(e.target.value))}
          style={{ padding: '0.15rem 0.25rem', fontSize: '0.8rem', width: '46px', outline: 'none', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-secondary)', height: '32px' }}
          title="Font Size"
        >
          {FONT_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <button
          onClick={toggleBold}
          className={`toolbar-button ${activeShape?.fontBold ? 'active' : ''}`}
          title="Bold text"
        >
          <Bold size={17} />
        </button>

        <button
          onClick={toggleItalic}
          className={`toolbar-button ${activeShape?.fontItalic ? 'active' : ''}`}
          title="Italic text"
        >
          <Italic size={17} />
        </button>

        <button
          onClick={toggleUnderline}
          className={`toolbar-button ${activeShape?.fontUnderline ? 'active' : ''}`}
          title="Underline text"
        >
          <Underline size={17} />
        </button>

        <div style={{ display: 'flex', border: '1px solid var(--border-light)', borderRadius: '3px' }}>
          <button
            onClick={() => handleTextAlign('left')}
            className={`toolbar-button ${activeShape?.textAlign === 'left' ? 'active' : ''}`}
            title="Align Left"
            style={{ padding: '0.25rem 0.35rem', borderRadius: 0 }}
          >
            <AlignLeft size={15} />
          </button>
          <button
            onClick={() => handleTextAlign('center')}
            className={`toolbar-button ${activeShape?.textAlign === 'center' ? 'active' : ''}`}
            title="Align Center"
            style={{ padding: '0.25rem 0.35rem', borderRadius: 0 }}
          >
            <AlignCenter size={15} />
          </button>
          <button
            onClick={() => handleTextAlign('right')}
            className={`toolbar-button ${activeShape?.textAlign === 'right' ? 'active' : ''}`}
            title="Align Right"
            style={{ padding: '0.25rem 0.35rem', borderRadius: 0 }}
          >
            <AlignRight size={15} />
          </button>
        </div>
      </div>
      
      {/* Colors Ribbon */}
      <div className="toolbar-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', alignItems: 'stretch' }}>
        {/* Color type horizontal tabs */}
        <div style={{ display: 'flex', gap: '0.2rem', justifyContent: 'space-between', width: '100%' }}>
          <button
            onClick={() => setColorMode('fill')}
            style={{
              flex: 1,
              padding: '0.1rem 0.3rem',
              fontSize: '0.85rem',
              fontWeight: 600,
              borderRadius: 'var(--radius-sm)',
              height: '24px',
              backgroundColor: colorMode === 'fill' ? 'var(--accent-light)' : 'transparent',
              color: colorMode === 'fill' ? 'var(--accent-primary)' : 'var(--text-secondary)',
              border: '1px solid ' + (colorMode === 'fill' ? 'rgba(59, 130, 246, 0.2)' : 'transparent')
            }}
          >
            Fill
          </button>
          <button
            onClick={() => setColorMode('stroke')}
            style={{
              flex: 1,
              padding: '0.1rem 0.3rem',
              fontSize: '0.85rem',
              fontWeight: 600,
              borderRadius: 'var(--radius-sm)',
              height: '24px',
              backgroundColor: colorMode === 'stroke' ? 'var(--accent-light)' : 'transparent',
              color: colorMode === 'stroke' ? 'var(--accent-primary)' : 'var(--text-secondary)',
              border: '1px solid ' + (colorMode === 'stroke' ? 'rgba(59, 130, 246, 0.2)' : 'transparent')
            }}
          >
            Line
          </button>
          <button
            onClick={() => setColorMode('text')}
            style={{
              flex: 1,
              padding: '0.1rem 0.3rem',
              fontSize: '0.85rem',
              fontWeight: 600,
              borderRadius: 'var(--radius-sm)',
              height: '24px',
              backgroundColor: colorMode === 'text' ? 'var(--accent-light)' : 'transparent',
              color: colorMode === 'text' ? 'var(--accent-primary)' : 'var(--text-secondary)',
              border: '1px solid ' + (colorMode === 'text' ? 'rgba(59, 130, 246, 0.2)' : 'transparent')
            }}
          >
            Text
          </button>
        </div>

        {/* Current Active Swatch & Swatches Grid */}
        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
          <div
            style={{
              width: '24px',
              height: '24px',
              backgroundColor: colorMode === 'fill' ? (activeShape ? activeShape.fill : defaultFill) :
                               colorMode === 'stroke' ? (activeShape ? activeShape.stroke : defaultStroke) :
                               (activeShape ? activeShape.textColor : defaultTextColor),
              border: '1.5px solid white',
              boxShadow: '0 0 0 1px var(--text-muted)',
              borderRadius: '3px',
              cursor: 'pointer'
            }}
            title={`Active Swatch Color for ${colorMode.toUpperCase()}`}
          />

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(9, 1fr)',
            gap: '2.5px',
            maxWidth: '140px'
          }}>
            {COLOR_PALETTE.map((color) => {
              const isCurrentColor =
                colorMode === 'fill' ? (activeShape ? activeShape.fill === color : defaultFill === color) :
                colorMode === 'stroke' ? (activeShape ? activeShape.stroke === color : defaultStroke === color) :
                (activeShape ? activeShape.textColor === color : defaultTextColor === color);
              
              return (
                <div
                  key={color}
                  onClick={() => {
                    if (colorMode === 'fill') handleFillChange(color);
                    else if (colorMode === 'stroke') handleStrokeChange(color);
                    else handleTextColorChange(color);
                  }}
                  className={`color-dot ${isCurrentColor ? 'active' : ''}`}
                  style={{
                    backgroundColor: color,
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%'
                  }}
                />
              );
            })}
          </div>
        </div>
      </div>

      <div className="toolbar-group" style={{ marginLeft: 'auto', borderRight: 'none' }}>
        <button
          onClick={onExportPDF}
          className="toolbar-button primary"
          style={{
            padding: '0.45rem 1rem',
            fontSize: '0.95rem',
            borderRadius: 'var(--radius-sm)',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            boxShadow: 'var(--shadow-sm)'
          }}
          title="Export flowchart as PDF"
        >
          <Download size={20} /> Export PDF
        </button>
      </div>
    </div>
  );
};

export default Toolbar;
