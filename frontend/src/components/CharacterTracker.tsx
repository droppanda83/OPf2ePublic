import React from 'react';
import { CharacterSheet, Condition } from '../../../shared/types';
import './CharacterTracker.css';

interface CharacterTrackerProps {
  characters: CharacterSheet[];
  activeCharacterId?: string;
  onSelectCharacter?: (characterId: string) => void;
}

/**
 * CharacterTracker Component
 * Displays a list of all party members with their current status
 * Used as a HUD during combat to track party information
 */
export const CharacterTracker: React.FC<CharacterTrackerProps> = ({
  characters,
  activeCharacterId,
  onSelectCharacter,
}) => {
  const calculateHealthPercentage = (character: CharacterSheet): number => {
    if (!character.maxHealth) return 100;
    return Math.max(0, ((character.currentHealth ?? 0) / character.maxHealth) * 100);
  };

  const getHealthColor = (percentage: number): string => {
    if (percentage > 75) return '#6f9'; // Green
    if (percentage > 50) return '#d4af37'; // Gold
    if (percentage > 25) return '#f9a'; // Orange
    return '#f55'; // Red
  };

  const getAbilityModifier = (score: number): number => {
    return Math.floor((score - 10) / 2);
  };

  const formatModifier = (mod: number): string => {
    return mod >= 0 ? `+${mod}` : `${mod}`;
  };

  if (!characters || characters.length === 0) {
    return (
      <div className="character-tracker empty">
        <p>No characters in party</p>
      </div>
    );
  }

  return (
    <div className="character-tracker">
      <div className="tracker-header">
        <h3>Party ({characters.length})</h3>
      </div>

      <div className="character-list">
        {characters.map((character) => {
          const healthPercent = calculateHealthPercentage(character);
          const healthColor = getHealthColor(healthPercent);
          const isActive = character.id === activeCharacterId;

          return (
            <div
              key={character.id}
              className={`character-card ${isActive ? 'active' : ''}`}
              onClick={() => onSelectCharacter && onSelectCharacter(character.id)}
            >
              {/* Character Header */}
              <div className="character-header">
                <div className="character-name">
                  <h4>{character.name}</h4>
                  <span className="character-level">Lvl {character.level}</span>
                </div>
                <span className="character-class">{character.class}</span>
              </div>

              {/* Health Bar */}
              <div className="health-section">
                <div className="health-bar-container">
                  <div className="health-bar-background">
                    <div
                      className="health-bar-fill"
                      style={{
                        width: `${healthPercent}%`,
                        backgroundColor: healthColor,
                      }}
                    />
                  </div>
                  <span className="health-text">
                    {character.currentHealth ?? 0} / {character.maxHealth ?? 0} HP
                  </span>
                </div>
              </div>

              {/* Abilities Row */}
              <div className="abilities-row">
                <div className="ability-mini">
                  <span className="ability-score">{character.abilities.strength}</span>
                  <span className="ability-mod">
                    {formatModifier(getAbilityModifier(character.abilities.strength))}
                  </span>
                  <span className="ability-label">STR</span>
                </div>
                <div className="ability-mini">
                  <span className="ability-score">{character.abilities.dexterity}</span>
                  <span className="ability-mod">
                    {formatModifier(getAbilityModifier(character.abilities.dexterity))}
                  </span>
                  <span className="ability-label">DEX</span>
                </div>
                <div className="ability-mini">
                  <span className="ability-score">{character.abilities.constitution}</span>
                  <span className="ability-mod">
                    {formatModifier(getAbilityModifier(character.abilities.constitution))}
                  </span>
                  <span className="ability-label">CON</span>
                </div>
              </div>

              {/* Second Row of Abilities */}
              <div className="abilities-row">
                <div className="ability-mini">
                  <span className="ability-score">{character.abilities.intelligence}</span>
                  <span className="ability-mod">
                    {formatModifier(getAbilityModifier(character.abilities.intelligence))}
                  </span>
                  <span className="ability-label">INT</span>
                </div>
                <div className="ability-mini">
                  <span className="ability-score">{character.abilities.wisdom}</span>
                  <span className="ability-mod">
                    {formatModifier(getAbilityModifier(character.abilities.wisdom))}
                  </span>
                  <span className="ability-label">WIS</span>
                </div>
                <div className="ability-mini">
                  <span className="ability-score">{character.abilities.charisma}</span>
                  <span className="ability-mod">
                    {formatModifier(getAbilityModifier(character.abilities.charisma))}
                  </span>
                  <span className="ability-label">CHA</span>
                </div>
              </div>

              {/* AC and Saves */}
              <div className="defense-stats">
                <div className="stat-mini">
                  <span className="stat-label">AC</span>
                  <span className="stat-value">{character.armorClass || '--'}</span>
                </div>
                <div className="stat-mini">
                  <span className="stat-label">Fort</span>
                  <span className="stat-value">
                    {formatModifier(character.savingThrows?.fortitude || 0)}
                  </span>
                </div>
                <div className="stat-mini">
                  <span className="stat-label">Ref</span>
                  <span className="stat-value">
                    {formatModifier(character.savingThrows?.reflex || 0)}
                  </span>
                </div>
                <div className="stat-mini">
                  <span className="stat-label">Will</span>
                  <span className="stat-value">
                    {formatModifier(character.savingThrows?.will || 0)}
                  </span>
                </div>
              </div>

              {/* Conditions/Status Indicator */}
              {character.conditions && character.conditions.length > 0 && (
                <div className="conditions-list">
                  <span className="conditions-header">Conditions:</span>
                  <div className="condition-tags">
                    {character.conditions.map((condition: Condition, idx: number) => (
                      <span key={idx} className="condition-tag">
                        {condition.name}
                        {(condition.value ?? 0) > 1 && ` (${condition.value})`}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Stats */}
              <div className="quick-stats">
                <span className="stat-item">
                  <strong>Ancestry:</strong> {character.ancestry}
                </span>
                {character.heritage && (
                  <span className="stat-item">
                    <strong>Heritage:</strong> {character.heritage}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CharacterTracker;
