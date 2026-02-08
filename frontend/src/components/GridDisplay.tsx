import React from 'react';
import { GameState } from '../../../shared/types.js';

interface GridDisplayProps {
  gameState: GameState;
  onAction: (creatureId: string, actionId: string, targetId?: string) => Promise<void>;
}

const GridDisplay: React.FC<GridDisplayProps> = ({ gameState, onAction }) => {
  const cellSize = 40;
  const canvasWidth = gameState.map.width * cellSize;
  const canvasHeight = gameState.map.height * cellSize;

  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw grid
    ctx.fillStyle = '#0d101a';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    ctx.strokeStyle = '#1e2434';
    for (let i = 0; i <= gameState.map.width; i++) {
      ctx.beginPath();
      ctx.moveTo(i * cellSize, 0);
      ctx.lineTo(i * cellSize, canvasHeight);
      ctx.stroke();
    }
    for (let i = 0; i <= gameState.map.height; i++) {
      ctx.beginPath();
      ctx.moveTo(0, i * cellSize);
      ctx.lineTo(canvasWidth, i * cellSize);
      ctx.stroke();
    }

    // Draw creatures
    gameState.creatures.forEach((creature) => {
      const x = creature.positions.x * cellSize + cellSize / 2;
      const y = creature.positions.y * cellSize + cellSize / 2;

      // Draw creature circle
      ctx.fillStyle = creature.type === 'player' ? '#58f4c6' : '#ff907f';
      ctx.beginPath();
      ctx.arc(x, y, cellSize / 3, 0, Math.PI * 2);
      ctx.fill();

      // Draw health
      ctx.fillStyle = '#fff';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`${creature.currentHealth}`, x, y + 20);
    });
  }, [gameState, canvasWidth, canvasHeight, cellSize]);

  return (
    <canvas
      ref={canvasRef}
      width={canvasWidth}
      height={canvasHeight}
      style={{
        flex: 1,
        backgroundColor: '#0d101a',
        cursor: 'pointer',
      }}
    />
  );
};

export default GridDisplay;
