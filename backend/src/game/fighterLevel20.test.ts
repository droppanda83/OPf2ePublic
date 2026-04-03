import test from 'node:test';
import assert from 'node:assert/strict';
import { GameEngine } from './engine';
import type { Creature } from 'pf2e-shared';

function makeFighter(name: string, withSupremacy: boolean): Creature {
  return {
    name,
    type: 'player' as const,
    characterClass: 'Fighter',
    level: 20,
    maxHealth: 300,
    currentHealth: 300,
    speed: 25,
    positions: { x: 0, y: 0 },
    equippedWeapon: 'longsword',
    abilities: {
      strength: 7,
      dexterity: 5,
      constitution: 6,
      intelligence: 1,
      wisdom: 2,
      charisma: 1,
    },
    proficiencies: {
      unarmed: 'trained',
      simpleWeapons: 'legendary',
      martialWeapons: 'legendary',
      advancedWeapons: 'trained',
      unarmored: 'master',
      lightArmor: 'master',
      mediumArmor: 'master',
      heavyArmor: 'master',
      fortitude: 'master',
      reflex: 'expert',
      will: 'master',
      perception: 'master',
      classDC: 'master',
      spellAttack: 'untrained',
      spellDC: 'untrained',
    },
    feats: withSupremacy
      ? ['Weapon Supremacy', 'Boundless Reprisals', 'Ultimate Flexibility']
      : ['Boundless Reprisals', 'Ultimate Flexibility'],
  } as Creature;
}

function makeTarget(): Creature {
  return {
    name: 'AC Dummy',
    type: 'creature' as const,
    level: 20,
    maxHealth: 999,
    currentHealth: 999,
    armorClass: 10,
    speed: 25,
    positions: { x: 1, y: 0 },
    abilities: {
      strength: 0,
      dexterity: 0,
      constitution: 0,
      intelligence: 0,
      wisdom: 0,
      charisma: 0,
    },
    proficiencies: {
      unarmed: 'trained',
      simpleWeapons: 'trained',
      martialWeapons: 'trained',
      advancedWeapons: 'trained',
      unarmored: 'trained',
      lightArmor: 'trained',
      mediumArmor: 'trained',
      heavyArmor: 'trained',
      fortitude: 'trained',
      reflex: 'trained',
      will: 'trained',
      perception: 'trained',
      classDC: 'trained',
      spellAttack: 'untrained',
      spellDC: 'untrained',
    },
  } as Creature;
}

function runStrike(withSupremacy: boolean) {
  const engine = new GameEngine();
  const game = engine.createGame(
    [makeFighter(withSupremacy ? 'Fighter+WS' : 'Fighter', withSupremacy)],
    [makeTarget()],
    10
  );

  const fighter = game.creatures.find((c) => c.name.includes('Fighter'));
  const target = game.creatures.find((c) => c.name === 'AC Dummy');

  assert.ok(fighter, 'fighter should exist');
  assert.ok(target, 'target dummy should exist');

  const out = engine.executeAction(game.id, fighter.id, 'strike', target.id, undefined, fighter.equippedWeapon);
  const details = out?.result?.details as {
    bonus?: number;
    damage?: { weaponSpecializationBonus?: number; abilityMod?: number };
  } | undefined;

  assert.ok(details, 'attack should include roll details');
  assert.equal(typeof details.bonus, 'number', 'attack bonus should be numeric');
  assert.ok(details.damage, 'damage details should exist against low-AC dummy');

  return details;
}

test('Level 20 Fighter combat math: Weapon Supremacy and specialization scaling', () => {
  const base = runStrike(false);
  const withWS = runStrike(true);

  assert.equal(withWS.bonus - base.bonus, 4, 'Weapon Supremacy should add +4 attack bonus with legendary proficiency');
  assert.equal(base.damage.weaponSpecializationBonus, 8, 'Legendary + Greater Weapon Specialization should grant +8 damage');
  assert.equal(withWS.damage.weaponSpecializationBonus, 8, 'Weapon specialization should remain +8 with Weapon Supremacy active');
  assert.equal(base.damage.abilityMod, 7, 'Melee damage should include STR modifier (+7)');
  assert.equal(withWS.damage.abilityMod, 7, 'Melee damage should include STR modifier (+7) with Weapon Supremacy');
});
