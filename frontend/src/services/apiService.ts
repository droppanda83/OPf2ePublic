/**
 * C.7 — Centralized API service layer
 * All axios calls go through typed methods with consistent error handling.
 */
import axios, { AxiosError } from 'axios';
import type { Creature, GameLog, GameState, GMSession, CampaignPreferences } from '../../../shared/types';

const API_BASE = '/api';

// ─── Request/Response Types ────────────────────────────────

export interface CreateGameParams {
  players: Creature[];
  creatures: Creature[];
  mapSize?: number;
  mapTheme?: string;
  mapSubTheme?: string | string[];
  aiModel?: string;
}

type DetailsMap = Record<string, unknown>;

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
    details?: DetailsMap;
    path?: { x: number; y: number }[];
    reactionOpportunities?: DetailsMap[];
    pendingDamage?: DetailsMap;
  };
  gameState: GameState;
  reactionOpportunities?: DetailsMap[];
}

export interface AITurnResponse {
  gameState: GameState;
  executionResults: {
    planned?: { action?: { actionId: string; targetId?: string } };
    result?: { success: boolean; message: string; details?: DetailsMap };
    stateSnapshot?: { creatures: Creature[]; log?: GameLog[] };
  }[];
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  requestCount: number;
}

export interface SaveGameResponse {
  metadata: Record<string, unknown>;
}

export interface EncounterResponse {
  creatures: Creature[];
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
export async function updateAIModel(gameId: string, aiModel: string): Promise<{ preferences?: Record<string, unknown> }> {
  const response = await axios.put(`${API_BASE}/game/${gameId}/gm/preferences`, { aiModel });
  return response.data;
}

/** Fetch AI token usage */
export async function fetchTokenUsage(): Promise<TokenUsage> {
  const response = await axios.get(`${API_BASE}/ai/token-usage`);
  return response.data;
}

// ─── Phase 9: GM Interface API Methods ─────────────────

/** Session Zero: generate campaign framework from player input */
export async function runSessionZero(gameId: string, input: {
  campaignName: string;
  tone: string;
  themes: string[];
  pacing: string;
  encounterBalance: string;
  lootLevel: string;
  companionAI: string;
  narrationVerbosity: string;
  customNotes: string;
  ruleCitations: boolean;
  playerCount: number;
  averageLevel: number;
}): Promise<{ gmSession?: GMSession; gameState?: GameState; campaignFramework?: Record<string, unknown> }> {
  const response = await axios.post(`${API_BASE}/game/${gameId}/gm/session-zero`, input, { timeout: 90000 });
  return response.data;
}

/** Fetch world state summary (quests, calendar, etc.) */
export async function fetchWorldState(gameId: string): Promise<{
  quests: { id: string; title: string; status: string; description: string }[];
  calendar: { day: number; season: string; timeOfDay: string };
}> {
  const response = await axios.get(`${API_BASE}/game/${gameId}/gm/world-state`);
  return response.data;
}

/** Encounter preview: get a proposed encounter before committing */
export async function previewEncounter(gameId: string, difficulty: string): Promise<{
  difficulty: string;
  enemies: { name: string; level: number; hp: number; description?: string }[];
  mapName?: string;
  narrativeHook?: string;
  xpReward?: number;
}> {
  const response = await axios.post(`${API_BASE}/game/${gameId}/gm/encounter/preview`, { difficulty }, { timeout: 30000 });
  return response.data;
}

/** Downtime: fetch available activities */
export async function fetchDowntimeActivities(gameId: string): Promise<{
  activities: { id: string; name: string; icon: string; description: string; daysRequired: number }[];
}> {
  const response = await axios.get(`${API_BASE}/game/${gameId}/gm/downtime/activities`);
  return response.data;
}

/** Downtime: perform an activity */
export async function performDowntimeActivity(gameId: string, activityId: string, days: number): Promise<{
  narrative: string;
  gmSession?: GMSession;
  gameState?: GameState;
}> {
  const response = await axios.post(`${API_BASE}/game/${gameId}/gm/downtime/perform`, { activityId, days }, { timeout: 45000 });
  return response.data;
}

/** Update runtime GM settings (mode toggle, verbosity, citations, loot) */
export async function updateGMSettings(gameId: string, settings: {
  companionAI?: string;
  narrationVerbosity?: string;
  ruleCitations?: boolean;
  lootLevel?: string;
}): Promise<{
  companionAI?: string;
  narrationVerbosity?: string;
  ruleCitations?: boolean;
  lootLevel?: string;
}> {
  const response = await axios.put(`${API_BASE}/game/${gameId}/gm/settings`, settings);
  return response.data;
}

/** Subscribe to live game events via SSE */
export function subscribeToGameEvents(gameId: string): EventSource {
  return new EventSource(`${API_BASE}/game/${gameId}/events`);
}

export { extractErrorMessage };
