import React, { useEffect, useRef } from 'react';
import { useCanvas } from '../context/CanvasContext';
import Toolbar from '../components/Toolbar';
import CanvasArea from '../components/CanvasArea';
import { Activity, Layers, Link as LinkIcon } from 'lucide-react';

interface EditorProps {
  navigateTo: (page: any) => void;
}

const loadJsPDF = (): Promise<any> => {
  return new Promise((resolve, reject) => {
    if ((window as any).jspdf) {
      resolve((window as any).jspdf);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    script.async = true;
    script.onload = () => resolve((window as any).jspdf);
    script.onerror = (err) => reject(err);
    document.body.appendChild(script);
  });
};

const Editor: React.FC<EditorProps> = ({ navigateTo }) => {
  const {
    flowchartName, shapes, connections, zoom, isLoading, loadFlowchart
  } = useCanvas();

  const svgRef = useRef<SVGSVGElement>(null);

  // Load diagram if id exists in localStorage
  useEffect(() => {
    const activeId = localStorage.getItem('active_flowchart_id');
    if (activeId) {
      loadFlowchart(activeId);
      localStorage.removeItem('active_flowchart_id'); // Clear so we don't reload on next app refresh
    }
  }, []);

  // 1. Export as SVG
  const handleExportSVG = () => {
    if (!svgRef.current || shapes.length === 0) {
      alert('Cannot export an empty canvas');
      return;
    }

    try {
      // Find bounding box to crop the SVG around shapes
      let minX = Infinity, minY = Infinity;
      let maxX = -Infinity, maxY = -Infinity;
      
      shapes.forEach(s => {
        minX = Math.min(minX, s.x);
        minY = Math.min(minY, s.y);
        maxX = Math.max(maxX, s.x + s.width);
        maxY = Math.max(maxY, s.y + s.height);
      });

      const pad = 40;
      const x = minX - pad;
      const y = minY - pad;
      const w = (maxX - minX) + pad * 2;
      const h = (maxY - minY) + pad * 2;

      // Clone original SVG node
      const svgClone = svgRef.current.cloneNode(true) as SVGSVGElement;
      
      // Remove panning translate and zoom scale for clean vector output
      const innerGroup = svgClone.querySelector('g');
      if (innerGroup) {
        innerGroup.setAttribute('transform', 'none');
      }

      // Configure SVG attributes
      svgClone.setAttribute('viewBox', `${x} ${y} ${w} ${h}`);
      svgClone.setAttribute('width', w.toString());
      svgClone.setAttribute('height', h.toString());
      svgClone.style.backgroundColor = '#ffffff';

      // Remove UI elements like tooltip, hud, contextual menus
      const tooltip = svgClone.querySelector('.shortcut-tooltip');
      if (tooltip) tooltip.remove();

      // Serialize
      const serializer = new XMLSerializer();
      const source = serializer.serializeToString(svgClone);

      const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${flowchartName.toLowerCase().replace(/\s+/g, '_')}.svg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert('Failed to export SVG image');
    }
  };

  // 2. Export as PNG
  const handleExportPNG = () => {
    if (!svgRef.current || shapes.length === 0) {
      alert('Cannot export an empty canvas');
      return;
    }

    try {
      let minX = Infinity, minY = Infinity;
      let maxX = -Infinity, maxY = -Infinity;
      
      shapes.forEach(s => {
        minX = Math.min(minX, s.x);
        minY = Math.min(minY, s.y);
        maxX = Math.max(maxX, s.x + s.width);
        maxY = Math.max(maxY, s.y + s.height);
      });

      const pad = 40;
      const x = minX - pad;
      const y = minY - pad;
      const w = (maxX - minX) + pad * 2;
      const h = (maxY - minY) + pad * 2;

      const svgClone = svgRef.current.cloneNode(true) as SVGSVGElement;
      const innerGroup = svgClone.querySelector('g');
      if (innerGroup) innerGroup.setAttribute('transform', 'none');

      svgClone.setAttribute('viewBox', `${x} ${y} ${w} ${h}`);
      svgClone.setAttribute('width', w.toString());
      svgClone.setAttribute('height', h.toString());
      svgClone.style.backgroundColor = '#ffffff';

      const serializer = new XMLSerializer();
      const source = serializer.serializeToString(svgClone);

      const img = new Image();
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<?xml version="1.0" standalone="no"?>\r\n' + source);
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, w, h);
          ctx.drawImage(img, 0, 0);
          
          const pngUrl = canvas.toDataURL('image/png');
          const link = document.createElement('a');
          link.href = pngUrl;
          link.download = `${flowchartName.toLowerCase().replace(/\s+/g, '_')}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      };
    } catch (e) {
      console.error(e);
      alert('Failed to render PNG export image');
    }
  };

  // 3. Export as PDF (Direct File Download Method)
  const handleExportPDF = () => {
    if (!svgRef.current || shapes.length === 0) {
      alert('Cannot export an empty canvas');
      return;
    }

    try {
      document.body.style.cursor = 'wait';
      // Find bounding box
      let minX = Infinity, minY = Infinity;
      let maxX = -Infinity, maxY = -Infinity;
      shapes.forEach(s => {
        minX = Math.min(minX, s.x);
        minY = Math.min(minY, s.y);
        maxX = Math.max(maxX, s.x + s.width);
        maxY = Math.max(maxY, s.y + s.height);
      });

      const pad = 40;
      const x = minX - pad;
      const y = minY - pad;
      const w = (maxX - minX) + pad * 2;
      const h = (maxY - minY) + pad * 2;

      const svgClone = svgRef.current.cloneNode(true) as SVGSVGElement;
      const innerGroup = svgClone.querySelector('g');
      if (innerGroup) innerGroup.setAttribute('transform', 'none');

      svgClone.setAttribute('viewBox', `${x} ${y} ${w} ${h}`);
      svgClone.setAttribute('width', w.toString());
      svgClone.setAttribute('height', h.toString());
      svgClone.style.backgroundColor = '#ffffff';

      const serializer = new XMLSerializer();
      const source = serializer.serializeToString(svgClone);

      const img = new Image();
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<?xml version="1.0" standalone="no"?>\r\n' + source);

      img.onload = async () => {
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, w, h);
          ctx.drawImage(img, 0, 0);

          try {
            const pngUrl = canvas.toDataURL('image/png');
            
            // Load jsPDF from CDN
            const jspdfModule = await loadJsPDF();
            const { jsPDF } = jspdfModule;
            
            const pdf = new jsPDF({
              orientation: w > h ? 'landscape' : 'portrait',
              unit: 'px',
              format: [w, h]
            });
            
            pdf.addImage(pngUrl, 'PNG', 0, 0, w, h);
            pdf.save(`${flowchartName.toLowerCase().replace(/\s+/g, '_')}.pdf`);
          } catch (err) {
            console.error(err);
            alert('Failed to load PDF library. Please check your network connection.');
          } finally {
            document.body.style.cursor = 'default';
          }
        } else {
          document.body.style.cursor = 'default';
        }
      };

      img.onerror = () => {
        document.body.style.cursor = 'default';
        alert('Failed to render PDF image');
      };
    } catch (e) {
      document.body.style.cursor = 'default';
      console.error(e);
      alert('Failed to export PDF document');
    }
  };

  const handleBackToDashboard = () => {
    navigateTo('dashboard');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      {/* Editor top ribbon */}
      <Toolbar
        onExportSVG={handleExportSVG}
        onExportPNG={handleExportPNG}
        onExportPDF={handleExportPDF}
        onBackToDashboard={handleBackToDashboard}
      />

      {/* Main Canvas CanvasArea */}
      {isLoading ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'white' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: '35px',
              height: '35px',
              border: '3px solid var(--border-light)',
              borderTopColor: 'var(--accent-primary)',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 1rem'
            }} />
            <p style={{ color: 'var(--text-secondary)' }}>Loading Flowchart State...</p>
          </div>
        </div>
      ) : (
        <CanvasArea svgRef={svgRef} />
      )}

      {/* Status Bar */}
      <div
        style={{
          height: '28px',
          backgroundColor: 'var(--bg-secondary)',
          borderTop: '1px solid var(--border-light)',
          padding: '0 1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.75rem',
          color: 'var(--text-secondary)',
          userSelect: 'none',
          zIndex: 10
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <Layers size={12} />
            <span>Shapes: <strong>{shapes.length}</strong></span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <LinkIcon size={12} />
            <span>Connectors: <strong>{connections.length}</strong></span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <Activity size={12} />
            <span>Zoom: <strong>{Math.round(zoom * 100)}%</strong></span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span>Mode: <strong>Local Canvas</strong></span>
        </div>
      </div>
    </div>
  );
};

export default Editor;
