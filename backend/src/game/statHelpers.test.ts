/**
 * Tests for statHelpers.ts — distance calculations, skill bonuses,
 * save DCs, weapon selection, feat detection.
 * Phase E.2 — Core combat tests.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateDistance, getSkillBonus, getPerceptionDC, getWillDC, getReflexDC, getFortitudeDC, hasFeat, getSelectedWeapon } from './statHelpers';
import type { Creature, WeaponSlot } from 'pf2e-shared';

// ─── Test Fixture Helpers ────────────────────────────────────

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

// ─── Distance ────────────────────────────────────────────────

test('calculateDistance: same position returns 0', () => {
  assert.equal(calculateDistance({ x: 3, y: 5 }, { x: 3, y: 5 }), 0);
});

test('calculateDistance: horizontal distance', () => {
  assert.equal(calculateDistance({ x: 0, y: 0 }, { x: 3, y: 0 }), 3);
});

test('calculateDistance: vertical distance', () => {
  assert.equal(calculateDistance({ x: 0, y: 0 }, { x: 0, y: 4 }), 4);
});

test('calculateDistance: diagonal distance (3,4,5 triangle)', () => {
  assert.equal(calculateDistance({ x: 0, y: 0 }, { x: 3, y: 4 }), 5);
});

// ─── Skill Bonus ─────────────────────────────────────────────

test('getSkillBonus: uses precomputed skill bonus from array', () => {
  const creature = makeCreature({
    skills: [{ name: 'Athletics', proficiency: 'trained' as const, bonus: 12, abilityMod: 4, profBonus: 7 }],
  });
  assert.equal(getSkillBonus(creature, 'Athletics'), 12);
});

test('getSkillBonus: case-insensitive lookup', () => {
  const creature = makeCreature({
    skills: [{ name: 'Stealth', proficiency: 'trained' as const, bonus: 9, abilityMod: 3, profBonus: 5 }],
  });
  assert.equal(getSkillBonus(creature, 'stealth'), 9);
});

test('getSkillBonus: fallback computation when skill not in array', () => {
  const creature = makeCreature({ skills: [] });
  // Athletics → STR-based. STR mod = 4, trained prof at level 5 = 5+2=7 → total 11
  const bonus = getSkillBonus(creature, 'athletics');
  assert.equal(typeof bonus, 'number');
  assert.ok(bonus > 0, 'Should compute a positive bonus for trained skill');
});

// ─── Save DCs ────────────────────────────────────────────────

test('getPerceptionDC: returns perception skill bonus + 10', () => {
  const creature = makeCreature({
    skills: [{ name: 'Perception', proficiency: 'expert' as const, bonus: 14, abilityMod: 3, profBonus: 9 }],
  });
  // DC = 10 + bonus = 24
  assert.equal(getPerceptionDC(creature), 24);
});

test('getWillDC: returns a numeric DC', () => {
  const creature = makeCreature();
  const dc = getWillDC(creature);
  assert.equal(typeof dc, 'number');
  assert.ok(dc >= 10, 'Will DC should be at least 10');
});

test('getReflexDC: returns a numeric DC', () => {
  const creature = makeCreature();
  const dc = getReflexDC(creature);
  assert.equal(typeof dc, 'number');
  assert.ok(dc >= 10, 'Reflex DC should be at least 10');
});

test('getFortitudeDC: returns a numeric DC', () => {
  const creature = makeCreature();
  const dc = getFortitudeDC(creature);
  assert.equal(typeof dc, 'number');
  assert.ok(dc >= 10, 'Fortitude DC should be at least 10');
});

// ─── Feat Detection ──────────────────────────────────────────

test('hasFeat: true when feat is present', () => {
  const creature = makeCreature({
    feats: [{ name: 'Power Attack', type: 'class', level: 2 }, { name: 'Sudden Charge', type: 'class', level: 1 }],
  });
  assert.equal(hasFeat(creature, 'Power Attack'), true);
});

test('hasFeat: false when feat is absent', () => {
  const creature = makeCreature({ feats: [] });
  assert.equal(hasFeat(creature, 'Power Attack'), false);
});

test('hasFeat: case-insensitive match', () => {
  const creature = makeCreature({
    feats: [{ name: 'Sudden Charge', type: 'class', level: 1 }],
  });
  assert.equal(hasFeat(creature, 'sudden charge'), true);
});

// ─── Weapon Selection ────────────────────────────────────────

test('getSelectedWeapon: returns weapon by ID from inventory', () => {
  // weaponInventory stores slot objects { weapon, state }
  const inventory: WeaponSlot[] = [
    { weapon: { id: 'longsword-1', display: 'Longsword', attackType: 'melee', damageDice: '1d8', damageType: 'slashing', hands: 1 }, state: 'held' },
    { weapon: { id: 'shortbow-1', display: 'Shortbow', attackType: 'ranged', damageDice: '1d6', damageType: 'piercing', hands: 2, range: 12 }, state: 'stowed' },
  ];
  const creature = makeCreature({ weaponInventory: inventory });
  const selected = getSelectedWeapon(creature, 'shortbow-1');
  assert.ok(selected);
  assert.equal(selected!.display, 'Shortbow');
});

test('getSelectedWeapon: returns null for unknown weaponId', () => {
  const creature = makeCreature({ weaponInventory: [] });
  const selected = getSelectedWeapon(creature, 'nonexistent');
  assert.equal(selected, null);
});
