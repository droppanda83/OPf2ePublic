# PF2e — Skill DCs, Skill Actions & Difficulty Reference

Reference for the AI GM when adjudicating skill checks, setting DCs, and running
exploration/social encounters. Includes all standard skill actions with their mechanics.

---

## Level-Based DCs

The default DC for a task tied to a creature or object of a given level.

| Level | DC | Level | DC | Level | DC |
|-------|----|-------|----|-------|----|
| 0 | 14 | 9 | 26 | 18 | 38 |
| 1 | 15 | 10 | 27 | 19 | 39 |
| 2 | 16 | 11 | 28 | 20 | 40 |
| 3 | 18 | 12 | 30 | 21 | 42 |
| 4 | 19 | 13 | 31 | 22 | 44 |
| 5 | 20 | 14 | 32 | 23 | 46 |
| 6 | 22 | 15 | 34 | 24 | 48 |
| 7 | 23 | 16 | 35 | 25 | 50 |
| 8 | 24 | 17 | 36 | | |

---

## DC Adjustments

When a task is easier or harder than standard for its level:

| Difficulty | DC Adjustment | When to Use |
|-----------|--------------|-------------|
| Incredibly Easy | -10 | Almost guaranteed; only fail on critical fumble |
| Very Easy | -5 | Trivial for trained characters |
| Easy | -2 | Slightly below standard |
| Standard | +0 | Default for the level |
| Hard | +2 | Requires extra effort |
| Very Hard | +5 | Only specialists succeed reliably |
| Incredibly Hard | +10 | Nearly impossible; requires mastery |

---

## Simple DCs (Not Level-Based)

For tasks where level doesn't apply (generic difficulty):

| Proficiency | DC |
|------------|-----|
| Untrained | 10 |
| Trained | 15 |
| Expert | 20 |
| Master | 30 |
| Legendary | 40 |

---

## Recall Knowledge

- **Action cost:** 1 action (Secret check — GM rolls)
- **Skill used depends on creature type:**

| Creature Type | Skill |
|--------------|-------|
| Aberration | Occultism |
| Animal | Nature |
| Astral | Occultism |
| Beast | Arcana, Nature |
| Celestial | Religion |
| Construct | Arcana, Crafting |
| Dragon | Arcana |
| Dream | Occultism |
| Elemental | Arcana, Nature |
| Ethereal | Occultism |
| Fey | Nature |
| Fiend | Religion |
| Fungus | Nature |
| Giant | Society |
| Humanoid | Society |
| Monitor | Religion |
| Ooze | Occultism |
| Plant | Nature |
| Spirit | Occultism |
| Undead | Religion |

- **Success:** Learn one useful fact (weakness, resistance, special ability, or one important stat)
- **Critical Success:** Learn two facts, including something more specific
- **Failure:** No information
- **Critical Failure:** GM provides false information (the player doesn't know it's wrong)
- **DC:** Use the creature's level-based DC. Second attempt on same creature: DC increases by +5 (can't just keep guessing)

---

## Athletics Skill Actions

### Climb
- **Actions:** 1
- **Requirements:** Both hands free (or appropriate climb Speed)
- **DC:** Varies by surface — flat DC 15 for rough stone, DC 20 for smooth, DC 30 for near-impossible
- **Success:** Move up to 5 ft (or 10 ft on crit success)
- **Critical Failure:** Fall

### Force Open
- **Actions:** 1
- **Trained only**
- **DC:** Set by door/container level
- **Uses:** Opening locked doors, breaking objects
- **Success:** Open it; Critical Success: open without damaging

### Grapple
- **Actions:** 1
- **Requirements:** At least one free hand
- **Target:** Adjacent creature, your Athletics vs. their Fortitude DC
- **Critical Success:** Target is restrained (escape DC = your Athletics DC)
- **Success:** Target is grabbed (escape DC = your Athletics DC)
- **Failure:** Nothing
- **Critical Failure:** If target is larger, you become off-guard until start of your next turn
- **Sustaining:** The grabbed/restrained condition lasts until end of your next turn unless you use an action to sustain it (another Grapple)

### High Jump
- **Actions:** 2 (includes Stride)
- **DC:** 30 to reach 5 ft, DC 15 to reach 3 ft
- **Requires:** Stride action first (built into the 2-action cost)

### Long Jump
- **Actions:** 2 (includes Stride)
- **DC:** Equal to distance in feet (DC 15 to jump 15 ft)
- **Maximum:** Can't jump farther than your Speed
- **Failure:** Jump normally (Leap distance), then fall prone

### Shove
- **Actions:** 1
- **Requirements:** At least one free hand
- **Target:** Adjacent creature, your Athletics vs. their Fortitude DC
- **Critical Success:** Push target 10 ft away; you can Stride 10 ft after them
- **Success:** Push target 5 ft; you can Stride 5 ft after them
- **Critical Failure:** You become off-guard until start of your next turn

