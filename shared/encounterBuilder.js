"use strict";
/**
 * PF2e Encounter Builder — XP budget system for balanced encounters.
 *
 * Uses the official PF2e encounter building rules:
 *   - Each creature awards XP based on its level relative to party level
 *   - Difficulty thresholds define XP budgets for an encounter
 *   - The builder selects creatures to fill the budget
 *
 * XP table (creature level vs party level):
 *   -4 → 10 XP    -3 → 15 XP    -2 → 20 XP    -1 → 30 XP
 *    0 → 40 XP    +1 → 60 XP    +2 → 80 XP    +3 → 120 XP    +4 → 160 XP
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DIFFICULTY_COLORS = exports.DIFFICULTY_LABELS = exports.DIFFICULTIES = void 0;
exports.getCreatureXP = getCreatureXP;
exports.getXPBudget = getXPBudget;
exports.buildEncounter = buildEncounter;
const bestiary_1 = require("./bestiary");
// ─── XP Tables ───────────────────────────────────────
/** XP awarded per creature based on (creatureLevel - partyLevel) */
const CREATURE_XP = {
    [-4]: 10,
    [-3]: 15,
    [-2]: 20,
    [-1]: 30,
    [0]: 40,
    [1]: 60,
    [2]: 80,
    [3]: 120,
    [4]: 160,
};
/** XP budget per difficulty (base for 4 players) */
const DIFFICULTY_XP = {
    trivial: 40,
    low: 60,
    moderate: 80,
    severe: 120,
    extreme: 160,
};
/** Character adjustment: per player beyond 4, add this much XP */
const PER_EXTRA_PLAYER_XP = 20;
// ─── Core Functions ──────────────────────────────────
/** Get the XP a creature is worth relative to party level */
function getCreatureXP(creatureLevel, partyLevel) {
    const diff = creatureLevel - partyLevel;
    if (diff < -4)
        return 10; // floor at 10
    if (diff > 4)
        return 160; // cap at 160
    return CREATURE_XP[diff] ?? 40;
}
/** Calculate XP budget for a given difficulty and party size */
function getXPBudget(difficulty, partySize = 4) {
    const base = DIFFICULTY_XP[difficulty];
    const adjustment = (partySize - 4) * PER_EXTRA_PLAYER_XP;
    return base + adjustment;
}
/**
 * Build a random encounter of the specified difficulty.
 *
 * Strategy:
 *  1. Determine the XP budget
 *  2. Find creatures within a valid level range (partyLevel -4 to +4)
 *  3. Greedily fill the budget, preferring variety
 *  4. Add weaker creatures to fill remaining XP
 */
function buildEncounter(difficulty, partyLevel, partySize = 4, allowedTags) {
    const budget = getXPBudget(difficulty, partySize);
    let remaining = budget;
    const chosen = [];
    // Determine valid creature level range based on difficulty
    // Higher difficulties should include tougher creatures
    const levelRanges = {
        trivial: [partyLevel - 4, partyLevel - 1],
        low: [partyLevel - 3, partyLevel],
        moderate: [partyLevel - 2, partyLevel + 1],
        severe: [partyLevel - 1, partyLevel + 2],
        extreme: [partyLevel, partyLevel + 3],
    };
    const [minLv, maxLv] = levelRanges[difficulty];
    // Get candidate creatures
    let candidates = (0, bestiary_1.getCreaturesInRange)(minLv, maxLv);
    if (allowedTags && allowedTags.length > 0) {
        candidates = candidates.filter((b) => b.tags.some((t) => allowedTags.includes(t)));
    }
    // If no candidates found, widen the range
    if (candidates.length === 0) {
        candidates = (0, bestiary_1.getCreaturesInRange)(partyLevel - 4, partyLevel + 4);
    }
    // Still nothing? Use the entire bestiary
    if (candidates.length === 0) {
        candidates = [...bestiary_1.BESTIARY];
    }
    // Sort candidates by XP cost (descending) for greedy fill
    const sortedCandidates = candidates
        .map((b) => ({
        entry: b,
        xp: getCreatureXP(b.creature.level ?? 0, partyLevel),
    }))
        .sort((a, b) => b.xp - a.xp);
    // Greedy fill: try to add creatures that fit the budget
    // Use a shuffled order for variety, but respect XP constraints
    const shuffled = shuffleArray([...sortedCandidates]);
    for (const candidate of shuffled) {
        if (remaining <= 0)
            break;
        if (candidate.xp <= remaining) {
            // Clone the creature data so each instance is independent
            chosen.push({ ...candidate.entry.creature });
            remaining -= candidate.xp;
        }
    }
    // If we still have remaining XP, fill with weakest available creatures
    if (remaining > 0) {
        const weakest = sortedCandidates.filter((c) => c.xp <= remaining);
        const weakestShuffled = shuffleArray(weakest);
        for (const candidate of weakestShuffled) {
            if (remaining <= 0)
                break;
            if (candidate.xp <= remaining) {
                chosen.push({ ...candidate.entry.creature });
                remaining -= candidate.xp;
            }
        }
    }
    // If encounter is still empty, add at least one creature
    if (chosen.length === 0 && candidates.length > 0) {
        const fallback = (0, bestiary_1.pickRandom)(candidates);
        chosen.push({ ...fallback.creature });
        remaining -= getCreatureXP(fallback.creature.level ?? 0, partyLevel);
    }
    const totalXP = budget - remaining;
    // Build description
    const creatureNames = chosen.map((c) => c.name).join(', ');
    const description = `${capitalize(difficulty)} encounter (${totalXP}/${budget} XP): ${creatureNames}`;
    return {
        difficulty,
        creatures: chosen,
        totalXP,
        targetXP: budget,
        description,
    };
}
// ─── Utility ─────────────────────────────────────────
function shuffleArray(arr) {
    const result = [...arr];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}
function capitalize(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
}
/** All available difficulty levels */
exports.DIFFICULTIES = ['trivial', 'low', 'moderate', 'severe', 'extreme'];
/** Human-readable labels for difficulties */
exports.DIFFICULTY_LABELS = {
    trivial: 'Trivial',
    low: 'Low',
    moderate: 'Moderate',
    severe: 'Severe',
    extreme: 'Extreme',
};
/** Color codes for difficulty levels */
exports.DIFFICULTY_COLORS = {
    trivial: '#4CAF50',
    low: '#8BC34A',
    moderate: '#FFC107',
    severe: '#FF9800',
    extreme: '#F44336',
};
