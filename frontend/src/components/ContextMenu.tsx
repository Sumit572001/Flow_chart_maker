import React, { useEffect, useRef } from 'react';
import { useCanvas } from '../context/CanvasContext';
import { Copy, Trash2, ArrowUp, ArrowDown, FileText, Palette, Layers } from 'lucide-react';

interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  targetId: string | null;
  targetType: 'shape' | 'connection' | 'canvas';
}

const QUICK_COLORS = [
  '#ffffff', '#f8fafc', '#eff6ff', '#f0fdf4', '#fdf2f8', // row 1
  '#cbd5e1', '#3b82f6', '#10b981', '#ef4444', '#f59e0b'  // row 2
];

const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, onClose, targetId, targetType }) => {
  const {
    deleteSelected,
    copySelection,
    pasteSelection,
    clipboard,
    updateShape,
    bringToFront,
    sendToBack,
    duplicateShape
  } = useCanvas();

  const menuRef = useRef<HTMLDivElement>(null);

  // Close context menu if clicked outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [onClose]);

  const handleBringToFront = () => {
    if (targetType === 'shape' && targetId) {
      bringToFront(targetId);
    }
    onClose();
  };

  const handleSendToBack = () => {
    if (targetType === 'shape' && targetId) {
      sendToBack(targetId);
    }
    onClose();
  };

  const handleDuplicate = () => {
    if (targetType === 'shape' && targetId) {
      duplicateShape(targetId);
    }
    onClose();
  };

  const handleDelete = () => {
    deleteSelected();
    onClose();
  };

  const handleCopy = () => {
    copySelection();
    onClose();
  };

  const handlePaste = () => {
    pasteSelection();
    onClose();
  };

  const handleColorSelect = (color: string) => {
    if (targetType === 'shape' && targetId) {
      updateShape(targetId, { fill: color });
    }
    onClose();
  };

  const btnStyle = {
    display: 'flex',
    alignItems: 'center',
    width: '100%',
    justifyContent: 'flex-start',
    padding: '0.5rem 0.8rem',
    background: 'transparent',
    color: 'var(--text-secondary)',
    fontSize: '0.85rem',
    borderRadius: 'var(--radius-sm)',
    border: 'none',
    cursor: 'pointer',
    gap: '0.5rem'
  };

  return (
    <div
      ref={menuRef}
      className="animate-scale-in"
      style={{
        position: 'fixed',
        left: x,
        top: y,
        backgroundColor: 'var(--bg-secondary)',
        border: '1px solid var(--border-light)',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-lg)',
        padding: '0.4rem',
        zIndex: 1000,
        minWidth: '170px',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.2rem'
      }}
    >
      {targetType === 'shape' && (
        <>
          <button
            onClick={handleCopy}
            style={btnStyle}
            onMouseOver={e => e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'}
            onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <Copy size={14} /> Copy Shape
          </button>
          
          <button
            onClick={handleDuplicate}
            style={btnStyle}
            onMouseOver={e => e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'}
            onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <Layers size={14} /> Duplicate
          </button>

          <button
            onClick={handleBringToFront}
            style={btnStyle}
            onMouseOver={e => e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'}
            onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <ArrowUp size={14} /> Bring to Front
          </button>

          <button
            onClick={handleSendToBack}
            style={btnStyle}
            onMouseOver={e => e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'}
            onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <ArrowDown size={14} /> Send to Back
          </button>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border-light)', margin: '0.2rem 0' }} />
        </>
      )}

      {targetType === 'canvas' && (
        <>
          <button
            onClick={handlePaste}
            disabled={!clipboard}
            style={{
              ...btnStyle,
              color: clipboard ? 'var(--text-secondary)' : 'var(--text-muted)',
              cursor: clipboard ? 'pointer' : 'not-allowed'
            }}
            onMouseOver={e => { if (clipboard) e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'; }}
            onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <FileText size={14} /> Paste Shape
          </button>
          <hr style={{ border: 'none', borderTop: '1px solid var(--border-light)', margin: '0.2rem 0' }} />
        </>
      )}

      {targetType !== 'canvas' && (
        <button
          onClick={handleDelete}
          style={{
            ...btnStyle,
            color: 'var(--danger)'
          }}
          onMouseOver={e => e.currentTarget.style.backgroundColor = 'var(--accent-light)'}
          onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <Trash2 size={14} /> Delete
        </button>
      )}

      {targetType === 'shape' && (
        <>
          <hr style={{ border: 'none', borderTop: '1px solid var(--border-light)', margin: '0.2rem 0' }} />
          
          {/* Quick Color Palette sub menu */}
          <div style={{ padding: '0.4rem 0.8rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.4rem' }}>
              <Palette size={12} /> Fill Color
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.3rem' }}>
              {QUICK_COLORS.map(color => (
                <div
                  key={color}
                  onClick={() => handleColorSelect(color)}
                  style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    backgroundColor: color,
                    border: '1px solid var(--text-muted)',
                    cursor: 'pointer',
                    transition: 'transform 0.1s'
                  }}
                  onMouseOver={e => e.currentTarget.style.transform = 'scale(1.2)'}
                  onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
                />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ContextMenu;