### Swim
- **Actions:** 1
- **DC:** Varies by water conditions. Calm DC 10, rough DC 15, stormy DC 20
- **Success:** Move up to 10 ft through water
- **Critical Failure:** Lose 1 round of air (if holding breath)

### Trip
- **Actions:** 1
- **Requirements:** At least one free hand OR a weapon with the trip trait
- **Target:** Adjacent creature (or within reach if using trip weapon), your Athletics vs. their Reflex DC
- **Critical Success:** Target falls prone and takes 1d6 bludgeoning damage
- **Success:** Target falls prone
- **Critical Failure:** You fall prone

### Disarm
- **Actions:** 1
- **Trained only**
- **Target:** Adjacent creature wielding an item, your Athletics vs. their Reflex DC
- **Critical Success:** Item drops to ground in target's space
- **Success:** -2 circumstance penalty to attacks/checks with that item until start of your next turn
- **Critical Failure:** You become off-guard until your next turn

---

## Intimidation Skill Actions

### Demoralize
- **Actions:** 1
- **Target:** Creature within 30 ft that you can sense; your Intimidation vs. their Will DC
- **Critical Success:** Frightened 2
- **Success:** Frightened 1
- **Failure:** Nothing; target is temporarily immune to your Demoralize for **10 minutes**
- **Notes:**
  - Auditory, emotion, mental, concentrate trait
  - -4 penalty if target doesn't share a language (unless you have Intimidating Glare feat)
  - **AI GM critical:** The 10-minute immunity means you can't spam Demoralize on the same target

### Coerce
- **Actions:** Exploration (1+ minute)
- **Trained only**
- **Your Intimidation vs. Will DC**
- **Success:** Target does what you say for now, but dislikes you
- **Critical Failure:** Target refuses and becomes hostile

---

## Diplomacy Skill Actions

### Make an Impression
- **Actions:** Exploration (1+ minute)
- **Your Diplomacy vs. Will DC**
- **Changes NPC attitude** one step (hostile → unfriendly → indifferent → friendly → helpful)
- **Critical Success:** Improve by 2 steps
- **Critical Failure:** Worsen by 1 step
- **Can retry** after 24 hours

### Request
- **Actions:** 1+
- **Prerequisite:** Target must be friendly or helpful to you
- **Your Diplomacy vs. target's Will DC (adjusted by request difficulty)**
- **Helpful NPCs:** +2 to the DC (easier requests)
- **Simple requests:** No check needed from helpful NPCs

### Bon Mot (common feat-granted action)
- **Actions:** 1
- **Your Diplomacy vs. target's Will DC**
- **Critical Success:** -3 status penalty to target's Perception and Will saves for 1 minute
- **Success:** -2 status penalty to Perception and Will saves for 1 minute
- **Critical Failure:** +2 status bonus to target's saves against your attempts for 1 minute

---

## Stealth Skill Actions

### Sneak
- **Actions:** 1
- **Requirements:** You're hidden or undetected
- **Your Stealth vs. Perception DC of observers**
- **Success:** Move up to half your Speed while remaining hidden/undetected
- **Failure:** You become observed at the end of your movement
- **You must end in cover or concealment**, or you become observed regardless

### Hide
- **Actions:** 1
- **Requirements:** You have cover or concealment from the observer
- **Your Stealth vs. Perception DC of observers**
- **Success:** You become hidden from those observers
- **Failure:** You remain observed

### Avoid Notice (Exploration)
- Used during exploration mode
- Stealth check for initiative when encounter starts
- You start combat hidden or undetected on success

---

## Medicine Skill Actions

### Treat Wounds
- **Actions:** Exploration (10 minutes)
- **Trained only**
- **DC 15** (base), **DC 20** (Expert — heals more), **DC 30** (Master), **DC 40** (Legendary)
- **Success:** Heal 2d8 (DC 15), 2d8+10 (DC 20), 2d8+30 (DC 30), 2d8+50 (DC 40)
- **Critical Success:** Double the healing
- **Critical Failure:** Deal 1d8 damage
- **Cooldown:** Can't treat the same creature again for **1 hour** (unless you have Continual Recovery feat → 10 minutes)
- **Removes Wounded:** A successful Treat Wounds also removes the wounded condition

### Battle Medicine
- **Actions:** 1 (feat required)
- **Treat Wounds but in combat, 1 action**
- **Same target immune for 1 day** (unless you have feats reducing this)

### Treat Poison/Disease
- **Actions:** 1 action (poison — in combat) or Exploration (disease — 8 hours)
- **Trained only**
- **Success:** +2 circumstance bonus to next save vs. the affliction; +4 on critical success

---

## Thievery Skill Actions

