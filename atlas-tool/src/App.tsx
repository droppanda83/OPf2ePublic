import React, { useState } from 'react';
import { AtlasViewer } from './pages/AtlasViewer';
import { AtlasApprovedDatabase } from './pages/AtlasApprovedDatabase';

const App: React.FC = () => {
  const params = new URLSearchParams(window.location.search);
  const [page, setPage] = useState<'viewer' | 'database'>(
    params.get('page') === 'database' ? 'database' : 'viewer',
  );

  return (
    <div style={{ width: '100%', height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Minimal nav bar */}
      <div style={{
        display: 'flex',
        gap: 8,
        padding: '6px 12px',
        background: '#111',
        borderBottom: '1px solid #333',
        alignItems: 'center',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}>
        <span style={{ fontWeight: 700, marginRight: 12, color: '#8bf' }}>
          🗺️ Atlas Terrain Picker
        </span>
        <button
          onClick={() => setPage('viewer')}
          style={{
            padding: '4px 12px',
            background: page === 'viewer' ? '#3a6' : '#333',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
          }}
        >
          Tile Viewer
        </button>
        <button
          onClick={() => setPage('database')}
          style={{
            padding: '4px 12px',
            background: page === 'database' ? '#3a6' : '#333',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
          }}
        >
          Approved Database
        </button>
      </div>

      {/* Page content */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        {page === 'viewer' ? <AtlasViewer /> : <AtlasApprovedDatabase />}
      </div>
    </div>
  );
};

export default App;
