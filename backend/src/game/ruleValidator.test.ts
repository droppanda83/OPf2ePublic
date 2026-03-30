/**
 * Tests for ruleValidator.ts — action validation and action cost table.
 * Phase E.2 — Core combat tests.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { validateAction, getActionCost } from './ruleValidator';
import type { Creature, GameState } from 'pf2e-shared';

// ─── Fixture Helpers ─────────────────────────────────────────

function makeCreature(overrides: Partial<Creature> = {}): Creature {
  return {
    id: 'hero-1', name: 'Test Hero', type: 'player', level: 5,
    maxHealth: 50, currentHealth: 50, speed: 25,
    positions: { x: 0, y: 0 },
    abilities: { strength: 4, dexterity: 3, constitution: 2, intelligence: 1, wisdom: 2, charisma: 0 },
    proficiencies: {
      unarmed: 'trained', simpleWeapons: 'trained', martialWeapons: 'expert',
      advancedWeapons: 'untrained',
      unarmored: 'trained', lightArmor: 'trained', mediumArmor: 'trained', heavyArmor: 'untrained',
      fortitude: 'expert', reflex: 'trained', will: 'master',
      perception: 'expert', classDC: 'trained', spellAttack: 'untrained', spellDC: 'untrained',
    },
    armorClass: 20, armorBonus: 0, shieldRaised: false,
    bonuses: [], penalties: [], conditions: [],
    initiative: 10, attacksMadeThisTurn: 0, actionsRemaining: 3,
    dying: false, deathSaveFailures: 0, deathSaveSuccesses: 0, deathSaveMadeThisTurn: false,
    wounded: 0, damageResistances: [], damageImmunities: [], damageWeaknesses: [],
    ...overrides,
  } as Creature;
}

function makeEnemy(overrides: Partial<Creature> = {}): Creature {
  return {
    ...makeCreature({ id: 'enemy-1', name: 'Goblin', type: 'creature', positions: { x: 1, y: 0 } }),
    ...overrides,
  } as Creature;
}

function makeGameState(creatures: Creature[]): GameState {
  return {
    id: 'game-1',
    name: 'Test Game',
    creatures,
    map: { width: 10, height: 10, terrain: [] },
    currentRound: { turnOrder: creatures.map(c => c.id), currentTurnIndex: 0, roundNumber: 1 },
    log: [],
    groundObjects: [],
  } as unknown as GameState;
}

// ─── Action Cost Table ───────────────────────────────────────

test('getActionCost: strike costs 1 action', () => {
  assert.equal(getActionCost('strike'), 1);
});

test('getActionCost: stride costs 1 action', () => {
  assert.equal(getActionCost('stride'), 1);
});

test('getActionCost: sudden-charge costs 3 actions', () => {
  assert.equal(getActionCost('sudden-charge'), 3);
});

test('getActionCost: double-slice costs 2 actions', () => {
  assert.equal(getActionCost('double-slice'), 2);
});

test('getActionCost: reactive-strike is a reaction', () => {
  assert.equal(getActionCost('reactive-strike'), 'reaction');
});

test('getActionCost: shield-block is a reaction', () => {
  assert.equal(getActionCost('shield-block'), 'reaction');
});

test('getActionCost: drop-weapon is free', () => {
  assert.equal(getActionCost('drop-weapon'), 'free');
});

test('getActionCost: unknown action defaults to 1', () => {
  assert.equal(getActionCost('totally-made-up-action'), 1);
});

// ─── Validate: Dying creature ────────────────────────────────

test('validateAction: dying creature can only make death saves', () => {
  const actor = makeCreature({ dying: true, currentHealth: 0 });
  const gs = makeGameState([actor]);

  const strikeResult = validateAction(actor, gs, 'strike', 'enemy-1');
  assert.equal(strikeResult.valid, false);
  assert.equal(strikeResult.errorCode, 'ACTOR_DYING');

  const deathSaveResult = validateAction(actor, gs, 'death-save');
  assert.equal(deathSaveResult.valid, true);
});

// ─── Validate: Unconscious creature ──────────────────────────

test('validateAction: unconscious creature cannot act', () => {
  const actor = makeCreature({ currentHealth: 0, dying: false });
  const gs = makeGameState([actor]);
  const result = validateAction(actor, gs, 'stride');
  assert.equal(result.valid, false);
  assert.equal(result.errorCode, 'ACTOR_UNCONSCIOUS');
});

// ─── Validate: Insufficient actions ──────────────────────────

test('validateAction: not enough actions for 3-action activity', () => {
  const actor = makeCreature({ actionsRemaining: 2 });
  const gs = makeGameState([actor]);
  const result = validateAction(actor, gs, 'sudden-charge');
  assert.equal(result.valid, false);
  assert.equal(result.errorCode, 'INSUFFICIENT_ACTIONS');
});

test('validateAction: enough actions for 2-action activity', () => {
  const actor = makeCreature({ actionsRemaining: 2 });
  const enemy = makeEnemy();
  const gs = makeGameState([actor, enemy]);
  const result = validateAction(actor, gs, 'double-slice', 'enemy-1');
  // Should at least pass action-cost check (may fail on other grounds)
  assert.notEqual(result.errorCode, 'INSUFFICIENT_ACTIONS');
});

// ─── Validate: Reaction already used ─────────────────────────

test('validateAction: reaction blocked when already used', () => {
  const actor = makeCreature({ reactionUsed: true });
  const gs = makeGameState([actor]);
  const result = validateAction(actor, gs, 'reactive-strike');
  assert.equal(result.valid, false);
  assert.equal(result.errorCode, 'REACTION_USED');
});

// ─── Validate: Flourish once per turn ────────────────────────

test('validateAction: flourish blocked on second use', () => {
  const actor = makeCreature({ flourishUsedThisTurn: true, actionsRemaining: 3 });
  const enemy = makeEnemy();
  const gs = makeGameState([actor, enemy]);
  // intimidating-strike has the flourish trait (2 actions)
  const result = validateAction(actor, gs, 'intimidating-strike', 'enemy-1');
  assert.equal(result.valid, false);
  assert.equal(result.errorCode, 'FLOURISH_ONCE_PER_TURN');
});

// ─── Validate: Free actions always allowed ───────────────────

test('validateAction: free actions work with 0 remaining actions', () => {
  const actor = makeCreature({ actionsRemaining: 0 });
  const gs = makeGameState([actor]);
  const result = validateAction(actor, gs, 'drop-weapon');
  // Free action should not fail on action cost
  assert.notEqual(result.errorCode, 'INSUFFICIENT_ACTIONS');
});

// ─── Validate: Valid strike ──────────────────────────────────

test('validateAction: valid strike against adjacent enemy passes', () => {
  const actor = makeCreature({
    actionsRemaining: 3, positions: { x: 0, y: 0 },
    equippedWeapon: 'longsword',
    weaponInventory: [{ weapon: { id: 'longsword', name: 'Longsword', damage: '1d8', damageType: 'slashing', rangeIncrement: 0, traits: [], weaponCategory: 'martial', group: 'sword', hands: '1' }, state: 'held' }] as any,
  });
  const enemy = makeEnemy({ positions: { x: 1, y: 0 } });
  const gs = makeGameState([actor, enemy]);
  const result = validateAction(actor, gs, 'strike', 'enemy-1', undefined, 'longsword');
  assert.equal(result.valid, true);
});
