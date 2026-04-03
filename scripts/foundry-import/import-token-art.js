/**
 * Token Art Import Script — Downloads creature icons from game-icons.net (CC-BY 3.0).
 *
 * Part of the Foundry VTT Data Pipeline.
 * Run via: npm run import:token-art
 *
 * Source: game-icons.net GitHub repository (https://github.com/game-icons/icons)
 * License: CC-BY 3.0 — Attribution required (credited to individual icon authors)
 *
 * Strategy:
 *   1. Copy any manually-placed art from source/art/
 *   2. For each bestiary creature, find the best matching icon via:
 *      a. Curated exact-name overrides (for common/important creatures)
 *      b. Keyword extraction from creature name → icon name matching
 *      c. Tag-based type fallback (e.g., undead → skeleton icon)
 *   3. Download matched SVGs from game-icons GitHub to frontend/public/art/tokens/
 *   4. Generate art-manifest.json for runtime service
 *
 * Downloads to: frontend/public/art/tokens/ and frontend/public/art/portraits/
 */
const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = path.resolve(__dirname, '..', '..');
const BESTIARY_SOURCE = path.join(__dirname, 'source', 'bestiary.source.json');
const MANUAL_ART_DIR = path.join(__dirname, 'source', 'art');
const TOKEN_OUTPUT_DIR = path.join(ROOT, 'frontend', 'public', 'art', 'tokens');
const PORTRAIT_OUTPUT_DIR = path.join(ROOT, 'frontend', 'public', 'art', 'portraits');
const MANIFEST_FILE = path.join(__dirname, 'generated', 'art-manifest.json');
const REPORT_FILE = path.join(__dirname, 'generated', 'art-import-report.json');

const GAME_ICONS_GITHUB_BASE = 'https://raw.githubusercontent.com/game-icons/icons/master';

