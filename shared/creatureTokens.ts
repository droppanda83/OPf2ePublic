/**
 * Creature Token Mapping — Maps creature tags to themed token images.
 *
 * Tokens are SVG files in frontend/public/tokens/, served at /tokens/<type>.svg.
 * Follows the Foundry VTT PF2e creature-type classification system.
 *
 * The mapping is priority-ordered: more specific subtypes (vampire, skeleton, etc.)
 * are checked before broader categories (undead, fiend, etc.).
 */

// ─── Token File Names ────────────────────────────────

/** All available creature type tokens */
export const CREATURE_TOKEN_TYPES = [
  // Specific subtypes (checked first for higher specificity)
  'demon', 'devil', 'vampire', 'skeleton', 'zombie', 'ghost', 'golem',
  // Broad creature types (Foundry PF2e "creature types")
  'aberration', 'animal', 'beast', 'celestial', 'construct', 'dragon',
  'elemental', 'fey', 'fiend', 'fungus', 'giant', 'humanoid',
  'monitor', 'ooze', 'plant', 'spirit', 'undead', 'swarm',
  // Fallback
  'default',
] as const;

export type CreatureTokenType = typeof CREATURE_TOKEN_TYPES[number];

// ─── Tag → Token Priority Map ────────────────────────

/**
 * Priority-ordered mapping from creature tags to token types.
 * Entries earlier in the array take precedence: if a creature has both
 * 'vampire' and 'undead' tags, it gets the vampire token.
 *
 * Includes trait aliases that commonly appear in PF2e bestiary tags.
 */
