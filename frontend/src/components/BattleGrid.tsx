import React from 'react';
import './BattleGrid.css';

interface BattleGridProps {
  gameState: any;
  selectedTarget: string | null;
  selectedAction: any | null;
  onSelectTarget: (id: string) => void;
}

const BattleGrid: React.FC<BattleGridProps> = ({ gameState, selectedTarget, selectedAction, onSelectTarget }) => {
  const mapSize = gameState.map.width;
  const cellSize = 40; // pixels
  const gridSize = mapSize * cellSize;

  // Calculate distance between two positions using Euclidean distance (circular range)
  const calculateDistance = (pos1: any, pos2: any) => {
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // Determine if a creature is a valid target
  const isValidTarget = (creature: any) => {
    if (!selectedAction) return true;
    if (creature.id === gameState.creatures.find((c: any) => c.id === gameState.currentRound?.turnOrder[gameState.currentRound?.currentTurnIndex])?.id) {
      return false; // Can't target self
    }
    
    const currentCreature = gameState.creatures.find((c: any) => c.id === gameState.currentRound?.turnOrder[gameState.currentRound?.currentTurnIndex]);
    if (!currentCreature) return true;
    
    const distance = calculateDistance(currentCreature.positions, creature.positions);
    const range = selectedAction.range || 1;
    return distance <= range;
  };

  const renderCreatures = () => {
    return gameState.creatures.map((creature: any) => {
      const isSelected = creature.id === selectedTarget;
      const isDefeated = creature.currentHealth <= 0;
      const isValid = isValidTarget(creature);
      const healthPercent = (creature.currentHealth / creature.maxHealth) * 100;

      return (
        <div
          key={creature.id}
          className={`creature ${creature.type} ${isSelected ? 'selected' : ''} ${isDefeated ? 'defeated' : ''} ${selectedAction && !isValid ? 'invalid-target' : ''} ${selectedAction && isValid ? 'valid-target' : ''}`}
          style={{
            left: `${creature.positions.x * cellSize}px`,
            top: `${creature.positions.y * cellSize}px`,
            width: `${cellSize}px`,
            height: `${cellSize}px`,
            opacity: selectedAction && !isValid ? 0.3 : 1,
            cursor: (selectedAction && isValid) ? 'pointer' : 'default'
          }}
          onClick={() => {
            if (selectedAction && isValid) {
              onSelectTarget(creature.id);
            }
          }}
        >
          <div className="creature-icon">
            {creature.type === 'player' ? '🛡️' : '👹'}
          </div>
          <div className="creature-name">{creature.name}</div>
          <div className="health-bar">
            <div
              className="health-fill"
              style={{
                width: `${healthPercent}%`,
                backgroundColor:
                  healthPercent > 50 ? '#4CAF50' :
                  healthPercent > 25 ? '#FFC107' : '#F44336'
              }}
            />
          </div>
          <div className="health-text">{creature.currentHealth}/{creature.maxHealth}</div>
        </div>
      );
    });
  };

  // Determine if a grid position is valid for movement
  const isValidMovementTarget = (x: number, y: number) => {
    if (!selectedAction || selectedAction.id !== 'move') return false;
    
    const currentCreature = gameState.creatures.find((c: any) => c.id === gameState.currentRound?.turnOrder[gameState.currentRound?.currentTurnIndex]);
    if (!currentCreature) return false;
    
    const distance = calculateDistance(currentCreature.positions, { x, y });
    const range = selectedAction.range || 6;
    
    // Check if there's a creature at this position
    const hasCreature = gameState.creatures.some((c: any) => c.positions.x === x && c.positions.y === y);
    
    return distance <= range && !hasCreature;
  };

  const renderGrid = () => {
    const cells = [];
    
    // Debug: check terrain structure
    if (gameState.map?.terrain && cells.length === 0) {
      console.log('🗺️ Terrain array dimensions:', gameState.map.terrain.length, 'x', gameState.map.terrain[0]?.length);
    }
    
    for (let y = 0; y < mapSize; y++) {
      for (let x = 0; x < mapSize; x++) {
        // Safe terrain access with fallback
        const terrainRow = gameState.map?.terrain?.[y];
        const terrainTile = terrainRow?.[x];
        const terrain = terrainTile || { x, y, type: 'empty' };
        
        const isValidMovement = isValidMovementTarget(x, y);
        const isSelectedPosition = selectedTarget === `${x}-${y}`;
        
        cells.push(
          <div
            key={`${x}-${y}`}
            className={`grid-cell terrain-${terrain.type} ${isValidMovement ? 'valid-movement' : ''} ${isSelectedPosition ? 'selected-position' : ''}`}
            style={{
              left: `${x * cellSize}px`,
              top: `${y * cellSize}px`,
              width: `${cellSize}px`,
              height: `${cellSize}px`,
              cursor: isValidMovement ? 'pointer' : 'default',
              opacity: selectedAction?.id === 'move' && !isValidMovement ? 0.3 : 1
            }}
            onClick={() => {
              if (isValidMovement) {
                console.log('🖱️ Clicked grid cell:', x, y);
                onSelectTarget(`${x}-${y}`);
              }
            }}
          />
        );
      }
    }
    return cells;
  };

  return (
    <div className="battle-grid-container">
      <div
        className="battle-grid"
        style={{
          width: `${gridSize}px`,
          height: `${gridSize}px`,
          backgroundImage: `
            linear-gradient(0deg, #e0e0e0 1px, transparent 1px),
            linear-gradient(90deg, #e0e0e0 1px, transparent 1px)
          `,
          backgroundSize: `${cellSize}px ${cellSize}px`
        }}
      >
        {renderGrid()}
        {renderCreatures()}
      </div>

      <div className="grid-legend">
        <div className="legend-item">
          <span className="legend-color empty"></span>
          <span>Empty</span>
        </div>
        <div className="legend-item">
          <span className="legend-color difficult"></span>
          <span>Difficult Terrain</span>
        </div>
        <div className="legend-item">
          <span className="legend-color impassable"></span>
          <span>Impassable</span>
        </div>
      </div>
    </div>
  );
};

export default BattleGrid;