// ─── Curated Creature Name → game-icons Path ────────
// Maps keywords extracted from bestiary creature names
// to the best matching game-icons.net SVG path.
// Key = lowercase keyword, Value = path in game-icons repo
const KEYWORD_TO_ICON = {
  // === Specific creature types ===
  'goblin':     'caro-asercion/goblin.svg',
  'skeleton':   'skoll/skeleton.svg',
  'zombie':     'delapouite/shambling-zombie.svg',
  'dragon':     'lorc/dragon-head.svg',
  'wolf':       'lorc/wolf-head.svg',
  'spider':     'carl-olsen/spider-face.svg',
  'rat':        'delapouite/rat.svg',
  'bat':        'delapouite/bat.svg',
  'ghost':      'lorc/ghost.svg',
  'ogre':       'delapouite/ogre.svg',
  'troll':      'skoll/troll.svg',
  'minotaur':   'lorc/minotaur.svg',
  'cyclops':    'lorc/cyclops.svg',
  'hydra':      'lorc/hydra.svg',
  'harpy':      'lorc/harpy.svg',
  'medusa':     'cathelineau/medusa-head.svg',
  'wyvern':     'lorc/wyvern.svg',
  'golem':      'delapouite/golem-head.svg',
  'centaur':    'delapouite/centaur.svg',
  'unicorn':    'delapouite/unicorn.svg',
  'sphinx':     'delapouite/greek-sphinx.svg',
  'djinn':      'delapouite/djinn.svg',
  'djinni':     'delapouite/djinn.svg',
  'bandit':     'delapouite/bandit.svg',
  'guard':      'delapouite/guards.svg',
  'knight':     'delapouite/black-knight-helm.svg',
  'archer':     'delapouite/archer.svg',
  'barbarian':  'delapouite/barbarian.svg',
  'rogue':      'lorc/rogue.svg',
  'wizard':     'delapouite/wizard-face.svg',
  'witch':      'cathelineau/witch-face.svg',
  'monk':       'delapouite/monk-face.svg',
  'orc':        'delapouite/orc-head.svg',
  'imp':        'lorc/imp.svg',
  'mummy':      'delapouite/mummy-head.svg',
  'vampire':    'delapouite/vampire-cape.svg',
  'werewolf':   'lorc/werewolf.svg',
  'octopus':    'lorc/octopus.svg',
  'scorpion':   'lorc/scorpion.svg',
  'snake':      'lorc/snake.svg',
  'viper':      'lorc/snake.svg',
  'cobra':      'delapouite/cobra.svg',
  'frog':       'lorc/frog.svg',
  'toad':       'lorc/frog.svg',
  'turtle':     'lorc/turtle.svg',
  'crab':       'lorc/crab.svg',
  'bear':       'sparker/bear-face.svg',
  'boar':       'caro-asercion/boar.svg',
  'eagle':      'lorc/eagle-emblem.svg',
  'owl':        'lorc/owl.svg',
  'hyena':      'caro-asercion/hyena-head.svg',
  'lion':       'lorc/lion.svg',
  'tiger':      'delapouite/tiger.svg',
  'monkey':     'lorc/monkey.svg',
  'ape':        'lorc/monkey.svg',
  'gorilla':    'delapouite/gorilla.svg',
  'deer':       'caro-asercion/deer.svg',
  'stag':       'lorc/stag-head.svg',
  'fox':        'caro-asercion/fox.svg',
  'ant':        'delapouite/ant.svg',
  'bee':        'lorc/bee.svg',
  'wasp':       'lorc/wasp-sting.svg',
  'beetle':     'lorc/beetle-shell.svg',
  'scarab':     'lorc/gold-scarab.svg',
  'mushroom':   'lorc/mushroom.svg',
  'squid':      'lorc/squid.svg',
  'shark':      'lorc/shark-jaws.svg',
  'mammoth':    'delapouite/mammoth.svg',
  'fairy':      'delapouite/fairy.svg',
  'vulture':    'lorc/vulture.svg',
  'snail':      'lorc/snail.svg',
  'slime':      'delapouite/slime.svg',
  'ooze':       'delapouite/slime.svg',
  'giant':      'delapouite/giant.svg',
  'cat':        'lorc/cat.svg',
  'horse':      'lorc/horse-head.svg',
  'pony':       'lorc/horse-head.svg',
  'hound':      'lorc/hound.svg',
  'dog':        'lorc/hound.svg',
  'crocodile':  'lorc/croc-jaws.svg',
  'alligator':  'lorc/croc-jaws.svg',
  'dinosaur':   'lorc/dinosaur-rex.svg',
  'rex':        'lorc/dinosaur-rex.svg',
  'raptor':     'delapouite/velociraptor.svg',
  'raven':      'lorc/raven.svg',
  'crow':       'lorc/raven.svg',
  'drake':      'lorc/sea-serpent.svg',
  'lich':       'sbed/death-skull.svg',
  'angel':      'lorc/angel-wings.svg',
  'demon':      'delapouite/devil-mask.svg',
  'devil':      'delapouite/devil-mask.svg',
  'wraith':     'lorc/ghost.svg',
  'wight':      'skoll/skeleton.svg',
  'ghoul':      'skoll/skeleton.svg',
  'kobold':     'caro-asercion/goblin.svg',
  'hobgoblin':  'delapouite/orc-head.svg',
  'phoenix':    'lorc/fire-wave.svg',
  'pegasus':    'skoll/pegasus.svg',
  'chimera':    'lorc/hydra.svg',
  'manticore':  'lorc/wyvern.svg',
  'griffon':    'lorc/wyvern.svg',

  // === Humanoid NPC profession keywords ===
  'priest':     'lorc/angel-wings.svg',
  'cleric':     'lorc/angel-wings.svg',
  'healer':     'lorc/angel-wings.svg',
  'champion':   'delapouite/black-knight-helm.svg',
  'paladin':    'delapouite/black-knight-helm.svg',
  'warrior':    'delapouite/sword-brandish.svg',
  'soldier':    'delapouite/guards.svg',
  'fighter':    'delapouite/sword-brandish.svg',
  'swordsman':  'delapouite/sword-brandish.svg',
  'duelist':    'delapouite/sword-brandish.svg',
  'assassin':   'lorc/hood.svg',
  'thief':      'lorc/hood.svg',
  'spy':        'delapouite/spy.svg',
  'scout':      'lorc/hood.svg',
  'ranger':     'lorc/hood.svg',
  'hunter':     'lorc/hood.svg',
  'druid':      'lorc/oak.svg',
  'sorcerer':   'delapouite/wizard-face.svg',
  'mage':       'delapouite/wizard-face.svg',
  'magus':      'delapouite/wizard-face.svg',
  'alchemist':  'lorc/potion-ball.svg',
  'bard':       'delapouite/harp.svg',
  'pirate':     'delapouite/pirate-flag.svg',
  'captain':    'delapouite/pirate-flag.svg',
  'merchant':   'delapouite/coins.svg',
  'innkeeper':  'delapouite/tavern-sign.svg',
  'tavern':     'delapouite/tavern-sign.svg',
  'blacksmith': 'lorc/anvil.svg',
  'smith':      'lorc/anvil.svg',
  'farmer':     'lorc/wheat.svg',
  'commoner':   'delapouite/person.svg',
  'villager':   'delapouite/person.svg',
  'noble':      'lorc/crown-coin.svg',
  'king':       'kier-heyl/dwarf-king.svg',
  'queen':      'lorc/crown-coin.svg',
  'prince':     'lorc/crown-coin.svg',
  'doctor':     'delapouite/caduceus.svg',
  'physician':  'delapouite/caduceus.svg',
  'surgeon':    'delapouite/caduceus.svg',
  'librarian':  'lorc/book-aura.svg',
  'scholar':    'lorc/book-aura.svg',
  'sage':       'lorc/book-aura.svg',
  'teacher':    'lorc/book-aura.svg',
  'apprentice': 'delapouite/wizard-face.svg',
  'beggar':     'lorc/cowled.svg',
  'urchin':     'lorc/cowled.svg',
  'hermit':     'lorc/cowled.svg',
  'pilgrim':    'lorc/cowled.svg',
  'servant':    'delapouite/person.svg',
  'tax':        'delapouite/coins.svg',
  'judge':      'delapouite/weight-scale.svg',
  'barrister':  'delapouite/weight-scale.svg',
  'collector':  'delapouite/coins.svg',
  'apothecary': 'lorc/potion-ball.svg',
  'navigator':  'lorc/compass.svg',
  'sailor':     'delapouite/pirate-flag.svg',
  'swashbuckler': 'delapouite/sword-brandish.svg',
  'investigator': 'delapouite/spy.svg',
  'psychic':    'lorc/eyeball.svg',
  'oracle':     'lorc/eyeball.svg',
  'summoner':   'lorc/spark-spirit.svg',
  'inventor':   'lorc/gears.svg',
  'gunslinger': 'lorc/blunderbuss.svg',
  'thaumaturge': 'lorc/tied-scroll.svg',
  'kineticist': 'sbed/fire.svg',
  'officer':    'delapouite/guards.svg',
  'warden':     'delapouite/guards.svg',
  'sheriff':    'delapouite/guards.svg',
  'marshal':    'delapouite/guards.svg',
  'jester':     'delapouite/jester-hat.svg',
  'maestro':    'delapouite/harp.svg',
  'dancer':     'delapouite/harp.svg',
  'singer':     'delapouite/harp.svg',
  'gladiator':  'delapouite/sword-brandish.svg',
  'executioner': 'lorc/fire-axe.svg',
  'torturer':   'lorc/fire-axe.svg',
  'warlord':    'delapouite/sword-brandish.svg',
  'general':    'delapouite/sword-brandish.svg',
  'commander':  'delapouite/sword-brandish.svg',
  'bounty':     'lorc/hood.svg',
  'necromancer': 'sbed/death-skull.svg',
  'cultist':    'lorc/hood.svg',
  'acolyte':    'lorc/angel-wings.svg',

  // === Animal sub-types ===
  'serpent':    'lorc/sea-serpent.svg',
  'worm':       'lorc/worm-mouth.svg',
  'whale':      'delapouite/whale-tail.svg',
  'dolphin':    'delapouite/whale-tail.svg',
  'lobster':    'lorc/crab.svg',
  'mantis':     'delapouite/ant.svg',
  'centipede':  'delapouite/ant.svg',
  'fly':        'lorc/bee.svg',
  'mosquito':   'lorc/bee.svg',
  'moth':       'lorc/bee.svg',
  'butterfly':  'lorc/bee.svg',
  'dragonfly':  'lorc/bee.svg',
  'lizard':     'lorc/lizard-tongue.svg',
  'gecko':      'lorc/lizard-tongue.svg',
  'salamander': 'lorc/lizard-tongue.svg',
  'newt':       'lorc/lizard-tongue.svg',
  'slug':       'delapouite/grasping-slug.svg',
  'panther':    'lorc/lion.svg',
  'leopard':    'lorc/lion.svg',
  'jaguar':     'lorc/lion.svg',
  'cougar':     'lorc/lion.svg',
  'wolverine':  'sparker/bear-face.svg',
  'badger':     'sparker/bear-face.svg',
  'rhino':      'delapouite/mammoth.svg',
  'hippo':      'delapouite/mammoth.svg',
  'elephant':   'delapouite/mammoth.svg',
  'whale':      'delapouite/whale-tail.svg',
  'ray':        'lorc/jellyfish.svg',
  'eel':        'lorc/snake.svg',

  // === Element/environment keywords ===
  'fire':       'sbed/fire.svg',
  'flame':      'carl-olsen/flame.svg',
  'ice':        'delapouite/ice-golem.svg',
  'frost':      'delapouite/ice-golem.svg',
  'storm':      'lorc/lightning-arc.svg',
  'lightning':  'lorc/lightning-arc.svg',
  'thunder':    'lorc/lightning-arc.svg',
  'earth':      'lorc/stone-crafting.svg',
  'stone':      'lorc/stone-crafting.svg',
  'rock':       'lorc/stone-crafting.svg',
  'water':      'lorc/water-splash.svg',
  'sea':        'lorc/water-splash.svg',
  'ocean':      'lorc/water-splash.svg',
  'air':        'lorc/wind-slap.svg',
  'wind':       'lorc/wind-slap.svg',
  'lava':       'sbed/lava.svg',
  'magma':      'sbed/lava.svg',
  'shadow':     'lorc/shadow-grasp.svg',
  'void':       'lorc/shadow-grasp.svg',
  'crystal':    'lorc/crystal-eye.svg',

  // === PF2e ancestry keywords ===
  'elf':        'kier-heyl/elf-helmet.svg',
  'dwarf':      'delapouite/dwarf-face.svg',
  'gnome':      'cathelineau/bad-gnome.svg',
  'halfling':   'lorc/hood.svg',
  'leshy':      'lorc/oak.svg',

  // === Broad creature types ===
  'elemental':  'sbed/fire.svg',
  'construct':  'delapouite/golem-head.svg',
  'automaton':  'delapouite/metal-golem-head.svg',
  'clockwork':  'delapouite/metal-golem-head.svg',
  'undead':     'skoll/skeleton.svg',
  'fiend':      'delapouite/devil-mask.svg',
  'celestial':  'lorc/angel-wings.svg',
  'aberration': 'delapouite/floating-tentacles.svg',
  'fey':        'delapouite/fairy.svg',
  'plant':      'lorc/oak.svg',
  'fungus':     'lorc/mushroom.svg',
  'spirit':     'lorc/ghost.svg',
  'swarm':      'lorc/bee.svg',
  'troop':      'delapouite/guards.svg',

  // === Misc notable creatures ===
  'animated':   'delapouite/golem-head.svg',
  'treant':     'lorc/evil-tree.svg',
  'gargoyle':   'delapouite/gargoyle.svg',
  'naga':       'lorc/sea-serpent.svg',
  'kraken':     'delapouite/kraken-tentacle.svg',
  'aboleth':    'delapouite/floating-tentacles.svg',
  'doppelganger': 'delapouite/person.svg',
  'mimic':      'delapouite/mimic-chest.svg',
  'golem':      'delapouite/golem-head.svg',
};

