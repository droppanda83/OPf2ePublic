import React, { useState } from 'react';
import type {
  GMSession,
  GameState,
  RecurringNPC,
  CompanionCreature,
} from '../../../shared/types';
import './CompanionPanel.css';

interface CompanionPanelProps {
  gmSession: GMSession | null;
  gameState: GameState | null;
  onClose: () => void;
}

const DISPOSITION_LABEL: Record<string, string> = {
  friendly: '😊 Friendly',
  neutral: '😐 Neutral',
  hostile: '😠 Hostile',
};

function dispositionLabel(score: number): string {
  if (score > 50) return '😊 Friendly';
  if (score > 0) return '😐 Neutral';
  return '😠 Hostile';
}

function dispositionColor(score: number): string {
  if (score > 50) return '#6cce6c';
  if (score > 0) return '#d4af37';
  return '#cc5050';
}

export const CompanionPanel: React.FC<CompanionPanelProps> = ({
  gmSession,
  gameState,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'npcs' | 'companions'>('npcs');

  const npcs = gmSession?.recurringNPCs || [];
  const companions = gameState?.companions || [];
  const aiPartyMembers = gameState?.creatures?.filter(
    c => c.type === 'player' && c.id !== gameState.creatures[0]?.id
  ) || [];

  return (
    <div className="cp-overlay">
      <div className="cp-panel">
        <div className="cp-header">
          <h3>👥 Party & NPCs</h3>
          <button className="cp-close" onClick={onClose}>✕</button>
        </div>

        <div className="cp-tabs">
          <button
            className={`cp-tab ${activeTab === 'npcs' ? 'active' : ''}`}
            onClick={() => setActiveTab('npcs')}
          >
            NPCs ({npcs.length})
          </button>
          <button
            className={`cp-tab ${activeTab === 'companions' ? 'active' : ''}`}
            onClick={() => setActiveTab('companions')}
          >
            Companions ({companions.length + aiPartyMembers.length})
          </button>
        </div>

        <div className="cp-body">
          {activeTab === 'npcs' && (
            <div className="cp-npc-list">
              {npcs.length === 0 && (
                <div className="cp-empty">No recurring NPCs yet. They'll appear as your campaign progresses.</div>
              )}
              {npcs.map(npc => (
                <NpcCard key={npc.id} npc={npc} />
              ))}
            </div>
          )}

          {activeTab === 'companions' && (
            <div className="cp-companion-list">
              {aiPartyMembers.length === 0 && companions.length === 0 && (
                <div className="cp-empty">No companions yet.</div>
              )}
              {aiPartyMembers.map(member => (
                <div key={member.id} className="cp-companion-card">
                  <div className="cp-companion-header">
                    <span className="cp-companion-name">{member.name}</span>
                    <span className="cp-companion-level">Lv{member.level}</span>
                    <span className="cp-companion-class">{member.class || 'Adventurer'}</span>
                  </div>
                  <div className="cp-companion-hp">
                    <div className="cp-hp-bar">
                      <div
                        className="cp-hp-fill"
                        style={{ width: `${Math.max(0, (member.currentHealth / member.maxHealth) * 100)}%` }}
                      />
                    </div>
                    <span className="cp-hp-text">{member.currentHealth}/{member.maxHealth} HP</span>
                  </div>
                  {member.conditions && member.conditions.length > 0 && (
                    <div className="cp-companion-conditions">
                      {member.conditions.map((c, i) => (
                        <span key={i} className="cp-condition-tag">
                          {typeof c === 'string' ? c : c.name || 'Unknown'}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {companions.map(comp => (
                <div key={comp.id} className="cp-companion-card">
                  <div className="cp-companion-header">
                    <span className="cp-companion-name">{comp.name}</span>
                    <span className="cp-companion-type">{comp.companionType.replace('-', ' ')}</span>
                    <span className="cp-companion-level">Lv{comp.level}</span>
                  </div>
                  <div className="cp-companion-hp">
                    <div className="cp-hp-bar">
                      <div
                        className="cp-hp-fill"
                        style={{ width: `${Math.max(0, (comp.currentHealth / comp.maxHealth) * 100)}%` }}
                      />
                    </div>
                    <span className="cp-hp-text">{comp.currentHealth}/{comp.maxHealth} HP</span>
                  </div>
                  {comp.manifested !== undefined && (
                    <span className={`cp-manifest-tag ${comp.manifested ? 'active' : ''}`}>
                      {comp.manifested ? '✅ Active' : '💤 Resting'}
                    </span>
                  )}
                  {comp.supportBenefit && (
                    <div className="cp-companion-support">
                      <strong>Support:</strong> {comp.supportBenefit}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/** Expanded NPC card with personality details */
const NpcCard: React.FC<{ npc: RecurringNPC }> = ({ npc }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`cp-npc-card ${expanded ? 'expanded' : ''}`} onClick={() => setExpanded(!expanded)}>
      <div className="cp-npc-header">
        <span className={`cp-npc-role cp-role-${npc.role}`}>{npc.role}</span>
        <span className="cp-npc-name">{npc.name}</span>
        <span className="cp-npc-disp" style={{ color: dispositionColor(npc.disposition) }}>
          {dispositionLabel(npc.disposition)}
        </span>
        {!npc.isAlive && <span className="cp-npc-dead">💀</span>}
      </div>

      {expanded && (
        <div className="cp-npc-details">
          {npc.description && <div className="cp-npc-desc">{npc.description}</div>}
          {npc.location && <div className="cp-npc-location">📍 {npc.location}</div>}

          {/* Disposition bar */}
          <div className="cp-disp-bar-container">
            <span className="cp-disp-label">Disposition</span>
            <div className="cp-disp-bar">
              <div
                className="cp-disp-fill"
                style={{
                  width: `${Math.max(0, Math.min(100, (npc.disposition + 100) / 2))}%`,
                  background: dispositionColor(npc.disposition),
                }}
              />
            </div>
            <span className="cp-disp-score">{npc.disposition}</span>
          </div>

          {/* Interaction history */}
          {npc.interactions && npc.interactions.length > 0 && (
            <div className="cp-npc-interactions">
              <strong>Recent Interactions:</strong>
              {npc.interactions.slice(-3).reverse().map((inter, i) => (
                <div key={i} className="cp-npc-interaction">
                  {typeof inter === 'string' ? inter : inter.summary || JSON.stringify(inter)}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
