import React, { useState } from 'react';
import { PathbuilderUploadModal } from '../components/PathbuilderUploadModal';
import { CharacterSheetModal } from '../components/CharacterSheetModal';
import type { Creature } from '../../../shared/types';
import type { Difficulty } from '../../../shared/encounterBuilder';
import { DIFFICULTIES, DIFFICULTY_LABELS, DIFFICULTY_COLORS } from '../../../shared/encounterBuilder';
import './LandingPage.css';

console.log('📄 LandingPage.tsx loaded');

interface LandingPageProps {
  onStartBattle: (creatures: Creature[], difficulty: Difficulty) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onStartBattle }) => {
  console.log('📄 LandingPage component rendering');
  const [importedCharacters, setImportedCharacters] = useState<Creature[]>([]);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [difficulty, setDifficulty] = useState<Difficulty>('moderate');
  const [selectedCharacter, setSelectedCharacter] = useState<Creature | null>(null);
  const [showCharacterSheet, setShowCharacterSheet] = useState(false);
  
  const handleCharacterImported = (creatures: Creature[]) => {
    setImportedCharacters(prev => [...prev, ...creatures]);
    setUploadModalOpen(false);
  };

  const handleStartBattle = () => {
    if (importedCharacters.length > 0) {
      onStartBattle(importedCharacters, difficulty);
    }
  };

  const handleRemoveCharacter = (id: string) => {
    setImportedCharacters(prev => prev.filter(c => c.id !== id));
  };

  return (
    <div className="landing-page">
      <div className="landing-container">
        <h1 className="title">⚔️ PF2e Rebirth Combat</h1>
        
        <div className="content">
          <section className="import-section">
            <h2>Import Characters</h2>
            <p>Upload Pathbuilder 2e character sheets to start a battle</p>
            
            <button 
              className="btn-primary"
              onClick={() => setUploadModalOpen(true)}
            >
              + Import Character
            </button>
          </section>

          <section className="difficulty-section">
            <h2>Encounter Difficulty</h2>
            <p>Choose how tough the enemies will be</p>
            <div className="difficulty-selector">
              {DIFFICULTIES.map((d) => (
                <button
                  key={d}
                  className={`difficulty-btn ${difficulty === d ? 'active' : ''}`}
                  style={{
                    borderColor: difficulty === d ? DIFFICULTY_COLORS[d] : undefined,
                    color: difficulty === d ? DIFFICULTY_COLORS[d] : undefined,
                  }}
                  onClick={() => setDifficulty(d)}
                >
                  {DIFFICULTY_LABELS[d]}
                </button>
              ))}
            </div>
          </section>

          {importedCharacters.length > 0 && (
            <section className="characters-section">
              <h2>Loaded Characters ({importedCharacters.length})</h2>
              <div className="character-list">
                {importedCharacters.map(character => (
                  <div 
                    key={character.id} 
                    className="character-card"
                    onClick={() => {
                      setSelectedCharacter(character);
                      setShowCharacterSheet(true);
                    }}
                  >
                    <div className="character-info">
                      <h3>{character.name}</h3>
                      <p>Lvl {character.level} • {character.maxHealth}HP</p>
                    </div>
                    <button 
                      className="btn-remove"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveCharacter(character.id);
                      }}
                      title="Remove character"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="action-section">
            <button 
              className={`btn-primary btn-large ${importedCharacters.length === 0 ? 'disabled' : ''}`}
              onClick={handleStartBattle}
              disabled={importedCharacters.length === 0}
            >
              {importedCharacters.length === 0 
                ? 'Upload a Character to Start'
                : 'Start Battle'}
            </button>
            
            {importedCharacters.length === 0 && (
              <p className="help-text">Please upload at least one character to continue</p>
            )}
          </section>
        </div>
      </div>

      <PathbuilderUploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onCharacterImported={handleCharacterImported}
        multiple={true}
      />

      {selectedCharacter && (
        <CharacterSheetModal
          isOpen={showCharacterSheet}
          onClose={() => {
            setShowCharacterSheet(false);
            setSelectedCharacter(null);
          }}
          creature={selectedCharacter}
        />
      )}
    </div>
  );
};
