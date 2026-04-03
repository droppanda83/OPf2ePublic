# PF2e — Hazard & Trap Building Rules

Reference for the AI GM when designing traps, environmental hazards, and haunts.
Built from the Gamemastery Guide formulae — same level-based approach as creature building.

---

## Hazard Types

| Type | Description | Typical Trigger |
|------|-------------|----------------|
| **Trap** | Mechanical device. Can be detected (Perception) and disabled (Thievery). | Proximity, tripwire, pressure plate, opening a door |
| **Environmental** | Natural hazard — rockfall, quicksand, lava, avalanche. Can be noticed but not always disabled. | Entering area, weight, time |
| **Haunt** | Spiritual/undead manifestation. Detected with Perception (often Religion), neutralized with positive energy or specific rituals. | Living creatures entering, specific emotional triggers |
| **Complex** | Any type that acts on initiative (has its own turn). Multiple disable steps needed. | Same triggers, but the hazard "fights back" |

---

## Simple vs. Complex Hazards

### Simple Hazards
- **No initiative** — trigger once, then done (or reset after a defined time)
- **1 reaction** when triggered
- Detection DC, Disable DC, and effect are defined
- Examples: arrow trap, pit trap, poison dart, falling block

### Complex Hazards
- **Have initiative** and take turns each round
- **Routine:** Defined actions the hazard takes each turn (usually 1-3 actions)
- **Multiple disable steps:** Must disable X components (each requires a check)
- **HP/Hardness:** Can be destroyed by attacking
- Examples: flooding room, spinning blade corridor, summoning circle, collapsing ceiling

---

## Hazard Statistics by Level

### Detection & Disable DCs

Use the level-based DC from skill-actions-reference.md, then adjust:

| Hazard Stealth | DC Adjustment |
|---------------|--------------|
| Trained-only detection | +0 (level DC) |
| Easy to spot | -2 to -5 |
| Well-hidden | +2 to +5 |
| Incredibly hidden | +10 |

| Disable Difficulty | DC Adjustment |
|-------------------|--------------|
| Standard | +0 (level DC) |
| Easy to disable | -2 to -5 |
| Hard to disable | +2 to +5 |
| Requires specific skill/tool | No change to DC but limits who can attempt |

### Hazard AC, Saves & HP

For complex hazards that can be attacked:

| Level | AC | Fort | Ref | Hardness | HP (per component) |
|-------|-----|------|------|----------|-------------------|
| 1 | 15 | +10 | +4 | 5 | 20 |
| 2 | 17 | +11 | +5 | 7 | 28 |
| 3 | 18 | +12 | +6 | 8 | 36 |
| 4 | 20 | +14 | +8 | 9 | 44 |
| 5 | 21 | +15 | +9 | 10 | 52 |
| 6 | 23 | +17 | +11 | 11 | 64 |
| 7 | 24 | +18 | +12 | 12 | 72 |
| 8 | 26 | +19 | +13 | 13 | 84 |
| 9 | 27 | +21 | +15 | 14 | 92 |
| 10 | 29 | +22 | +16 | 15 | 104 |
| 11 | 30 | +24 | +18 | 16 | 112 |
| 12 | 32 | +25 | +19 | 17 | 124 |
| 13 | 33 | +26 | +20 | 18 | 136 |
| 14 | 35 | +28 | +22 | 19 | 148 |
| 15 | 36 | +29 | +23 | 20 | 164 |
| 16 | 38 | +30 | +25 | 21 | 176 |
| 17 | 39 | +32 | +26 | 22 | 192 |
| 18 | 41 | +33 | +27 | 23 | 208 |
| 19 | 42 | +35 | +29 | 24 | 224 |
| 20 | 44 | +36 | +30 | 25 | 244 |

---

## Hazard Damage by Level

Damage dealt when the hazard triggers or on each routine action.

