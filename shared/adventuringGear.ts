/**
 * Adventuring Gear — PF2e Remastered
 * Common adventuring equipment that characters purchase during character creation.
 * Source: Player Core pp. 287–292 (Table 6-8), GM Core
 * Stats verified against Archives of Nethys (2e.aonprd.com), March 2026.
 */

export interface GearItem {
  id: string;
  name: string;
  price: number;        // GP (use decimals for sp/cp: 0.1 = 1 sp, 0.01 = 1 cp)
  bulk: number | 'L';   // Bulk (L = light, 0 = negligible/—)
  level: number;
  description: string;
  category: 'general' | 'tool' | 'container' | 'light' | 'rope' | 'writing' | 'religious' | 'medical' | 'survival' | 'thievery';
}

// ─── General Adventuring Gear ─────────────────────────────────
// AoN source IDs noted where verified. Prices from Player Core Table 6-8.

export const ADVENTURING_GEAR: Record<string, GearItem> = {
  // ── Containers ──
  'backpack': {
    id: 'backpack', name: 'Backpack', price: 0.1, bulk: 0, level: 0,
    description: 'A sturdy leather pack. Holds up to 4 Bulk of items.',
    category: 'container',
  },
  'belt-pouch': {
    id: 'belt-pouch', name: 'Belt Pouch', price: 0.04, bulk: 0, level: 0,
    description: 'A small pouch worn at the waist. Holds up to 4 items of light Bulk.',
    category: 'container',
  },
  'sack': {
    id: 'sack', name: 'Sack', price: 0.01, bulk: 'L', level: 0,
    description: 'A simple cloth sack that holds up to 8 Bulk.',
    category: 'container',
  },
  'bandolier': {
    id: 'bandolier', name: 'Bandolier', price: 0.1, bulk: 'L', level: 0,
    description: 'Carries up to 8 items of light Bulk. You can draw an item as part of using it.',
    category: 'container',
  },
  'saddlebags': {
    id: 'saddlebags', name: 'Saddlebags', price: 0.2, bulk: 'L', level: 0,
    description: 'For a mount. Holds up to 3 Bulk of items.',
    category: 'container',
  },
  'chest': {
    id: 'chest', name: 'Chest', price: 0.6, bulk: 2, level: 0,
    description: 'A sturdy wooden chest that holds up to 8 Bulk.',
    category: 'container',
  },

  // ── Light Sources ──
  'candle': {
    id: 'candle', name: 'Candle (10)', price: 0.01, bulk: 0, level: 0,
    description: '10 candles. Each sheds dim light in a 10-foot radius for 8 hours.',
    category: 'light',
  },
  'torch': {
    id: 'torch', name: 'Torch', price: 0.01, bulk: 'L', level: 0,
    description: 'Sheds bright light in a 20-foot radius (and dim light to the next 20 feet) for 1 hour. Can be used as an improvised weapon (1d4 B + 1 fire).',
    category: 'light',
  },
  'lantern-hooded': {
    id: 'lantern-hooded', name: 'Lantern (Hooded)', price: 0.7, bulk: 'L', level: 0,
    description: 'Bright light in a 30-foot radius. Burns 6 hours per pint of oil. Can shutter the light.',
    category: 'light',
  },
  'lantern-bulls-eye': {
    id: 'lantern-bulls-eye', name: "Lantern (Bull's-Eye)", price: 1, bulk: 1, level: 0,
    description: 'Bright light in a 60-foot cone. Burns 6 hours per pint of oil.',
    category: 'light',
  },
  'oil-pint': {
    id: 'oil-pint', name: 'Oil (1 pint)', price: 0.01, bulk: 0, level: 0,
    description: 'Fuel for lanterns. Burns 6 hours in a lantern.',
    category: 'light',
  },
  'glow-rod': {
    id: 'glow-rod', name: 'Glow Rod', price: 3, bulk: 'L', level: 1,
    description: 'Strike as an Interact action to produce bright light in a 20-foot radius for 6 hours. Cannot be extinguished by wind or water.',
    category: 'light',
  },
  'matchstick': {
    id: 'matchstick', name: 'Matchstick', price: 0.02, bulk: 0, level: 1,
    description: 'Strike to ignite on a surface. Can light a flammable object or fuse as an Interact action.',
    category: 'light',
  },

  // ── Rope & Climbing ──
  'rope-50ft': {
    id: 'rope-50ft', name: 'Rope (50 feet)', price: 0.5, bulk: 'L', level: 0,
    description: '50 feet of hemp rope. Can hold up to 3,000 lb.',
    category: 'rope',
  },
  'grappling-hook': {
    id: 'grappling-hook', name: 'Grappling Hook', price: 0.1, bulk: 'L', level: 0,
    description: 'Attach to a rope and throw to anchor at a distance.',
    category: 'rope',
  },
  'pitons': {
    id: 'pitons', name: 'Piton', price: 0.01, bulk: 0, level: 0,
    description: 'A metal spike hammered into surfaces to anchor rope.',
    category: 'rope',
  },
  'climbing-kit': {
    id: 'climbing-kit', name: 'Climbing Kit', price: 0.5, bulk: 1, level: 0,
    description: 'Carabiners, pitons, rope, and harness. Required to Climb without penalties on certain surfaces.',
    category: 'rope',
  },
  'chain-10ft': {
    id: 'chain-10ft', name: 'Chain (10 feet)', price: 4, bulk: 1, level: 0,
    description: '10 feet of iron chain.',
    category: 'rope',
  },

  // ── Tools & Kits ──
  'thieves-toolkit': {
    id: 'thieves-toolkit', name: "Thieves' Toolkit", price: 3, bulk: 'L', level: 0,
    description: 'Required to Pick Locks or Disable traps that use fine lockpicks. Includes replacement picks.',
    category: 'thievery',
  },
  'thieves-toolkit-infiltrator': {
    id: 'thieves-toolkit-infiltrator', name: "Thieves' Toolkit (Infiltrator)", price: 50, bulk: 'L', level: 3,
    description: "Superior thieves' toolkit. +1 item bonus to Pick Locks and Disable Devices.",
    category: 'thievery',
  },
  'repair-toolkit': {
    id: 'repair-toolkit', name: 'Repair Toolkit', price: 2, bulk: 1, level: 0,
    description: 'Portable anvil, tongs, woodworking tools, whetstone, and oils. Required to Repair items.',
    category: 'tool',
  },
  'repair-toolkit-superb': {
    id: 'repair-toolkit-superb', name: 'Repair Toolkit (Superb)', price: 25, bulk: 1, level: 3,
    description: 'Superior repair toolkit. +1 item bonus to Repair checks.',
    category: 'tool',
  },
  'artisans-toolkit': {
    id: 'artisans-toolkit', name: "Artisan's Toolkit", price: 4, bulk: 2, level: 0,
    description: 'Tools for a specific craft (e.g., blacksmithing, carpentry). Required for most Crafting checks.',
    category: 'tool',
  },
  'alchemists-toolkit': {
    id: 'alchemists-toolkit', name: "Alchemist's Toolkit", price: 3, bulk: 1, level: 0,
    description: 'Beakers, reagent pouches, and burners. Required for alchemical Crafting checks.',
    category: 'tool',
  },
  'healers-toolkit': {
    id: 'healers-toolkit', name: "Healer's Toolkit", price: 5, bulk: 1, level: 0,
    description: 'Bandages, salves, and herbs. Required for Treat Wounds and other Medicine checks.',
    category: 'medical',
  },
  'healers-toolkit-expanded': {
    id: 'healers-toolkit-expanded', name: "Healer's Toolkit (Expanded)", price: 50, bulk: 1, level: 3,
    description: "Superior healer's toolkit. +1 item bonus to Medicine checks.",
    category: 'medical',
  },
  'disguise-kit': {
    id: 'disguise-kit', name: 'Disguise Kit', price: 2, bulk: 'L', level: 0,
    description: 'Cosmetics, hair dyes, false facial hair. Required for Impersonate.',
    category: 'tool',
  },
  'disguise-kit-elite': {
    id: 'disguise-kit-elite', name: 'Disguise Kit (Elite)', price: 40, bulk: 'L', level: 3,
    description: 'Superior disguise supplies. +1 item bonus to Impersonate.',
    category: 'tool',
  },
  'musical-instrument-handheld': {
    id: 'musical-instrument-handheld', name: 'Musical Instrument (Handheld)', price: 0.8, bulk: 1, level: 0,
    description: 'A portable instrument like a flute, lute, or fiddle. Required for Performance checks.',
    category: 'tool',
  },
  'musical-instrument-virtuoso': {
    id: 'musical-instrument-virtuoso', name: 'Musical Instrument (Virtuoso Handheld)', price: 50, bulk: 1, level: 3,
    description: 'A masterwork instrument. +1 item bonus to Performance checks.',
    category: 'tool',
  },
  'signal-whistle': {
    id: 'signal-whistle', name: 'Signal Whistle', price: 0.08, bulk: 0, level: 0,
    description: 'A whistle audible for a quarter-mile.',
    category: 'tool',
  },
  'mirror': {
    id: 'mirror', name: 'Mirror', price: 1, bulk: 0, level: 0,
    description: 'A polished steel mirror. Useful for looking around corners.',
    category: 'tool',
  },
  'compass': {
    id: 'compass', name: 'Compass', price: 1, bulk: 0, level: 0,
    description: '+1 item bonus to Survival checks to Sense Direction.',
    category: 'survival',
  },
  'flint-steel': {
    id: 'flint-steel', name: 'Flint and Steel', price: 0.05, bulk: 0, level: 0,
    description: 'Used to start fires. Takes 1 minute to ignite tinder.',
    category: 'survival',
  },
  'crowbar': {
    id: 'crowbar', name: 'Crowbar', price: 0.5, bulk: 'L', level: 0,
    description: '+1 item bonus to Athletics checks to Force Open.',
    category: 'tool',
  },
  'hammer': {
    id: 'hammer', name: 'Hammer', price: 0.1, bulk: 'L', level: 0,
    description: 'A simple hammer for driving pitons.',
    category: 'tool',
  },
  'manacles': {
    id: 'manacles', name: 'Manacles (Simple)', price: 3, bulk: 0, level: 1,
    description: 'Restraints for a Medium creature. Escape DC 22 (Athletics or Thievery).',
    category: 'tool',
  },
  'spyglass': {
    id: 'spyglass', name: 'Spyglass', price: 20, bulk: 'L', level: 0,
    description: 'See things more clearly at distance. Objects 6× farther away appear as if at normal distance.',
    category: 'tool',
  },
  'caltrops': {
    id: 'caltrops', name: 'Caltrops', price: 0.3, bulk: 'L', level: 0,
    description: 'Cover a 5-foot square. Creatures stepping in take 1d4 piercing and are flat-footed (DC 14 Reflex to avoid).',
    category: 'tool',
  },
  'ten-foot-pole': {
    id: 'ten-foot-pole', name: 'Ten-Foot Pole', price: 0.01, bulk: 1, level: 0,
    description: 'A 10-foot wooden pole for probing ahead.',
    category: 'tool',
  },
  'lock-simple': {
    id: 'lock-simple', name: 'Lock (Simple)', price: 2, bulk: 0, level: 1,
    description: 'A simple lock. Pick DC 15 (Thievery).',
    category: 'tool',
  },
  'soap': {
    id: 'soap', name: 'Soap', price: 0.02, bulk: 0, level: 0,
    description: 'A bar of soap for washing.',
    category: 'tool',
  },
  'magnifying-glass': {
    id: 'magnifying-glass', name: 'Magnifying Glass', price: 40, bulk: 0, level: 3,
    description: 'Grants a +1 item bonus to Perception checks to notice tiny details. Can focus sunlight to start a fire.',
    category: 'tool',
  },

  // ── Survival & Camping ──
  'bedroll': {
    id: 'bedroll', name: 'Bedroll', price: 0.02, bulk: 'L', level: 0,
    description: 'A simple sleeping roll for camping.',
    category: 'survival',
  },
  'tent-pup': {
    id: 'tent-pup', name: 'Tent (Pup)', price: 0.8, bulk: 'L', level: 0,
    description: 'A small tent for one person.',
    category: 'survival',
  },
  'tent-4-person': {
    id: 'tent-4-person', name: 'Tent (4-Person)', price: 5, bulk: 1, level: 0,
    description: 'A comfortable tent for up to 4 people.',
    category: 'survival',
  },
  'cookware': {
    id: 'cookware', name: 'Cookware', price: 1, bulk: 2, level: 0,
    description: 'A portable cooking set with pots, pans, utensils, and basic seasonings.',
    category: 'survival',
  },
  'waterskin': {
    id: 'waterskin', name: 'Waterskin', price: 0.05, bulk: 'L', level: 0,
    description: "Holds a day's worth of water.",
    category: 'survival',
  },
  'rations-1-week': {
    id: 'rations-1-week', name: 'Rations (1 week)', price: 0.4, bulk: 'L', level: 0,
    description: 'A week of preserved trail food.',
    category: 'survival',
  },

  // ── Religious & Spellcasting ──
  'primal-symbol': {
    id: 'primal-symbol', name: 'Primal Symbol', price: 0, bulk: 0, level: 0,
    description: 'Holly, mistletoe, or other primal focus. Free with a druid kit. Required for primal spellcasting.',
    category: 'religious',
  },
  'religious-symbol-wooden': {
    id: 'religious-symbol-wooden', name: 'Religious Symbol (Wooden)', price: 0.1, bulk: 'L', level: 0,
    description: 'A divine spellcasting focus. Needed for clerics and champions.',
    category: 'religious',
  },
  'religious-symbol-silver': {
    id: 'religious-symbol-silver', name: 'Religious Symbol (Silver)', price: 2, bulk: 'L', level: 0,
    description: 'A fine silver divine spellcasting focus.',
    category: 'religious',
  },
  'religious-text': {
    id: 'religious-text', name: 'Religious Text', price: 1, bulk: 'L', level: 0,
    description: 'The holy (or unholy) scripture of a particular religion.',
    category: 'religious',
  },
  'material-component-pouch': {
    id: 'material-component-pouch', name: 'Material Component Pouch', price: 0.5, bulk: 'L', level: 0,
    description: 'A small pouch of material components for spells with material components.',
    category: 'tool',
  },
  'spellbook-blank': {
    id: 'spellbook-blank', name: 'Spellbook (Blank)', price: 1, bulk: 'L', level: 0,
    description: 'A blank book with 100 pages for recording spells. Wizards get one free.',
    category: 'writing',
  },
  'formula-book-blank': {
    id: 'formula-book-blank', name: 'Formula Book (Blank)', price: 1, bulk: 'L', level: 0,
    description: 'A blank book for recording alchemical formulas.',
    category: 'writing',
  },

  // ── Writing ──
  'writing-set': {
    id: 'writing-set', name: 'Writing Set', price: 1, bulk: 'L', level: 0,
    description: 'Ink, pens, and 10 sheets of parchment.',
    category: 'writing',
  },
  'chalk-10': {
    id: 'chalk-10', name: 'Chalk (10 pieces)', price: 0.01, bulk: 0, level: 0,
    description: 'For marking surfaces.',
    category: 'writing',
  },

  // ── Clothing ──
  'clothing-ordinary': {
    id: 'clothing-ordinary', name: 'Clothing (Ordinary)', price: 0.1, bulk: 0, level: 0,
    description: "Basic functional clothing: peasant garb, work clothes, or monk's robes.",
    category: 'general',
  },
  'clothing-explorers': {
    id: 'clothing-explorers', name: "Clothing (Explorer's)", price: 0.1, bulk: 'L', level: 0,
    description: 'Sturdy clothing that can be reinforced. Clerical vestments, wizard robes, etc. Treated as unarmored defense.',
    category: 'general',
  },
  'clothing-fine': {
    id: 'clothing-fine', name: 'Clothing (Fine)', price: 2, bulk: 'L', level: 0,
    description: 'Well-tailored clothing for social occasions.',
    category: 'general',
  },
  'clothing-cold-weather': {
    id: 'clothing-cold-weather', name: 'Clothing (Cold-Weather)', price: 0.4, bulk: 'L', level: 0,
    description: 'Warm furs and layers. Negates damage from severe cold; reduces extreme cold to severe.',
    category: 'general',
  },
  'clothing-high-fashion': {
    id: 'clothing-high-fashion', name: 'Clothing (High-Fashion Fine)', price: 55, bulk: 'L', level: 3,
    description: 'Exquisite, cutting-edge fashion. Impresses high society.',
    category: 'general',
  },

  // ── Additional Tools & Kits ──
  'snare-kit': {
    id: 'snare-kit', name: 'Snare Kit', price: 5, bulk: 2, level: 0,
    description: 'Required to Craft snares. Contains springs, wires, and triggers.',
    category: 'tool',
  },
  'snare-kit-specialist': {
    id: 'snare-kit-specialist', name: 'Snare Kit (Specialist)', price: 55, bulk: 2, level: 3,
    description: 'Superior snare kit. +1 item bonus to Crafting checks to set snares.',
    category: 'tool',
  },
  'fishing-tackle': {
    id: 'fishing-tackle', name: 'Fishing Tackle', price: 0.8, bulk: 1, level: 0,
    description: 'Collapsible fishing pole, hooks, line, lures, and net.',
    category: 'tool',
  },
  'fishing-tackle-professional': {
    id: 'fishing-tackle-professional', name: 'Fishing Tackle (Professional)', price: 20, bulk: 1, level: 3,
    description: 'Superior tackle. +1 item bonus to checks to fish.',
    category: 'tool',
  },
  'merchants-scale': {
    id: 'merchants-scale', name: "Merchant's Scale", price: 0.02, bulk: 'L', level: 0,
    description: 'A portable scale for weighing goods and coins.',
    category: 'tool',
  },
  'hourglass': {
    id: 'hourglass', name: 'Hourglass', price: 3, bulk: 'L', level: 0,
    description: 'Measures time in 1-hour increments.',
    category: 'tool',
  },
  'ladder-10ft': {
    id: 'ladder-10ft', name: 'Ladder (10 ft.)', price: 0.03, bulk: 3, level: 0,
    description: 'A standard 10-foot wooden ladder.',
    category: 'tool',
  },
  'tool-short': {
    id: 'tool-short', name: 'Tool (Short)', price: 0.4, bulk: 'L', level: 0,
    description: 'A short hand tool: trowel, hand drill, file, etc. Can be used as an improvised weapon (1d4).',
    category: 'tool',
  },
  'tool-long': {
    id: 'tool-long', name: 'Tool (Long)', price: 1, bulk: 1, level: 0,
    description: 'A long tool: hoe, shovel, rake, etc. Can be used as an improvised weapon (1d6).',
    category: 'tool',
  },
  'tack': {
    id: 'tack', name: 'Tack', price: 4, bulk: 1, level: 0,
    description: 'Saddle, bit, bridle, and stirrups for a riding animal.',
    category: 'survival',
  },
  'scholarly-journal': {
    id: 'scholarly-journal', name: 'Scholarly Journal', price: 6, bulk: 'L', level: 3,
    description: 'Uncommon. A reference work on a specific topic. +1 item bonus to Recall Knowledge on that subject (after 1 min referencing).',
    category: 'writing',
  },
  'survey-map': {
    id: 'survey-map', name: 'Survey Map', price: 10, bulk: 0, level: 3,
    description: 'Uncommon. A detailed map of a single location. +1 item bonus to Survival and Recall Knowledge related to that area.',
    category: 'writing',
  },

  // ── Packs (pre-made kits) ──
  'adventurers-pack': {
    id: 'adventurers-pack', name: "Adventurer's Pack", price: 1.5, bulk: 1, level: 0,
    description: 'Backpack, bedroll, 2 belt pouches, 10 pieces of chalk, flint & steel, 50 ft rope, 2 weeks rations, soap, 5 torches, waterskin.',
    category: 'general',
  },
};
