/**
 * Phase 8 — Adventure & Encounter Generator types.
 *
 * Types for Session Zero campaign generation, NPC personality cards,
 * custom creature building, treasure generation, adventure arcs,
 * and exploration/downtime content generation.
 */
import type { LLMService } from '../llm';
import type { ContextCompiler } from '../../services/contextCompiler';
import type { KnowledgeBase } from '../../services/knowledgeBase';
import type { GameEventBus } from '../../events/eventBus';
import type { WorldMemory } from '../memory';

// ─── Shared dependencies ────────────────────────────────────

export interface GeneratorDependencies {
  llmService: LLMService;
  contextCompiler: ContextCompiler;
  knowledgeBase: KnowledgeBase;
  eventBus: GameEventBus;
  worldMemory: WorldMemory;
}

// ─── Session Zero ───────────────────────────────────────────

/** Input the player provides at Session Zero. */
export interface SessionZeroInput {
  characterName: string;
  characterClass: string;
  characterLevel: number;
  ancestry: string;
  background: string;
  backstory: string;
  campaignPreferences: {
    campaignName?: string;
    tone: 'heroic' | 'dark' | 'comedic' | 'gritty' | 'epic';
    themes: string[];               // e.g. ['undead', 'political intrigue']
    pacing: 'fast' | 'moderate' | 'slow';
    encounterBalance: 'combat-heavy' | 'balanced' | 'rp-heavy';
    highLoot: boolean;              // toggle generous treasure
    customNotes?: string;           // freeform player wishes
  };
}

/** Full campaign framework generated from Session Zero. */
export interface CampaignFramework {
  campaignName: string;
  synopsis: string;                // 2-3 paragraph overview
  tone: string;
  themes: string[];

  /** The Big Bad — designed from backstory hooks + tone. */
  bbeg: GeneratedNPC;
  bbegMotivation: string;

  /** Starting region with geographic detail. */
  startingLocation: GeneratedLocation;

  /** 3-5 key locations involved in the main arc. */
  keyLocations: GeneratedLocation[];

  /** The nested arc structure: campaign → acts → episodes. */
  acts: StoryAct[];

  /** Recurring NPCs the player meets early. */
  initialNPCs: GeneratedNPC[];

  /** First session hooks + opening scene. */
  openingScene: string;
  initialQuests: GeneratedQuest[];

  /** Campaign-level secrets (hidden from the player). */
  secretPlots: string[];

  isFallback: boolean;
}

// ─── NPC Generation ─────────────────────────────────────────

export interface NPCGenerationRequest {
  role: 'ally' | 'enemy' | 'neutral' | 'bbeg' | 'merchant' | 'quest-giver';
  level: number;
  location?: string;
  themes?: string[];
  plotThreadId?: string;
  /** Existing NPCs to avoid duplication. */
  existingNames?: string[];
}

export interface GeneratedNPC {
  name: string;
  role: 'ally' | 'enemy' | 'neutral' | 'bbeg' | 'merchant' | 'quest-giver';
  ancestry: string;
  class?: string;
  level: number;
  description: string;              // 1-2 sentences of appearance
  personality: string;              // 1-2 sentences of demeanor
  secretGoal?: string;              // hidden motivation
  disposition: number;              // -100..100
  location: string;
  speechPattern?: string;           // e.g. "clipped military jargon", "flowery elven"
  tacticalPreference?: TacticalPreference;
  /** Connections to other NPCs by name. */
  connections: string[];
}

export interface TacticalPreference {
  style: 'aggressive' | 'defensive' | 'tactical' | 'cowardly' | 'reckless' | 'supportive';
  preferredRange: 'melee' | 'ranged' | 'mixed';
  fleeThreshold: number;           // HP% at which NPC tries to flee (0 = never)
  notes: string;                   // freeform tactical notes for TacticianAI
}

// ─── Creature Building ──────────────────────────────────────

export type StatTier = 'extreme' | 'high' | 'moderate' | 'low' | 'terrible';

export interface CreatureBuildRequest {
  name: string;
  level: number;
  archetype: CreatureArchetype;
  traits?: string[];                // e.g. ['undead', 'humanoid']
  thematicNotes?: string;           // freeform flavor guidance
  /** Override default stat distribution for specific stats. */
  statOverrides?: Partial<CreatureStatProfile>;
  abilities?: string[];             // special ability names/descriptions to incorporate
}

export type CreatureArchetype = 'brute' | 'skirmisher' | 'sniper' | 'soldier' | 'spellcaster' | 'tank';

export interface CreatureStatProfile {
  ac: StatTier;
  hp: StatTier;                     // only extreme/high/moderate/low (no "terrible")
  attack: StatTier;
  damage: StatTier;
  fortitude: StatTier;
  reflex: StatTier;
  will: StatTier;
  perception: StatTier;
}

export interface GeneratedCreatureStats {
  name: string;
  level: number;
  traits: string[];
  ac: number;
  hp: number;
  speed: number;
  flySpeed?: number;
  swimSpeed?: number;
  abilities: { str: number; dex: number; con: number; int: number; wis: number; cha: number };
  fortitude: number;
  reflex: number;
  will: number;
  perception: number;
  skills: { name: string; modifier: number }[];
  attacks: GeneratedAttack[];
  specialAbilities: GeneratedAbility[];
  spells?: GeneratedSpellEntry[];
  resistances?: { type: string; value: number }[];
  weaknesses?: { type: string; value: number }[];
  immunities?: string[];
}

export interface GeneratedAttack {
  name: string;
  modifier: number;
  damage: string;                   // e.g. "2d8+6 slashing"
  traits: string[];
}

