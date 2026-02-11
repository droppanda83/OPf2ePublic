import React from 'react';
import './BattleGrid.css';

interface BattleGridProps {
  gameState: any;
  creatures?: any[];
  selectedTarget: string | null;
  selectedAction: any | null;
  movementInfo: {
    costMap: Map<string, number>;
    maxDistance: number;
    origin: { x: number; y: number };
  } | null;
  onSelectTarget: (id: string) => void;
  onCreatureClick?: (id: string) => void;
}

const BattleGrid: React.FC<BattleGridProps> = ({ gameState, selectedTarget, selectedAction, movementInfo, onSelectTarget, onCreatureClick }) => {
  const [panX, setPanX] = React.useState(0);
  const [panY, setPanY] = React.useState(0);
  const [zoom, setZoom] = React.useState(1);
  const gridContainerRef = React.useRef<HTMLDivElement>(null);

  // Debug logging for AoE spell selection and targeting
  React.useEffect(() => {
    if (selectedAction?.aoe) {
      console.log('🔥 AoE Spell selected:', { action: selectedAction.name, aoeRadius: selectedAction.aoeRadius, selectedTarget });
    }
  }, [selectedAction, selectedTarget]);

  // Handle keyboard controls for panning and zooming
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const panAmount = 30;
      const zoomAmount = 0.15;

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          setPanY(prev => prev + panAmount);
          break;
        case 'ArrowDown':
          e.preventDefault();
          setPanY(prev => prev - panAmount);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          setPanX(prev => prev + panAmount);
          break;
        case 'ArrowRight':
          e.preventDefault();
          setPanX(prev => prev - panAmount);
          break;
        case '+':
        case '=':
          e.preventDefault();
          setZoom(prev => Math.min(prev + zoomAmount, 3));
          break;
        case '-':
          e.preventDefault();
          setZoom(prev => Math.max(prev - zoomAmount, 0.5));
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  const mapSize = gameState.map.width;
  const cellSize = 40; // pixels
  const gridSize = mapSize * cellSize;

  const formatMovementCostDisplay = (value: number): string => {
    if (!Number.isFinite(value)) {
      return '∞';
    }
    return Math.abs(value - Math.round(value)) < 0.05
      ? Math.round(value).toString()
      : value.toFixed(1);
  };

  // Calculate distance between two positions using Euclidean distance (circular range)
  const calculateDistance = (pos1: any, pos2: any) => {
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const rangeForSelection = movementInfo?.maxDistance ?? selectedAction?.range ?? 6;
  const currentCreatureId = gameState.currentRound?.turnOrder?.[gameState.currentRound?.currentTurnIndex];
  const currentCreature = gameState.creatures.find((c: any) => c.id === currentCreatureId);

  // Determine if a creature is a valid target
  const isValidTarget = (creature: any) => {
    if (!selectedAction) return true;
    if (creature.id === currentCreatureId) {
      return false; // Can't target self
    }
    if (!currentCreature) return true;

    const distance = calculateDistance(currentCreature.positions, creature.positions);
    const range = selectedAction.range || 1;
    return distance <= range;
  };

  const renderCreatures = () => {
    return gameState.creatures.map((creature: any) => {
      const isSelected = creature.id === selectedTarget || (selectedAction?.aoe && selectedTarget === `${creature.positions.x}-${creature.positions.y}`);
      const isDefeated = creature.currentHealth <= 0;
      const isValid = isValidTarget(creature);
      const isAoEClickable = selectedAction?.aoe;
      const healthPercent = (creature.currentHealth / creature.maxHealth) * 100;

      return (
        <div
          key={creature.id}
          className={`creature ${creature.type} ${isSelected ? 'selected' : ''} ${isDefeated ? 'defeated' : ''} ${creature.id === currentCreatureId ? 'current-turn' : ''} ${selectedAction && !isValid && !isAoEClickable ? 'invalid-target' : ''} ${selectedAction && (isValid || isAoEClickable) ? 'valid-target' : ''}`}
          style={{
            left: `${creature.positions.x * cellSize}px`,
            top: `${creature.positions.y * cellSize}px`,
            width: `${cellSize}px`,
            height: `${cellSize}px`,
            opacity: selectedAction && !isValid && !isAoEClickable ? 0.3 : 1,
            cursor: !selectedAction ? 'pointer' : (selectedAction && (isValid || isAoEClickable)) ? 'pointer' : 'default'
          }}
          onClick={() => {
            if (!selectedAction) {
              // No action selected - show creature stats
              onCreatureClick?.(creature.id);
            } else if (selectedAction.aoe) {
              // AoE spells target a position, not a creature
              onSelectTarget(`${creature.positions.x}-${creature.positions.y}`);
            } else if (isValid) {
              onSelectTarget(creature.id);
            }
          }}
        >
          <div className="creature-icon">
            {creature.type === 'player' ? '🛡️' : '👹'}
          </div>
        </div>
      );
    });
  };

  const renderGroundObjects = () => {
    if (!gameState.groundObjects) return [];
    
    return gameState.groundObjects.map((groundObj: any) => {
      const isSelected = selectedTarget === groundObj.id;
      const isValidPickupTarget = selectedAction?.id === 'pick-up-weapon' && currentCreature && 
        calculateDistance(currentCreature.positions, groundObj.position) <= Math.sqrt(2) + 0.1;
      
      return (
        <div
          key={groundObj.id}
          className="ground-object"
          onClick={() => {
            if (selectedAction?.id === 'pick-up-weapon' && isValidPickupTarget) {
              onSelectTarget(groundObj.id);
            }
          }}
          style={{
            left: `${groundObj.position.x * cellSize}px`,
            top: `${groundObj.position.y * cellSize}px`,
            width: `${cellSize}px`,
            height: `${cellSize}px`,
            position: 'absolute',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: selectedAction?.id === 'pick-up-weapon' ? (isValidPickupTarget ? 'pointer' : 'not-allowed') : 'default',
            zIndex: 5,
            opacity: isSelected ? 1 : 0.8,
            border: isSelected ? '2px solid #4fc3f7' : 'none'
          }}
          title={`${groundObj.weapon.display} (dropped)`}
        >
          <div style={{
            fontSize: '24px',
            filter: 'drop-shadow(0 0 3px rgba(0,0,0,0.8))',
            opacity: 0.8
          }}>
            ⧬
          </div>
        </div>
      );
    });
  };

  // Determine if a grid position is valid for targeting (movement or AoE spells)
  const isValidGridTarget = (x: number, y: number) => {
    if (!selectedAction || !currentCreature) return false;

    // Check if there's a creature at this position
    const hasCreature = gameState.creatures.some((c: any) => (
      c.positions.x === x &&
      c.positions.y === y &&
      c.id !== currentCreature.id &&
      c.currentHealth > 0
    ));

    // Movement: can't move to creature positions or current position, must have valid path
    if (selectedAction.movementType === 'walk') {
      if (hasCreature) return false;
      const costKey = `${x},${y}`;
      // Exclude origin position - can't move to where you already are
      const isOrigin = x === movementInfo?.origin.x && y === movementInfo?.origin.y;
      return !isOrigin && (movementInfo?.costMap.has(costKey) ?? false);
    }

    // AoE spells (like Fireball): can click on any empty space
    if (selectedAction.aoe) {
      return true;
    }

    return false;
  };

  // Check if a cell is within AoE radius of selected target
  const isInAoE = (x: number, y: number): boolean => {
    if (!selectedAction?.aoe || !selectedTarget) return false;
    try {
      const [centerX, centerY] = selectedTarget.split('-').map(Number);
      const radius = selectedAction.aoeRadius || 0;
      const dx = x - centerX;
      const dy = y - centerY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      return distance <= radius;
    } catch (e) {
      console.error('❌ Error in isInAoE:', e, 'selectedTarget:', selectedTarget, 'selectedAction:', selectedAction);
      return false;
    }
  };

  // Get creatures affected by the selected AoE
  const getAoEAffectedCreatures = (): string[] => {
    if (!selectedAction?.aoe || !selectedTarget) return [];
    const [centerX, centerY] = selectedTarget.split('-').map(Number);
    const radius = selectedAction.aoeRadius || 0;
    return gameState.creatures
      .filter((creature: any) => {
        if (creature.id === currentCreature?.id) return false;
        const dx = creature.positions.x - centerX;
        const dy = creature.positions.y - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance <= radius;
      })
      .map((c: any) => c.id);
  };

  const renderGrid = () => {
    const cells = [];

    for (let y = 0; y < mapSize; y++) {
      for (let x = 0; x < mapSize; x++) {
        // Safe terrain access with fallback
        const terrainRow = gameState.map?.terrain?.[y];
        const terrainTile = terrainRow?.[x];
        const terrain = terrainTile || { x, y, type: 'empty' };

        const isValidMovement = isValidGridTarget(x, y);
        const isSelectedPosition = selectedTarget === `${x}-${y}`;
        const isOriginCell = movementInfo && movementInfo.origin.x === x && movementInfo.origin.y === y;
        const isInAoERadius = isInAoE(x, y);

        let movementCost: number | undefined;
        if (movementInfo) {
          movementCost = movementInfo.costMap.get(`${x},${y}`);
        } else if ((selectedAction?.id === 'move' || selectedAction?.id === 'stride') && currentCreature) {
          movementCost = calculateDistance(currentCreature.positions, { x, y });
        }

        const showCost = (selectedAction?.id === 'move' || selectedAction?.id === 'stride') && movementCost !== undefined && movementCost !== null && movementCost > 0 && movementCost <= rangeForSelection + 1e-6;
        
        cells.push(
          <div
            key={`${x}-${y}`}
            className={`grid-cell terrain-${terrain.type} ${isValidMovement ? 'valid-movement' : ''} ${isSelectedPosition ? 'selected-position' : ''} ${isOriginCell ? 'movement-origin' : ''} ${isInAoERadius ? 'aoe-affected' : ''}`}
            style={{
              left: `${x * cellSize}px`,
              top: `${y * cellSize}px`,
              width: `${cellSize}px`,
              height: `${cellSize}px`,
              cursor: isValidMovement ? 'pointer' : 'default',
              opacity: (selectedAction?.id === 'move' || selectedAction?.id === 'stride') && !isValidMovement ? 0.3 : 1
            }}
            onClick={() => {
              if (isValidMovement) {
                onSelectTarget(`${x}-${y}`);
              }
            }}
          >
            {showCost && (
              <span className="movement-cost-badge">{formatMovementCostDisplay(movementCost!)}</span>
            )}
          </div>
        );
      }
    }
    return cells;
  };

  return (
    <div className="battle-grid-container" ref={gridContainerRef}>
      <div className="grid-controls">
        <button className="grid-btn" onClick={() => setPanY(prev => prev + 30)} title="Pan Up">⬆️</button>
        <button className="grid-btn" onClick={() => setPanY(prev => prev - 30)} title="Pan Down">⬇️</button>
        <button className="grid-btn" onClick={() => setPanX(prev => prev + 30)} title="Pan Left">⬅️</button>
        <button className="grid-btn" onClick={() => setPanX(prev => prev - 30)} title="Pan Right">➡️</button>
        <div style={{ width: '1px', height: '16px', background: '#555', margin: '0 2px' }} />
        <button className="grid-btn" onClick={() => setZoom(prev => Math.min(prev + 0.15, 3))} title="Zoom In">🔍+</button>
        <button className="grid-btn" onClick={() => setZoom(prev => Math.max(prev - 0.15, 0.5))} title="Zoom Out">🔍-</button>
        <button className="grid-btn" onClick={() => { setPanX(0); setPanY(0); setZoom(1); }} title="Reset">⟲</button>
      </div>

      <div
        className="battle-grid"
        style={{
          width: `${gridSize}px`,
          height: `${gridSize}px`,
          backgroundImage: `
            linear-gradient(0deg, #e0e0e0 1px, transparent 1px),
            linear-gradient(90deg, #e0e0e0 1px, transparent 1px)
          `,
          backgroundSize: `${cellSize}px ${cellSize}px`,
          transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
          transformOrigin: 'top left',
          transition: 'none',
          position: 'relative'
        }}
      >
        {renderGrid()}
        {renderGroundObjects()}
        {renderCreatures()}
      </div>

      <div className="grid-legend">
        <div className="legend-item">
          <span className="legend-color empty-cell"></span>
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
