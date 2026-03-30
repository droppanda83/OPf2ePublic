import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './SaveLoadModal.css';

export interface SaveInfo {
  id: string;
  name: string;
  encounterName: string;
  round: number;
  timestamp: number;
  playerCount: number;
  enemyCount: number;
}

interface SaveLoadModalProps {
  isOpen: boolean;
  mode: 'save' | 'load';
  currentGameId?: string;
  onClose: () => void;
  onSave?: (saveName: string) => Promise<void>;
  onLoad?: (saveId: string) => Promise<void>;
  loading?: boolean;
}

const SaveLoadModal: React.FC<SaveLoadModalProps> = ({
  isOpen,
  mode,
  currentGameId,
  onClose,
  onSave,
  onLoad,
  loading = false
}) => {
  const [saves, setSaves] = useState<SaveInfo[]>([]);
  const [selectedSaveId, setSelectedSaveId] = useState<string>('');
  const [saveName, setSaveName] = useState<string>('');
  const [loadingList, setLoadingList] = useState(false);

  useEffect(() => {
    if (isOpen && mode === 'load') {
      loadSaves();
    }
  }, [isOpen, mode]);

  const loadSaves = async () => {
    setLoadingList(true);
    try {
      const response = await axios.get('/api/game/saves');
      setSaves(response.data.saves || []);
    } catch (error) {
      console.error('Error loading saves:', error);
    } finally {
      setLoadingList(false);
    }
  };

  const handleSave = async () => {
    if (!saveName.trim()) {
      alert('Please enter a save name');
      return;
    }
    if (onSave) {
      await onSave(saveName);
      setSaveName('');
    }
  };

  const handleLoad = async () => {
    if (!selectedSaveId) {
      alert('Please select a save to load');
      return;
    }
    if (onLoad) {
      await onLoad(selectedSaveId);
    }
  };

  const handleDelete = async (saveId: string) => {
    if (confirm('Are you sure you want to delete this save?')) {
      try {
        await axios.delete(`/api/game/saves/${saveId}`);
        setSaves(saves.filter(s => s.id !== saveId));
      } catch (error) {
        console.error('Error deleting save:', error);
        alert('Failed to delete save');
      }
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  if (!isOpen) return null;

  return (
    <div className="save-load-modal-overlay" role="dialog" aria-modal="true" aria-label={mode === 'save' ? 'Save Game' : 'Load Game'}>
      <div className="save-load-modal">
        <div className="modal-header">
          <h2>{mode === 'save' ? '💾 Save Game' : '📂 Load Game'}</h2>
          <button className="close-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="modal-content">
          {mode === 'save' ? (
            <div className="save-form">
              <label>Save Name</label>
              <input
                type="text"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder="Enter save name..."
                onKeyPress={(e) => e.key === 'Enter' && handleSave()}
              />
              <div className="form-actions">
                <button
                  className="btn-primary"
                  onClick={handleSave}
                  disabled={loading || !saveName.trim()}
                >
                  {loading ? 'Saving...' : 'Save Game'}
                </button>
                <button className="btn-secondary" onClick={onClose}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="load-form">
              <div className="saves-list">
                {loadingList ? (
                  <div className="loading">Loading saves...</div>
                ) : saves.length === 0 ? (
                  <div className="empty">No saved games found</div>
                ) : (
                  saves.map(save => (
                    <div
                      key={save.id}
                      className={`save-item ${selectedSaveId === save.id ? 'selected' : ''}`}
                      onClick={() => setSelectedSaveId(save.id)}
                    >
                      <div className="save-info">
                        <div className="save-name">{save.name}</div>
                        <div className="save-details">
                          <span className="encounter">{save.encounterName} - Round {save.round}</span>
                          <span className="time">{formatDate(save.timestamp)}</span>
                          <span className="creatures">
                            {save.playerCount} players, {save.enemyCount} enemies
                          </span>
                        </div>
                      </div>
                      <button
                        className="delete-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(save.id);
                        }}
                        title="Delete save"
                        aria-label={`Delete save: ${save.name}`}
                      >
                        🗑️
                      </button>
                    </div>
                  ))
                )}
              </div>
              <div className="form-actions">
                <button
                  className="btn-primary"
                  onClick={handleLoad}
                  disabled={loading || !selectedSaveId}
                >
                  {loading ? 'Loading...' : 'Load Game'}
                </button>
                <button className="btn-secondary" onClick={onClose}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SaveLoadModal;