### Pick a Lock
- **Actions:** 2
- **Trained only; requires thieves' tools**
- **DC:** Set by lock level
- **Success:** Unlock; Critical Success: unlock faster
- **Critical Failure:** Break your thieves' tools

### Disable a Device
- **Actions:** 2
- **Trained only; requires thieves' tools**
- **DC:** Set by device/trap level
- **Success:** Disable one component; Critical Success: disable quickly
- **Failure:** No progress; Critical Failure: trigger the trap

### Steal
- **Actions:** 1
- **Your Thievery vs. target's Perception DC**
- **Object must be unattended or loosely held/worn**
- **Success:** Take the item without notice
- **Failure:** Don't get it; Critical Failure: noticed

---

## Acrobatics Skill Actions

### Balance
- **Actions:** 1
- **Move across narrow/unsteady surface**
- **DC:** Varies (DC 10 wide beam, DC 15 narrow, DC 20 very narrow)
- **Success:** Move up to Speed; off-guard while on surface
- **Critical Failure:** Fall

### Tumble Through
- **Actions:** 1
- **Your Acrobatics vs. target's Reflex DC**
- **Success:** Move through the target's space (counts as difficult terrain)
- **Failure:** Movement stops before the target's space; triggers reactions

### Maneuver in Flight
- **Actions:** 1
- **Trained only; requires fly Speed**
- **DC:** Varies by maneuver
- **Success:** Perform complex aerial movement
- **Critical Failure:** Lose altitude or fall

---

## Crafting Skill Actions

### Repair
- **Actions:** Exploration (10 minutes)
- **Trained only; requires repair kit**
- **DC:** Level-based DC of the item
- **Success:** Restore 5 HP to item (10 on crit)
- **Critical Failure:** Deal 2d6 damage to item

### Craft
- **Actions:** Downtime (4+ days)
- **Trained only; requires formula + materials (half item price)**
- **DC:** Level-based DC of the item
- **Success:** Create the item; additional days reduce remaining cost
- **Critical Failure:** Lose 10% of raw materials

---

## Survival Skill Actions

### Sense Direction
- **Actions:** Exploration
- **DC:** Varies by environment (DC 15 forest, DC 20 underground, DC 25 featureless plain)
- **Success:** Know which direction is north

### Track
- **Actions:** Exploration
- **Trained only**
- **DC:** Varies by terrain and prey's stealth
- **Success:** Follow tracks; must check again every hour or mile

### Subsist
- **Actions:** Downtime (1 day)
- **DC:** 15 (or varies by environment)
- **Success:** Find enough food/water for 1 day

---

## Performance Skill Actions

### Perform
- **Actions:** 1
- **DC:** Varies by audience
- **Success:** Impress audience; Critical Success: memorable performance
- **Used for:** Earning income, Bardic performances, social encounters, disguises via acting

---

## Earn Income (Downtime)

Available for most trained skills during downtime:

| Task Level | DC | Trained | Expert | Master | Legendary |
|-----------|-----|---------|--------|--------|-----------|
| 0 | 14 | 1 cp | 1 cp | 1 cp | 1 cp |
| 1 | 15 | 2 sp | 2 sp | 2 sp | 2 sp |
| 2 | 16 | 3 sp | 3 sp | 3 sp | 3 sp |
| 3 | 18 | 5 sp | 5 sp | 5 sp | 5 sp |
| 4 | 19 | 7 sp | 8 sp | 8 sp | 8 sp |
| 5 | 20 | 9 sp | 1 gp | 1 gp | 1 gp |
| 6 | 22 | — | 1 gp 5 sp | 1 gp 5 sp | 1 gp 5 sp |
| 7 | 23 | — | 2 gp | 2 gp | 2 gp |
| 8 | 24 | — | 2 gp 5 sp | 2 gp 5 sp | 2 gp 5 sp |
| 9 | 26 | — | — | 3 gp | 3 gp |
| 10 | 27 | — | — | 4 gp | 4 gp |
| 11 | 28 | — | — | 5 gp | 5 gp |
| 12+ | 30+ | — | — | — | Scales up |

**Critical Success:** Double income. **Failure:** Earn nothing. **Critical Failure:** Earn nothing, may lose some money.

---

## Flat Checks Quick Reference

Flat checks have no modifiers — just roll d20 vs. DC.

| Situation | Flat Check DC |
|-----------|-------------|
| Concealed target | DC 5 |
| Hidden target | DC 11 |
| Casting while deafened (verbal) | DC 5 |
| Manipulate while grabbed | DC 5 |
| Casting while stupefied | DC 5 + stupefied value |
| Persistent damage recovery | DC 15 |
| Persistent damage (received help) | DC 10 |
| Counteracting a target you can't see | DC 11 |
| Unconscious creature waking from damage | Not a flat check — perception DC 15 |
