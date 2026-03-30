/**
 * C.7 — Centralized API service layer
 * All axios calls go through typed methods with consistent error handling.
 */
import axios, { AxiosError } from 'axios';
import type { Creature, GameState, GMSession, CampaignPreferences } from '../../../shared/types';

const API_BASE = '/api';

// ─── Request/Response Types ────────────────────────────────

export interface CreateGameParams {
  players: Creature[];
  creatures: any[];
  mapSize?: number;
  mapTheme?: string;
  mapSubTheme?: string | string[];
  aiModel?: string;
}

export interface ActionPayload {
  creatureId: string;
  actionId: string;
  targetId?: string;
  targetPosition?: { x: number; y: number };
  weaponId?: string;
  spellId?: string;
  pickupDestination?: string;
  readyActionId?: string;
  itemId?: string;
  heroPointsSpent?: number;
}

export interface ActionResponse {
  result: {
    success: boolean;
    message: string;
    errorCode?: string;
    details?: any;
    path?: { x: number; y: number }[];
    reactionOpportunities?: any[];
    pendingDamage?: any;
  };
  gameState: GameState;
  reactionOpportunities?: any[];
}

export interface AITurnResponse {
  gameState: GameState;
  executionResults: {
    planned?: { action?: { actionId: string; targetId?: string } };
    result?: { success: boolean; message: string; details?: any };
    stateSnapshot?: { creatures: any[]; log?: any[] };
  }[];
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  requestCount: number;
}

export interface SaveGameResponse {
  metadata: any;
}

export interface EncounterResponse {
  creatures: any[];
  description: string;
}

// ─── Error Extraction ──────────────────────────────────────

function extractErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof AxiosError) {
    return error.response?.data?.error || error.message || fallback;
  }
  if (error instanceof Error) {
    return error.message || fallback;
  }
  return fallback;
}

// ─── API Methods ───────────────────────────────────────────

/** Fetch a generated encounter from bestiary */
export async function fetchEncounter(difficulty: string, partyLevel: number, partySize: number): Promise<EncounterResponse> {
  const response = await axios.get(`${API_BASE}/bestiary/encounter`, {
    params: { difficulty, partyLevel, partySize },
  });
  return response.data;
}

/** Create a new game */
export async function createGame(params: CreateGameParams): Promise<GameState> {
  const response = await axios.post(`${API_BASE}/game/create`, params);
  if (!response.data.id) {
    throw new Error('No game ID returned from server');
  }
  return response.data;
}

/** Initialize GM session for campaign mode */
export async function initGMSession(gameId: string, preferences: CampaignPreferences): Promise<{ gmSession?: GMSession; gameState?: GameState }> {
  const response = await axios.post(`${API_BASE}/game/${gameId}/gm/init`, { preferences });
  return response.data;
}

/** Add creatures to an existing game (Pathbuilder import) */
export async function addCreatures(gameId: string, creatures: Creature[]): Promise<GameState> {
  const response = await axios.post(`${API_BASE}/game/${gameId}/add-creatures`, { creatures });
  return response.data;
}

/** Execute a game action */
export async function executeGameAction(gameId: string, payload: ActionPayload): Promise<ActionResponse> {
  const response = await axios.post(`${API_BASE}/game/${gameId}/action`, payload);
  return {
    result: response.data.result ?? response.data,
    gameState: response.data.gameState || response.data,
    reactionOpportunities: response.data.reactionOpportunities,
  };
}

/** Execute AI turn */
export async function executeAITurn(gameId: string): Promise<AITurnResponse> {
  const response = await axios.post(`${API_BASE}/game/${gameId}/ai-turn`, {}, { timeout: 35000 });
  return {
    gameState: response.data.gameState || response.data,
    executionResults: response.data.executionResults || [],
  };
}

/** End turn and advance to next creature */
export async function endTurn(gameId: string): Promise<GameState> {
  const response = await axios.post(`${API_BASE}/game/${gameId}/end-turn`, {}, { timeout: 5000 });
  return response.data.gameState || response.data;
}

/** Save game */
export async function saveGame(gameId: string, saveName: string): Promise<SaveGameResponse> {
  const response = await axios.post(`${API_BASE}/game/${gameId}/save`, { saveName });
  return response.data;
}

/** Load game */
export async function loadGame(saveId: string): Promise<GameState> {
  const response = await axios.post(`${API_BASE}/game/load/${saveId}`);
  return response.data;
}

/** Exploration movement */
export async function explorationMove(gameId: string, creatureId: string, targetPosition: { x: number; y: number }): Promise<{ success: boolean; path?: { x: number; y: number }[]; gameState: GameState }> {
  const response = await axios.post(`${API_BASE}/game/${gameId}/exploration/move`, {
    creatureId,
    targetPosition,
  });
  return response.data;
}

/** Fetch available AI models */
export async function fetchAIModels(): Promise<{ models: string[]; currentModel: string }> {
  const response = await axios.get(`${API_BASE}/ai/models`);
  return {
    models: response.data?.models || [],
    currentModel: response.data?.currentModel || '',
  };
}

/** Update global default AI model (used outside active campaign session too) */
export async function updateDefaultAIModel(aiModel: string): Promise<{ ok: boolean; currentModel: string }> {
  const response = await axios.put(`${API_BASE}/ai/models/default`, { aiModel });
  return {
    ok: !!response.data?.ok,
    currentModel: response.data?.currentModel || aiModel,
  };
}

/** Update AI model preference */
export async function updateAIModel(gameId: string, aiModel: string): Promise<{ preferences?: any }> {
  const response = await axios.put(`${API_BASE}/game/${gameId}/gm/preferences`, { aiModel });
  return response.data;
}

/** Fetch AI token usage */
export async function fetchTokenUsage(): Promise<TokenUsage> {
  const response = await axios.get(`${API_BASE}/ai/token-usage`);
  return response.data;
}

export { extractErrorMessage };