// ─── Tag-based fallback icons ────────────────────────
// When no name keyword matches, use creature tags to pick an icon.
const TAG_TO_ICON = {
  'humanoid':   'delapouite/person.svg',
  'animal':     'lorc/paw-front.svg',
  'beast':      'lorc/beast-eye.svg',
  'undead':     'skoll/skeleton.svg',
  'dragon':     'lorc/dragon-head.svg',
  'construct':  'delapouite/golem-head.svg',
  'aberration': 'delapouite/floating-tentacles.svg',
  'elemental':  'sbed/fire.svg',
  'fey':        'delapouite/fairy.svg',
  'fiend':      'delapouite/devil-mask.svg',
  'celestial':  'lorc/angel-wings.svg',
  'giant':      'delapouite/giant.svg',
  'monitor':    'lorc/semi-closed-eye.svg',
  'ooze':       'delapouite/slime.svg',
  'plant':      'lorc/oak.svg',
  'spirit':     'lorc/ghost.svg',
  'fungus':     'lorc/mushroom.svg',
  'swarm':      'lorc/bee.svg',
  'demon':      'delapouite/devil-mask.svg',
  'devil':      'delapouite/devil-mask.svg',
  'daemon':     'delapouite/devil-mask.svg',
  'angel':      'lorc/angel-wings.svg',
  'archon':     'lorc/angel-wings.svg',
  'azata':      'lorc/angel-wings.svg',
  'agathion':   'lorc/angel-wings.svg',
  'vampire':    'delapouite/vampire-cape.svg',
  'skeleton':   'skoll/skeleton.svg',
  'zombie':     'delapouite/shambling-zombie.svg',
  'ghost':      'lorc/ghost.svg',
  'phantom':    'lorc/ghost.svg',
  'wraith':     'lorc/ghost.svg',
  'golem':      'delapouite/golem-head.svg',
  'clockwork':  'delapouite/metal-golem-head.svg',
  'aeon':       'lorc/semi-closed-eye.svg',
  'psychopomp': 'lorc/semi-closed-eye.svg',
  'protean':    'lorc/semi-closed-eye.svg',
  'oni':        'delapouite/orc-head.svg',
  'troll':      'skoll/troll.svg',
  'hag':        'cathelineau/witch-face.svg',
  'nymph':      'delapouite/fairy.svg',
  'sprite':     'delapouite/fairy.svg',
  'gremlin':    'delapouite/fairy.svg',
  'leshy':      'lorc/oak.svg',
  'dinosaur':   'lorc/dinosaur-rex.svg',
  'troop':      'delapouite/guards.svg',
  'shade':      'lorc/shadow-grasp.svg',
  'kami':       'delapouite/fairy.svg',
  'fire':       'sbed/fire.svg',
  'water':      'lorc/water-splash.svg',
  'earth':      'lorc/stone-crafting.svg',
  'air':        'lorc/wind-slap.svg',
  'cold':       'delapouite/ice-golem.svg',
  'electricity': 'lorc/lightning-arc.svg',
  'shadow':     'lorc/shadow-grasp.svg',
  'incorporeal': 'lorc/ghost.svg',
  'aquatic':    'lorc/water-splash.svg',
  'amphibious': 'lorc/frog.svg',
  'human':      'delapouite/person.svg',
  'elf':        'kier-heyl/elf-helmet.svg',
  'dwarf':      'delapouite/dwarf-face.svg',
  'gnome':      'cathelineau/bad-gnome.svg',
  'halfling':   'lorc/hood.svg',
  'orc':        'delapouite/orc-head.svg',
  'goblin':     'caro-asercion/goblin.svg',
  'kobold':     'caro-asercion/goblin.svg',
  'gnoll':      'delapouite/orc-head.svg',
  'hobgoblin':  'delapouite/orc-head.svg',
  'lizardfolk': 'lorc/lizard-tongue.svg',
  'catfolk':    'lorc/cat.svg',
  'ratfolk':    'delapouite/rat.svg',
  'tengu':      'lorc/raven.svg',
  'drow':       'kier-heyl/elf-helmet.svg',
  'boggard':    'lorc/frog.svg',
  'serpentfolk': 'lorc/snake.svg',
  'merfolk':    'lorc/water-splash.svg',
  'caligni':    'lorc/shadow-grasp.svg',
};

