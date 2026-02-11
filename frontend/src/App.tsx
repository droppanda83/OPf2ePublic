import React, { useState } from 'react';
import CombatInterface from './components/CombatInterface';
import { LandingPage } from './pages/LandingPage';
import type { Creature } from '../../shared/types';
import type { Difficulty } from '../../shared/encounterBuilder';

console.log('🎮 App.tsx loaded');

const App: React.FC = () => {
  console.log('🎮 App component rendering');
  const [gameStarted, setGameStarted] = useState(false);
  const [importedCreatures, setImportedCreatures] = useState<Creature[]>([]);
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>('moderate');

  const handleStartBattle = (creatures: Creature[], difficulty: Difficulty) => {
    console.log('🎮 Starting battle with creatures:', creatures, 'difficulty:', difficulty);
    setImportedCreatures(creatures);
    setSelectedDifficulty(difficulty);
    setGameStarted(true);
  };

  const handleReturnToLanding = () => {
    console.log('🎮 Returning to landing page');
    setGameStarted(false);
    setImportedCreatures([]);
  };

  console.log('🎮 App rendering. gameStarted:', gameStarted);

  return (
    <div style={{ width: '100%', height: '100%' }}>
      {!gameStarted ? (
        <LandingPage onStartBattle={handleStartBattle} />
      ) : (
        <CombatInterface 
          initialCreatures={importedCreatures}
          difficulty={selectedDifficulty}
          onReturnToLanding={handleReturnToLanding}
        />
      )}
    </div>
  );
};

export default App;
