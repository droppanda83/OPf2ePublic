/**
 * PF2e Remaster — Adventuring Gear
 * AUTO-GENERATED from Foundry VTT PF2e system data
 * 37 items
 * Generated: 2026-03-03
 */

export interface GearItem {
  id: string;
  name: string;
  price: number;       // gp
  bulk: number | 'L';
  level: number;
  description: string;
  category: string;
}

export const adventuringGear: Record<string, GearItem> = {
  'aetheric-irritant-lesser': {
    id: 'aetheric-irritant-lesser', name: 'Aetheric Irritant (Lesser)', price: 4,
    bulk: 'L', level: 1,
    description: 'Activate (1 action) (manipulate) | An aetheric irritant is a chime that can emit a subsonic frequency that otherworldly beings find unpleasant. When you Activate an aetheric irritant, you sound the chime and place it on the ground in a square within your reach. The aetheric irritant affects an ar...',
    category: 'Consumables',
  },
  'alarm-snare': {
    id: 'alarm-snare', name: 'Alarm Snare', price: 3,
    bulk: 0, level: 1,
    description: 'You create an alarm snare by rigging one or more noisy objects to a trip wire or pressure plate. When you create an alarm snare, you designate a range between 100 to 500 feet at which it can be heard. When a Small or larger creature enters the square, the snare makes a noise loud enough that it c...',
    category: 'Consumables',
  },
  'caltrop-snare': {
    id: 'caltrop-snare', name: 'Caltrop Snare', price: 3,
    bulk: 0, level: 1,
    description: "This snare consists of a hidden canister of Caltrops attached to a trip wire. When the snare is triggered, it flings the caltrops into either the snare's square or a square adjacent to the snare. You choose which square when you set up the snare. If the caltrops scatter into the same square as a ...",
    category: 'Consumables',
  },
  'candle': {
    id: 'candle', name: 'Candle', price: 0.01,
    bulk: 0, level: 0,
    description: 'A lit candle sheds dim light in a 10‐foot radius for 8 hours.',
    category: 'Consumables',
  },
  'chalk': {
    id: 'chalk', name: 'Chalk', price: 0.01,
    bulk: 0, level: 0,
    description: '',
    category: 'Consumables',
  },
  'darkening-poison': {
    id: 'darkening-poison', name: 'Darkening Poison', price: 5,
    bulk: 'L', level: 0,
    description: 'Many calignis keep several doses of darkening poison, an uncommon injury poison made from Darklands spider venom, on hand to incapacitate foes. | Saving Throw @Check[fortitude|dc:16] Maximum Duration 6 rounds | Stage 1 @Damage[1d6[poison]] (1 round) Stage 2 1d6 poison and creatures you can see on...',
    category: 'Consumables',
  },
  'fake-blood-pack': {
    id: 'fake-blood-pack', name: 'Fake Blood Pack', price: 1,
    bulk: 'L', level: 0,
    description: 'Adventurers have found a number of uses for these animal blood–filled bladders, which were originally used in theatrical productions. Whenever you take slashing or piercing damage with the fake blood pack under your clothes or armor, roll a @Check[flat|dc:11]. On a success, the blood pack is punc...',
    category: 'Consumables',
  },
  'hampering-snare': {
    id: 'hampering-snare', name: 'Hampering Snare', price: 3,
    bulk: 0, level: 1,
    description: "You arrange brambles, wires, sticky goo, or other materials to interfere with a creature's movement. The square with this snare, as well as three adjacent squares (to form a @Template[square|distance:10]{10-foot-by-10-foot area}), become difficult terrain when the first creature enters the snare'...",
    category: 'Consumables',
  },
  'marking-snare': {
    id: 'marking-snare', name: 'Marking Snare', price: 3,
    bulk: 0, level: 1,
    description: 'This snare is often used to mark intruders for later tracking or identification. When you create this snare, you must decide whether to make it a dye or a scent marker. Either type of marking grants a +2 circumstance bonus to Track the creature for up to 24 hours or until the dye or scent is wash...',
    category: 'Consumables',
  },
  'oil-1-pint': {
    id: 'oil-1-pint', name: 'Oil (1 pint)', price: 0.01,
    bulk: 0, level: 0,
    description: 'You can use oil to fuel lanterns, but you can also set a pint of oil aflame and throw it. You must first spend an Interact action preparing the oil, then throw it with another action as a ranged attack. If you hit, it splatters on the creature or in a single 5-foot square you target. You must suc...',
    category: 'Consumables',
  },
  'rations': {
    id: 'rations', name: 'Rations', price: 0.4,
    bulk: 'L', level: 0,
    description: '',
    category: 'Consumables',
  },
  'signaling-snare': {
    id: 'signaling-snare', name: 'Signaling Snare', price: 3,
    bulk: 0, level: 1,
    description: 'A subtle snare used in hunting or tracking, a signaling snare often consists of carefully prepared earth, piled sand or stones, specific arrangements of vegetation, and so forth. When a creature enters a square of a signaling snare, nothing happens to the creature, but instead it causes a small, ...',
    category: 'Consumables',
  },
  'sling-darts': {
    id: 'sling-darts', name: 'Sling Darts', price: 0.1,
    bulk: 0, level: 0,
    description: 'These are special ammunition with wing-shaped fins and a pointed end.',
    category: 'Consumables',
  },
  'spike-snare': {
    id: 'spike-snare', name: 'Spike Snare', price: 3,
    bulk: 0, level: 1,
    description: "This basic snare consists of hidden spikes that rely on a creature's momentum to lacerate or potentially impale it as it enters the snare's square, dealing @Damage[2d8[piercing]] damage. The creature must attempt a @Check[reflex|showDC:all|dc:17|basic] saving throw.",
    category: 'Consumables',
  },
  'spray-pellets': {
    id: 'spray-pellets', name: 'Spray Pellets', price: 0.1,
    bulk: 'L', level: 0,
    description: 'A specially prepared packet of spray pellets.',
    category: 'Consumables',
  },
  'adventurers-pack': {
    id: 'adventurers-pack', name: "Adventurer's Pack", price: 1.5,
    bulk: 0, level: 0,
    description: 'This item is the starter kit for an adventurer, containing the essential items for exploration and survival. The Bulk value is for the entire pack together, but see the descriptions of individual items as necessary. The pack contains the following items: a backpack, a bedroll, 10 pieces of chalk,...',
    category: 'Containers',
  },
  'alchemists-haversack': {
    id: 'alchemists-haversack', name: "Alchemist's Haversack", price: 1400,
    bulk: 1, level: 11,
    description: "An alchemist's haversack is a sturdy leather backpack with two compartments. The main section contains an extradimensional space equivalent to a spacious pouch type II, perfect for carrying bulkier alchemist equipment. A secondary partition can hold 2 Bulk of items, 1 of which doesn't count again...",
    category: 'Containers',
  },
  'backpack': {
    id: 'backpack', name: 'Backpack', price: 0.1,
    bulk: 0, level: 0,
    description: "A backpack holds up to 4 Bulk of items and the first 2 Bulk of these items don't count against your Bulk limits. If you're carrying or stowing the pack rather than wearing it on your back, its Bulk is light instead of negligible",
    category: 'Containers',
  },
  'bag-of-weasels': {
    id: 'bag-of-weasels', name: 'Bag of Weasels', price: 0,
    bulk: 1, level: 4,
    description: 'This item appears to be and functions as a Spacious Pouch (Type I), until you try to retrieve an item from the bag. Whenever you retrieve an item from the bag of weasels, roll a @Check[flat|dc:11]. On a success, you retrieve the item as normal. On a failure, the item you retrieve is transformed i...',
    category: 'Containers',
  },
  'chair-storage': {
    id: 'chair-storage', name: 'Chair Storage', price: 1,
    bulk: 0, level: 0,
    description: "Chair storage can be purchased and applied to any wheelchair. This reduces the amount of Bulk the items weigh when stored within the chair, much like a backpack. The first 2 Bulk of items stowed in your chair don't count against your Bulk limit. If you use both chair storage and a backpack at the...",
    category: 'Containers',
  },
  'chest': {
    id: 'chest', name: 'Chest', price: 0.6,
    bulk: 2, level: 0,
    description: 'A wooden chest can hold up to 8 Bulk of items.',
    category: 'Containers',
  },
  'horn-of-plenty': {
    id: 'horn-of-plenty', name: 'Horn of Plenty', price: 0,
    bulk: 0, level: 0,
    description: '',
    category: 'Containers',
  },
  'mother-maw': {
    id: 'mother-maw', name: 'Mother Maw', price: 6000,
    bulk: 0, level: 15,
    description: "This item appears to be and functions as a portable hole, but it's actually the maw of an alien extradimensional creature akin to and older than a bag of devouring. Any animal or vegetable matter put in the hole has a chance of triggering the creature's interest. Whenever you reach into the hole ...",
    category: 'Containers',
  },
  'oilskin-pouch': {
    id: 'oilskin-pouch', name: 'Oilskin Pouch', price: 0.5,
    bulk: 'L', level: 0,
    description: 'Treated with oil and animal fats, the leather of this pouch is more resistant to water but is also stiffer. Many makers and travelers decorate their oilskin pouches with symbols of the ocean and sailing. Often used to store scrolls or other paper documents when a traveler knows they will be in an...',
    category: 'Containers',
  },
  'planar-tunnel': {
    id: 'planar-tunnel', name: 'Planar Tunnel', price: 6000,
    bulk: 0, level: 15,
    description: "A complex, collapsible mechanism forms the outer surface of a planar tunnel. It's linked to a passageway that can be accessed if the tunnel is fully opened. The passage is extradimensional, but borders another plane of existence. Each planar tunnel is keyed to one specific plane. If another extra...",
    category: 'Containers',
  },
  'retrieval-belt': {
    id: 'retrieval-belt', name: 'Retrieval Belt', price: 340,
    bulk: 0, level: 7,
    description: "This belt is covered in small pouches that clasp with buttons of painstakingly carved stone. The belt is tied to an extradimensional space that can hold one item of 1 Bulk or less. Anyone holding the belt can sense its contents, but only those who've invested it can store or retrieve items. Many ...",
    category: 'Containers',
  },
  'retrieval-belt-greater': {
    id: 'retrieval-belt-greater', name: 'Retrieval Belt (Greater)', price: 600,
    bulk: 0, level: 9,
    description: "This belt is covered in small pouches that clasp with buttons of painstakingly carved stone. The belt is tied to an extradimensional space that can hold up to three items of 1 Bulk or less. Anyone holding the belt can sense its contents, but only those who've invested it can store or retrieve ite...",
    category: 'Containers',
  },
  'retrieval-belt-major': {
    id: 'retrieval-belt-major', name: 'Retrieval Belt (Major)', price: 2500,
    bulk: 0, level: 13,
    description: "This belt is covered in small pouches that clasp with buttons of painstakingly carved stone. The belt is tied to an extradimensional space that can hold up to ten items of 1 Bulk or less. Anyone holding the belt can sense its contents, but only those who've invested it can store or retrieve items...",
    category: 'Containers',
  },
  'sack': {
    id: 'sack', name: 'Sack', price: 0.01,
    bulk: 'L', level: 0,
    description: 'A sack can hold up to 8 Bulk worth of items. A sack containing 2 Bulk or less can be worn on the body, usually tucked into a belt. You can carry a sack with one hand, but must use two hands to transfer items in and out.',
    category: 'Containers',
  },
  'saddlebags': {
    id: 'saddlebags', name: 'Saddlebags', price: 0.2,
    bulk: 'L', level: 0,
    description: "Saddlebags come in a pair. Each can hold up to 3 Bulk of items, and the first 1 Bulk of items in each doesn't count against your mount's Bulk limit. The Bulk value given is for saddlebags worn by a mount. If you are carrying or stowing saddlebags, they count as 1 Bulk instead of light Bulk.",
    category: 'Containers',
  },
  'sleeves-of-storage': {
    id: 'sleeves-of-storage', name: 'Sleeves of Storage', price: 100,
    bulk: 'L', level: 4,
    description: 'This loose robe has wide, voluminous sleeves that each contain an extradimensional space. These spaces each function as a Spacious Pouch (Type I) that can hold up to 5 Bulk of items (for a total of 10 Bulk), though no individual item can be of more than 1 Bulk; the sleeves grow slightly heavy as ...',
    category: 'Containers',
  },
  'sleeves-of-storage-greater': {
    id: 'sleeves-of-storage-greater', name: 'Sleeves of Storage (Greater)', price: 600,
    bulk: 0, level: 9,
    description: 'This loose robe has wide, voluminous sleeves that each contain an extradimensional space. These spaces each function as a Spacious Pouch (Type I) that can hold up to 20 Bulk of items (for a total of 40 Bulk), though no individual item can be of more than 1 Bulk; the sleeves grow slightly heavy as...',
    category: 'Containers',
  },
  'spacious-pouch-type-i': {
    id: 'spacious-pouch-type-i', name: 'Spacious Pouch (Type I)', price: 75,
    bulk: 1, level: 4,
    description: "Though it appears to be a cloth bag decorated with panels of richly colored silk or stylish embroidery, a spacious pouch opens into a magical space larger than its outside dimensions. The Bulk held inside the bag doesn't change the Bulk of the spacious pouch itself. The amount of Bulk the bag's e...",
    category: 'Containers',
  },
  'spacious-pouch-type-ii': {
    id: 'spacious-pouch-type-ii', name: 'Spacious Pouch (Type II)', price: 300,
    bulk: 1, level: 7,
    description: "Though it appears to be a cloth bag decorated with panels of richly colored silk or stylish embroidery, a spacious pouch opens into a magical space larger than its outside dimensions. The Bulk held inside the bag doesn't change the Bulk of the spacious pouch itself. The amount of Bulk the bag's e...",
    category: 'Containers',
  },
  'spacious-pouch-type-iii': {
    id: 'spacious-pouch-type-iii', name: 'Spacious Pouch (Type III)', price: 1200,
    bulk: 1, level: 11,
    description: "Though it appears to be a cloth bag decorated with panels of richly colored silk or stylish embroidery, a spacious pouch opens into a magical space larger than its outside dimensions. The Bulk held inside the bag doesn't change the Bulk of the spacious pouch itself. The amount of Bulk the bag's e...",
    category: 'Containers',
  },
  'spacious-pouch-type-iv': {
    id: 'spacious-pouch-type-iv', name: 'Spacious Pouch (Type IV)', price: 2400,
    bulk: 1, level: 13,
    description: "Though it appears to be a cloth bag decorated with panels of richly colored silk or stylish embroidery, a spacious pouch opens into a magical space larger than its outside dimensions. The Bulk held inside the bag doesn't change the Bulk of the spacious pouch itself. The amount of Bulk the bag's e...",
    category: 'Containers',
  },
  'voyagers-pack': {
    id: 'voyagers-pack', name: "Voyager's Pack", price: 14800,
    bulk: 0, level: 17,
    description: "This leather rucksack has icons burned into it, and every time it's taken to a plane it hasn't been to before, a new icon representing that plane scorches into the surface. The pack grants you a +3 bonus to Survival checks. It also enables you to see the magical traces of creatures' passage, allo...",
    category: 'Containers',
  },
};