| Level | Simple (one hit) | Complex (per round) | Save DC |
|-------|-----------------|--------------------|---------| 
| 1 | 2d6+3 (10 avg) | 1d6+2 (5 avg) | 17 |
| 2 | 2d8+4 (13 avg) | 1d8+3 (7 avg) | 18 |
| 3 | 2d10+6 (17 avg) | 1d10+4 (9 avg) | 20 |
| 4 | 3d8+6 (19 avg) | 2d6+4 (11 avg) | 21 |
| 5 | 3d10+8 (24 avg) | 2d8+5 (14 avg) | 22 |
| 6 | 4d8+8 (26 avg) | 2d10+6 (17 avg) | 24 |
| 7 | 4d10+10 (32 avg) | 2d10+8 (19 avg) | 25 |
| 8 | 5d8+10 (32 avg) | 3d8+6 (19 avg) | 26 |
| 9 | 5d10+12 (39 avg) | 3d8+9 (22 avg) | 28 |
| 10 | 5d12+14 (46 avg) | 3d10+10 (26 avg) | 29 |
| 11 | 6d10+14 (47 avg) | 4d8+10 (28 avg) | 30 |
| 12 | 6d12+16 (55 avg) | 4d10+12 (34 avg) | 32 |
| 13 | 7d10+18 (56 avg) | 4d10+16 (38 avg) | 33 |
| 14 | 7d12+20 (65 avg) | 5d10+14 (41 avg) | 34 |
| 15 | 8d10+22 (66 avg) | 5d10+18 (45 avg) | 36 |
| 16 | 8d12+24 (76 avg) | 5d12+16 (48 avg) | 37 |
| 17 | 9d10+26 (75 avg) | 6d10+18 (51 avg) | 38 |
| 18 | 9d12+28 (86 avg) | 6d10+22 (55 avg) | 40 |
| 19 | 10d10+30 (85 avg) | 6d12+20 (59 avg) | 41 |
| 20 | 10d12+34 (99 avg) | 7d10+24 (62 avg) | 42 |

---

## Hazard XP Awards

Hazards award XP based on their level relative to the party, same as creatures:

| Hazard Level vs Party | Simple XP | Complex XP |
|----------------------|-----------|------------|
| Party Level -4 | 2 XP | 10 XP |
| Party Level -3 | 3 XP | 15 XP |
| Party Level -2 | 4 XP | 20 XP |
| Party Level -1 | 6 XP | 30 XP |
| Party Level +0 | 8 XP | 40 XP |
| Party Level +1 | 12 XP | 60 XP |
| Party Level +2 | 16 XP | 80 XP |
| Party Level +3 | 24 XP | 120 XP |
| Party Level +4 | 32 XP | 160 XP |

---

## Common Trap Templates

### Dart Trap (Simple)
- **Type:** Trap (mechanical)
- **Stealth:** Level DC + 2 to detect the trigger mechanism
- **Trigger:** Pressure plate, tripwire, or opening something
- **Effect:** Ranged Strike (+level-appropriate attack) dealing piercing damage
- **Disable:** Thievery (level DC) to jam the firing mechanism
- May include poison (apply affliction on hit)

### Pit Trap (Simple)
- **Type:** Trap (mechanical)
- **Stealth:** Level DC to notice the covered pit
- **Trigger:** Creature walks on the cover
- **Effect:** Creature falls (10-40 ft typically). Damage: 1d6 per 10 ft falling. Basic Reflex save to Grab an Edge
- **Disable:** Thievery (level DC) to jam the cover open, or wedge it with a tool
- Variants: spiked bottom (+piercing damage), water-filled, concealed spikes

### Scything Blade (Simple or Complex)
- **Type:** Trap (mechanical)
- **Stealth:** Level DC to see the blade slot in the wall
- **Trigger:** Proximity or pressure plate
- **Simple version:** Single slash dealing slashing damage (basic Reflex save)
- **Complex version:** Initiative. Routine: 1 action to sweep the corridor. Reset automatically.
- **Disable:** Thievery (level DC +2) to jam the mechanism, or destroy the blade (use Hardness/HP)

### Poison Gas (Simple or Complex)
- **Type:** Trap (mechanical or environmental)
- **Stealth:** Level DC to notice the vents
- **Trigger:** Opening a container, entering a room, pressure plate
- **Simple:** Single burst — Fortitude save or poisoned (inhaled poison with stages)
- **Complex:** Fills room over multiple rounds. Each round: Fortitude save or advance poison stage.
- **Disable:** Thievery or Crafting (level DC) to seal the vents

### Magical Trap (Simple)
- **Type:** Trap (magical)
- **Stealth:** Perception (level DC) to notice magical aura; Arcana/Occultism/etc. to identify
- **Trigger:** Proximity, touching, opening, speaking a trigger word
- **Effect:** Casts a spell at the triggering creature (fireball, lightning bolt, phantasmal killer, etc.)
- **Disable:** Dispel magic (counteract DC), or Thievery (level DC +5) to disrupt the glyph
- **Cannot be disabled by mundane means if purely magical**

### Flooding Room (Complex)
- **Type:** Trap (mechanical), complex
- **Initiative:** Usually +10 to +15
- **Routine:** 2 actions — water rises 1 foot per action
- **Effect:** When water reaches creature height: must Swim (Athletics DC) each round or start drowning
- **Disable:** Thievery (level DC) on the intake valve + Engineering/Crafting (level DC) on the drain mechanism (2 disable steps)
- **Destroy:** Attack the valve (use AC/Hardness/HP from table)

