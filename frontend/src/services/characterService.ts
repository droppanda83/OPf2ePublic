/**
 * Character Service
 * Handles character sheet creation, export, import, and conversion
 * Supports: JSON export/import, PDF export, Pathbuilder JSON import
 */

import type { CharacterSheet, Party, PathbuilderCharacter, Creature, AbilityScores, ProficiencyProfile, DamageResistance, DamageWeakness, ImmunityType, CreatureWeapon, WeaponSlot, CastableSpell, SpellSlot, StashItem, StashItemCatalog } from '../../../shared/types';
import { getProficiencyBonus } from '../../../shared/bonuses';
import { WEAPON_CATALOG, type Weapon } from '../../../shared/weapons';
import { ARMOR_CATALOG } from '../../../shared/armor';
import { SHIELD_CATALOG } from '../../../shared/shields';
import { getArmorRuneResistances } from '../../../shared/runes';
import { resolveEquipmentEffects } from '../../../shared/equipmentBonuses';
import { CONSCIOUS_MINDS, CLASS_SPELLCASTING, isSpellcastingClass, ANCESTRY_BOOSTS, type AncestryData, applyClassFeatureProficiencies, BASE_PROFICIENCIES, CLASS_STARTING_PROFICIENCIES } from '../components/characterBuilderData';
import { SPELL_CATALOG, getSpell } from '../../../shared/spells';

// ─── CHARACTER STORAGE ────────────────────────────────────

const PARTY_STORAGE_KEY = 'pf2e_parties';
const CHARACTER_STORAGE_KEY = 'pf2e_characters';

/** Get ancestry speed from the authoritative ANCESTRY_BOOSTS data */
function getAncestrySpeed(ancestry: string): number {
  const data = ANCESTRY_BOOSTS[ancestry];
  return data?.speed ?? 25;
}

/** Get ancestry HP from the authoritative ANCESTRY_BOOSTS data */
function getAncestryHp(ancestry: string): number {
  const data = ANCESTRY_BOOSTS[ancestry];
  return data?.hp ?? 8;
}

/** PF2e class Hit Points per level (AoN Remastered) */
const CLASS_HP: Record<string, number> = {
  Alchemist: 8,
  Animist: 8,
  Barbarian: 12,
  Bard: 8,
  Champion: 10,
  Cleric: 8,
  Commander: 8,
  Druid: 8,
  Exemplar: 10,
  Fighter: 10,
  Guardian: 12,
  Gunslinger: 8,
  Inventor: 8,
  Investigator: 8,
  Kineticist: 8,
  Magus: 8,
  Monk: 10,
  Oracle: 8,
  Psychic: 6,
  Ranger: 10,
  Rogue: 8,
  Sorcerer: 6,
  Summoner: 10,
  Swashbuckler: 10,
  Thaumaturge: 8,
  Witch: 6,
  Wizard: 6,
};

export class CharacterService {
  // ═══════════════════════════════════════════════════════════
  // STORAGE OPERATIONS
  // ═══════════════════════════════════════════════════════════

  /**
   * Save a party to localStorage
   */
  static saveParty(party: Party): void {
    try {
      const parties = this.getAllParties();
      const existingIndex = parties.findIndex(p => p.id === party.id);
      if (existingIndex >= 0) {
        parties[existingIndex] = party;
      } else {
        parties.push(party);
      }
      localStorage.setItem(PARTY_STORAGE_KEY, JSON.stringify(parties));
    } catch (error) {
      console.error('Error saving party:', error);
      throw new Error('Failed to save party to localStorage');
    }
  }