const TAG_TO_TOKEN: [tag: string, token: CreatureTokenType][] = [
  // === Specific subtypes (high priority) ===
  ['vampire', 'vampire'],
  ['skeleton', 'skeleton'],
  ['zombie', 'zombie'],
  ['ghost', 'spirit'],    // ghost → spirit token (blue spectral)
  ['phantom', 'spirit'],
  ['wraith', 'spirit'],
  ['wight', 'undead'],
  ['mummy', 'undead'],
  ['graveknight', 'undead'],
  ['demon', 'demon'],
  ['devil', 'devil'],
  ['daemon', 'fiend'],
  ['rakshasa', 'fiend'],
  ['div', 'fiend'],
  ['qlippoth', 'fiend'],
  ['asura', 'fiend'],
  ['sahkil', 'fiend'],
  ['velstrac', 'fiend'],
  ['golem', 'golem'],
  ['clockwork', 'construct'],
  ['automaton', 'construct'],
  ['soulbound', 'construct'],
  ['angel', 'celestial'],
  ['archon', 'celestial'],
  ['azata', 'celestial'],
  ['agathion', 'celestial'],
  ['couatl', 'celestial'],
  ['aeon', 'monitor'],
  ['psychopomp', 'monitor'],
  ['protean', 'monitor'],
  ['oni', 'giant'],
  ['troll', 'giant'],
  ['titan', 'giant'],
  ['hag', 'fey'],
  ['nymph', 'fey'],
  ['sprite', 'fey'],
  ['gremlin', 'fey'],
  ['tane', 'fey'],
  ['leshy', 'plant'],
  ['dinosaur', 'animal'],

  // === Swarm check (before broad types) ===
  ['swarm', 'swarm'],
  ['troop', 'swarm'],

  // === Broad PF2e creature types (lower priority) ===
  ['aberration', 'aberration'],
  ['animal', 'animal'],
  ['beast', 'beast'],
  ['celestial', 'celestial'],
  ['construct', 'construct'],
  ['dragon', 'dragon'],
  ['elemental', 'elemental'],
  ['fey', 'fey'],
  ['fiend', 'fiend'],
  ['fungus', 'fungus'],
  ['giant', 'giant'],
  ['humanoid', 'humanoid'],
  ['monitor', 'monitor'],
  ['ooze', 'ooze'],
  ['plant', 'plant'],
  ['spirit', 'spirit'],
  ['undead', 'undead'],

  // === Elemental sub-types → elemental token ===
  ['fire', 'elemental'],
  ['water', 'elemental'],
  ['earth', 'elemental'],
  ['air', 'elemental'],
  ['metal', 'elemental'],
  ['wood', 'elemental'],

  // === Other common tags that suggest a type ===
  ['incorporeal', 'spirit'],
  ['dream', 'fey'],
  ['astral', 'monitor'],
  ['ethereal', 'spirit'],
  ['shadow', 'spirit'],
  ['spellcaster', 'humanoid'], // fallback for magic users

  // === PF2e-specific tags without broad-type matches ===
  ['shade', 'spirit'],           // Shade creatures (shadow/void entities)
  ['kami', 'fey'],               // Kami (Japanese nature spirits)
  ['siktempora', 'monitor'],     // Siktempora (time creatures)
  ['force', 'construct'],        // Force creatures (magical constructs)
  ['mortic', 'undead'],          // Mortic (undead-touched living)
  ['werecreature', 'beast'],     // Werecreatures
  ['darvakka', 'undead'],        // Darvakka (void undead)
  ['inevitable', 'construct'],   // Inevitables (law constructs)
  ['summoned', 'spirit'],        // Summoned entities
  ['illusion', 'fey'],           // Illusion creatures
  ['mental', 'aberration'],      // Mental creatures
  ['arcane', 'construct'],       // Arcane constructs
  ['divine', 'celestial'],       // Divine creatures fallback
  ['primal', 'beast'],           // Primal creatures fallback
  ['occult', 'aberration'],      // Occult creatures fallback
  ['alchemical', 'construct'],   // Alchemical creatures

  // === Ancestries → humanoid fallback ===
  ['human', 'humanoid'],
  ['elf', 'humanoid'],
  ['dwarf', 'humanoid'],
  ['gnome', 'humanoid'],
  ['halfling', 'humanoid'],
  ['orc', 'humanoid'],
  ['goblin', 'humanoid'],
  ['kobold', 'humanoid'],
  ['hobgoblin', 'humanoid'],
  ['gnoll', 'humanoid'],
  ['lizardfolk', 'humanoid'],
  ['catfolk', 'humanoid'],
  ['ratfolk', 'humanoid'],
  ['tengu', 'humanoid'],
  ['fetchling', 'humanoid'],
  ['changeling', 'humanoid'],
  ['dhampir', 'humanoid'],
  ['drow', 'humanoid'],
  ['duergar', 'humanoid'],
  ['boggard', 'humanoid'],
  ['grippli', 'humanoid'],
  ['strix', 'humanoid'],
  ['merfolk', 'humanoid'],
  ['kitsune', 'humanoid'],
  ['nagaji', 'humanoid'],
  ['vanara', 'humanoid'],
  ['vishkanya', 'humanoid'],
  ['azarketi', 'humanoid'],
  ['caligni', 'humanoid'],
  ['serpentfolk', 'humanoid'],
  ['xulgath', 'humanoid'],
  ['dero', 'humanoid'],
  ['aiuvarin', 'humanoid'],
  ['dromaar', 'humanoid'],
  ['naari', 'humanoid'],
  ['nephilim', 'humanoid'],
  ['centaur', 'beast'],
  ['creature', 'beast'],        // Generic "creature" tag
];

// ─── Public API ──────────────────────────────────────

/**
 * Return the token image URL for a creature based on its tags.
 *
 * @param tags  Array of creature tags (e.g., ['undead', 'vampire', 'humanoid'])
 * @returns     Relative URL path like "/tokens/vampire.svg"
 */
export function getCreatureTokenUrl(tags: string[]): string {
  const tagSet = new Set(tags.map(t => t.toLowerCase()));

  for (const [tag, token] of TAG_TO_TOKEN) {
    if (tagSet.has(tag)) {
      return `/tokens/${token}.svg`;
    }
  }

  return '/tokens/default.svg';
}

/**
 * Return the token type name for a creature based on its tags.
 * Useful for logging or debugging.
 */
export function getCreatureTokenType(tags: string[]): CreatureTokenType {
  const tagSet = new Set(tags.map(t => t.toLowerCase()));

  for (const [tag, token] of TAG_TO_TOKEN) {
    if (tagSet.has(tag)) {
      return token;
    }
  }

  return 'default';
}
