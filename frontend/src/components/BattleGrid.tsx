import React from 'react';
import './BattleGrid.css';
import { renderTileMap, renderTreeOverhangs } from '../rendering/TileRenderer';
import type { TileType } from '../../../shared/mapGenerator';
import { calculatePartyLineOfSight, getVisionRange } from '../../../shared/mapGenerator';
import type { LightingLevel } from '../../../shared/mapGenerator';
import type { Action, GameState, Creature, Position } from '../../../shared/types';

interface BattleGridProps {
  gameState: GameState;
  creatures?: Creature[];
  selectedTarget: string | null;
  selectedAction: (Action & { range?: number; aoe?: unknown; aoeRadius?: number }) | null;
  movementInfo: {
    costMap: Map<string, number>;
    maxDistance: number;
    origin: { x: number; y: number };
  } | null;
  onSelectTarget: (id: string) => void;
  onCreatureClick?: (id: string) => void;
  explorationMode?: boolean;
  explorationCreatureId?: string | null;
  onExplorationMove?: (x: number, y: number) => void;
  /** Position overrides for animated movement (creatureId → {x,y}) */
  positionOverrides?: Map<string, { x: number; y: number }>;
}

const BattleGrid: React.FC<BattleGridProps> = ({ gameState, selectedTarget, selectedAction, movementInfo, onSelectTarget, onCreatureClick, explorationMode, explorationCreatureId, onExplorationMove, positionOverrides }) => {
  const [panX, setPanX] = React.useState(0);
  const [panY, setPanY] = React.useState(0);
  const [zoom, setZoom] = React.useState(1);
  const gridContainerRef = React.useRef<HTMLDivElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = React.useRef<HTMLCanvasElement>(null);
  const revealedCellsRef = React.useRef<Set<string>>(new Set());

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
  const mapWidth = gameState.map.width;
  const mapHeight = gameState.map.height || gameState.map.width;
  const cellSize = 40; // pixels
  const gridWidthPx = mapWidth * cellSize;
  const gridHeightPx = mapHeight * cellSize;
  const mapImageUrl: string | undefined = gameState.map.mapImageUrl;
  const mapTheme: string = gameState.map.mapTheme || 'dungeon';
  const tiles: TileType[][] | undefined = gameState.map.tiles;
  const overlays = gameState.map.overlays;
  const hasTiles = !!tiles && tiles.length > 0;

  // Map lighting level — determined by the backend based on theme.
  // Falls back to 'bright' when not set (e.g. legacy saves).
  const lightingLevel: LightingLevel = gameState.map.lightingLevel || 'bright';

  // Gather player creatures for fog-of-war (alive only)
  const playerCreatures = React.useMemo(() => {
    return gameState.creatures.filter(
      (c: Creature) => c.type === 'player' && c.currentHealth > 0
    );
  }, [gameState.creatures]);

  const playerPositions = React.useMemo(() => {
    return playerCreatures.map((c: Creature) => c.positions);
  }, [playerCreatures]);

  // Compute per-creature vision range based on senses + lighting
  const perCreatureVisionRanges = React.useMemo(() => {
    const maxDim = Math.max(mapWidth, mapHeight);
    const ranges = playerCreatures.map((c: Creature) => {
      // Combine creature.senses and creature.specials (Pathbuilder imports put senses in specials)
      const allSenses = [
        ...(c.senses || []),
        ...((c.specials || []).filter((s: string) =>
          /darkvision|low[- ]?light|greater darkvision/i.test(s)
        )),
      ];
      const range = getVisionRange(allSenses, lightingLevel, maxDim);
      console.log(`👁️ [LoS] ${c.name}: senses=${JSON.stringify(allSenses)}, lighting=${lightingLevel}, maxDim=${maxDim} → range=${range}`);
      return range;
    });
    console.log(`👁️ [LoS] perCreatureVisionRanges:`, ranges, `mapSize=${mapWidth}x${mapHeight}`);
    return ranges;
  }, [playerCreatures, lightingLevel, mapWidth, mapHeight]);

  const visibleCells = React.useMemo(() => {
    if (!hasTiles || !tiles || playerPositions.length === 0) return null;
    const vis = calculatePartyLineOfSight(tiles, playerPositions, perCreatureVisionRanges);
    console.log(`👁️ [LoS] visibleCells count: ${vis.size} / total map cells: ${mapWidth * mapHeight}`);
    // Accumulate revealed cells
    for (const cell of vis) {
      revealedCellsRef.current.add(cell);
    }
    return vis;
  }, [hasTiles, tiles, playerPositions, perCreatureVisionRanges]);

  const visibleCreatureNamesByCell = React.useMemo(() => {
    const map = new Map<string, string[]>();
    const creatures = gameState.creatures || [];
    for (const creature of creatures) {
      if (!creature || creature.currentHealth <= 0) continue;
      const key = `${creature.positions.x},${creature.positions.y}`;
      const isVisible = creature.type === 'player' || !visibleCells || visibleCells.has(key);
      if (!isVisible) continue;
      const names = map.get(key) || [];
      names.push(creature.name || creature.id || 'Unknown');
      map.set(key, names);
    }
    return map;
  }, [gameState.creatures, visibleCells]);

  const groundObjectNamesByCell = React.useMemo(() => {
    const map = new Map<string, string[]>();
    const objs = gameState.groundObjects || [];
    for (const obj of objs) {
      if (!obj?.position) continue;
      const key = `${obj.position.x},${obj.position.y}`;
      const names = map.get(key) || [];
      names.push(obj?.weapon?.display || 'Ground Object');
      map.set(key, names);
    }
    return map;
  }, [gameState.groundObjects]);

  const revealedCells = revealedCellsRef.current;

  // Render procedural tile map to canvas
  React.useEffect(() => {
    if (!hasTiles || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(gridWidthPx * dpr);
    canvas.height = Math.floor(gridHeightPx * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;

    const mapWithElevation = gameState.map as typeof gameState.map & { elevation?: number[][] };
    renderTileMap(ctx, tiles!, {
      cellSize,
      showGrid: true,
      gridColor: 'rgba(255,255,255,0.12)',
      gridOpacity: 1,
      detailMode: 'high',
      radialLighting: true,
      // Adjust ambient light based on map lighting level:
      // bright → well-lit (0.85), dim → moderate (0.38), dark → very low (0.12)
      ambientLight: lightingLevel === 'bright' ? 0.85 : lightingLevel === 'dark' ? 0.12 : 0.38,
      elevation: mapWithElevation.elevation,
      showElevation: !!mapWithElevation.elevation,
      showCoverQuality: true,
      fogOfWar: !!visibleCells,
      visibleCells: visibleCells ?? undefined,
      revealedCells: revealedCells.size > 0 ? revealedCells : undefined,
      overlays: overlays,
    });
  }, [hasTiles, tiles, overlays, gridWidthPx, gridHeightPx, cellSize, visibleCells, lightingLevel]);

  // Render tree canopy overhangs onto an overlay canvas above creature tokens
  React.useEffect(() => {
    if (!hasTiles || !overlayCanvasRef.current) return;
    const canvas = overlayCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(gridWidthPx * dpr);
    canvas.height = Math.floor(gridHeightPx * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, gridWidthPx, gridHeightPx);

    renderTreeOverhangs(ctx, tiles!, cellSize, {
      fogOfWar: !!visibleCells,
      visibleCells: visibleCells ?? undefined,
      revealedCells: revealedCells.size > 0 ? revealedCells : undefined,
    });
  }, [hasTiles, tiles, gridWidthPx, gridHeightPx, cellSize, visibleCells]);

  const formatMovementCostDisplay = (value: number): string => {
    if (!Number.isFinite(value)) {
      return '∞';
    }
    return Math.abs(value - Math.round(value)) < 0.05
      ? Math.round(value).toString()
      : value.toFixed(1);
  };

  // Calculate distance between two positions using Euclidean distance (circular range)
  const calculateDistance = (pos1: Position, pos2: Position) => {
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const rangeForSelection = movementInfo?.maxDistance ?? selectedAction?.range ?? 6;
  const currentCreatureId = gameState.currentRound?.turnOrder?.[gameState.currentRound?.currentTurnIndex];
  const currentCreature = gameState.creatures.find((c: Creature) => c.id === currentCreatureId);

  // Determine if a creature is a valid target
  const isValidTarget = (creature: Creature) => {
    if (!selectedAction) return true;
    if (creature.id === currentCreatureId) {
      return false; // Can't target self
    }
    if (!currentCreature) return true;

    const range = selectedAction.range ?? 1;

    // Use Chebyshev (grid) distance for all targeting — PF2e measures range in squares
    // Multi-tile aware: find minimum distance between any pair of occupied squares
    const aSpace = Math.max(1, Math.ceil(currentCreature.space || 1));
    const bSpace = Math.max(1, Math.ceil(creature.space || 1));
    let minDist = Infinity;
    for (let ay = 0; ay < aSpace; ay++) {
      for (let ax = 0; ax < aSpace; ax++) {
        for (let by = 0; by < bSpace; by++) {
          for (let bx = 0; bx < bSpace; bx++) {
            const dx = Math.abs((currentCreature.positions.x + ax) - (creature.positions.x + bx));
            const dy = Math.abs((currentCreature.positions.y + ay) - (creature.positions.y + by));
            const d = Math.max(dx, dy);
            if (d < minDist) minDist = d;
          }
        }
      }
    }
    return minDist <= range;
  };

  const renderCreatures = () => {
    return gameState.creatures
      .filter((creature: Creature) => {
        // Always show player creatures; hide enemies/NPCs in fog
        if (creature.type === 'player') return true;
        if (!visibleCells) return true; // No fog active, show all
        // Multi-tile: visible if ANY occupied square is in fog-revealed area
        const space = Math.max(1, Math.ceil(creature.space || 1));
        for (let dy = 0; dy < space; dy++) {
          for (let dx = 0; dx < space; dx++) {
            const key = `${creature.positions.x + dx},${creature.positions.y + dy}`;
            if (visibleCells.has(key)) return true;
          }
        }
        return false;
      })
      .map((creature: Creature) => {
      const isSelected = creature.id === selectedTarget || (selectedAction?.aoe && selectedTarget === `${creature.positions.x}-${creature.positions.y}`);
      const isDefeated = creature.currentHealth <= 0;
      const isValid = isValidTarget(creature);
      const isAoEClickable = selectedAction?.aoe;
      const healthPercent = (creature.currentHealth / creature.maxHealth) * 100;

      // Use position override if animating, otherwise use actual position
      const displayPos = positionOverrides?.get(creature.id) || creature.positions;
      const isAnimating = positionOverrides?.has(creature.id);

      // Determine icon based on creature type
      let icon = '👹';
      if (creature.type === 'player') {
        icon = '🛡️';
      } else if (creature.type === 'npc') {
        // Use custom icon stored in specials, or default NPC icon
        icon = creature.specials?.[0] || '🧑';
      }

      // Check for custom token image (Foundry VTT compatible format)
      const hasTokenImage = !!creature.tokenImageUrl;
      // Generate a per-creature hue shift for SVG tokens so identical types look distinct
      const isTypeToken = hasTokenImage && creature.tokenImageUrl?.startsWith('/tokens/');
      let tokenHueShift = 0;
      if (isTypeToken && creature.name) {
        let hash = 0;
        for (let i = 0; i < creature.name.length; i++) {
          hash = ((hash << 5) - hash + creature.name.charCodeAt(i)) | 0;
        }
        tokenHueShift = ((hash % 60) + 60) % 60 - 30; // -30 to +30 degree shift
      }

      // Multi-tile creature size: use space field (default 1 for small/medium)
      const creatureSpace = Math.max(1, Math.ceil(creature.space || 1));
      const tokenSizePx = creatureSpace * cellSize;

      return (
        <div
          key={creature.id}
          className={`creature ${creature.type} ${isSelected ? 'selected' : ''} ${isDefeated ? 'defeated' : ''} ${creature.id === currentCreatureId ? 'current-turn' : ''} ${selectedAction && !isValid && !isAoEClickable ? 'invalid-target' : ''} ${selectedAction && (isValid || isAoEClickable) ? 'valid-target' : ''} ${creatureSpace > 1 ? 'multi-tile' : ''}`}
          style={{
            left: `${displayPos.x * cellSize}px`,
            top: `${displayPos.y * cellSize}px`,
            transition: isAnimating ? 'left 0.3s ease-out, top 0.3s ease-out' : 'none',
            width: `${tokenSizePx}px`,
            height: `${tokenSizePx}px`,
            opacity: selectedAction && !isValid && !isAoEClickable ? 0.3 : 1,
            cursor: !selectedAction ? 'pointer' : (selectedAction && (isValid || isAoEClickable)) ? 'pointer' : 'default'
          }}
          onClick={() => {
            if (!selectedAction) {
              // Allow selecting any creature to view stats
              onCreatureClick?.(creature.id);
            } else if (selectedAction.aoe) {
              // AoE spells target a position, not a creature
              onSelectTarget(`${creature.positions.x}-${creature.positions.y}`);
            } else if (isValid) {
              onSelectTarget(creature.id);
            }
          }}
        >
          <div className={`creature-icon ${hasTokenImage ? 'has-token-image' : ''}`}>
            {hasTokenImage ? (
              <img 
                src={creature.tokenImageUrl} 
                alt={creature.name} 
                className="token-image"
                draggable={false}
                style={isTypeToken ? { filter: `hue-rotate(${tokenHueShift}deg)` } : undefined}
              />
            ) : (
              icon
            )}
            {isTypeToken && creature.name && (
              <span className="token-initial">{creature.name.charAt(0).toUpperCase()}</span>
            )}
          </div>
          {creature.type === 'npc' && (
            <div className="creature-name-label" style={{
              position: 'absolute',
              bottom: '-14px',
              left: '50%',
              transform: 'translateX(-50%)',
              fontSize: '9px',
              fontWeight: 700,
              color: '#ffcc66',
              textShadow: '0 0 3px #000, 0 0 6px #000',
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
              zIndex: 15,
            }}>
              {creature.name}
            </div>
          )}
        </div>
      );
    });
  };

  const renderGroundObjects = () => {
    if (!gameState.groundObjects) return [];
    
    return gameState.groundObjects.map((groundObj: GroundObject) => {
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
    const hasCreature = gameState.creatures.some((c: Creature) => (
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

    // AoE spells (like Fireball): can click on any cell within spell range
    if (selectedAction.aoe) {
      if (!currentCreature) return true;
      const spellRange = selectedAction.range ?? 24;
      const dx = Math.abs(currentCreature.positions.x - x);
      const dy = Math.abs(currentCreature.positions.y - y);
      const gridDistance = Math.max(dx, dy);
      return gridDistance <= spellRange;
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
                .filter((creature: Creature) => {
        if (creature.id === currentCreature?.id) return false;
        const dx = creature.positions.x - centerX;
        const dy = creature.positions.y - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance <= radius;
      })
      .map((c: Creature) => c.id);
  };

  const renderGrid = () => {
    const cells = [];

    for (let y = 0; y < mapHeight; y++) {
      for (let x = 0; x < mapWidth; x++) {
        // Safe terrain access with fallback
        const terrainRow = gameState.map?.terrain?.[y];
        const terrainTile = terrainRow?.[x];
        const terrain = terrainTile || { x, y, type: 'empty' };

        const isValidMovement = isValidGridTarget(x, y);
        const isSelectedPosition = selectedTarget === `${x}-${y}`;
        const isOriginCell = movementInfo && movementInfo.origin.x === x && movementInfo.origin.y === y;
        const isInAoERadius = isInAoE(x, y);

        // Check if this cell is a valid exploration move target
        const isOccupied = gameState.creatures.some((c: Creature) =>
          c.positions.x === x && c.positions.y === y && c.currentHealth > 0
        );
        const isImpassableTerrain = terrain.type === 'impassable';
        const tileAtPos = tiles?.[y]?.[x];
        const impassableTileTypes = ['wall', 'water-deep', 'lava', 'pit', 'pillar', 'tree', 'rock', 'void'];
        const isImpassableTile = tileAtPos ? impassableTileTypes.includes(tileAtPos) : false;
        // Only allow exploration click-to-move when NO combat action is selected
        const isExplorationTarget = explorationMode && !selectedAction && !isOccupied && !isImpassableTerrain && !isImpassableTile;

        let movementCost: number | undefined;
        if (movementInfo) {
          movementCost = movementInfo.costMap.get(`${x},${y}`);
        } else if ((selectedAction?.id === 'move' || selectedAction?.id === 'stride') && currentCreature) {
          movementCost = calculateDistance(currentCreature.positions, { x, y });
        }

        const showCost = (selectedAction?.id === 'move' || selectedAction?.id === 'stride') && movementCost !== undefined && movementCost !== null && movementCost > 0 && movementCost <= rangeForSelection + 1e-6;
        
        // When canvas tiles are present, grid cells only render interaction overlays (no terrain coloring)
        const terrainClass = hasTiles ? '' : `terrain-${terrain.type}`;
        const cellKey = `${x},${y}`;
        const creaturesHere = visibleCreatureNamesByCell.get(cellKey) || [];
        const objectsHere = groundObjectNamesByCell.get(cellKey) || [];
        const tooltipLines = [
          `Cell: ${x}, ${y}`,
          tileAtPos ? `Tile: ${tileAtPos}` : 'Tile: none',
          terrain?.type && terrain.type !== 'empty' ? `Terrain: ${terrain.type}` : null,
          creaturesHere.length > 0 ? `Creatures: ${creaturesHere.join(', ')}` : null,
          objectsHere.length > 0 ? `Objects: ${objectsHere.join(', ')}` : null,
        ].filter(Boolean).join('\n');

        cells.push(
          <div
            key={`${x}-${y}`}
            className={`grid-cell ${terrainClass} ${isValidMovement ? 'valid-movement' : ''} ${isSelectedPosition ? 'selected-position' : ''} ${isOriginCell ? 'movement-origin' : ''} ${isInAoERadius ? 'aoe-affected' : ''} ${isExplorationTarget ? 'exploration-target' : ''}`}
            title={tooltipLines}
            style={{
              left: `${x * cellSize}px`,
              top: `${y * cellSize}px`,
              width: `${cellSize}px`,
              height: `${cellSize}px`,
              cursor: (isValidMovement || isExplorationTarget) ? 'pointer' : 'default',
              opacity: (selectedAction?.id === 'move' || selectedAction?.id === 'stride') && !isValidMovement ? 0.3 : 1
            }}
            onClick={() => {
              if (isValidMovement) {
                // Combat movement/AoE takes priority when an action is selected
                onSelectTarget(`${x}-${y}`);
              } else if (isExplorationTarget && onExplorationMove) {
                onExplorationMove(x, y);
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
        className={`battle-grid${mapImageUrl && !hasTiles ? ' has-map-image' : ''} ${hasTiles ? 'has-tiles' : ''} theme-${mapTheme}`}
        style={{
          width: `${gridWidthPx}px`,
          height: `${gridHeightPx}px`,
          backgroundImage: mapImageUrl && !hasTiles
            ? `url(${mapImageUrl})`
            : undefined,
          backgroundSize: mapImageUrl && !hasTiles ? `${gridWidthPx}px ${gridHeightPx}px` : undefined,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'top left',
          transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
          transformOrigin: 'top left',
          transition: 'none',
          position: 'relative'
        }}
      >
        {/* Canvas layer for procedurally-generated tile maps */}
        {hasTiles && (
          <canvas
            ref={canvasRef}
            width={gridWidthPx}
            height={gridHeightPx}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: `${gridWidthPx}px`,
              height: `${gridHeightPx}px`,
              zIndex: 0,
              pointerEvents: 'none',
              imageRendering: 'auto',
            }}
          />
        )}
        {/* Grid overlay lines when a map image is present (no tiles) */}
        {mapImageUrl && !hasTiles && (
          <div
            className="grid-overlay"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              backgroundImage: `
                linear-gradient(0deg, rgba(255,255,255,0.15) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)
              `,
              backgroundSize: `${cellSize}px ${cellSize}px`,
              pointerEvents: 'none',
              zIndex: 1,
            }}
          />
        )}
        {renderGrid()}
        {renderGroundObjects()}
        {renderCreatures()}
        {/* Overlay canvas for tree canopy overhangs (renders ABOVE creature tokens) */}
        {hasTiles && (
          <canvas
            ref={overlayCanvasRef}
            width={gridWidthPx}
            height={gridHeightPx}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: `${gridWidthPx}px`,
              height: `${gridHeightPx}px`,
              zIndex: 20,
              pointerEvents: 'none',
              imageRendering: 'auto',
            }}
          />
        )}
      </div>
    </div>
  );
};

export default BattleGrid;
