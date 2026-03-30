/**
 * Random Name Generator for PF2e Ancestries
 * Provides lore-appropriate names based on ancestry.
 */

// Name pools per ancestry — drawn from Golarion naming conventions
const ANCESTRY_NAMES: Record<string, { first: string[]; surnames?: string[] }> = {
  Human: {
    first: [
      // Taldane / Common
      'Alistair', 'Brielle', 'Caelum', 'Daveth', 'Elara', 'Finnian', 'Gwendolyn', 'Halvard',
      'Isolde', 'Jasper', 'Keira', 'Lucien', 'Mirabel', 'Nikolai', 'Ophelia', 'Percival',
      'Quinn', 'Rosalind', 'Silas', 'Thalia', 'Ulric', 'Valeria', 'Wren', 'Xander',
      'Yara', 'Zephyr', 'Aldric', 'Belen', 'Corwin', 'Daria', 'Emeric', 'Farah',
      'Gareth', 'Helena', 'Idris', 'Jolene', 'Kellan', 'Lyra', 'Magnus', 'Nadia',
      'Orion', 'Petra', 'Ronan', 'Serena', 'Tobias', 'Una', 'Vesper', 'Willem',
    ],
    surnames: [
      'Blackwood', 'Stormwind', 'Ashford', 'Ironheart', 'Dawnweaver', 'Ravencrest',
      'Thornwall', 'Goldmere', 'Whitmore', 'Silvervane', 'Oakheart', 'Frostbloom',
      'Dunwright', 'Brightwater', 'Redcliffe', 'Greystone', 'Warden', 'Pennbrook',
      'Hartwell', 'Morrow', 'Fielding', 'Crestwood', 'Hale', 'Sable',
    ],
  },
  Dwarf: {
    first: [
      'Barik', 'Dorek', 'Gundren', 'Hargrim', 'Kazrak', 'Moradin', 'Norgar', 'Torbin',
      'Dolgrim', 'Eberk', 'Flint', 'Gimrak', 'Harbek', 'Kildrak', 'Rurik', 'Thorek',
      'Amber', 'Bardryn', 'Dagnal', 'Gunnlda', 'Helja', 'Kethra', 'Mardred', 'Riswynn',
      'Sannl', 'Tordek', 'Ulfgar', 'Vistra', 'Wren', 'Audhild', 'Diesa', 'Gurdis',
    ],
    surnames: [
      'Ironforge', 'Deepdelve', 'Stoneshield', 'Battlehammer', 'Fireforge', 'Goldvein',
      'Copperkettle', 'Torunn', 'Balderk', 'Dankil', 'Gorunn', 'Holderhek',
      'Loderr', 'Rumnaheim', 'Strakeln', 'Ungart', 'Hammergrim', 'Anvilstrike',
    ],
  },
  Elf: {
    first: [
      'Aerendil', 'Caelindra', 'Elathiel', 'Faelwen', 'Galathil', 'Ilyana', 'Lirael',
      'Mirindel', 'Naivara', 'Quelenna', 'Seraphina', 'Thalion', 'Valanthe', 'Adran',
      'Aramil', 'Berrian', 'Erevan', 'Galinndan', 'Hadarai', 'Ivellios', 'Laucian',
      'Riardon', 'Soveliss', 'Thamior', 'Varis', 'Althaea', 'Drusilia', 'Enna',
      'Keyleth', 'Meriele', 'Shanairra', 'Vadania', 'Caladrel', 'Tessara', 'Alyndra',
    ],
    surnames: [
      'Brightsong', 'Moonwhisper', 'Starweaver', 'Leafwalker', 'Duskhollow', 'Silverlark',
      'Windrunner', 'Greenmantle', 'Amastacia', 'Galanodel', 'Holimion', 'Liadon',
      'Meliamne', 'Nailo', 'Siannodel', 'Xiloscient', 'Brightleaf', 'Dawntracker',
    ],
  },
  Gnome: {
    first: [
      'Alston', 'Breena', 'Dimble', 'Ellywick', 'Frug', 'Gerbo', 'Jabble', 'Lini',
      'Myx', 'Nackle', 'Oda', 'Pock', 'Quilla', 'Roywyn', 'Shamil', 'Tink',
      'Warryn', 'Zook', 'Bimpnottin', 'Caramip', 'Donella', 'Duvamil', 'Ellyjobell',
      'Loopmottin', 'Mardnab', 'Nissa', 'Raulnor', 'Sindri', 'Wrenn', 'Zanna',
      'Fizzle', 'Stumbleduck', 'Nim', 'Pilwicken', 'Cogsworth', 'Twigget',
    ],
    surnames: [
      'Beren', 'Daergel', 'Folkor', 'Garrick', 'Nackle', 'Murnig', 'Ningel',
      'Raulnor', 'Scheppen', 'Turen', 'Sparklegem', 'Whizzlebang', 'Fiddlewick',
      'Tumblebrick', 'Cogsprocket', 'Wizzlepop', 'Glitterdust', 'Puddlejump',
    ],
  },
  Goblin: {
    first: [
      'Blix', 'Chuffy', 'Drubbus', 'Ekkie', 'Fumbus', 'Grig', 'Hoofy', 'Irnk',
      'Jixxa', 'Klonk', 'Lubb', 'Mogmurch', 'Nok-Nok', 'Poog', 'Reta', 'Splug',
      'Tark', 'Unk', 'Vregg', 'Wort', 'Zibini', 'Bokken', 'Churk', 'Drazz',
      'Filch', 'Gnarl', 'Hak', 'Jank', 'Kreb', 'Munch', 'Noggin', 'Prig',
      'Razzle', 'Skrag', 'Titch', 'Yark', 'Zix', 'Bibble', 'Crunch', 'Fizzgig',
    ],
  },
  Halfling: {
    first: [
      'Alton', 'Bree', 'Callista', 'Corrin', 'Dara', 'Eldon', 'Finnan', 'Garret',
      'Hilara', 'Idris', 'Jillian', 'Kithri', 'Lavinia', 'Merric', 'Nedda', 'Osborn',
      'Paela', 'Rosie', 'Seraphina', 'Tegan', 'Vani', 'Wellby', 'Cade', 'Lidda',
      'Milo', 'Portia', 'Sadie', 'Theo', 'Wendle', 'Andry', 'Beau', 'Callie',
    ],
    surnames: [
      'Goodbarrel', 'Greenbottle', 'Highhill', 'Hilltopple', 'Leagallow', 'Tealeaf',
      'Thorngage', 'Tosscobble', 'Underbough', 'Brushgather', 'Sweetwater', 'Warmhearth',
      'Lightfoot', 'Stoutbridge', 'Tallfellow', 'Merryweather', 'Honeydew', 'Kettleblack',
    ],
  },
  Leshy: {
    first: [
      'Bramble', 'Dewdrop', 'Fern', 'Gourd', 'Husk', 'Ivy', 'Juniper', 'Kale',
      'Lichen', 'Moss', 'Nettle', 'Oakling', 'Petal', 'Root', 'Sprout', 'Thistle',
      'Twig', 'Verdance', 'Willow', 'Zinnia', 'Acorn', 'Bud', 'Cedar', 'Daisy',
      'Elm', 'Flora', 'Ginger', 'Hazel', 'Iris', 'Jasmine', 'Knotwood', 'Laurel',
      'Mushroom', 'Nutmeg', 'Olive', 'Primrose', 'Quill', 'Rosemary', 'Sage', 'Thyme',
    ],
  },
  Orc: {
    first: [
      'Arkus', 'Bragg', 'Crug', 'Dench', 'Feng', 'Gell', 'Henk', 'Imsh',
      'Jurk', 'Keth', 'Lhurk', 'Mhurren', 'Nurg', 'Oshgir', 'Porung', 'Ruhk',
      'Shump', 'Thokk', 'Ugruk', 'Varg', 'Wurrg', 'Yevelda', 'Zulg', 'Baggi',
      'Emen', 'Grotha', 'Holga', 'Kansif', 'Myev', 'Neega', 'Ovak', 'Shuthka',
      'Sutha', 'Vola', 'Volen', 'Yevelda', 'Karug', 'Thrag', 'Brukka', 'Gorza',
    ],
    surnames: [
      'Bonebreaker', 'Skullcrusher', 'Ironjaw', 'Bloodfist', 'Doomhammer', 'Stormrage',
      'Goretusk', 'Thundermaw', 'Ashenfang', 'Warcry', 'Blacktusk', 'Stonefist',
    ],
  },
  Kitsune: {
    first: [
      'Akemi', 'Chiyo', 'Emiko', 'Fumiko', 'Hana', 'Izumi', 'Kaede', 'Kohaku',
      'Maki', 'Natsuki', 'Ren', 'Sakura', 'Tamiko', 'Ume', 'Yuki', 'Aiko',
      'Haruki', 'Kazuki', 'Miyu', 'Naoki', 'Riku', 'Sora', 'Takumi', 'Yui',
      'Hikari', 'Jin', 'Kira', 'Mitsuki', 'Ran', 'Shin', 'Tsubaki', 'Akira',
      'Daisuke', 'Hotaru', 'Kenji', 'Masumi', 'Nori', 'Sayuri', 'Yasu', 'Asuka',
    ],
    surnames: [
      'Foxfire', 'Moonveil', 'Starfur', 'Silvertail', 'Nightwhisper', 'Brightfox',
      'Shimizu', 'Hayashi', 'Matsuda', 'Tanaka', 'Fujimoto', 'Nakamura',
    ],
  },
  Kobold: {
    first: [
      'Dax', 'Eek', 'Fizz', 'Gix', 'Hix', 'Irk', 'Jex', 'Kip',
      'Lix', 'Mik', 'Nix', 'Pik', 'Quix', 'Rix', 'Sik', 'Tix',
      'Vex', 'Wik', 'Xix', 'Yip', 'Zak', 'Bip', 'Crex', 'Drik',
      'Ekk', 'Flik', 'Grik', 'Huzz', 'Ipkik', 'Jakk', 'Kipp', 'Lukk',
    ],
  },
  Gnoll: {
    first: [
      'Arra', 'Barsk', 'Crunch', 'Draal', 'Ekka', 'Fhurr', 'Gnash', 'Hrrak',
      'Igrra', 'Krynn', 'Murr', 'Narsk', 'Rrisk', 'Skarr', 'Thrask', 'Urgga',
      'Vrask', 'Yekk', 'Zharak', 'Burr', 'Grrekk', 'Krella', 'Mhask', 'Prrek',
    ],
  },
  Catfolk: {
    first: [
      'Ahmari', 'Bastet', 'Cinder', 'Duskpaw', 'Ember', 'Felis', 'Grimalkin', 'Hazel',
      'Indigo', 'Jasper', 'Kisa', 'Luna', 'Mira', 'Nyx', 'Onyx', 'Prism',
      'Quicksilver', 'Ripple', 'Shadow', 'Topaz', 'Umbra', 'Velvet', 'Whisker', 'Zara',
      'Amiir', 'Bast', 'Cleo', 'Dusk', 'Fawn', 'Ginger', 'Jet', 'Lynx',
    ],
    surnames: [
      'Swiftpaw', 'Nightpounce', 'Softpad', 'Brightwhisker', 'Moonstalker', 'Sunsleek',
      'Shadowleap', 'Thornpurr', 'Dewclaw', 'Silkstep', 'Rainfur', 'Goldclaw',
    ],
  },
  Tengu: {
    first: [
      'Arashi', 'Crowbeak', 'Darkwing', 'Featherfall', 'Gale', 'Haze', 'Inktalon',
      'Jinku', 'Kaze', 'Leafcutter', 'Migra', 'Nightcall', 'Onbin', 'Pinion',
      'Quill', 'Rook', 'Strix', 'Talongrasp', 'Ukyo', 'Windshear', 'Karasuma',
      'Yaegashi', 'Zenith', 'Baku', 'Corvus', 'Dusk', 'Ebon', 'Flock', 'Gust',
    ],
  },
  Ratfolk: {
    first: [
      'Bisk', 'Chitter', 'Dart', 'Eska', 'Fidget', 'Grisk', 'Hask', 'Itch',
      'Jink', 'Keen', 'Lisk', 'Misk', 'Nibble', 'Pip', 'Quick', 'Rask',
      'Skitter', 'Twitch', 'Usk', 'Visk', 'Whisk', 'Yssk', 'Zisk', 'Burrow',
      'Crumb', 'Dash', 'Flick', 'Gnaw', 'Husk', 'Jest', 'Kit', 'Morsel',
    ],
  },
  Lizardfolk: {
    first: [
      'Arashk', 'Brazzik', 'Chessk', 'Drazzil', 'Essik', 'Frazzk', 'Griss', 'Hissk',
      'Irrusk', 'Jessik', 'Kressil', 'Lissik', 'Mirik', 'Nessik', 'Ossik', 'Prizzk',
      'Rassik', 'Sessik', 'Tressik', 'Ussikk', 'Vrisk', 'Wrissik', 'Xisk', 'Zessik',
    ],
  },
  Automaton: {
    first: [
      'Alpha', 'Binary', 'Cipher', 'Delta', 'Echo', 'Flux', 'Glyph', 'Helix',
      'Index', 'Jolt', 'Kernel', 'Logic', 'Matrix', 'Nexus', 'Omega', 'Prism',
      'Quartz', 'Relay', 'Sigma', 'Theta', 'Unity', 'Vector', 'Warden', 'Zenith',
    ],
  },
  Poppet: {
    first: [
      'Button', 'Cotton', 'Dolly', 'Ember', 'Fable', 'Giggles', 'Hops', 'Ivory',
      'Jingle', 'Knots', 'Lullaby', 'Marble', 'Needles', 'Oakly', 'Patches', 'Quilty',
      'Ribbon', 'Stitch', 'Thimble', 'Unity', 'Velvet', 'Whistle', 'Yarn', 'Zigzag',
    ],
  },
  Fetchling: {
    first: [
      'Ashveil', 'Bleake', 'Crepus', 'Duskara', 'Erevain', 'Fadelight', 'Gloom', 'Hollow',
      'Inkshade', 'Jettison', 'Knell', 'Lurk', 'Murk', 'Nighthaven', 'Obscura', 'Penumbra',
      'Quietus', 'Roke', 'Somber', 'Twilight', 'Umbral', 'Vesper', 'Wane', 'Xeris',
    ],
  },
  Sprite: {
    first: [
      'Aura', 'Blink', 'Chime', 'Dewdrop', 'Elfin', 'Flicker', 'Glimmer', 'Halo',
      'Iridescence', 'Jot', 'Kalei', 'Lumen', 'Mote', 'Nymph', 'Opal', 'Pixie',
      'Quiver', 'Ripple', 'Shimmer', 'Tinsel', 'Updraft', 'Vibrance', 'Wisp', 'Zing',
    ],
  },
  Strix: {
    first: [
      'Ashtalonix', 'Brekkerax', 'Cawdrix', 'Duskfeather', 'Eyrion', 'Falcros', 'Gyrex',
      'Hawkenshrike', 'Ixion', 'Jaerix', 'Kestrix', 'Larkos', 'Merlinax', 'Nighthawk',
      'Osprix', 'Peregrix', 'Raptix', 'Swiftclaw', 'Talondrix', 'Windscreech',
    ],
  },
  Anadi: {
    first: [
      'Aranea', 'Bristle', 'Cobalt', 'Drider', 'Filament', 'Gossamer', 'Hexter',
      'Inkspinner', 'Jarak', 'Knotter', 'Loomara', 'Meshka', 'Netter', 'Orbweave',
      'Pallara', 'Silka', 'Threadbare', 'Unravela', 'Veilspun', 'Webbe', 'Xyla',
    ],
  },
  Nagaji: {
    first: [
      'Ashira', 'Bhaskara', 'Chandra', 'Devika', 'Esha', 'Garuda', 'Harsha', 'Indra',
      'Jayanta', 'Kavitha', 'Lakshmi', 'Mahendra', 'Naga', 'Padma', 'Rajani', 'Sarpa',
      'Takshaka', 'Usha', 'Vasuki', 'Yamini', 'Zara', 'Ananta', 'Bhujan', 'Dharma',
    ],
  },
  Vishkanya: {
    first: [
      'Amara', 'Belladonna', 'Cascara', 'Dhatura', 'Elixia', 'Foxglove', 'Hemlock',
      'Isha', 'Jasmine', 'Kala', 'Lotus', 'Mira', 'Nightshade', 'Oleander', 'Priya',
      'Rasha', 'Saffron', 'Toxica', 'Uma', 'Visha', 'Wisteria', 'Yashoda', 'Zina',
    ],
  },
  Conrasu: {
    first: [
      'Axiom', 'Balance', 'Concordance', 'Datum', 'Equilibria', 'Foundation', 'Gravitas',
      'Harmony', 'Integrity', 'Junction', 'Keystone', 'Lattice', 'Mandate', 'Nexion',
      'Order', 'Precept', 'Quintessence', 'Resonance', 'Structure', 'Theorem', 'Unity',
    ],
  },
  Shisk: {
    first: [
      'Altar', 'Beacon', 'Codex', 'Doctrine', 'Epoch', 'Folio', 'Glyph', 'Herist',
      'Incunabula', 'Journal', 'Keeper', 'Lexicon', 'Memoir', 'Notation', 'Oracle',
      'Psalm', 'Quorum', 'Registry', 'Scroll', 'Tome', 'Unbound', 'Volume', 'Writ',
    ],
  },
  Grippli: {
    first: [
      'Bloop', 'Croak', 'Dewlap', 'Eddy', 'Froggle', 'Gurgle', 'Hopper', 'Ibis',
      'Jumper', 'Kelpie', 'Lily', 'Marsh', 'Newt', 'Ollie', 'Puddle', 'Quaggy',
      'Reed', 'Splash', 'Tad', 'Umph', 'Vlorp', 'Waddle', 'Yelp', 'Zip',
    ],
  },
  Kashrishi: {
    first: [
      'Ashok', 'Bhadra', 'Chetan', 'Dhruva', 'Ekam', 'Ganesh', 'Hari', 'Ishi',
      'Jaya', 'Kavi', 'Lela', 'Mani', 'Nila', 'Ojas', 'Priti', 'Rashi',
      'Shanti', 'Tara', 'Uma', 'Veda', 'Yash', 'Ziva', 'Anup', 'Bhumi',
    ],
  },
  Android: {
    first: [
      'Aegis', 'Bios', 'Core', 'Data', 'Eris', 'Frame', 'Grid', 'Hub',
      'Ion', 'Jolt', 'Krux', 'Link', 'Mech', 'Node', 'Optic', 'Pulse',
      'Quanta', 'Rune', 'Syn', 'Trace', 'Unit', 'Vox', 'Wire', 'Xen',
    ],
  },
  Goloma: {
    first: [
      'Alertus', 'Brindle', 'Caution', 'Dread', 'Eerie', 'Flinch', 'Graven', 'Haunt',
      'Ivid', 'Jitter', 'Keen', 'Lurk', 'Morose', 'Nervy', 'Omen', 'Prowl',
      'Qualm', 'Riddick', 'Shiver', 'Trepid', 'Umber', 'Vigil', 'Wary', 'Xenarr',
    ],
  },
};

