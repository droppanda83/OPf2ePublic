import * as fs from 'fs';
import * as path from 'path';
import { GameState } from 'pf2e-shared';

export interface SaveMetadata {
  id: string;
  name: string;
  encounterName: string;
  round: number;
  timestamp: number;
  playerCount: number;
  enemyCount: number;
}

export interface GameSave {
  metadata: SaveMetadata;
  gameState: GameState;
}

export class PersistenceManager {
  private savesDir: string;

  constructor(savesDirectory: string = 'saves') {
    this.savesDir = savesDirectory;
    this.ensureSavesDirectory();
  }

  private ensureSavesDirectory(): void {
    if (!fs.existsSync(this.savesDir)) {
      fs.mkdirSync(this.savesDir, { recursive: true });
    }
  }

  /**
   * Save a game state to disk
   */
  saveGame(gameState: GameState, saveName?: string): SaveMetadata {
    const saveId = this.generateSaveId();
    const name = saveName || `Save ${new Date().toLocaleString()}`;
    
    const playerCount = gameState.creatures.filter(c => c.type === 'player').length;
    const enemyCount = gameState.creatures.filter(c => c.type !== 'player').length;

    const metadata: SaveMetadata = {
      id: saveId,
      name,
      encounterName: gameState.name,
      round: gameState.currentRound.number,
      timestamp: Date.now(),
      playerCount,
      enemyCount,
    };

    const gameSave: GameSave = {
      metadata,
      gameState,
    };

    const filePath = path.join(this.savesDir, `${saveId}.json`);
    fs.writeFileSync(filePath, JSON.stringify(gameSave, null, 2));

    return metadata;
  }

  /**
   * Load a game state from disk
   */
  loadGame(saveId: string): GameSave | null {
    const filePath = path.join(this.savesDir, `${saveId}.json`);
    
    if (!fs.existsSync(filePath)) {
      return null;
    }

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const gameSave = JSON.parse(content) as GameSave;
      return gameSave;
    } catch (error) {
      console.error(`Error loading save file ${saveId}:`, error);
      return null;
    }
  }

  /**
   * List all available saves
   */
  listSaves(): SaveMetadata[] {
    this.ensureSavesDirectory();

    if (!fs.existsSync(this.savesDir)) {
      return [];
    }

    const files = fs.readdirSync(this.savesDir)
      .filter(f => f.endsWith('.json'))
      .map(f => f.slice(0, -5)); // Remove .json extension

    const saves: SaveMetadata[] = [];

    files.forEach(saveId => {
      const gameSave = this.loadGame(saveId);
      if (gameSave) {
        saves.push(gameSave.metadata);
      }
    });

    // Sort by timestamp descending (newest first)
    return saves.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Delete a save game
   */
  deleteSave(saveId: string): boolean {
    const filePath = path.join(this.savesDir, `${saveId}.json`);
    
    if (!fs.existsSync(filePath)) {
      return false;
    }

    try {
      fs.unlinkSync(filePath);
      return true;
    } catch (error) {
      console.error(`Error deleting save file ${saveId}:`, error);
      return false;
    }
  }

  /**
   * Get save details
   */
  getSaveDetails(saveId: string): SaveMetadata | null {
    const gameSave = this.loadGame(saveId);
    return gameSave?.metadata || null;
  }

  private generateSaveId(): string {
    return `save_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
  }
}
