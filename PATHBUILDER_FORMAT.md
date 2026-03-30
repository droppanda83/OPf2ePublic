// Example Pathbuilder 2e Character Export Format
// This is what a Pathbuilder character JSON export looks like

{
  "name": "Aldrich Stormborn",
  "playerName": "Player One",
  "level": 3,
  "experience": 800,
  "alignment": "CG",
  "size": "medium",
  "gender": "Male",
  "age": "28",
  "traits": ["human", "humanoid"],

  // ABILITY SCORES
  // Raw ability scores (not modifiers)
  "abilities": {
    "str": 16,    // Strength (16 = +3 modifier)
    "dex": 14,    // Dexterity (14 = +2 modifier)
    "con": 15,    // Constitution (15 = +2 modifier)
    "int": 12,    // Intelligence (12 = +1 modifier)
    "wis": 13,    // Wisdom (13 = +1 modifier)
    "cha": 10     // Charisma (10 = +0 modifier)
  },

  // HIT POINTS
  "maxHP": 32,

  // ARMOR CLASS
  // This is the total AC (including armor/shield bonuses)
  "armorClass": 18,

  // SKILLS (Optional)
  // Proficiency levels: U (Untrained), T (Trained), E (Expert), M (Master), L (Legendary)
  "skills": {
    "acrobatics": { "proficiency": "T", "value": 5 },
    "animal-handling": { "proficiency": "U", "value": 1 },
    "arcana": { "proficiency": "U", "value": 1 },
    "athletics": { "proficiency": "T", "value": 5 },
    "crafting": { "proficiency": "T", "value": 4 },
    "deception": { "proficiency": "U", "value": 0 },
    "diplomacy": { "proficiency": "T", "value": 3 },
    "intimidation": { "proficiency": "T", "value": 3 },
    "medicine": { "proficiency": "U", "value": 1 },
    "nature": { "proficiency": "U", "value": 1 },
    "occultism": { "proficiency": "U", "value": 1 },
    "performance": { "proficiency": "U", "value": 0 },
    "religion": { "proficiency": "U", "value": 1 },
    "society": { "proficiency": "U", "value": 1 },
    "stealth": { "proficiency": "T", "value": 5 },
    "survival": { "proficiency": "U", "value": 1 },
    "thievery": { "proficiency": "U", "value": 2 }
  },

  // SAVING THROWS (Optional)
  "saves": {
    "fortitude": { "proficiency": "T", "value": 5 },
    "reflex": { "proficiency": "T", "value": 5 },
    "will": { "proficiency": "T", "value": 4 }
  },

  // WEAPON & ARMOR PROFICIENCIES (Optional)
  "proficiencies": {
    "weapons": ["simple", "martial"],
    "armor": ["light", "medium", "heavy"]
  },

  // EQUIPMENT
  "equippedArmor": "plate-armor",
  "equippedWeapon": "longsword",
  "equippedShield": "steel-shield",
  "equippedItems": ["backpack", "rope", "torch"],

  // SPELLCASTING (Optional)
  "spellcasting": {
    "keyAbility": "int",  // Key ability: str, dex, con, int, wis, or cha
    "spellDC": 15,        // Spell DC
    "spells": [
      "magic-missile",
      "shield",
      "fireball"
    ]
  },

  // NOTES
  "notes": "Brave fighter from the northern lands",
  "source": "Pathbuilder 2e",
  "imageUrl": "https://example.com/aldrich.jpg"
}