---

## Haunt Templates

### Ghostly Possession (Simple)
- **Type:** Haunt
- **Stealth:** Religion or Occultism (level DC) to sense the spiritual presence
- **Trigger:** Living creature enters the room
- **Effect:** Will save; on failure, creature is controlled for 1 round (does something thematic — walks toward danger, attacks ally, speaks cryptic words)
- **Disable:** Religion (level DC) to put the spirit to rest, or completing the haunt's unfinished business
- **Reset:** Usually 24 hours unless permanently laid to rest

### Terrifying Visions (Simple)
- **Type:** Haunt
- **Stealth:** Perception (level DC) to notice the temperature drop or spiritual whispers
- **Trigger:** Living creature enters or interacts with specific object
- **Effect:** Will save or Frightened 2 (Frightened 3 on critical failure). Mental damage possible.
- **Disable:** Religion (level DC +2), positive/vitality energy damage to the area, or resolving the ghost's trauma

### Poltergeist Assault (Complex)
- **Type:** Haunt, complex
- **Initiative:** +level-appropriate
- **Routine:** 2 actions — hurl objects (ranged Strike for bludgeoning damage) and attempt to Trip or Shove a creature
- **Disable:** Religion (level DC) to calm the spirit + Occultism (level DC) to sever its anchor (2 steps)
- **HP:** Uses haunt HP (lower than trap HP — typically 50% of table values)

---

## Environmental Hazards

### Avalanche / Rockfall
- **Type:** Environmental
- **Trigger:** Loud noise, tremor, weight on unstable slope
- **Effect:** Area damage (bludgeoning), basic Reflex save. Buried creatures are restrained and take suffocation damage.
- **Escape:** Athletics (DC 20–30) to dig out

### Quicksand
- **Type:** Environmental
- **Stealth:** Survival or Nature (DC 18–22) to identify
- **Trigger:** Creature walks on it
- **Effect:** Creature sinks. Each round: Athletics check (DC 20+) to Swim out. Failure: sink further. After 3 failures: fully submerged (drowning).
- **Rescue:** Ally can pull with Athletics (DC 15) + rope

### Lava
- **Type:** Environmental
- **Damage:** 20d6 fire damage per round of immersion. Splash within 5 ft: 4d6 fire.
- **Not level-scaled** — lava is just that dangerous. Level 15+ hazard equivalent.

### Extreme Weather
| Condition | Effect |
|-----------|--------|
| Extreme Cold | Fort save (hourly) or fatigued → drained → damage |
| Extreme Heat | Fort save (hourly) or fatigued → drained → damage |
| Severe Winds | -2 to ranged attacks, small creatures may be pushed |
| Blizzard/Sandstorm | Concealed (all creatures), difficult terrain |
| Flooding | Swim checks, difficult terrain, drowning risk |

---

## Hazard Design Guidelines for AI GM

### Difficulty Scaling
- Simple traps: use the encounter as a single hazard worth its XP. Pair with combat for combo encounters.
- Complex traps: treat as an encounter ON THEIR OWN (they take turns, have HP, and deal ongoing damage)
- **Solo player adjustment:** Reduce disable DCs by 2, or provide environmental hints (the stone on the pressure plate is slightly depressed)

### Fair Play Rules
1. Every trap MUST be detectable somehow (Perception, a knowledge skill, or a specific sense)
2. Every trap MUST be disableable or avoidable (even if hard)
3. Damage-only traps are boring — add a condition, environmental change, or narrative consequence
4. Complex traps should have a "puzzle" component the player can figure out (not just "roll Thievery 3 times")
5. Haunts should tell a story — the haunt's trigger and effect should hint at the spirit's unresolved issue

### Encounter Pairing
- Trap + Combat: The trap goes off during a fight, creating tactical pressure
- Trap + Skill Challenge: The trap must be disabled under time pressure
- Haunt + Roleplay: The haunt provides plot information while being dangerous
- Environmental + Exploration: Natural hazards make travel meaningful

### Detection Hints for the AI GM Narrator
When describing an area with a trap, always include at least ONE sensory clue:
- "The flagstones here seem slightly uneven"
- "There's a faint chemical smell near the door"
- "The wall has a thin horizontal slot at chest height"
- "The air feels unnaturally cold in this corner"
- The player gets a chance to investigate BEFORE triggering — don't spring traps with zero warning