// ─── Curated overrides for specific creatures ────────
const CREATURE_OVERRIDES = {
  'Animated Broom': 'delapouite/golem-head.svg',
  'Animated Armor': 'delapouite/metal-golem-head.svg',
  'Animated Statue': 'delapouite/golem-head.svg',
  'Giant Centipede': 'delapouite/ant.svg',
  'Giant Rat': 'delapouite/rat.svg',
  'Giant Spider': 'carl-olsen/spider-face.svg',
  'Giant Bat': 'delapouite/bat.svg',
  'Giant Scorpion': 'lorc/scorpion.svg',
  'Giant Viper': 'lorc/snake.svg',
  'Guard Dog': 'lorc/hound.svg',
  'Riding Horse': 'lorc/horse-head.svg',
  'War Horse': 'lorc/horse-head.svg',
  'Riding Pony': 'lorc/horse-head.svg',
  'Goblin Warrior': 'caro-asercion/goblin.svg',
  'Goblin Commando': 'caro-asercion/goblin.svg',
  'Goblin Pyro': 'caro-asercion/goblin.svg',
  'Kobold Warrior': 'caro-asercion/goblin.svg',
  'Kobold Scout': 'caro-asercion/goblin.svg',
  'Skeleton Guard': 'skoll/skeleton.svg',
  'Skeleton Archer': 'skoll/skeleton.svg',
  'Zombie Shambler': 'delapouite/shambling-zombie.svg',
  'Zombie Brute': 'delapouite/shambling-zombie.svg',
  'Orc Warrior': 'delapouite/orc-head.svg',
  'Hobgoblin Soldier': 'delapouite/orc-head.svg',
  'Ogre Warrior': 'delapouite/ogre.svg',
  'Ogre Boss': 'delapouite/ogre.svg',
  'Young Red Dragon': 'lorc/dragon-head.svg',
  'Adult Red Dragon': 'lorc/dragon-head.svg',
  'Ancient Red Dragon': 'lorc/dragon-head.svg',
  'Young Blue Dragon': 'lorc/dragon-head.svg',
  'Young Green Dragon': 'lorc/dragon-head.svg',
  'Young Black Dragon': 'lorc/dragon-head.svg',
  'Young White Dragon': 'lorc/dragon-head.svg',
  'Adult Blue Dragon': 'lorc/dragon-head.svg',
  'Adult Green Dragon': 'lorc/dragon-head.svg',
  'Adult Black Dragon': 'lorc/dragon-head.svg',
  'Adult White Dragon': 'lorc/dragon-head.svg',
  'Stone Golem': 'delapouite/golem-head.svg',
  'Iron Golem': 'delapouite/metal-golem-head.svg',
  'Clay Golem': 'delapouite/golem-head.svg',
  'Flesh Golem': 'delapouite/golem-head.svg',
  'Bandit': 'delapouite/bandit.svg',
  'Guard': 'delapouite/guards.svg',
  'Watch Officer': 'delapouite/guards.svg',
  'Commoner': 'delapouite/person.svg',
  'Innkeeper': 'delapouite/tavern-sign.svg',
  'Merchant': 'delapouite/coins.svg',
  'Physician': 'delapouite/caduceus.svg',
  'Librarian': 'lorc/book-aura.svg',
  'Adept': 'delapouite/wizard-face.svg',
  'Apprentice': 'delapouite/wizard-face.svg',
  'Barrister': 'delapouite/weight-scale.svg',
  'Beggar': 'lorc/cowled.svg',
  'Teacher': 'lorc/book-aura.svg',
  'Servant': 'delapouite/person.svg',
  'Harrow Reader': 'lorc/eyeball.svg',
  'Tax Collector': 'delapouite/coins.svg',
  'Urchin': 'lorc/cowled.svg',
  'Judge': 'delapouite/weight-scale.svg',
  'Court Historian': 'lorc/book-aura.svg',
  'Ghoul': 'skoll/skeleton.svg',
  'Ghoul Stalker': 'skoll/skeleton.svg',
  'Wraith': 'lorc/ghost.svg',
  'Wight': 'skoll/skeleton.svg',
  'Mummy Guardian': 'delapouite/mummy-head.svg',
  'Lich': 'sbed/death-skull.svg',
  'Vampire Count': 'delapouite/vampire-cape.svg',
  'Vampire Spawn': 'delapouite/vampire-cape.svg',
  'Living Wildfire': 'sbed/fire.svg',
  'Living Waterfall': 'lorc/water-splash.svg',
  'Living Landslide': 'lorc/stone-crafting.svg',
  'Living Whirlwind': 'lorc/wind-slap.svg',
  'Basilisk': 'lorc/lizard-tongue.svg',
  'Manticore': 'lorc/wyvern.svg',
  'Griffon': 'lorc/wyvern.svg',
  'Chimera': 'lorc/hydra.svg',
  'Gelatinous Cube': 'delapouite/slime.svg',
  'Black Pudding': 'delapouite/slime.svg',
  'Quasit': 'lorc/imp.svg',
  'Spider Swarm': 'carl-olsen/spider-face.svg',
  'Leaf Leshy': 'lorc/oak.svg',
  'Dire Wolf': 'lorc/direwolf.svg',
  'Grizzly Bear': 'sparker/bear-face.svg',
  'Warg': 'lorc/direwolf.svg',
  'Troll': 'skoll/troll.svg',
};

