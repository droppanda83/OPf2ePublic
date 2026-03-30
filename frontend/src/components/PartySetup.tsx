import React, { useState } from 'react';
import { Party } from '../../../shared/types';
import './PartySetup.css';

interface PartySetupProps {
  onPartyCreated: (party: Party) => void;
  onCancel: () => void;
}

/**
 * PartySetup Component
 * Allows user to create a new party campaign with:
 * - Number of player characters (1-6)
 * - Campaign name/description
 * - Optional rules selection (gradual ability boosts, ancestry paragon, free archetype)
 */
export const PartySetup: React.FC<PartySetupProps> = ({ onPartyCreated, onCancel }) => {
  const [playerCount, setPlayerCount] = useState<number>(4);
  const [campaignName, setCampaignName] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [gradualBoosts, setGradualBoosts] = useState<boolean>(true);
  const [ancestryParagon, setAncestryParagon] = useState<boolean>(false);
  const [freeArchetype, setFreeArchetype] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const handleCreate = () => {
    setError('');

    if (!campaignName.trim()) {
      setError('Campaign name is required');
      return;
    }

    // Create new party with selected settings
    const newParty: Party = {
      id: generatePartyId(),
      name: campaignName.trim(),
      notes,
      characters: [],
      optionalRules: {
        gradualAbilityBoosts: gradualBoosts,
        ancestryParagon: ancestryParagon,
        freeArchetype: freeArchetype,
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    onPartyCreated(newParty);
  };

  const generatePartyId = (): string => {
    return 'party_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  };

  return (
    <div className="party-setup-modal">
      <div className="setup-header">
        <h1>Create Campaign</h1>
        <p>Configure your party and optional rules</p>
      </div>

      <div className="setup-content">
        {error && (
          <div className="error-box">
            <h4>Error</h4>
            <p>{error}</p>
          </div>
        )}

        {/* Campaign Name */}
        <div className="form-section">
          <h2>Campaign Details</h2>

          <div className="form-group">
            <label htmlFor="campaign-name">Campaign Name *</label>
            <input
              id="campaign-name"
              type="text"
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              placeholder="e.g., The Lost Valley, Crimson Throne, etc."
              maxLength={100}
            />
          </div>

          <div className="form-group">
            <label htmlFor="notes">Campaign Notes</label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional: Describe your campaign setting, themes, or house rules..."
              rows={4}
              maxLength={500}
            />
          </div>

          <div className="info-text">
            <strong>Total Characters:</strong> {playerCount} player character{playerCount !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Player Count Selector */}
        <div className="form-section">
          <h2>Number of Players</h2>
          <p>Select how many player characters will be in this campaign. You can add or remove characters later.</p>

          <div className="player-count-selector">
            {[1, 2, 3, 4, 5, 6].map((num) => (
              <button
                key={num}
                className={`count-button ${playerCount === num ? 'active' : ''}`}
                onClick={() => setPlayerCount(num)}
              >
                {num}
              </button>
            ))}
          </div>
        </div>

        {/* Optional Rules */}
        <div className="form-section">
          <h2>Optional Rules</h2>
          <p>Apply these optional rules to the entire campaign:</p>

          <div className="rules-selector">
            {/* Gradual Ability Boosts */}
            <label className="rule-checkbox">
              <input
                type="checkbox"
                checked={gradualBoosts}
                onChange={(e) => setGradualBoosts(e.target.checked)}
              />
              <div className="rule-content">
                <strong>Gradual Ability Boosts</strong>
                <p>
                  Characters gain ability score boosts at every level (instead of every 4 levels).
                  +1 to any ability at levels 1, 5, 9, 13, 17 plus class/ancestry boosts.
                </p>
              </div>
            </label>

            {/* Ancestry Paragon */}
            <label className="rule-checkbox">
              <input
                type="checkbox"
                checked={ancestryParagon}
                onChange={(e) => setAncestryParagon(e.target.checked)}
              />
              <div className="rule-content">
                <strong>Ancestry Paragon</strong>
                <p>
                  At 1st level, characters gain an extra ancestry feat. Ancestry feats can be chosen instead
                  of general feats at levels 7 and 15. Ancestry bonuses increase (+2 HP per level, +1 to d20 rolls).
                </p>
              </div>
            </label>

            {/* Free Archetype */}
            <label className="rule-checkbox">
              <input
                type="checkbox"
                checked={freeArchetype}
                onChange={(e) => setFreeArchetype(e.target.checked)}
              />
              <div className="rule-content">
                <strong>Free Archetype</strong>
                <p>
                  Characters gain a bonus 2nd-level archetype dedication feat at 2nd level and a bonus archetype
                  feat every 4 levels (6, 10, 14, 18). Dedication feats are considered taken.
                </p>
              </div>
            </label>
          </div>

          <div className="rules-info">
            <p>
              <strong>Note:</strong> Optional rules apply to all characters in this campaign but can be disabled
              per character if needed during character creation.
            </p>
          </div>
        </div>
      </div>

      <div className="setup-footer">
        <button className="btn-outline" onClick={onCancel}>
          Cancel
        </button>
        <button className="btn-success" onClick={handleCreate}>
          Create Campaign
        </button>
      </div>
    </div>
  );
};

export default PartySetup;