export interface GeneratedAbility {
  name: string;
  actions?: number;                 // 0 = free/passive, 1-3 = action cost
  description: string;
  frequency?: string;               // e.g. "once per round"
}

export interface GeneratedSpellEntry {
  name: string;
  rank: number;
  tradition: 'arcane' | 'divine' | 'occult' | 'primal';
  frequency?: string;
}

// ─── Treasure Generation ────────────────────────────────────

export interface TreasureRequest {
  partyLevel: number;
  encounterDifficulty: 'trivial' | 'low' | 'moderate' | 'severe' | 'extreme';
  context: 'combat-loot' | 'chest' | 'shop' | 'quest-reward' | 'hidden-cache';
  themes?: string[];                // e.g. ['undead', 'fire'] for thematic items
  highLoot: boolean;
  /** Items the player already owns (avoid giving duplicates). */
  ownedItemNames?: string[];
}

export interface TreasureParcel {
  permanentItems: GeneratedItem[];
  consumables: GeneratedItem[];
  currency: { gold: number; silver: number; copper: number };
  totalValueGp: number;
  narrativeDescription: string;     // "Among the dragon's hoard you find..."
  isFallback: boolean;
}

export interface GeneratedItem {
  name: string;
  level: number;
  type: 'weapon' | 'armor' | 'worn' | 'held' | 'consumable' | 'scroll' | 'potion' | 'talisman' | 'bomb' | 'material';
  priceGp: number;
  rarity: 'common' | 'uncommon' | 'rare' | 'unique';
  description: string;
  traits?: string[];
  /** True if pulled from RAG; false if AI-generated. */
  fromBestiary: boolean;
}

// ─── Adventure Arc ──────────────────────────────────────────

export interface StoryAct {
  actNumber: number;
  title: string;
  synopsis: string;
  tensionGoal: 'rising' | 'peak' | 'falling';
  episodes: StoryEpisode[];
}

export interface StoryEpisode {
  episodeNumber: number;
  title: string;
  synopsis: string;
  mode: 'exploration' | 'encounter' | 'social' | 'downtime' | 'travel';
  keyNPCs: string[];
  location: string;
  objectives: string[];
  /** Encounters to generate when this episode triggers. */
  plannedEncounters: PlannedEncounter[];
  /** Branching: what happens if the player does X. */
  branches: { condition: string; outcome: string }[];
}

export interface PlannedEncounter {
  description: string;
  difficulty: 'trivial' | 'low' | 'moderate' | 'severe' | 'extreme';
  creatureThemes: string[];
  terrain?: string;
  objectiveOverride?: string;       // e.g. "protect the NPC" instead of "defeat all"
}

export interface ArcGenerationRequest {
  partyLevel: number;
  currentTension: number;
  activeThreads: string[];          // PlotThread titles
  recentEvents: string;             // compressed history snippet
  themes: string[];
  location: string;
}

export interface GeneratedArc {
  title: string;
  acts: StoryAct[];
  newPlotThreads: { title: string; description: string; priority: 'main' | 'secondary' | 'side' }[];
  newQuests: GeneratedQuest[];
  isFallback: boolean;
}

// ─── Exploration & Downtime Content ─────────────────────────

export interface DungeonLayout {
  name: string;
  theme: string;
  rooms: DungeonRoom[];
  connections: { from: number; to: number; type: 'door' | 'passage' | 'secret' | 'trap' | 'locked' }[];
  totalRooms: number;
}

export interface DungeonRoom {
  id: number;
  name: string;
  description: string;
  features: string[];
  hiddenElements: { type: string; perceptionDC: number; description: string }[];
  creatures?: string[];             // creature names for encounter gen
  treasure?: string;                // trigger treasure gen
  isEntrance?: boolean;
  isBossRoom?: boolean;
}

export interface TravelEncounterTable {
  terrain: string;
  entries: TravelEntry[];
}

export interface TravelEntry {
  weight: number;                   // probability weight 1-10
  type: 'combat' | 'social' | 'environmental' | 'discovery' | 'nothing';
  description: string;
  difficulty?: 'trivial' | 'low' | 'moderate' | 'severe';
}

export interface CityDistrict {
  name: string;
  description: string;
  atmosphere: string;
  pointsOfInterest: PointOfInterest[];
}

export interface PointOfInterest {
  name: string;
  type: 'shop' | 'tavern' | 'temple' | 'guild' | 'estate' | 'ruin' | 'market' | 'other';
  description: string;
  npcName?: string;
  services?: string[];              // e.g. ['healing', 'identify', 'craft']
}

export interface DowntimeContent {
  shopInventory: GeneratedItem[];
  availableNPCs: { name: string; service: string; cost?: string }[];
  rumors: Rumor[];
  personalQuestHooks: string[];
}

export interface Rumor {
  text: string;
  isTrue: boolean;
  relatedPlotThread?: string;
  source: string;                   // who spreads it
}

// ─── Locations ──────────────────────────────────────────────

export interface GeneratedLocation {
  name: string;
  type: 'city' | 'town' | 'village' | 'dungeon' | 'wilderness' | 'ruin' | 'landmark' | 'camp';
  region: string;
  description: string;
  atmosphere: string;               // tone/feel of the place
  notableFeatures: string[];
  connections: string[];            // other location names nearby
}

// ─── Quests ─────────────────────────────────────────────────

export interface GeneratedQuest {
  title: string;
  description: string;
  type: 'main' | 'side' | 'personal' | 'faction';
  source: string;                   // NPC or event that gives the quest
  objectives: { description: string; optional: boolean }[];
  xpReward: number;
  rewards: string[];                // descriptive reward hints
  plotThreadId?: string;
  deadlineDays?: number;            // in-game days before expiry
}