// ─── Helpers ─────────────────────────────────────────

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`  Created directory: ${path.relative(ROOT, dir)}`);
  }
}

function normalizeId(name) {
  return name
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function downloadFile(url, destPath) {
  return new Promise((resolve) => {
    const protocol = url.startsWith('https') ? https : require('http');
    const request = protocol.get(url, { headers: { 'User-Agent': 'pf2e-rebirth-import/1.0' }, timeout: 15000 }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        downloadFile(res.headers.location, destPath).then(resolve);
        return;
      }
      if (res.statusCode !== 200) {
        res.resume();
        resolve(false);
        return;
      }
      const fileStream = fs.createWriteStream(destPath);
      res.pipe(fileStream);
      fileStream.on('finish', () => { fileStream.close(); resolve(true); });
      fileStream.on('error', () => { fs.unlink(destPath, () => {}); resolve(false); });
    });
    request.on('error', () => resolve(false));
    request.on('timeout', () => { request.destroy(); resolve(false); });
  });
}

/**
 * Extract meaningful keywords from a creature name.
 * E.g., "Giant Fire Beetle" → ['fire', 'beetle', 'giant']
 */
function extractKeywords(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2 && !SKIP_WORDS.has(w));
}

// Words to skip when extracting keywords (too generic)
const SKIP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'from', 'young', 'adult', 'ancient', 'old',
  'elder', 'greater', 'lesser', 'minor', 'major', 'dire', 'great', 'deep',
  'high', 'low', 'common', 'rare', 'mega', 'ultra', 'mini', 'tiny', 'huge',
  'gargantuan', 'colossal', 'weak', 'elite', 'advanced', 'risen', 'fallen',
]);