// Fallback for any ancestry not in the map
const GENERIC_NAMES = {
  first: [
    'Alder', 'Brynn', 'Cael', 'Dara', 'Elan', 'Fable', 'Grey', 'Haven',
    'Ira', 'Jade', 'Kael', 'Lux', 'Maven', 'Nova', 'Onyx', 'Phoenix',
    'Quill', 'Raven', 'Storm', 'True', 'Vale', 'Winter', 'Xael', 'Zeal',
  ],
  surnames: [
    'Ashwalker', 'Brightforge', 'Coldstream', 'Darkhollow', 'Evenstar', 'Farwind',
    'Gloomward', 'Highreach', 'Ironveil', 'Justheart', 'Keenblade', 'Longstrider',
  ],
};

/**
 * Generate a random name appropriate for the given ancestry.
 */
export function generateRandomName(ancestry: string): string {
  const data = ANCESTRY_NAMES[ancestry] || GENERIC_NAMES;
  const first = data.first[Math.floor(Math.random() * data.first.length)];
  
  const surnamePool = data.surnames || GENERIC_NAMES.surnames;
  // ~70% chance to include a surname
  if (Math.random() < 0.7 && surnamePool && surnamePool.length > 0) {
    const surname = surnamePool[Math.floor(Math.random() * surnamePool.length)];
    return `${first} ${surname}`;
  }
  
  return first;
}
