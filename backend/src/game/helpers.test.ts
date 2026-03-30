/**
 * Tests for helpers.ts — weapon trait parsing, range increment penalties,
 * dying initialization, effective speed.
 * Phase E.2 — Core combat tests.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTraits, hasTrait, getTraitParam, calculateRangeIncrementPenalty, initDying, getEffectiveSpeed, hasBlankSlate, getAvailableDebilitations } from './helpers';
import type { Creature } from 'pf2e-shared';

// ─── Fixture ─────────────────────────────────────────────────

function makeCreature(overrides: Partial<Creature> = {}): Creature {
  return {
    id: 'test-1', name: 'Test Hero', type: 'player', level: 5,
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
    initiative: 0, attacksMadeThisTurn: 0,
    dying: false, deathSaveFailures: 0, deathSaveSuccesses: 0, deathSaveMadeThisTurn: false,
    wounded: 0, damageResistances: [], damageImmunities: [], damageWeaknesses: [],
    ...overrides,
  } as Creature;
}

// ─── Trait Parsing ───────────────────────────────────────────

test('parseTraits: empty/undefined returns empty map', () => {
  assert.equal(parseTraits(undefined).size, 0);
  assert.equal(parseTraits([]).size, 0);
});

test('parseTraits: simple traits parsed as boolean', () => {
  const parsed = parseTraits(['agile', 'finesse', 'sweep']);
  assert.equal(parsed.get('agile'), true);
  assert.equal(parsed.get('finesse'), true);
  assert.equal(parsed.get('sweep'), true);
});

test('parseTraits: parameterized traits parsed correctly', () => {
  const parsed = parseTraits(['deadly d10', 'volley 30', 'thrown 20']);
  assert.equal(parsed.get('deadly'), 'd10');
  assert.equal(parsed.get('volley'), '30');
  assert.equal(parsed.get('thrown'), '20');
});

// ─── hasTrait ────────────────────────────────────────────────

test('hasTrait: returns true for matching trait', () => {
  assert.equal(hasTrait(['agile', 'finesse'], 'agile'), true);
});

test('hasTrait: case-insensitive', () => {
  assert.equal(hasTrait(['Deadly d10'], 'deadly'), true);
});

test('hasTrait: returns false for missing trait', () => {
  assert.equal(hasTrait(['agile'], 'finesse'), false);
});

test('hasTrait: returns false for undefined traits', () => {
  assert.equal(hasTrait(undefined, 'agile'), false);
});

// ─── getTraitParam ───────────────────────────────────────────

test('getTraitParam: extracts die size from deadly trait', () => {
  assert.equal(getTraitParam(['deadly d10'], 'deadly'), 'd10');
});

test('getTraitParam: returns undefined for simple (boolean) traits', () => {
  assert.equal(getTraitParam(['agile'], 'agile'), undefined);
});

test('getTraitParam: returns undefined for missing trait', () => {
  assert.equal(getTraitParam(['agile'], 'deadly'), undefined);
});

// ─── Range Increment Penalty ─────────────────────────────────

test('calculateRangeIncrementPenalty: within first increment = 0 penalty', () => {
  // 12sq range increment (= 60ft), distance 2 squares → in first increment
  const result = calculateRangeIncrementPenalty(2, 12);
  assert.equal(result.penalty, 0);
  assert.equal(result.inRange, true);
});

test('calculateRangeIncrementPenalty: second increment = -2', () => {
  // 12sq range increment (= 60ft). Distance 15sq → 2nd increment → -2
  const result = calculateRangeIncrementPenalty(15, 12);
  assert.equal(result.penalty, -2);
  assert.equal(result.inRange, true);
});

test('calculateRangeIncrementPenalty: beyond max range = out of range', () => {
  // 12sq range increment. 7+ increments (85 sq) → out of range
  const result = calculateRangeIncrementPenalty(85, 12);
  assert.equal(result.inRange, false);
});

// ─── initDying ───────────────────────────────────────────────

test('initDying: sets dying to true with value 1 when not wounded', () => {
  const creature = makeCreature({ wounded: 0, conditions: [] });
  const msg = initDying(creature);
  assert.equal(creature.dying, true);
  assert.ok(creature.conditions.some(c => c.name === 'dying' && c.value === 1));
  assert.ok(msg.includes('DYING 1'));
});

test('initDying: dying value = 1 + wounded', () => {
  const creature = makeCreature({ wounded: 2, conditions: [] });
  initDying(creature);
  const dyingCond = creature.conditions.find(c => c.name === 'dying');
  assert.ok(dyingCond);
  assert.equal(dyingCond!.value, 3); // 1 + wounded 2
});

test('initDying: Orc Ferocity prevents dying, stays at 1 HP', () => {
  const creature = makeCreature({
    specials: ['Orc Ferocity'], wounded: 0, conditions: [], currentHealth: 0,
  });
  const msg = initDying(creature);
  assert.equal(creature.dying, false);
  assert.equal(creature.currentHealth, 1);
  assert.ok(msg.includes('ORC FEROCITY'));
  assert.equal(creature.wounded, 1); // increments wounded
});

// ─── getEffectiveSpeed ───────────────────────────────────────

test('getEffectiveSpeed: base speed when no armor or debilitation', () => {
  const creature = makeCreature({ speed: 30 });
  assert.equal(getEffectiveSpeed(creature), 30);
});

test('getEffectiveSpeed: minimum speed is 5', () => {
  const creature = makeCreature({
    speed: 5,
    conditions: [{ name: 'slowed-speed', duration: 'permanent', value: 10 }],
  });
  assert.equal(getEffectiveSpeed(creature), 5);
});