/**
 * Find the best game-icons match for a creature.
 * Returns { iconPath, matchType } or null if no match.
 */
function findBestIcon(creature) {
  const name = creature.name;
  const tags = (creature.tags || []).map(t => t.toLowerCase());

  // 1. Curated exact-name override
  if (CREATURE_OVERRIDES[name]) {
    return { iconPath: CREATURE_OVERRIDES[name], matchType: 'curated-override' };
  }

  // 2. Keyword extraction from name → KEYWORD_TO_ICON
  const keywords = extractKeywords(name);
  // Try longer keywords first (more specific)
  const sortedKeywords = keywords.sort((a, b) => b.length - a.length);
  for (const kw of sortedKeywords) {
    if (KEYWORD_TO_ICON[kw]) {
      return { iconPath: KEYWORD_TO_ICON[kw], matchType: 'keyword-name' };
    }
  }

  // 3. Tag-based fallback (specific subtypes before broad types)
  const tagPriority = [
    'vampire', 'skeleton', 'zombie', 'ghost', 'phantom', 'wraith',
    'demon', 'devil', 'daemon', 'angel', 'archon', 'azata', 'agathion',
    'golem', 'clockwork', 'aeon', 'psychopomp', 'protean',
    'oni', 'troll', 'hag', 'nymph', 'sprite', 'gremlin', 'leshy', 'dinosaur',
    'shade', 'kami',
    'goblin', 'kobold', 'orc', 'hobgoblin', 'gnoll', 'elf', 'dwarf', 'gnome',
    'halfling', 'human', 'lizardfolk', 'catfolk', 'ratfolk', 'tengu', 'drow',
    'boggard', 'serpentfolk', 'merfolk', 'caligni',
    'aberration', 'animal', 'beast', 'celestial', 'construct', 'dragon',
    'elemental', 'fey', 'fiend', 'fungus', 'giant', 'humanoid',
    'monitor', 'ooze', 'plant', 'spirit', 'undead', 'swarm', 'troop',
    'fire', 'water', 'earth', 'air', 'cold', 'electricity',
    'shadow', 'incorporeal', 'aquatic', 'amphibious',
  ];

  for (const tag of tagPriority) {
    if (tags.includes(tag) && TAG_TO_ICON[tag]) {
      return { iconPath: TAG_TO_ICON[tag], matchType: 'tag-fallback' };
    }
  }

  return null;
}

