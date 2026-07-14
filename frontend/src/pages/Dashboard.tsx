import React, { useEffect, useState } from 'react';
import { useCanvas } from '../context/CanvasContext';
import {
  Plus, Search, Trash2, Edit3, Copy, FolderKanban,
  Calendar, FileText, ChevronRight, Check, X
} from 'lucide-react';

interface DashboardProps {
  navigateTo: (page: any) => void;
}

interface IFlowchartCard {
  id: string;
  _id?: string;
  name: string;
  data: any;
  updatedAt: string;
}

const Dashboard: React.FC<DashboardProps> = ({ navigateTo }) => {
  const { resetCanvasState } = useCanvas();

  const [flowcharts, setFlowcharts] = useState<IFlowchartCard[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Renaming state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');

  const fetchFlowcharts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/flowcharts');
      if (res.ok) {
        const data = await res.json();
        setFlowcharts(data);
      }
    } catch (err) {
      console.error('Error fetching flowcharts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFlowcharts();
  }, []);

  // Start a new blank flowchart
  const handleCreateNew = () => {
    resetCanvasState();
    localStorage.removeItem('active_flowchart_id');
    navigateTo('editor');
  };

  // Open flowchart in editor
  const handleOpenFlowchart = (id: string) => {
    localStorage.setItem('active_flowchart_id', id);
    navigateTo('editor');
  };

  // Delete flowchart
  const handleDeleteFlowchart = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this flowchart?')) return;

    try {
      const res = await fetch(`/api/flowcharts/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setFlowcharts(flowcharts.filter(f => (f.id || f._id) !== id));
      } else {
        alert('Failed to delete flowchart');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Duplicate flowchart
  const handleDuplicateFlowchart = async (e: React.MouseEvent, chart: IFlowchartCard) => {
    e.stopPropagation();
    const chartId = chart.id || chart._id;
    if (!chartId) return;

    try {
      // Get the full detail first
      const getRes = await fetch(`/api/flowcharts/${chartId}`);
      if (!getRes.ok) return;
      const fullChart = await getRes.json();

      const payload = {
        name: `${fullChart.name} (Copy)`,
        data: fullChart.data
      };

      const res = await fetch('/api/flowcharts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        fetchFlowcharts(); // Refresh the list
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Start Rename inline
  const startRename = (e: React.MouseEvent, chart: IFlowchartCard) => {
    e.stopPropagation();
    setEditingId(chart.id || chart._id || null);
    setNewName(chart.name);
  };

  // Save renamed flowchart
  const saveRename = async (e: React.MouseEvent, chart: IFlowchartCard) => {
    e.stopPropagation();
    const chartId = chart.id || chart._id;
    if (!chartId || !newName.trim()) return;

    try {
      // Get full details first to preserve diagram data
      const getRes = await fetch(`/api/flowcharts/${chartId}`);
      if (!getRes.ok) return;
      const fullChart = await getRes.json();

      const res = await fetch(`/api/flowcharts/${chartId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: newName.trim(),
          data: fullChart.data
        })
      });

      if (res.ok) {
        setFlowcharts(flowcharts.map(f => {
          const fid = f.id || f._id;
          if (fid === chartId) {
            return { ...f, name: newName.trim() };
          }
          return f;
        }));
        setEditingId(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const cancelRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
  };

  // Filter list by search query
  const filteredFlowcharts = flowcharts.filter(f =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-primary)' }}>
      {/* Dashboard Top Header bar */}
      <header
        style={{
          height: '64px',
          backgroundColor: 'var(--bg-secondary)',
          borderBottom: '1px solid var(--border-light)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 2rem',
          boxShadow: 'var(--shadow-sm)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div
            style={{
              backgroundColor: 'var(--accent-primary)',
              color: 'white',
              width: '36px',
              height: '36px',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <FolderKanban size={18} />
          </div>
          <span style={{ fontSize: '1.25rem', fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--text-primary)' }}>
            Flowchart Maker
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          {/* Public canvas access */}
        </div>
      </header>

      {/* Dashboard Main workspace content */}
      <main style={{ flex: 1, padding: '2.5rem 2rem', maxWidth: '1200px', width: '100%', margin: '0 auto' }}>
        
        {/* Title, Search Filter, Actions Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '2rem',
            flexWrap: 'wrap',
            gap: '1rem'
          }}
        >
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
              My Flowcharts
            </h1>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              Create, manage, and edit your workflow diagrams
            </p>
          </div>

          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            {/* Search Input */}
            <div style={{ position: 'relative' }}>
              <Search
                size={16}
                style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
              />
              <input
                type="text"
                placeholder="Search flowcharts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ paddingLeft: '2.2rem', minWidth: '240px', height: '40px' }}
              />
            </div>

            {/* Create Button */}
            <button
              onClick={handleCreateNew}
              className="primary"
              style={{ height: '40px', padding: '0 1.25rem', borderRadius: 'var(--radius-sm)' }}
            >
              <Plus size={18} /> New Flowchart
            </button>
          </div>
        </div>

        {/* Loading Spinner */}
        {loading ? (
          <div style={{ display: 'flex', height: '300px', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{
              width: '35px',
              height: '35px',
              border: '3px solid var(--border-light)',
              borderTopColor: 'var(--accent-primary)',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
          </div>
        ) : filteredFlowcharts.length === 0 ? (
          // Empty State view
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '340px',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px dashed var(--border-light)',
              borderRadius: 'var(--radius-lg)',
              padding: '2rem',
              textAlign: 'center'
            }}
          >
            <div style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent-primary)', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.2rem' }}>
              <FolderKanban size={32} />
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
              {searchQuery ? 'No flowcharts match your search' : 'No flowcharts saved yet'}
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '380px', marginBottom: '1.5rem' }}>
              {searchQuery ? 'Try typing a different name or clear the filter.' : 'Launch the vector editor to build and map out your first flowchart process.'}
            </p>
            {!searchQuery && (
              <button onClick={handleCreateNew} className="primary">
                <Plus size={16} /> Start Blank Canvas
              </button>
            )}
          </div>
        ) : (
          // Grid layout of Flowchart Cards
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '1.5rem'
            }}
          >
            {/* New Flowchart card trigger */}
            <div
              onClick={handleCreateNew}
              style={{
                backgroundColor: 'var(--bg-secondary)',
                border: '2px dashed var(--border-light)',
                borderRadius: 'var(--radius-md)',
                padding: '2rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)',
                height: '180px'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.borderColor = 'var(--accent-primary)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-light)';
                e.currentTarget.style.transform = 'none';
              }}
            >
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--accent-light)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.8rem' }}>
                <Plus size={20} />
              </div>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.95rem' }}>Create New Diagram</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>Start with a clean canvas</span>
            </div>

            {/* List cards */}
            {filteredFlowcharts.map((chart) => {
              const chartId = chart.id || chart._id || '';
              const shapesCount = chart.data?.shapes?.length || 0;
              const connCount = chart.data?.connections?.length || 0;
              const dateStr = new Date(chart.updatedAt).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              });

              return (
                <div
                  key={chartId}
                  onClick={() => handleOpenFlowchart(chartId)}
                  className="animate-fade-in"
                  style={{
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-light)',
                    borderRadius: 'var(--radius-md)',
                    padding: '1.5rem',
                    cursor: 'pointer',
                    position: 'relative',
                    boxShadow: 'var(--shadow-sm)',
                    transition: 'all var(--transition-fast)',
                    height: '180px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                    e.currentTarget.style.transform = 'none';
                  }}
                >
                  {/* Card Header name / rename */}
                  <div>
                    {editingId === chartId ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', marginBottom: '0.5rem' }} onClick={(e) => e.stopPropagation()}>
                        <input
                          type="text"
                          value={newName}
                          onChange={(e) => setNewName(e.target.value)}
                          autoFocus
                          style={{
                            padding: '0.2rem 0.4rem',
                            fontSize: '0.9rem',
                            height: '28px',
                            width: '120px'
                          }}
                        />
                        <button
                          onClick={(e) => saveRename(e, chart)}
                          className="primary"
                          style={{ padding: '4px', width: '28px', height: '28px' }}
                        >
                          <Check size={14} />
                        </button>
                        <button
                          onClick={cancelRename}
                          className="secondary"
                          style={{ padding: '4px', width: '28px', height: '28px' }}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem', paddingRight: '1rem', wordBreak: 'break-all' }}>
                        {chart.name}
                      </h3>
                    )}

                    {/* Meta labels (elements count) */}
                    <div style={{ display: 'flex', gap: '0.8rem', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                        <FileText size={12} /> {shapesCount} {shapesCount === 1 ? 'shape' : 'shapes'}
                      </span>
                      <span>•</span>
                      <span>{connCount} {connCount === 1 ? 'connector' : 'connectors'}</span>
                    </div>
                  </div>

                  {/* Card Footer controls */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--bg-primary)', paddingTop: '0.8rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                      <Calendar size={12} />
                      <span>{dateStr}</span>
                    </div>

                    <div style={{ display: 'flex', gap: '0.2rem' }} onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={(e) => startRename(e, chart)}
                        className="secondary"
                        style={{ padding: '4px', width: '28px', height: '28px', borderRadius: '4px' }}
                        title="Rename diagram"
                      >
                        <Edit3 size={12} />
                      </button>
                      <button
                        onClick={(e) => handleDuplicateFlowchart(e, chart)}
                        className="secondary"
                        style={{ padding: '4px', width: '28px', height: '28px', borderRadius: '4px' }}
                        title="Duplicate diagram"
                      >
                        <Copy size={12} />
                      </button>
                      <button
                        onClick={(e) => handleDeleteFlowchart(e, chartId)}
                        className="secondary"
                        style={{ padding: '4px', width: '28px', height: '28px', borderRadius: '4px', color: 'var(--danger)', borderColor: 'transparent' }}
                        title="Delete diagram"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>

                  {/* Hover indicator link arrow */}
                  <ChevronRight
                    size={16}
                    style={{ position: 'absolute', right: '12px', top: '16px', color: 'var(--text-muted)' }}
                  />
                </div>
              );
            })}
          </div>
        )}
      </main>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default Dashboard;
