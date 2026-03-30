"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pickRandom = exports.getCreatureByName = exports.getCreaturesByTag = exports.getCreaturesInRange = exports.getCreaturesByLevel = exports.getSpell = void 0;
exports.rollDice = rollDice;
exports.calculateFinalDamage = calculateFinalDamage;
exports.applyDamageToShield = applyDamageToShield;
// Export all shared types
__exportStar(require("./types"), exports);
__exportStar(require("./movement"), exports);
__exportStar(require("./ac"), exports);
__exportStar(require("./spells"), exports);
var spells_1 = require("./spells");
Object.defineProperty(exports, "getSpell", { enumerable: true, get: function () { return spells_1.getSpell; } });
__exportStar(require("./weapons"), exports);
__exportStar(require("./shields"), exports);
__exportStar(require("./armor"), exports);
__exportStar(require("./runes"), exports);
__exportStar(require("./consumables"), exports);
__exportStar(require("./adventuringGear"), exports);
__exportStar(require("./wornItems"), exports);
__exportStar(require("./actions"), exports);
__exportStar(require("./bonuses"), exports);
var bestiary_1 = require("./bestiary");
Object.defineProperty(exports, "getCreaturesByLevel", { enumerable: true, get: function () { return bestiary_1.getCreaturesByLevel; } });
Object.defineProperty(exports, "getCreaturesInRange", { enumerable: true, get: function () { return bestiary_1.getCreaturesInRange; } });
Object.defineProperty(exports, "getCreaturesByTag", { enumerable: true, get: function () { return bestiary_1.getCreaturesByTag; } });
Object.defineProperty(exports, "getCreatureByName", { enumerable: true, get: function () { return bestiary_1.getCreatureByName; } });
Object.defineProperty(exports, "pickRandom", { enumerable: true, get: function () { return bestiary_1.pickRandom; } });
__exportStar(require("./encounterBuilder"), exports);
__exportStar(require("./encounterMaps"), exports);
// foundryEncounterMaps removed – FOUNDRY_MAP_CATALOG had zero consumers (274 KB dead code)
__exportStar(require("./feats"), exports);
__exportStar(require("./mapGenerator"), exports);
__exportStar(require("./atlasMapGenerator"), exports);
__exportStar(require("./creatureTokens"), exports);
// Companion / Familiar / Eidolon catalogs
__exportStar(require("./companions"), exports);
__exportStar(require("./familiarAbilities"), exports);
__exportStar(require("./eidolons"), exports);
// Dice rolling utility
function rollDice(times, sides) {
    const results = [];
    for (let i = 0; i < times; i++) {
        results.push(Math.floor(Math.random() * sides) + 1);
    }
    return results;
}
function calculateFinalDamage(baseDamage, damageType, target) {
    // Check for immunity first (complete negation)
    if (target.damageImmunities?.includes(damageType)) {
        return { finalDamage: 0, modifier: 'immune' };
    }
    // Check for weakness (extra damage)
    const weakness = target.damageWeaknesses?.find(w => w.type === damageType);
    if (weakness) {
        const finalDamage = baseDamage + weakness.value;
        return { finalDamage, modifier: 'weak', modifierValue: weakness.value };
    }
    // Check for resistance (reduced damage)
    const resistance = target.damageResistances?.find(r => r.type === damageType);
    if (resistance) {
        const finalDamage = Math.max(0, baseDamage - resistance.value);
        return { finalDamage, modifier: 'resist', modifierValue: resistance.value };
    }
    return { finalDamage: baseDamage, modifier: 'normal' };
}
// Shield damage calculation
const shields_1 = require("./shields");
function applyDamageToShield(creature, incomingDamage) {
    const result = {
        incomingDamage,
        shieldAbsorbed: 0,
        shieldTakenDamage: 0,
        creatureTakenDamage: incomingDamage,
        shieldBroken: false,
        shieldHpRemaining: 0,
    };
    // If no shield equipped OR shield not raised, all damage goes to creature
    if (!creature.equippedShield || !creature.shieldRaised) {
        return result;
    }
    // Shield Block must be armed to apply hardness and damage to shield
    const blockIndex = creature.conditions?.findIndex((c) => c.name === 'shield-block-ready' && ((c.usesRemaining ?? 1) > 0)) ?? -1;
    if (blockIndex < 0) {
        return result;
    }
    const shield = (0, shields_1.getShield)(creature.equippedShield);
    if (!shield) {
        return result;
    }
    // Initialize shield HP if not set
    if (creature.currentShieldHp === undefined) {
        creature.currentShieldHp = shield.maxHp;
    }
    // Apply shield hardness (flat damage reduction)
    result.shieldAbsorbed = Math.min(incomingDamage, shield.hardness);
    const damageAfterHardness = Math.max(0, incomingDamage - shield.hardness);
    // Apply remaining damage to shield HP
    result.shieldTakenDamage = Math.min(damageAfterHardness, creature.currentShieldHp);
    creature.currentShieldHp -= result.shieldTakenDamage;
    // Any damage that exceeds shield HP goes to creature
    result.creatureTakenDamage = Math.max(0, damageAfterHardness - result.shieldTakenDamage);
    // Mark shield as broken if HP reaches 0
    if (creature.currentShieldHp <= 0) {
        result.shieldBroken = true;
        creature.currentShieldHp = 0;
    }
    result.shieldHpRemaining = creature.currentShieldHp;
    // Consume the armed Shield Block
    const blockCondition = creature.conditions?.[blockIndex];
    if (blockCondition) {
        if (typeof blockCondition.usesRemaining === 'number') {
            blockCondition.usesRemaining -= 1;
        }
        if (!blockCondition.usesRemaining || blockCondition.usesRemaining <= 0) {
            creature.conditions.splice(blockIndex, 1);
        }
    }
    return result;
}
