/**
 * Phase 8 — Adventure & Encounter Generator barrel export.
 */
export { SessionZeroGenerator } from './sessionZero';
export { NPCGenerator } from './npcGenerator';
export { CreatureBuilder } from './creatureBuilder';
export { TreasureGenerator } from './treasureGenerator';
export { AdventureArcGenerator } from './adventureArc';
export { ContentGenerator } from './contentGenerator';

export type {
  // Shared dependencies
  GeneratorDependencies,

  // Session Zero
  SessionZeroInput,
  CampaignFramework,

  // NPC
  NPCGenerationRequest,
  GeneratedNPC,
  TacticalPreference,

  // Creature building
  CreatureBuildRequest,
  CreatureArchetype,
  CreatureStatProfile,
  GeneratedCreatureStats,
  GeneratedAttack,
  GeneratedAbility,
  GeneratedSpellEntry,
  StatTier,

  // Treasure
  TreasureRequest,
  TreasureParcel,
  GeneratedItem,

  // Adventure arc
  StoryAct,
  StoryEpisode,
  PlannedEncounter,
  ArcGenerationRequest,
  GeneratedArc,

  // Content
  DungeonLayout,
  DungeonRoom,
  TravelEncounterTable,
  TravelEntry,
  CityDistrict,
  PointOfInterest,
  DowntimeContent,
  Rumor,

  // Locations & quests
  GeneratedLocation,
  GeneratedQuest,
} from './types';
