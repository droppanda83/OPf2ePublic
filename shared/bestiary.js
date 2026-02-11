"use strict";
/**
 * PF2e Bestiary — Curated creature data for encounter building.
 * Stats sourced from the open-source Foundry VTT PF2e system (ORC license).
 *
 * Each entry is a Partial<Creature> that can be passed directly to
 * the game engine's initializeCreature(). NPC creatures use:
 *   - armorClass: flat AC (preserved by engine for NPCs)
 *   - pbAttackBonus: flat attack bonus (bypasses proficiency calc)
 *   - weaponDamageDice / weaponDamageBonus / weaponDamageType: damage
 *   - weaponDisplay: attack name shown in UI
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BESTIARY = void 0;
exports.getCreaturesByLevel = getCreaturesByLevel;
exports.getCreaturesInRange = getCreaturesInRange;
exports.getCreaturesByTag = getCreaturesByTag;
exports.pickRandom = pickRandom;
// ─── Helper ──────────────────────────────────────────
function abs(scores) {
    return {
        strength: scores.str,
        dexterity: scores.dex,
        constitution: scores.con,
        intelligence: scores.int,
        wisdom: scores.wis,
        charisma: scores.cha,
    };
}
/** Helper: create a held weapon slot from a CreatureWeapon */
function held(w) { return { weapon: w, state: 'held' }; }
/** Helper: create a stowed weapon slot */
function stowed(w) { return { weapon: w, state: 'stowed' }; }
/** Helper: create a natural attack (always held, 0 hands) */
function natural(id, display, dice, bonus, dmgType, traits) {
    return held({
        id, display, attackType: 'melee', damageDice: dice, damageBonus: bonus,
        damageType: dmgType, hands: 0, isNatural: true, traits,
    });
}
// ─── Bestiary Data ───────────────────────────────────
exports.BESTIARY = [
    // ────────────── Level -1 ──────────────
    {
        creature: {
            name: 'Goblin Warrior',
            level: -1,
            maxHealth: 6,
            armorClass: 16,
            speed: 25,
            abilities: abs({ str: 0, dex: 3, con: 1, int: 0, wis: -1, cha: 1 }),
            pbAttackBonus: 7,
            weaponDamageDice: '1d6',
            weaponDamageBonus: 0,
            weaponDamageType: 'slashing',
            weaponDisplay: 'Dogslicer',
            specials: ['Goblin Scuttle'],
            weaponInventory: [
                held({ id: 'dogslicer', display: 'Dogslicer', attackType: 'melee', damageDice: '1d6', damageBonus: 0, damageType: 'slashing', hands: 1, traits: ['agile', 'backstabber', 'finesse'], icon: '🗡️' }),
                stowed({ id: 'shortbow', display: 'Shortbow', attackType: 'ranged', damageDice: '1d6', damageBonus: 0, damageType: 'piercing', hands: 2, range: 12, traits: ['deadly d10'], icon: '🏹' }),
            ],
        },
        description: 'A scrappy goblin wielding a jagged dogslicer.',
        tags: ['humanoid', 'goblin'],
    },
    {
        creature: {
            name: 'Kobold Warrior',
            level: -1,
            maxHealth: 7,
            armorClass: 16,
            speed: 25,
            abilities: abs({ str: 1, dex: 3, con: -1, int: 0, wis: 1, cha: 1 }),
            pbAttackBonus: 3,
            weaponDamageDice: '1d6',
            weaponDamageBonus: 1,
            weaponDamageType: 'piercing',
            weaponDisplay: 'Spear',
            specials: ['Sneak Attack'],
            weaponInventory: [
                held({ id: 'spear', display: 'Spear', attackType: 'melee', damageDice: '1d6', damageBonus: 1, damageType: 'piercing', hands: 1, traits: ['thrown 4'], icon: '🔱' }),
                stowed({ id: 'sling', display: 'Sling', attackType: 'ranged', damageDice: '1d6', damageBonus: 1, damageType: 'bludgeoning', hands: 1, range: 10, icon: '🪨' }),
            ],
        },
        description: 'A cunning kobold with a spear and sling.',
        tags: ['humanoid', 'kobold'],
    },
    {
        creature: {
            name: 'Giant Rat',
            level: -1,
            maxHealth: 8,
            armorClass: 15,
            speed: 40,
            abilities: abs({ str: 1, dex: 3, con: 2, int: -4, wis: 1, cha: -3 }),
            pbAttackBonus: 7,
            weaponDamageDice: '1d6',
            weaponDamageBonus: 1,
            weaponDamageType: 'piercing',
            weaponDisplay: 'Jaws',
            weaponInventory: [
                natural('jaws', 'Jaws', '1d6', 1, 'piercing'),
            ],
        },
        description: 'An oversized rat with filthy, infectious teeth.',
        tags: ['animal'],
    },
    {
        creature: {
            name: 'Skeleton Guard',
            level: -1,
            maxHealth: 4,
            armorClass: 16,
            speed: 25,
            abilities: abs({ str: 2, dex: 4, con: 0, int: -1, wis: 0, cha: 0 }),
            pbAttackBonus: 6,
            weaponDamageDice: '1d6',
            weaponDamageBonus: 2,
            weaponDamageType: 'slashing',
            weaponDisplay: 'Scimitar',
            damageResistances: [
                { type: 'cold', value: 5 },
                { type: 'electricity', value: 5 },
                { type: 'fire', value: 5 },
                { type: 'piercing', value: 5 },
                { type: 'slashing', value: 5 },
            ],
            damageImmunities: ['poison'],
            weaponInventory: [
                held({ id: 'scimitar', display: 'Scimitar', attackType: 'melee', damageDice: '1d6', damageBonus: 2, damageType: 'slashing', hands: 1, traits: ['forceful', 'sweep'], icon: '⚔️' }),
                natural('claw', 'Claw', '1d4', 2, 'slashing', ['agile']),
            ],
        },
        description: 'An animated skeleton wielding a scimitar.',
        tags: ['undead', 'skeleton'],
    },
    {
        creature: {
            name: 'Zombie Shambler',
            level: -1,
            maxHealth: 20,
            armorClass: 12,
            speed: 20,
            abilities: abs({ str: 3, dex: -2, con: 2, int: -5, wis: 0, cha: -2 }),
            pbAttackBonus: 7,
            weaponDamageDice: '1d6',
            weaponDamageBonus: 3,
            weaponDamageType: 'bludgeoning',
            weaponDisplay: 'Fist',
            damageWeaknesses: [
                { type: 'slashing', value: 5 },
            ],
            damageImmunities: ['poison'],
            weaponInventory: [
                natural('fist', 'Fist', '1d6', 3, 'bludgeoning'),
            ],
        },
        description: 'A shambling corpse driven by unholy hunger.',
        tags: ['undead', 'zombie'],
    },
    // ────────────── Level 1 ──────────────
    {
        creature: {
            name: 'Wolf',
            level: 1,
            maxHealth: 24,
            armorClass: 15,
            speed: 40,
            abilities: abs({ str: 2, dex: 4, con: 1, int: -4, wis: 2, cha: -2 }),
            pbAttackBonus: 9,
            weaponDamageDice: '1d6',
            weaponDamageBonus: 2,
            weaponDamageType: 'piercing',
            weaponDisplay: 'Jaws',
            weaponInventory: [
                natural('jaws', 'Jaws', '1d6', 2, 'piercing', ['knockdown']),
            ],
        },
        description: 'A lean, hungry wolf with sharp fangs.',
        tags: ['animal'],
    },
    {
        creature: {
            name: 'Hobgoblin Soldier',
            level: 1,
            maxHealth: 20,
            armorClass: 18,
            speed: 25,
            abilities: abs({ str: 3, dex: 3, con: 2, int: 0, wis: 2, cha: -1 }),
            pbAttackBonus: 8,
            weaponDamageDice: '1d8',
            weaponDamageBonus: 3,
            weaponDamageType: 'slashing',
            weaponDisplay: 'Longsword',
            equippedShield: 'wooden',
            specials: ['Reactive Strike', 'Shield Block'],
            weaponInventory: [
                held({ id: 'longsword', display: 'Longsword', attackType: 'melee', damageDice: '1d8', damageBonus: 3, damageType: 'slashing', hands: 1, traits: ['versatile P'], icon: '⚔️' }),
                stowed({ id: 'shortbow', display: 'Shortbow', attackType: 'ranged', damageDice: '1d6', damageBonus: 0, damageType: 'piercing', hands: 2, range: 12, traits: ['deadly d10'], icon: '🏹' }),
            ],
        },
        description: 'A disciplined hobgoblin with longsword and shield.',
        tags: ['humanoid', 'hobgoblin'],
    },
    // ────────────── Level 2 ──────────────
    {
        creature: {
            name: 'Leopard',
            level: 2,
            maxHealth: 30,
            armorClass: 18,
            speed: 40,
            abilities: abs({ str: 3, dex: 4, con: 2, int: -4, wis: 1, cha: -2 }),
            pbAttackBonus: 10,
            weaponDamageDice: '1d10',
            weaponDamageBonus: 3,
            weaponDamageType: 'piercing',
            weaponDisplay: 'Jaws',
            weaponInventory: [
                natural('jaws', 'Jaws', '1d10', 3, 'piercing'),
                natural('claw', 'Claw', '1d6', 3, 'slashing', ['agile']),
            ],
        },
        description: 'A stealthy big cat that pounces from ambush.',
        tags: ['animal'],
    },
    {
        creature: {
            name: 'Crocodile',
            level: 2,
            maxHealth: 30,
            armorClass: 17,
            speed: 30,
            abilities: abs({ str: 4, dex: 1, con: 3, int: -5, wis: 1, cha: -4 }),
            pbAttackBonus: 10,
            weaponDamageDice: '1d10',
            weaponDamageBonus: 4,
            weaponDamageType: 'piercing',
            weaponDisplay: 'Jaws',
            weaponInventory: [
                natural('jaws', 'Jaws', '1d10', 4, 'piercing', ['grab']),
                natural('tail', 'Tail', '1d6', 4, 'bludgeoning', ['agile']),
            ],
        },
        description: 'A patient reptilian ambush predator.',
        tags: ['animal'],
    },
    {
        creature: {
            name: 'Warg',
            level: 2,
            maxHealth: 36,
            armorClass: 17,
            speed: 40,
            abilities: abs({ str: 4, dex: 3, con: 3, int: -1, wis: 2, cha: 2 }),
            pbAttackBonus: 11,
            weaponDamageDice: '1d8',
            weaponDamageBonus: 4,
            weaponDamageType: 'piercing',
            weaponDisplay: 'Jaws',
            weaponInventory: [
                natural('jaws', 'Jaws', '1d8', 4, 'piercing', ['knockdown']),
            ],
        },
        description: 'An intelligent, malicious wolf-like beast.',
        tags: ['beast'],
    },
    {
        creature: {
            name: 'Boar',
            level: 2,
            maxHealth: 40,
            armorClass: 15,
            speed: 40,
            abilities: abs({ str: 4, dex: 1, con: 4, int: -4, wis: 2, cha: -3 }),
            pbAttackBonus: 10,
            weaponDamageDice: '2d6',
            weaponDamageBonus: 4,
            weaponDamageType: 'piercing',
            weaponDisplay: 'Tusk',
            weaponInventory: [
                natural('tusk', 'Tusk', '2d6', 4, 'piercing'),
            ],
        },
        description: 'A ferocious wild boar with sharp tusks.',
        tags: ['animal'],
    },
    {
        creature: {
            name: 'Bugbear Prowler',
            level: 2,
            maxHealth: 34,
            armorClass: 17,
            speed: 30,
            abilities: abs({ str: 4, dex: 2, con: 3, int: -1, wis: 1, cha: 0 }),
            pbAttackBonus: 10,
            weaponDamageDice: '1d8',
            weaponDamageBonus: 4,
            weaponDamageType: 'piercing',
            weaponDisplay: 'Bastard Sword',
            specials: ['Vicious Swing'],
            weaponInventory: [
                held({ id: 'bastard-sword', display: 'Bastard Sword', attackType: 'melee', damageDice: '1d8', damageBonus: 4, damageType: 'piercing', hands: 1, traits: ['two-hand d12'], icon: '⚔️' }),
                stowed({ id: 'dagger', display: 'Dagger', attackType: 'melee', damageDice: '1d4', damageBonus: 4, damageType: 'piercing', hands: 1, traits: ['agile', 'finesse', 'thrown 2', 'versatile S'], icon: '🗡️' }),
            ],
        },
        description: 'A sneaky bugbear that prefers ambush tactics.',
        tags: ['humanoid', 'bugbear'],
    },
    {
        creature: {
            name: 'Kholo Hunter',
            level: 2,
            maxHealth: 29,
            armorClass: 18,
            speed: 40,
            abilities: abs({ str: 4, dex: 3, con: 2, int: -1, wis: 1, cha: 0 }),
            pbAttackBonus: 10,
            weaponDamageDice: '1d8',
            weaponDamageBonus: 4,
            weaponDamageType: 'slashing',
            weaponDisplay: 'Battle Axe',
            weaponInventory: [
                held({ id: 'battle-axe', display: 'Battle Axe', attackType: 'melee', damageDice: '1d8', damageBonus: 4, damageType: 'slashing', hands: 1, traits: ['sweep'], icon: '🪓' }),
                stowed({ id: 'shortbow', display: 'Shortbow', attackType: 'ranged', damageDice: '1d6', damageBonus: 0, damageType: 'piercing', hands: 2, range: 12, traits: ['deadly d10'], icon: '🏹' }),
                natural('jaws', 'Jaws', '1d6', 4, 'piercing'),
            ],
        },
        description: 'A gnoll-like hunter wielding a battle axe.',
        tags: ['humanoid', 'gnoll'],
    },
    {
        creature: {
            name: 'Orc Commander',
            level: 2,
            maxHealth: 32,
            armorClass: 19,
            speed: 30,
            abilities: abs({ str: 4, dex: 2, con: 1, int: -1, wis: 1, cha: 2 }),
            pbAttackBonus: 10,
            weaponDamageDice: '1d10',
            weaponDamageBonus: 4,
            weaponDamageType: 'bludgeoning',
            weaponDisplay: 'Greatclub',
            specials: ['Reactive Strike', 'Vicious Swing'],
            weaponInventory: [
                held({ id: 'greatclub', display: 'Greatclub', attackType: 'melee', damageDice: '1d10', damageBonus: 4, damageType: 'bludgeoning', hands: 2, traits: ['backswing', 'shove'], icon: '🏏' }),
                stowed({ id: 'javelin', display: 'Javelin', attackType: 'ranged', damageDice: '1d6', damageBonus: 4, damageType: 'piercing', hands: 1, range: 6, traits: ['thrown 6'], icon: '🔱' }),
            ],
        },
        description: 'An orc leader commanding through raw strength.',
        tags: ['humanoid', 'orc'],
    },
    {
        creature: {
            name: 'Animated Armor',
            level: 2,
            maxHealth: 20,
            armorClass: 17,
            speed: 20,
            abilities: abs({ str: 3, dex: -3, con: 4, int: -5, wis: 0, cha: -5 }),
            pbAttackBonus: 10,
            weaponDamageDice: '1d8',
            weaponDamageBonus: 4,
            weaponDamageType: 'slashing',
            weaponDisplay: 'Glaive',
            damageImmunities: ['poison'],
            weaponInventory: [
                held({ id: 'glaive', display: 'Glaive', attackType: 'melee', damageDice: '1d8', damageBonus: 4, damageType: 'slashing', hands: 2, traits: ['deadly d8', 'forceful', 'reach'], icon: '🔱' }),
            ],
        },
        description: 'A suit of armor given life by magic.',
        tags: ['construct'],
    },
    // ────────────── Level 3 ──────────────
    {
        creature: {
            name: 'Dire Wolf',
            level: 3,
            maxHealth: 50,
            armorClass: 18,
            speed: 45,
            abilities: abs({ str: 5, dex: 3, con: 4, int: -4, wis: 3, cha: -2 }),
            pbAttackBonus: 12,
            weaponDamageDice: '1d10',
            weaponDamageBonus: 5,
            weaponDamageType: 'piercing',
            weaponDisplay: 'Jaws',
            weaponInventory: [
                natural('jaws', 'Jaws', '1d10', 5, 'piercing', ['knockdown', 'grab']),
            ],
        },
        description: 'A massive wolf, alpha of its pack.',
        tags: ['animal'],
    },
    {
        creature: {
            name: 'Lion',
            level: 3,
            maxHealth: 45,
            armorClass: 18,
            speed: 45,
            abilities: abs({ str: 4, dex: 3, con: 2, int: -4, wis: 2, cha: -2 }),
            pbAttackBonus: 11,
            weaponDamageDice: '1d10',
            weaponDamageBonus: 6,
            weaponDamageType: 'piercing',
            weaponDisplay: 'Jaws',
            weaponInventory: [
                natural('jaws', 'Jaws', '1d10', 6, 'piercing', ['grab']),
                natural('claw', 'Claw', '1d8', 4, 'slashing', ['agile']),
            ],
        },
        description: 'A powerful feline predator, king of beasts.',
        tags: ['animal'],
    },
    {
        creature: {
            name: 'Grizzly Bear',
            level: 3,
            maxHealth: 59,
            armorClass: 17,
            speed: 40,
            abilities: abs({ str: 4, dex: 1, con: 5, int: -4, wis: 1, cha: -2 }),
            pbAttackBonus: 11,
            weaponDamageDice: '2d8',
            weaponDamageBonus: 4,
            weaponDamageType: 'piercing',
            weaponDisplay: 'Jaws',
            weaponInventory: [
                natural('jaws', 'Jaws', '2d8', 4, 'piercing'),
                natural('claw', 'Claw', '1d10', 4, 'slashing', ['agile', 'grab']),
            ],
        },
        description: 'A massive bear with devastating claws.',
        tags: ['animal'],
    },
    {
        creature: {
            name: 'Ogre Warrior',
            level: 3,
            maxHealth: 50,
            armorClass: 17,
            speed: 35,
            abilities: abs({ str: 5, dex: -1, con: 4, int: -2, wis: 0, cha: -2 }),
            pbAttackBonus: 12,
            weaponDamageDice: '1d10',
            weaponDamageBonus: 7,
            weaponDamageType: 'piercing',
            weaponDisplay: 'Ogre Hook',
            weaponInventory: [
                held({ id: 'ogre-hook', display: 'Ogre Hook', attackType: 'melee', damageDice: '1d10', damageBonus: 7, damageType: 'piercing', hands: 2, traits: ['deadly d10', 'reach', 'trip'], icon: '⚔️' }),
                stowed({ id: 'javelin', display: 'Javelin', attackType: 'ranged', damageDice: '1d6', damageBonus: 5, damageType: 'piercing', hands: 1, range: 6, traits: ['thrown 6'], icon: '🔱' }),
                natural('fist', 'Fist', '1d4', 5, 'bludgeoning'),
            ],
        },
        description: 'A towering brute wielding a brutal ogre hook.',
        tags: ['humanoid', 'giant'],
    },
    // ────────────── Level 4 ──────────────
    {
        creature: {
            name: 'Owlbear',
            level: 4,
            maxHealth: 70,
            armorClass: 21,
            speed: 40,
            abilities: abs({ str: 6, dex: 1, con: 5, int: -4, wis: 3, cha: 0 }),
            pbAttackBonus: 14,
            weaponDamageDice: '1d12',
            weaponDamageBonus: 6,
            weaponDamageType: 'piercing',
            weaponDisplay: 'Beak',
            weaponInventory: [
                natural('beak', 'Beak', '1d12', 6, 'piercing'),
                natural('talon', 'Talon', '1d10', 6, 'slashing', ['agile']),
            ],
        },
        description: 'A fearsome hybrid of owl and bear, territorial and aggressive.',
        tags: ['animal'],
    },
    {
        creature: {
            name: 'Minotaur Hunter',
            level: 4,
            maxHealth: 70,
            armorClass: 20,
            speed: 35,
            abilities: abs({ str: 6, dex: 0, con: 3, int: -2, wis: 2, cha: -1 }),
            pbAttackBonus: 14,
            weaponDamageDice: '1d12',
            weaponDamageBonus: 8,
            weaponDamageType: 'slashing',
            weaponDisplay: 'Greataxe',
            weaponInventory: [
                held({ id: 'greataxe', display: 'Greataxe', attackType: 'melee', damageDice: '1d12', damageBonus: 8, damageType: 'slashing', hands: 2, traits: ['sweep'], icon: '🪓' }),
                natural('horn', 'Horn', '1d8', 6, 'piercing'),
            ],
        },
        description: 'A labyrinth-dwelling beast with a massive greataxe.',
        tags: ['beast', 'humanoid'],
    },
    // ────────────── Level 5 ──────────────
    {
        creature: {
            name: 'Troll',
            level: 5,
            maxHealth: 115,
            armorClass: 20,
            speed: 35,
            abilities: abs({ str: 5, dex: 2, con: 6, int: -2, wis: 0, cha: -2 }),
            pbAttackBonus: 14,
            weaponDamageDice: '2d10',
            weaponDamageBonus: 5,
            weaponDamageType: 'piercing',
            weaponDisplay: 'Jaws',
            damageWeaknesses: [{ type: 'fire', value: 10 }],
            specials: ['Reactive Strike'],
            weaponInventory: [
                natural('jaws', 'Jaws', '2d10', 5, 'piercing'),
                natural('claw', 'Claw', '2d6', 5, 'slashing', ['agile', 'reach']),
            ],
        },
        description: 'A regenerating giant with a voracious appetite.',
        tags: ['giant', 'troll'],
    },
    {
        creature: {
            name: 'Harpy',
            level: 5,
            maxHealth: 75,
            armorClass: 21,
            speed: 40,
            abilities: abs({ str: 1, dex: 4, con: 0, int: -1, wis: 1, cha: 2 }),
            pbAttackBonus: 15,
            weaponDamageDice: '2d6',
            weaponDamageBonus: 4,
            weaponDamageType: 'slashing',
            weaponDisplay: 'Talon',
            weaponInventory: [
                natural('talon', 'Talon', '2d6', 4, 'slashing', ['agile']),
                held({ id: 'club', display: 'Club', attackType: 'melee', damageDice: '1d6', damageBonus: 1, damageType: 'bludgeoning', hands: 1, traits: ['thrown 2'], icon: '🪵' }),
            ],
        },
        description: 'A cruel winged predator with a bewitching song.',
        tags: ['beast', 'humanoid'],
    },
    // ────────────── Level 6 ──────────────
    {
        creature: {
            name: 'Manticore',
            level: 6,
            maxHealth: 90,
            armorClass: 23,
            speed: 40,
            abilities: abs({ str: 5, dex: 2, con: 4, int: -2, wis: 2, cha: -1 }),
            pbAttackBonus: 17,
            weaponDamageDice: '2d8',
            weaponDamageBonus: 8,
            weaponDamageType: 'piercing',
            weaponDisplay: 'Jaws',
            weaponInventory: [
                natural('jaws', 'Jaws', '2d8', 8, 'piercing'),
                natural('claw', 'Claw', '2d6', 5, 'slashing', ['agile']),
                natural('tail-spikes', 'Tail Spikes', '1d10', 5, 'piercing'),
            ],
        },
        description: 'A lion-bodied beast with bat wings and a spiked tail.',
        tags: ['beast'],
    },
];
// ─── Lookup helpers ──────────────────────────────────
/** Get all creatures at a specific level */
function getCreaturesByLevel(level) {
    return exports.BESTIARY.filter((b) => b.creature.level === level);
}
/** Get all creatures within a level range (inclusive) */
function getCreaturesInRange(minLevel, maxLevel) {
    return exports.BESTIARY.filter((b) => {
        const lv = b.creature.level ?? 0;
        return lv >= minLevel && lv <= maxLevel;
    });
}
/** Get all creatures matching any of the given tags */
function getCreaturesByTag(tags) {
    return exports.BESTIARY.filter((b) => b.tags.some((t) => tags.includes(t)));
}
/** Pick a random creature from a list */
function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}