  /**
   * Get all parties from localStorage
   */
  static getAllParties(): Party[] {
    try {
      const data = localStorage.getItem(PARTY_STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error loading parties:', error);
      return [];
    }
  }

  /**
   * Get a specific party by ID
   */
  static getParty(partyId: string): Party | null {
    const parties = this.getAllParties();
    return parties.find(p => p.id === partyId) || null;
  }

  /**
   * Delete a party
   */
  static deleteParty(partyId: string): void {
    const parties = this.getAllParties();
    const filtered = parties.filter(p => p.id !== partyId);
    localStorage.setItem(PARTY_STORAGE_KEY, JSON.stringify(filtered));
  }

  /**
   * Save a single character
   */
  static saveCharacter(character: CharacterSheet): void {
    try {
      const characters = this.getAllCharacters();
      const existingIndex = characters.findIndex(c => c.id === character.id);
      if (existingIndex >= 0) {
        characters[existingIndex] = character;
      } else {
        characters.push(character);
      }
      localStorage.setItem(CHARACTER_STORAGE_KEY, JSON.stringify(characters));
    } catch (error) {
      console.error('Error saving character:', error);
      throw new Error('Failed to save character to localStorage');
    }
  }

  /**
   * Get all characters from localStorage
   */
  static getAllCharacters(): CharacterSheet[] {
    try {
      const data = localStorage.getItem(CHARACTER_STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error loading characters:', error);
      return [];
    }
  }

  /**
   * Delete a character from localStorage by ID
   */
  static deleteCharacter(characterId: string): void {
    try {
      const characters = this.getAllCharacters().filter(c => c.id !== characterId);
      localStorage.setItem(CHARACTER_STORAGE_KEY, JSON.stringify(characters));
    } catch (error) {
      console.error('Error deleting character:', error);
    }
  }

  // ═══════════════════════════════════════════════════════════
  // PARTY STASH OPERATIONS
  // ═══════════════════════════════════════════════════════════

  /** Generate a unique stash item UID */
  static generateStashUid(): string {
    return 'stash_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
  }

  /** Get the stash for a party (returns empty array if none) */
  static getPartyStash(partyId: string): StashItem[] {
    const party = this.getParty(partyId);
    return party?.stash ?? [];
  }

  /** Get the party treasury gold */
  static getPartyGold(partyId: string): number {
    const party = this.getParty(partyId);
    return party?.stashGold ?? 0;
  }

  /** Add an item to the party stash (merges by catalogId+catalogType if stackable) */
  static addToStash(partyId: string, item: Omit<StashItem, 'uid'>, quantity = 1): void {
    const party = this.getParty(partyId);
    if (!party) return;
    const stash = party.stash ? [...party.stash] : [];

    // Try to stack with existing entry of same catalog + no runes
    const existing = stash.find(
      s => s.catalogId === item.catalogId
        && s.catalogType === item.catalogType
        && !s.weaponRunes && !item.weaponRunes
        && !s.armorRunes && !item.armorRunes
    );
    if (existing) {
      existing.quantity += quantity;
    } else {
      stash.push({ ...item, uid: this.generateStashUid(), quantity });
    }

    party.stash = stash;
    party.updatedAt = Date.now();
    this.saveParty(party);
  }

  /** Remove quantity of a stash item by UID. Removes entirely if quantity reaches 0. */
  static removeFromStash(partyId: string, uid: string, quantity = 1): void {
    const party = this.getParty(partyId);
    if (!party || !party.stash) return;

    const idx = party.stash.findIndex(s => s.uid === uid);
    if (idx < 0) return;

    party.stash[idx].quantity -= quantity;
    if (party.stash[idx].quantity <= 0) {
      party.stash.splice(idx, 1);
    }

    party.updatedAt = Date.now();
    this.saveParty(party);
  }

  /** Set party treasury gold */
  static setPartyGold(partyId: string, gold: number): void {
    const party = this.getParty(partyId);
    if (!party) return;
    party.stashGold = Math.max(0, gold);
    party.updatedAt = Date.now();
    this.saveParty(party);
  }

  /** Give a stash item to a character (transfers to their sheet) */
  static giveStashItemToCharacter(partyId: string, stashUid: string, characterId: string): boolean {
    const party = this.getParty(partyId);
    if (!party || !party.stash) return false;

    const stashItem = party.stash.find(s => s.uid === stashUid);
    if (!stashItem) return false;

    // Find the character in the party
    const charIdx = party.characters.findIndex(c => c.id === characterId);
    if (charIdx < 0) return false;

    const character = { ...party.characters[charIdx] };

    // Add item to appropriate character field
    switch (stashItem.catalogType) {
      case 'weapon': {
        const weaponIds = character.weaponIds ? [...character.weaponIds] : [];
        weaponIds.push(stashItem.catalogId);
        character.weaponIds = weaponIds;
        if (stashItem.weaponRunes) {
          const runes = character.weaponRunes ? [...character.weaponRunes] : [];
          runes.push(stashItem.weaponRunes);
          character.weaponRunes = runes;
        }
        break;
      }
      case 'armor':
        character.armorId = stashItem.catalogId;
        if (stashItem.armorRunes) character.armorRunes = stashItem.armorRunes;
        break;
      case 'shield':
        character.shieldId = stashItem.catalogId;
        break;
      case 'wornItem': {
        const worn = character.equippedWornItems ? [...character.equippedWornItems] : [];
        if (!worn.includes(stashItem.catalogId)) worn.push(stashItem.catalogId);
        character.equippedWornItems = worn;
        break;
      }
      case 'consumable':
      case 'gear': {
        const inv = character.inventory ? [...character.inventory] : [];
        const existInv = inv.find(i => i.id === stashItem.catalogId);
        if (existInv) {
          existInv.quantity += 1;
        } else {
          inv.push({ id: stashItem.catalogId, itemName: stashItem.name, quantity: 1 });
        }
        character.inventory = inv;
        break;
      }
    }

    character.updatedAt = Date.now();
    party.characters[charIdx] = character;

    // Remove one from stash
    this.removeFromStash(partyId, stashUid, 1);

    // Save the updated character to standalone storage too
    this.saveCharacter(character);

    return true;
  }

  // ═══════════════════════════════════════════════════════════
  // EXPORT OPERATIONS
  // ═══════════════════════════════════════════════════════════

  /**
   * Export character as JSON
   */
  static exportToJSON(character: CharacterSheet): string {
    return JSON.stringify(character, null, 2);
  }

  /**
   * Download character as JSON file
   */
  static downloadCharacterJSON(character: CharacterSheet): void {
    const json = this.exportToJSON(character);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${character.name}-${character.level}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Export character as PDF
   * Requires jsPDF library - will generate formatted character sheet
   */
  static async exportToPDF(character: CharacterSheet): Promise<void> {
    // Lazy load jsPDF to avoid bloating bundle
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();

    // Title
    doc.setFontSize(20);
    doc.text(`${character.name}`, 10, 10);

    // Header info
    doc.setFontSize(12);
    let yPos = 25;
    doc.text(`Level ${character.level} ${character.ancestry} ${character.heritage}`, 10, yPos);
    yPos += 7;
    doc.text(`${character.background} | ${character.class}`, 10, yPos);
    yPos += 12;

    // Abilities
    doc.setFontSize(14);
    doc.text('Ability Scores', 10, yPos);
    yPos += 7;
    doc.setFontSize(11);
    const abilities: (keyof AbilityScores)[] = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];
    const abilityLabels: Record<keyof AbilityScores, string> = {
      strength: 'STR',
      dexterity: 'DEX',
      constitution: 'CON',
      intelligence: 'INT',
      wisdom: 'WIS',
      charisma: 'CHA',
    };

    let xPos = 10;
    for (const ability of abilities) {
      const score = character.abilities[ability] || 10;
      const mod = Math.floor((score - 10) / 2);
      doc.text(`${abilityLabels[ability]}: ${score} (${mod > 0 ? '+' : ''}${mod})`, xPos, yPos);
      xPos += 30;
      if (xPos > 180) {
        xPos = 10;
        yPos += 6;
      }
    }
    yPos += 12;

    // Skills — two-column layout with page overflow
    doc.setFontSize(14);
    doc.text('Skills', 10, yPos);
    yPos += 7;
    doc.setFontSize(10);

    if (character.skills && character.skills.length > 0) {
      let col = 0; // 0 = left column, 1 = right column
      const colX = [10, 105]; // x positions for two columns
      const startY = yPos;
      let colY = [yPos, yPos]; // Track y per column

      for (const skill of character.skills) {
        const bonus = skill.bonus || 0;
        const profLabel = skill.proficiency === 'untrained' ? '' : ` (${skill.proficiency})`;
        doc.text(`${skill.name}: +${bonus}${profLabel}`, colX[col], colY[col]);
        colY[col] += 5;

        if (colY[col] > 270) {
          // If right column overflows, add a new page
          if (col === 1) {
            doc.addPage();
            colY = [15, 15];
            col = 0;
          } else {
            col = 1; // Switch to right column
          }
        } else if (col === 0) {
          col = 1; // Alternate columns
        } else {
          col = 0;
        }
      }
      yPos = Math.max(colY[0], colY[1]) + 2;
    }

    // Feats — with page overflow
    yPos += 5;
    if (yPos > 260) { doc.addPage(); yPos = 15; }
    doc.setFontSize(14);
    doc.text('Feats', 10, yPos);
    yPos += 7;
    doc.setFontSize(10);

    if (character.feats && character.feats.length > 0) {
      for (const feat of character.feats) {
        doc.text(`${feat.name} (Level ${feat.level})`, 10, yPos);
        yPos += 5;
        if (yPos > 275) {
          doc.addPage();
          yPos = 15;
        }
      }
    }

    // Save
    doc.save(`${character.name}-${character.level}.pdf`);
  }

  /**
   * Download character as PDF file
   */
  static downloadCharacterPDF(character: CharacterSheet): void {
    this.exportToPDF(character).catch(error => {
      console.error('Error exporting to PDF:', error);
      alert('Failed to export PDF. Please ensure jsPDF is installed.');
    });
  }

  // ═══════════════════════════════════════════════════════════
  // IMPORT OPERATIONS
  // ═══════════════════════════════════════════════════════════

  /**
   * Import character from JSON
   */
  static importFromJSON(jsonString: string): CharacterSheet {
    try {
      const data = JSON.parse(jsonString);
      
      // Validate required fields
      if (!data.name || !data.class || !data.level || !data.abilities) {
        throw new Error('Missing required character fields: name, class, level, or abilities');
      }

      // Ensure ID
      if (!data.id) {
        data.id = this.generateCharacterId();
      }

      // Ensure metadata
      if (!data.createdAt) {
        data.createdAt = Date.now();
      }
      if (data.currentXP === undefined) {
        data.currentXP = 0;
      }
      data.updatedAt = Date.now();

      return data as CharacterSheet;
    } catch (error) {
      throw new Error(`Failed to import JSON: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Import character from Pathbuilder JSON format
   */
  static importFromPathbuilder(pathbuilderCharacter: PathbuilderCharacter): CharacterSheet {
    try {
      // Map Pathbuilder format to our CharacterSheet format
      const character: CharacterSheet = {
        id: this.generateCharacterId(),
        name: pathbuilderCharacter.name || 'New Character',
        level: pathbuilderCharacter.level || 1,
        currentXP: 0,
        ancestry: pathbuilderCharacter.ancestry || 'Human',
        heritage: pathbuilderCharacter.heritage || '',
        background: pathbuilderCharacter.background || '',
        class: pathbuilderCharacter.classname || 'Fighter',
        abilities: {
          strength: pathbuilderCharacter.str || 10,
          dexterity: pathbuilderCharacter.dex || 10,
          constitution: pathbuilderCharacter.con || 10,
          intelligence: pathbuilderCharacter.int || 10,
          wisdom: pathbuilderCharacter.wis || 10,
          charisma: pathbuilderCharacter.cha || 10,
        },
        proficiencies: applyClassFeatureProficiencies(
          pathbuilderCharacter.classname || 'Fighter',
          pathbuilderCharacter.level || 1,
          {
            ...BASE_PROFICIENCIES,
            ...(CLASS_STARTING_PROFICIENCIES[pathbuilderCharacter.classname || 'Fighter'] || {}),
          }
        ),
        skills: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      // TODO: Map Pathbuilder skills, feats, equipment, etc.
      // This would require more detailed Pathbuilder JSON structure parsing

      return character;
    } catch (error) {
      throw new Error(`Failed to import Pathbuilder character: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Parse JSON file and return as parsed object
   */
  static async parseJSONFile(file: File): Promise<any> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const json = JSON.parse(e.target?.result as string);
          resolve(json);
        } catch (error) {
          reject(new Error(`Invalid JSON file: ${error instanceof Error ? error.message : 'Unknown error'}`));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  // ═══════════════════════════════════════════════════════════
  // CHARACTER CONVERSION (Sheet → Creature for combat)
  // ═══════════════════════════════════════════════════════════

  /**
   * Convert CharacterSheet to Creature for use in combat.
   * Applies passive feat effects (speed, HP, resistances, etc.).
   */
  static sheetToCreature(character: CharacterSheet): Creature {
    const abilityMods: AbilityScores = {
      strength: Math.floor((character.abilities.strength - 10) / 2),
      dexterity: Math.floor((character.abilities.dexterity - 10) / 2),
      constitution: Math.floor((character.abilities.constitution - 10) / 2),
      intelligence: Math.floor((character.abilities.intelligence - 10) / 2),
      wisdom: Math.floor((character.abilities.wisdom - 10) / 2),
      charisma: Math.floor((character.abilities.charisma - 10) / 2),
    };

    // ── Helper: check if character has a feat by name (case-insensitive) ──
    const hasFeat = (name: string): boolean => {
      const lower = name.toLowerCase();
      return character.feats?.some(f => f.name.toLowerCase() === lower) ?? false;
    };

    // ── Compute maxHealth with proper PF2e formula ──
    // (classHP + CON_mod) × level + ancestryHP + feat bonuses
    let maxHealth: number;
    if (character.maxHealth) {
      maxHealth = character.maxHealth;
    } else {
      const classHp = CLASS_HP[character.class] ?? 10;
      const ancestryHp = getAncestryHp(character.ancestry);
      const conMod = abilityMods.constitution;
      maxHealth = ((classHp + conMod) * character.level) + ancestryHp;
    }
    // Toughness: +1 HP per level
    if (hasFeat('Toughness')) {
      maxHealth += character.level;
    }

    // ── Compute speed with feat modifiers ──
    let speed = getAncestrySpeed(character.ancestry);
    // Fleet: +5 feet
    if (hasFeat('Fleet')) speed += 5;
    // Nimble Elf: +5 feet
    if (hasFeat('Nimble Elf')) speed += 5;
    // Hardy Traveler: +10 feet (status bonus)
    if (hasFeat('Hardy Traveler')) speed += 10;
    // Breeze Rider (Sylph): +10 feet (status bonus, no heavy armor — simplified)
    if (hasFeat('Breeze Rider')) speed += 10;

    // ── Build damage resistances from feats ──
    const damageResistances: DamageResistance[] = [];
    const halfLevel = Math.max(1, Math.floor(character.level / 2));
    const fullLevel = character.level;
    // Draconic Resistance (Dragonblood) — pick fire as default, half level
    if (hasFeat('Draconic Resistance')) damageResistances.push({ type: 'fire', value: halfLevel });
    // Draconic Might upgrades to full level
    if (hasFeat('Draconic Might')) {
      const dr = damageResistances.find(r => r.type === 'fire');
      if (dr) dr.value = fullLevel;
    }
    // Fire Resistance (Ifrit)
    if (hasFeat('Fire Resistance')) damageResistances.push({ type: 'fire', value: halfLevel });
    // Earth Resistance (Oread)
    if (hasFeat('Earth Resistance')) damageResistances.push({ type: 'bludgeoning', value: halfLevel });
    // Bark Skin (Ardande)
    if (hasFeat('Bark Skin')) damageResistances.push({ type: 'slashing', value: halfLevel });
    // Metal Skin (Talos)
    if (hasFeat('Metal Skin')) {
      const val = hasFeat('Living Metal') ? fullLevel : halfLevel;
      damageResistances.push({ type: 'slashing', value: val });
    }
    // Celestial Resistance (Nephilim) — default fire
    if (hasFeat('Celestial Resistance')) {
      const val = hasFeat('Planar Resistance') ? fullLevel : halfLevel;
      damageResistances.push({ type: 'fire', value: val });
    }
    // Ghostly Resistance (Duskwalker)
    if (hasFeat('Ghostly Resistance')) damageResistances.push({ type: 'negative', value: halfLevel });
    // Protean Anatomy (Ganzi) — precision resistance
    if (hasFeat('Protean Anatomy')) damageResistances.push({ type: 'precision', value: halfLevel });
    // Elemental Bulwark (Suli) — multiple resistances
    if (hasFeat('Elemental Bulwark')) {
      for (const t of ['acid', 'cold', 'electricity', 'fire'] as const) {
        damageResistances.push({ type: t, value: halfLevel });
      }
    }

    // ── Build specials array for action availability ──
    const specials: string[] = [];
    if (hasFeat('Shield Block')) specials.push('Shield Block');
    if (hasFeat('Orc Ferocity')) specials.push('Orc Ferocity');

    // ── Build bonuses array from passive feats ──
    const bonuses: any[] = [];
    const getStrikingDice = (rune: 'striking' | 'greater-striking' | 'major-striking'): number => {
      if (rune === 'striking') return 1;
      if (rune === 'greater-striking') return 2;
      return 3;
    };
    const getResilientBonus = (rune: 'resilient' | 'greater-resilient' | 'major-resilient'): number => {
      if (rune === 'resilient') return 1;
      if (rune === 'greater-resilient') return 2;
      return 3;
    };
    // Incredible Initiative: +2 circumstance bonus to initiative
    if (hasFeat('Incredible Initiative')) {
      bonuses.push({ source: 'Incredible Initiative', type: 'circumstance', value: 2, appliesTo: 'initiative' });
    }
    // Cooperative Nature: +4 circumstance to Aid
    if (hasFeat('Cooperative Nature')) {
      bonuses.push({ source: 'Cooperative Nature', type: 'circumstance', value: 4, appliesTo: 'aid' });
    }
    // Forlorn: +1 circumstance to saves vs emotion
    if (hasFeat('Forlorn')) {
      bonuses.push({ source: 'Forlorn', type: 'circumstance', value: 1, appliesTo: 'save-vs-emotion' });
    }
    // Pervasive Superstition (Dromaar): +1 circumstance vs spells
    if (hasFeat('Pervasive Superstition')) {
      bonuses.push({ source: 'Pervasive Superstition', type: 'circumstance', value: 1, appliesTo: 'save-vs-magic' });
    }
    // Haughty Obstinacy: success→crit success vs mental control
    if (hasFeat('Haughty Obstinacy')) {
      bonuses.push({ source: 'Haughty Obstinacy', type: 'special', value: 0, appliesTo: 'mental-control-upgrade' });
    }
    // Predator's Instinct (Beastkin): +2 circumstance to initiative with Perception
    if (hasFeat("Predator's Instinct")) {
      bonuses.push({ source: "Predator's Instinct", type: 'circumstance', value: 2, appliesTo: 'initiative' });
    }
    // Living Metal (Talos): +1 status bonus to AC
    if (hasFeat('Living Metal')) {
      bonuses.push({ source: 'Living Metal', type: 'status', value: 1, appliesTo: 'ac' });
    }
    // Ward Against Corruption (Duskwalker): +1 vs death/negative/undead effects
    if (hasFeat('Ward Against Corruption')) {
      bonuses.push({ source: 'Ward Against Corruption', type: 'circumstance', value: 1, appliesTo: 'save-vs-death' });
    }
    // Uncanny Duplication (Reflection): +1 vs illusions
    if (hasFeat('Uncanny Duplication')) {
      bonuses.push({ source: 'Uncanny Duplication', type: 'circumstance', value: 1, appliesTo: 'save-vs-illusion' });
    }

    // ── Copy feats to creature ──
    const creatureFeats = character.feats?.map(f => ({ name: f.name, type: f.type, level: f.level }));

    // ── Build weapon inventory from CharacterSheet equipment ──
    const weaponInventory: WeaponSlot[] = [];
    if (character.weaponIds && character.weaponIds.length > 0) {
      for (let weaponIndex = 0; weaponIndex < character.weaponIds.length; weaponIndex++) {
        const wId = character.weaponIds[weaponIndex];
        const catalogWeapon = WEAPON_CATALOG[wId];
        if (catalogWeapon) {
          const runeData = character.weaponRunes?.[weaponIndex];
          const displayParts: string[] = [];
          if (runeData?.potencyRune) displayParts.push(`+${runeData.potencyRune}`);
          if (runeData?.strikingRune) {
            displayParts.push(
              runeData.strikingRune === 'striking'
                ? 'Striking'
                : runeData.strikingRune === 'greater-striking'
                  ? 'Greater Striking'
                  : 'Major Striking'
            );
          }

          const cw: CreatureWeapon = {
            id: wId,
            display: `${displayParts.join(' ')} ${catalogWeapon.name}`.trim(),
            attackType: catalogWeapon.type,
            damageDice: catalogWeapon.damageFormula,
            damageType: catalogWeapon.damageType,
            hands: catalogWeapon.hands,
            traits: catalogWeapon.traits,
            range: catalogWeapon.range,
            weaponCatalogId: wId,
            icon: catalogWeapon.icon,
            potencyRune: runeData?.potencyRune,
            strikingRune: runeData?.strikingRune,
            propertyRunes: runeData?.propertyRunes,
          };

          if (runeData?.potencyRune) {
            bonuses.push({ source: `${catalogWeapon.name} Potency Rune`, type: 'item', value: runeData.potencyRune, applyTo: 'attack' });
          }
          if (runeData?.strikingRune) {
            bonuses.push({
              source: `${catalogWeapon.name} ${runeData.strikingRune}`,
              type: 'item',
              value: getStrikingDice(runeData.strikingRune),
              applyTo: `striking:${catalogWeapon.name}`,
            });
          }

          weaponInventory.push({ weapon: cw, state: 'stowed' });
        }
      }
    }
    // Auto-draw first weapon if any
    if (weaponInventory.length > 0) {
      weaponInventory[0].state = 'held';
    }

    // ── Apply Handwraps of Mighty Blows runes to unarmed weapons ──
    if (character.handwrapRunes) {
      const hwRunes = character.handwrapRunes;
      for (const slot of weaponInventory) {
        const catalogWeapon = WEAPON_CATALOG[slot.weapon.weaponCatalogId ?? ''];
        if (catalogWeapon && catalogWeapon.proficiencyCategory === 'unarmed') {
          // Apply potency rune
          if (hwRunes.potencyRune && (!slot.weapon.potencyRune || hwRunes.potencyRune > slot.weapon.potencyRune)) {
            slot.weapon.potencyRune = hwRunes.potencyRune;
            const displayParts: string[] = [];
            if (hwRunes.potencyRune) displayParts.push(`+${hwRunes.potencyRune}`);
            if (hwRunes.strikingRune) {
              displayParts.push(
                hwRunes.strikingRune === 'striking' ? 'Striking'
                  : hwRunes.strikingRune === 'greater-striking' ? 'Greater Striking'
                    : 'Major Striking'
              );
            }
            slot.weapon.display = `${displayParts.join(' ')} ${catalogWeapon.name}`.trim();
            bonuses.push({ source: `Handwraps Potency`, type: 'item', value: hwRunes.potencyRune, applyTo: 'attack' });
          }
          // Apply striking rune
          if (hwRunes.strikingRune) {
            slot.weapon.strikingRune = hwRunes.strikingRune;
            bonuses.push({
              source: `Handwraps ${hwRunes.strikingRune}`,
              type: 'item',
              value: getStrikingDice(hwRunes.strikingRune),
              applyTo: `striking:${catalogWeapon.name}`,
            });
          }
          // Apply property runes
          if (hwRunes.propertyRunes && hwRunes.propertyRunes.length > 0) {
            slot.weapon.propertyRunes = [...(slot.weapon.propertyRunes ?? []), ...hwRunes.propertyRunes];
          }
        }
      }
    }

    // ── Compute armor bonus from equipped armor ──
    let armorBonus = 0;
    let equippedArmor: string | undefined;
    if (character.armorId) {
      const catalogArmor = ARMOR_CATALOG[character.armorId];
      if (catalogArmor) {
        armorBonus = catalogArmor.acBonus;
        if (character.armorRunes?.potencyRune) {
          armorBonus += character.armorRunes.potencyRune;
        }

        if (character.armorRunes?.resilientRune) {
          const resilientBonus = getResilientBonus(character.armorRunes.resilientRune);
          bonuses.push({ source: 'Resilient Rune', type: 'item', value: resilientBonus, applyTo: 'fortitude' });
          bonuses.push({ source: 'Resilient Rune', type: 'item', value: resilientBonus, applyTo: 'reflex' });
          bonuses.push({ source: 'Resilient Rune', type: 'item', value: resilientBonus, applyTo: 'will' });
        }

        if (character.armorRunes?.propertyRunes && character.armorRunes.propertyRunes.length > 0) {
          const runeResistances = getArmorRuneResistances(character.armorRunes.propertyRunes);
          for (const rr of runeResistances) {
            damageResistances.push({ type: rr.type, value: rr.value });
          }
        }

        equippedArmor = character.armorId;
        // Apply DEX cap
        if (catalogArmor.dexCap !== null && abilityMods.dexterity > catalogArmor.dexCap) {
          // AC uses capped DEX
        }
        // Speed penalty from armor
        if (catalogArmor.speedPenalty > 0) {
          const strScore = character.abilities.strength || 10;
          if (strScore >= catalogArmor.strRequirement) {
            speed -= Math.max(0, catalogArmor.speedPenalty - 5);
          } else {
            speed -= catalogArmor.speedPenalty;
          }
        }
      }
    }

    // ── Compute AC with armor and dex cap ──
    let effectiveDex = abilityMods.dexterity;
    let armorProficiencyRank: 'untrained' | 'trained' | 'expert' | 'master' | 'legendary' = character.proficiencies.unarmored;
    if (character.armorId) {
      const catalogArmor = ARMOR_CATALOG[character.armorId];
      if (catalogArmor && catalogArmor.dexCap !== null) {
        effectiveDex = Math.min(effectiveDex, catalogArmor.dexCap);
      }
      // Determine armor proficiency rank based on armor category
      if (catalogArmor) {
        const categoryMap: Record<string, keyof ProficiencyProfile> = {
          unarmored: 'unarmored',
          light: 'lightArmor',
          medium: 'mediumArmor',
          heavy: 'heavyArmor',
        };
        const profKey = categoryMap[catalogArmor.category] ?? 'unarmored';
        armorProficiencyRank = character.proficiencies[profKey] as typeof armorProficiencyRank;
      }
    }
    const armorProfBonus = getProficiencyBonus(armorProficiencyRank, character.level);
    const computedAC = 10 + effectiveDex + armorBonus + armorProfBonus;

    // ── Shield data ──
    let equippedShield: string | undefined;
    let currentShieldHp: number | undefined;
    let maxShieldHp: number | undefined;
    if (character.shieldId) {
      const catalogShield = SHIELD_CATALOG[character.shieldId];
      if (catalogShield) {
        equippedShield = character.shieldId;
        currentShieldHp = catalogShield.hp;
        maxShieldHp = catalogShield.maxHp;
      }
    }

    // ── Consumables ──
    const consumables = character.inventory?.map(i => ({ id: i.id, quantity: i.quantity }));

    // ── Apply worn equipment effects (resistances, immunities, weaknesses, speed, DEX cap, and 8 new types) ──
    const equipmentImmunities: ImmunityType[] = [];
    const equipmentWeaknesses: DamageWeakness[] = [];
    let eqEffects: ReturnType<typeof resolveEquipmentEffects> | undefined;
    if (character.equippedWornItems && character.equippedWornItems.length > 0) {
      eqEffects = resolveEquipmentEffects(character.equippedWornItems);

      // Merge equipment resistances
      for (const res of eqEffects.resistances) {
        const existing = damageResistances.find(r => r.type === res.type);
        if (existing) {
          existing.value = Math.max(existing.value, res.value);
        } else {
          damageResistances.push({ type: res.type, value: res.value });
        }
      }

      // Merge equipment immunities (deduplicate)
      for (const imm of eqEffects.immunities) {
        if (!equipmentImmunities.includes(imm)) {
          equipmentImmunities.push(imm);
        }
      }

      // Merge equipment weaknesses (take highest value per type)
      for (const wk of eqEffects.weaknesses) {
        const existing = equipmentWeaknesses.find(w => w.type === wk.type);
        if (existing) {
          existing.value = Math.max(existing.value, wk.value);
        } else {
          equipmentWeaknesses.push({ type: wk.type, value: wk.value });
        }
      }

      // Merge equipment speed bonuses (take best land speed bonus)
      if (eqEffects.speeds['land']) {
        speed += eqEffects.speeds['land'];
      }

      // Apply equipment DEX cap (take lowest)
      if (eqEffects.dexCap !== undefined) {
        effectiveDex = Math.min(effectiveDex, eqEffects.dexCap);
      }
    }

    const creature: Creature = {
      id: character.id,
      name: character.name,
      type: 'player',
      level: character.level,
      abilities: abilityMods,
      maxHealth,
      currentHealth: maxHealth,
      proficiencies: character.proficiencies,
      armorClass: computedAC,
      armorBonus,
      shieldRaised: false,
      bonuses,
      penalties: [],
      speed,
      positions: { x: 0, y: 0 },
      conditions: [],
      initiative: 0,
      initiativeBonus: abilityMods.wisdom + getProficiencyBonus(character.proficiencies.perception, character.level),
      attacksMadeThisTurn: 0,

      dying: false,
      deathSaveFailures: 0,
      deathSaveSuccesses: 0,
      deathSaveMadeThisTurn: false,
      wounded: 0,
      damageResistances,
      damageImmunities: equipmentImmunities,
      damageWeaknesses: equipmentWeaknesses,
      characterClass: character.class,
      currentXP: character.currentXP,
      ancestry: character.ancestry,
      heritage: character.heritage,
      rogueRacket: character.classSpecific?.rogueRacket,
      rogueDeity: character.classSpecific?.rogueDeity,
      // Psychic class fields
      consciousMind: character.classSpecific?.consciousMind,
      subconsciousMind: character.classSpecific?.subconsciousMind,
      feats: creatureFeats,
      specials: specials.length > 0 ? specials : undefined,
      // Equipment from character sheet
      weaponInventory: weaponInventory.length > 0 ? weaponInventory : undefined,
      equippedWeapon: weaponInventory.length > 0 ? weaponInventory[0].weapon.id : undefined,
      equippedArmor,
      equippedShield,
      currentShieldHp,
      equippedWornItems: character.equippedWornItems,
      // Equipment effects (Phase 6: notes, damage dice, alterations, strike adjustments, conditions, roll-twice, fast healing, ephemeral)
      equipmentNotes: eqEffects?.notes.length ? eqEffects.notes : undefined,
      equipmentDamageDice: eqEffects?.damageDice.length ? eqEffects.damageDice : undefined,
      equipmentDamageAlterations: eqEffects?.damageAlterations.length ? eqEffects.damageAlterations : undefined,
      equipmentStrikeAdjustments: eqEffects?.strikeAdjustments.length ? eqEffects.strikeAdjustments : undefined,
      equipmentGrantedConditions: eqEffects?.grantedConditions.length ? eqEffects.grantedConditions : undefined,
      equipmentRollTwice: eqEffects?.rollTwice.length ? eqEffects.rollTwice : undefined,
      equipmentFastHealing: eqEffects?.fastHealing.length ? eqEffects.fastHealing : undefined,
      equipmentEphemeralEffects: eqEffects?.ephemeralEffects.length ? eqEffects.ephemeralEffects : undefined,
      consumables: consumables && consumables.length > 0 ? consumables : undefined,
      // ── Token & Portrait images ──
      tokenImageUrl: character.tokenImageUrl || undefined,
      portraitImageUrl: character.portraitImageUrl || undefined,
      // ── Bio / Description ──
      pronouns: character.pronouns || undefined,
      age: character.age || undefined,
      height: character.height || undefined,
      weight: character.weight || undefined,
      description: character.description || undefined,
      // ── Transfer skills from character sheet ──
      skills: character.skills?.map(skill => {
        const abilityMod = abilityMods[skill.ability] ?? 0;
        const profBonus = getProficiencyBonus(skill.proficiency, character.level);
        return {
          name: skill.name,
          proficiency: skill.proficiency,
          bonus: skill.bonus ?? (abilityMod + profBonus),
          abilityMod,
          profBonus,
        };
      }),
    };

    // ── Wire Psychic spellcasting ──
    if (character.class === 'Psychic') {
      const consciousMindData = CONSCIOUS_MINDS.find(m => m.id === character.classSpecific?.consciousMind);
      // Set key ability based on class boost selection (INT or CHA)
      creature.keyAbility = 'charisma';
      if (abilityMods.intelligence > abilityMods.charisma) {
        creature.keyAbility = 'intelligence';
      }

      // Focus points (Psychic starts with 2)
      creature.focusPoints = 2;
      creature.maxFocusPoints = 2;

      // Build focus spells from conscious mind psi cantrips
      if (consciousMindData) {
        creature.focusSpells = consciousMindData.grantedCantrips.map(cantrip => ({
          name: cantrip,
          level: Math.max(1, Math.ceil(character.level / 2)),
          type: 'cantrip' as const,
          ampable: true,
          tradition: 'occult',
        }));
      }

      // Build spells list from CharacterSheet known spells
      const psychicSpells: CastableSpell[] = [];
      // Add cantrips
      if (character.knownCantrips) {
        for (const spellId of character.knownCantrips) {
          const spell = getSpell(spellId);
          if (spell) {
            psychicSpells.push({
              name: spell.name,
              level: 0,
              tradition: 'occult',
              traits: spell.targetType === 'aoe' ? ['Evocation'] : undefined,
            });
          }
        }
      }
      // Add repertoire spells
      if (character.knownSpells) {
        for (const spellId of character.knownSpells) {
          const spell = getSpell(spellId);
          if (spell) {
            psychicSpells.push({
              name: spell.name,
              level: spell.rank,
              tradition: 'occult',
              traits: spell.targetType === 'aoe' ? ['Evocation'] : undefined,
            });
          }
        }
      }

      // Set up occult spontaneous spellcasting with proper slot config
      const config = CLASS_SPELLCASTING['Psychic'];
      const keyMod = creature.keyAbility === 'intelligence' ? abilityMods.intelligence : abilityMods.charisma;
      const profBonus = getProficiencyBonus(character.proficiencies.spellAttack, character.level);
      const slotConfig = config ? config.getSlots(character.level) : [];
      const spellSlots: SpellSlot[] = [
        { level: 0, available: 99, max: 99 }, // Cantrips unlimited
        ...slotConfig.map(s => ({ level: s.rank, available: s.count, max: s.count })),
      ];

      creature.spellcasters = [{
        tradition: 'occult',
        castingType: 'spontaneous',
        spells: psychicSpells,
        slots: spellSlots,
        spellAttackBonus: keyMod + profBonus,
        spellDC: 10 + keyMod + profBonus,
      }];
    }

    // ── Wire Magus spellcasting ──
    if (character.class === 'Magus') {
      creature.keyAbility = 'intelligence';
      const config = CLASS_SPELLCASTING['Magus'];

      // Focus points (Magus starts with 1 from hybrid study conflux spell)
      creature.focusPoints = 1;
      creature.maxFocusPoints = 1;

      // Build spells list from CharacterSheet
      const magusSpells: CastableSpell[] = [];
      // Add cantrips
      if (character.knownCantrips) {
        for (const spellId of character.knownCantrips) {
          const spell = getSpell(spellId);
          if (spell) {
            magusSpells.push({
              name: spell.name,
              level: 0,
              tradition: 'arcane',
            });
          }
        }
      }
      // Add prepared spells (or all known for display)
      if (character.preparedSpells) {
        for (const [rankStr, spellIds] of Object.entries(character.preparedSpells)) {
          const rank = Number(rankStr);
          for (const spellId of spellIds) {
            const spell = getSpell(spellId);
            if (spell) {
              magusSpells.push({
                name: spell.name,
                level: rank,
                tradition: 'arcane',
              });
            }
          }
        }
      }

      const keyMod = abilityMods.intelligence;
      const profBonus = getProficiencyBonus(character.proficiencies.spellAttack, character.level);
      const slotConfig = config ? config.getSlots(character.level) : [];
      const spellSlots: SpellSlot[] = [
        { level: 0, available: 99, max: 99 },
        ...slotConfig.map(s => ({ level: s.rank, available: s.count, max: s.count })),
      ];

      creature.spellcasters = [{
        tradition: 'arcane',
        castingType: 'prepared',
        spells: magusSpells,
        slots: spellSlots,
        spellAttackBonus: keyMod + profBonus,
        spellDC: 10 + keyMod + profBonus,
      }];

      // Also wire the old spells array for backward compat with action panel
      creature.spells = magusSpells.map(s => s.name);
    }

    return creature;
  }

  // ═══════════════════════════════════════════════════════════
  // UTILITY FUNCTIONS
  // ═══════════════════════════════════════════════════════════

  /**
   * Generate a unique character ID
   */
  static generateCharacterId(): string {
    return `char_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate a unique party ID
   */
  static generatePartyId(): string {
    return `party_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Create a blank character sheet for a given class and level
   */
  static createBlankCharacter(name: string, characterClass: string, level: number): CharacterSheet {
    return {
      id: this.generateCharacterId(),
      name,
      level,
      currentXP: 0,
      class: characterClass,
      ancestry: 'Human',
      heritage: '',
      background: '',
      abilities: {
        strength: 10,
        dexterity: 10,
        constitution: 10,
        intelligence: 10,
        wisdom: 10,
        charisma: 10,
      },
      proficiencies: {
        unarmed: 'untrained',
        simpleWeapons: 'untrained',
        martialWeapons: 'untrained',
        advancedWeapons: 'untrained',
        unarmored: 'untrained',
        lightArmor: 'untrained',
        mediumArmor: 'untrained',
        heavyArmor: 'untrained',
        fortitude: 'untrained',
        reflex: 'untrained',
        will: 'untrained',
        perception: 'untrained',
        classDC: 'untrained',
        spellAttack: 'untrained',
        spellDC: 'untrained',
      },
      skills: [],
      feats: [],
      createdAt: Date.now(),
    };
  }
}
// Export as singleton instance for convenience
export default new CharacterService();