/**
 * Extract attribution from game-icons path.
 */
function extractAttribution(iconPath) {
  const author = iconPath.split('/')[0];
  const iconName = iconPath.split('/').pop().replace('.svg', '').replace(/-/g, ' ');
  return `"${iconName}" by ${author} (game-icons.net, CC-BY 3.0)`;
}

// ─── Main Import Logic ───────────────────────────────

async function run() {
  console.log('\n[token-art] Starting token art import from game-icons.net...');
  console.log('  Source: game-icons.net (CC-BY 3.0)');
  console.log('  Repo:   https://github.com/game-icons/icons\n');

  ensureDir(TOKEN_OUTPUT_DIR);
  ensureDir(PORTRAIT_OUTPUT_DIR);
  ensureDir(path.join(__dirname, 'generated'));
  ensureDir(MANUAL_ART_DIR);

  // Load bestiary
  let bestiary = [];
  if (fs.existsSync(BESTIARY_SOURCE)) {
    const raw = JSON.parse(fs.readFileSync(BESTIARY_SOURCE, 'utf8'));
    bestiary = Array.isArray(raw) ? raw : (raw.creatures || []);
    console.log(`  Loaded ${bestiary.length} creatures from bestiary`);
  } else {
    console.log('  WARNING: No bestiary.source.json found');
    return;
  }

  const manifest = {};
  const report = {
    timestamp: new Date().toISOString(),
    totalCreatures: bestiary.length,
    downloaded: 0,
    cached: 0,
    manualArt: 0,
    failed: 0,
    noMatch: 0,
    matchTypes: {},
    sources: {},
  };

  // ─── Phase 1: Copy manually-placed art ─────────────
  console.log('\n  Phase 1: Checking for manual art files...');
  const manualTokenDir = path.join(MANUAL_ART_DIR, 'tokens');
  const manualPortraitDir = path.join(MANUAL_ART_DIR, 'portraits');

  if (fs.existsSync(manualTokenDir)) {
    const manualTokens = fs.readdirSync(manualTokenDir).filter(f => /\.(webp|png|jpg|svg)$/i.test(f));
    for (const file of manualTokens) {
      const dest = path.join(TOKEN_OUTPUT_DIR, file);
      fs.copyFileSync(path.join(manualTokenDir, file), dest);
      const id = path.basename(file, path.extname(file));
      manifest[id] = manifest[id] || {};
      manifest[id].token = `/art/tokens/${file}`;
      manifest[id].source = 'custom';
      report.manualArt++;
    }
    if (manualTokens.length > 0) console.log(`  Copied ${manualTokens.length} manual token files`);
  }

  if (fs.existsSync(manualPortraitDir)) {
    const manualPortraits = fs.readdirSync(manualPortraitDir).filter(f => /\.(webp|png|jpg|svg)$/i.test(f));
    for (const file of manualPortraits) {
      const dest = path.join(PORTRAIT_OUTPUT_DIR, file);
      fs.copyFileSync(path.join(manualPortraitDir, file), dest);
      const id = path.basename(file, path.extname(file));
      manifest[id] = manifest[id] || {};
      manifest[id].portrait = `/art/portraits/${file}`;
      manifest[id].source = manifest[id].source || 'custom';
      report.manualArt++;
    }
    if (manualPortraits.length > 0) console.log(`  Copied ${manualPortraits.length} manual portrait files`);
  }

  // ─── Phase 2: Match all creatures to game-icons ────
  console.log('\n  Phase 2: Matching creatures to game-icons...');

  const iconDownloads = new Map(); // iconPath → Set of { id, match }
  const creatureMatches = new Map(); // creatureId → { iconPath, matchType, name, tags }

  for (const creature of bestiary) {
    const id = normalizeId(creature.name);
    if (manifest[id]?.token) continue; // Skip if already has manual art

    const match = findBestIcon(creature);
    if (match) {
      creatureMatches.set(id, { ...match, name: creature.name, tags: creature.tags });
      if (!iconDownloads.has(match.iconPath)) {
        iconDownloads.set(match.iconPath, new Set());
      }
      iconDownloads.get(match.iconPath).add(id);
      report.matchTypes[match.matchType] = (report.matchTypes[match.matchType] || 0) + 1;
    } else {
      manifest[id] = { fallbackOnly: true, displayName: creature.name, tags: creature.tags };
      report.noMatch++;
    }
  }

  const totalMatched = creatureMatches.size;
  const uniqueIcons = iconDownloads.size;
  console.log(`  Matched ${totalMatched}/${bestiary.length} creatures → ${uniqueIcons} unique icons`);
  console.log(`  Match breakdown:`, JSON.stringify(report.matchTypes));
  if (report.noMatch > 0) {
    console.log(`  Unmatched: ${report.noMatch} (will use existing SVG type fallback)`);
  }

  // ─── Phase 3: Download icons from game-icons.net ───
  console.log('\n  Phase 3: Downloading game-icons SVGs...');

  const iconsToDownload = [];
  let alreadyCached = 0;

  for (const [iconPath, creatureIds] of iconDownloads) {
    const iconBasename = iconPath.split('/').pop();
    const destPath = path.join(TOKEN_OUTPUT_DIR, iconBasename);

    if (fs.existsSync(destPath)) {
      for (const id of creatureIds) {
        const match = creatureMatches.get(id);
        manifest[id] = {
          token: `/art/tokens/${iconBasename}`,
          source: 'game-icons',
          displayName: match.name,
          tags: match.tags,
          matchType: match.matchType,
          attribution: extractAttribution(iconPath),
          cached: true,
        };
      }
      alreadyCached++;
      report.cached += creatureIds.size;
    } else {
      iconsToDownload.push({ iconPath, iconBasename, destPath, creatureIds });
    }
  }

  if (alreadyCached > 0) console.log(`  ${alreadyCached} icons already cached`);

  let downloaded = 0;
  let failed = 0;

  if (iconsToDownload.length > 0) {
    console.log(`  Downloading ${iconsToDownload.length} icons (. = ok, x = fail):`);
    process.stdout.write('  ');

    for (const task of iconsToDownload) {
      const url = `${GAME_ICONS_GITHUB_BASE}/${task.iconPath}`;
      const success = await downloadFile(url, task.destPath);

      if (success) {
        downloaded++;
        for (const id of task.creatureIds) {
          const match = creatureMatches.get(id);
          manifest[id] = {
            token: `/art/tokens/${task.iconBasename}`,
            source: 'game-icons',
            displayName: match.name,
            tags: match.tags,
            matchType: match.matchType,
            attribution: extractAttribution(task.iconPath),
          };
        }
        report.downloaded += task.creatureIds.size;
        process.stdout.write('.');
      } else {
        failed++;
        for (const id of task.creatureIds) {
          const match = creatureMatches.get(id);
          manifest[id] = { fallbackOnly: true, displayName: match.name, tags: match.tags };
        }
        report.failed += task.creatureIds.size;
        process.stdout.write('x');
      }

      // Rate limit: small delay between requests
      await new Promise(r => setTimeout(r, 50));
    }
    console.log('');
    console.log(`  Result: ${downloaded} downloaded, ${failed} failed`);
  } else {
    console.log('  All icons already cached!');
  }

  // ─── Phase 4: Write manifest ───────────────────────
  console.log('\n  Phase 4: Writing art manifest...');

  const withSpecificArt = Object.values(manifest).filter(e => !e.fallbackOnly).length;
  const manifestData = {
    version: '2.0.0',
    generatedAt: new Date().toISOString(),
    source: 'game-icons.net',
    license: 'CC-BY 3.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/3.0/',
    attribution: 'Icons by game-icons.net contributors. See https://game-icons.net/about.html#authors',
    totalEntries: Object.keys(manifest).length,
    withSpecificArt,
    entries: manifest,
  };

  fs.writeFileSync(MANIFEST_FILE, JSON.stringify(manifestData, null, 2));
  console.log(`  Wrote manifest: ${path.relative(ROOT, MANIFEST_FILE)}`);

  // Write report
  report.sources = {
    'game-icons': report.downloaded + report.cached,
    'manual/custom': report.manualArt,
    'no-match': report.noMatch,
    'failed': report.failed,
  };
  fs.writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2));

  // ─── Summary ──────────────────────────────────────
  const coverage = Math.round((withSpecificArt / Math.max(report.totalCreatures, 1)) * 100);
  console.log('\n  ─── Token Art Import Summary ───');
  console.log(`  Total creatures:     ${report.totalCreatures}`);
  console.log(`  With specific icons: ${withSpecificArt} (${coverage}%)`);
  console.log(`    Downloaded:        ${report.downloaded} creature mappings (${downloaded || 0} unique icons)`);
  console.log(`    Cached:            ${report.cached} creature mappings (${alreadyCached} unique icons)`);
  console.log(`    Manual art:        ${report.manualArt}`);
  console.log(`  No match:            ${report.noMatch} (existing SVG type fallback)`);
  console.log(`  Failed:              ${report.failed}`);
  console.log('');
  console.log('  License: CC-BY 3.0 — https://game-icons.net/about.html#authors');
  console.log('');
}

if (require.main === module) {
  run().catch(err => {
    console.error('[token-art] Fatal error:', err);
    process.exit(1);
  });
}

module.exports = { run };
