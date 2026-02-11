# Official PF2e Spell Data (from Foundry VTT PF2e Repository)

Data fetched from `foundryvtt/pf2e` branch `v13-dev`, path `packs/pf2e/spells/spells/`.

---

## CANTRIPS

---

### 1. Shield

| Field | Value |
|-------|-------|
| **Name** | Shield |
| **Rank** | Cantrip (level 1) |
| **Traditions** | Arcane, Divine, Occult |
| **Cast** | 1 action (concentrate) |
| **Range** | — (self) |
| **Targets** | — |
| **Duration** | Until the start of your next turn |
| **Save** | None |
| **Area** | None |
| **Is Cantrip** | Yes (`"cantrip"` in traits) |
| **Damage** | None (no damage entry) |
| **Defense** | None |
| **Traits** | cantrip, concentrate, force |

**Description:**
> You raise a magical shield of force. This counts as using the Raise a Shield action, giving you a +1 circumstance bonus to AC until the start of your next turn, but it doesn't require a hand to use.
>
> While the spell is in effect, you can use the Shield Block reaction with your magic shield. The shield has Hardness 5. You can use the spell's reaction to reduce damage from any spell or magical effect, even if it doesn't deal physical damage. After you use Shield Block, the spell ends and you can't cast it again for 10 minutes.

**Heightening:**
> **Heightened (+2)** The shield's Hardness increases by 5.

*(Note: No structured heightening data — the heightening is described narratively, not tracked as damage intervals.)*

**Publication:** Pathfinder Player Core (ORC, Remaster)

---

### 2. Ignition (replaces Produce Flame)

| Field | Value |
|-------|-------|
| **Name** | Ignition |
| **Rank** | Cantrip (level 1) |
| **Traditions** | Arcane, Primal |
| **Cast** | 2 actions (concentrate, manipulate) |
| **Range** | 30 feet |
| **Targets** | 1 creature |
| **Duration** | — |
| **Save** | None (uses spell attack roll) |
| **Area** | None |
| **Is Cantrip** | Yes |
| **Traits** | attack, cantrip, concentrate, fire, manipulate |

**Damage:**
```json
{
  "cQDyW0QpjJ38MlSi": {
    "applyMod": false,
    "category": null,
    "formula": "2d4",
    "kinds": ["damage"],
    "materials": [],
    "type": "fire"
  }
}
```
- **Formula:** 2d4 fire (ranged), 2d6 fire (melee overlay)
- **Type:** fire

**Defense:** None (spell attack roll, not a save)

**Heightening:**
```json
{
  "type": "interval",
  "interval": 1,
  "damage": {
    "cQDyW0QpjJ38MlSi": "1d4"
  }
}
```
- **Heightened (+1):** Initial damage increases by 1d4, persistent fire on crit increases by 1d4.

**Description:**
> You snap your fingers and point at a target, which begins to smolder. Make a spell attack roll against the target's AC, dealing 2d4 fire damage on a hit. If the target is within your melee reach, you can choose to make a melee spell attack with the flame instead of a ranged spell attack, which increases all the spell's damage dice to d6s.
>
> **Critical Success** The target takes double damage and 1d4 persistent fire damage.
> **Success** The target takes full damage.
>
> **Heightened (+1)** The initial damage increases by 1d4 and the persistent fire damage on a critical hit increases by 1d4.

**Overlays (Melee variant):**
- Name: "Ignition (Melee)"
- Damage formula changes to: `2d6`
- Heightening damage changes to: `1d6`
- Range changes to: `touch`

**Publication:** Pathfinder Player Core (ORC, Remaster)

---

### 3. Electric Arc

| Field | Value |
|-------|-------|
| **Name** | Electric Arc |
| **Rank** | Cantrip (level 1) |
| **Traditions** | Arcane, Primal |
| **Cast** | 2 actions (concentrate, manipulate) |
| **Range** | 30 feet |
| **Targets** | 1 or 2 creatures |
| **Duration** | — |
| **Save** | Basic Reflex |
| **Area** | None |
| **Is Cantrip** | Yes |
| **Traits** | cantrip, concentrate, electricity, manipulate |

**Damage:**
```json
{
  "0": {
    "applyMod": false,
    "category": null,
    "formula": "2d4",
    "kinds": ["damage"],
    "materials": [],
    "type": "electricity"
  }
}
```
- **Formula:** 2d4
- **Type:** electricity

**Defense:**
```json
{
  "save": {
    "basic": true,
    "statistic": "reflex"
  }
}
```

**Heightening:**
```json
{
  "type": "interval",
  "interval": 1,
  "damage": {
    "0": "1d4"
  }
}
```
- **Heightened (+1):** Damage increases by 1d4.

**Description:**
> An arc of lightning leaps from one target to another. Each target takes 2d4 electricity damage with a basic Reflex save.
>
> **Heightened (+1)** The damage increases by 1d4.

**Publication:** Pathfinder Player Core (ORC, Remaster)

---

### 4. Telekinetic Projectile

| Field | Value |
|-------|-------|
| **Name** | Telekinetic Projectile |
| **Rank** | Cantrip (level 1) |
| **Traditions** | Arcane, Occult |
| **Cast** | 2 actions (concentrate, manipulate) |
| **Range** | 30 feet |
| **Targets** | 1 creature |
| **Duration** | — |
| **Save** | None (uses spell attack roll) |
| **Area** | None |
| **Is Cantrip** | Yes |
| **Traits** | attack, cantrip, concentrate, manipulate |

**Damage:**
```json
{
  "0": {
    "applyMod": false,
    "category": null,
    "formula": "2d6",
    "kinds": ["damage"],
    "materials": [],
    "type": "untyped"
  }
}
```
- **Formula:** 2d6
- **Type:** untyped (bludgeoning, piercing, or slashing — chosen via overlays)

**Defense:** None (spell attack roll)

**Heightening:**
```json
{
  "type": "interval",
  "interval": 1,
  "damage": {
    "0": "1d6"
  }
}
```
- **Heightened (+1):** Damage increases by 1d6.

**Overlays:** Three variants:
- "Telekinetic Projectile (Bludgeoning)" — type: "bludgeoning"
- "Telekinetic Projectile (Piercing)" — type: "piercing"
- "Telekinetic Projectile (Slashing)" — type: "slashing"

**Description:**
> You hurl a loose, unattended object that is within range and that has 1 Bulk or less at the target. Make a spell attack roll against the target. If you hit, you deal 2d6 bludgeoning, piercing, or slashing damage—as appropriate for the object you hurled. No specific traits or magic properties of the hurled item affect the attack or the damage.
>
> **Critical Success** You deal double damage.
> **Success** You deal full damage.
>
> **Heightened (+1)** The damage increases by 1d6.

**Publication:** Pathfinder Player Core (ORC, Remaster)

---

### 5. Daze

| Field | Value |
|-------|-------|
| **Name** | Daze |
| **Rank** | Cantrip (level 1) |
| **Traditions** | Arcane, Divine, Occult |
| **Cast** | 2 actions (concentrate, manipulate) |
| **Range** | 60 feet |
| **Targets** | 1 creature |
| **Duration** | — |
| **Save** | Basic Will |
| **Area** | None |
| **Is Cantrip** | Yes |
| **Traits** | cantrip, concentrate, manipulate, mental, nonlethal |

**Damage:**
```json
{
  "0": {
    "applyMod": false,
    "category": null,
    "formula": "1d6",
    "kinds": ["damage"],
    "materials": [],
    "type": "mental"
  }
}
```
- **Formula:** 1d6
- **Type:** mental

**Defense:**
```json
{
  "save": {
    "basic": true,
    "statistic": "will"
  }
}
```

**Heightening:**
```json
{
  "type": "interval",
  "interval": 2,
  "damage": {
    "0": "1d6"
  }
}
```
- **Heightened (+2):** Damage increases by 1d6. **(Note: interval is 2, not 1!)**

**Description:**
> You push into the target's mind and daze it with a mental jolt. The jolt deals 1d6 mental damage, with a basic Will save. If the target critically fails the save, it is also Stunned 1.
>
> **Heightened (+2)** The damage increases by 1d6.

**Publication:** Pathfinder Player Core (ORC, Remaster)

---

### 6. Warp Step

| Field | Value |
|-------|-------|
| **Name** | Warp Step |
| **Rank** | Cantrip (level 1) |
| **Traditions** | Arcane, Occult |
| **Cast** | 2 actions (concentrate, manipulate) |
| **Range** | — (self) |
| **Targets** | — |
| **Duration** | — |
| **Save** | None |
| **Area** | None |
| **Is Cantrip** | Yes |
| **Traits** | cantrip, concentrate, manipulate |

**Damage:** None

**Defense:** None

**Heightening:** None

**Description:**
> When you walk, the earth warps beneath your feet—your steps extend, distance contracts, and everything is just a little bit closer. You gain a +5-foot status bonus to your Speed until the end of your turn. You then Stride twice. You can use warp step to Burrow, Climb, Fly, or Swim instead of Stride if you have the corresponding movement type.

**Publication:** Pathfinder Dark Archive (Remastered) (ORC, Remaster)

---

## RANK 1 SPELLS

---

### 7. Force Barrage (Remaster name for Magic Missile)

| Field | Value |
|-------|-------|
| **Name** | Force Barrage |
| **Rank** | 1 |
| **Traditions** | Arcane, Occult |
| **Cast** | 1 to 3 actions (concentrate, manipulate) |
| **Range** | 120 feet |
| **Targets** | 1 creature |
| **Duration** | — |
| **Save** | None (auto-hit) |
| **Area** | None |
| **Is Cantrip** | No |
| **Traits** | concentrate, force, manipulate |

**Damage:**
```json
{
  "0": {
    "applyMod": false,
    "category": null,
    "formula": "1d4+1",
    "kinds": ["damage"],
    "materials": [],
    "type": "force"
  }
}
```
- **Formula:** 1d4+1
- **Type:** force

**Defense:** None (auto-hit)

**Heightening:** None structured (described in text)
> **Heightened (+2)** You fire one additional shard with each action you spend.

**Description:**
> You fire a shard of solidified magic toward a creature that you can see. It automatically hits and deals 1d4+1 force damage. For each additional action you use when Casting the Spell, increase the number of shards you shoot by one, to a maximum of three shards for 3 actions. You choose the target for each shard individually. If you shoot more than one shard at the same target, combine the damage before applying bonuses or penalties to damage, resistances, weaknesses, and so forth.
>
> **Heightened (+2)** You fire one additional shard with each action you spend.

**Publication:** Pathfinder Player Core (ORC, Remaster)

---

### 8. Breathe Fire (Remaster name for Burning Hands)

| Field | Value |
|-------|-------|
| **Name** | Breathe Fire |
| **Rank** | 1 |
| **Traditions** | Arcane, Primal |
| **Cast** | 2 actions (concentrate, manipulate) |
| **Range** | — (emanates from caster) |
| **Targets** | — (area) |
| **Duration** | — |
| **Save** | Basic Reflex |
| **Area** | 15-foot cone |
| **Is Cantrip** | No |
| **Traits** | concentrate, fire, manipulate |

**Damage:**
```json
{
  "0": {
    "applyMod": false,
    "category": null,
    "formula": "2d6",
    "kinds": ["damage"],
    "materials": [],
    "type": "fire"
  }
}
```
- **Formula:** 2d6
- **Type:** fire

**Area:**
```json
{
  "type": "cone",
  "value": 15
}
```

**Defense:**
```json
{
  "save": {
    "basic": true,
    "statistic": "reflex"
  }
}
```

**Heightening:**
```json
{
  "type": "interval",
  "interval": 1,
  "damage": {
    "0": "2d6"
  }
}
```
- **Heightened (+1):** Damage increases by 2d6.

**Description:**
> A gout of flame sprays from your mouth. You deal 2d6 fire damage to creatures in the area with a basic Reflex save.
>
> **Heightened (+1)** The damage increases by 2d6.

**Publication:** Pathfinder Player Core (ORC, Remaster)

---

### 9. Heal

| Field | Value |
|-------|-------|
| **Name** | Heal |
| **Rank** | 1 |
| **Traditions** | Divine, Primal |
| **Cast** | 1 to 3 actions (manipulate; concentrate added for 2+ actions) |
| **Range** | Varies (touch for 1-action, 30 feet for 2-action, emanation for 3-action) |
| **Targets** | 1 willing living creature or 1 undead |
| **Duration** | — |
| **Save** | Basic Fortitude (vs undead only) |
| **Area** | 30-foot emanation (3-action version) |
| **Is Cantrip** | No |
| **Traits** | healing, manipulate, vitality |

**Damage/Healing:**
```json
{
  "0": {
    "applyMod": false,
    "category": null,
    "formula": "1d8",
    "kinds": ["damage", "healing"],
    "materials": [],
    "type": "vitality"
  }
}
```
- **Formula:** 1d8
- **Type:** vitality
- **Kinds:** Both "damage" and "healing"

**Defense:**
```json
{
  "save": {
    "basic": true,
    "statistic": "fortitude"
  }
}
```

**Heightening:**
```json
{
  "type": "interval",
  "interval": 1,
  "damage": {
    "0": "1d8"
  }
}
```
- **Heightened (+1):** Amount of healing or damage increases by 1d8, and the extra healing for 2-action version increases by 8.

**Overlays (multiple casting modes):**
- **1 action:** Range touch, manipulate/vitality traits
- **2 actions (vs. Living):** Range 30 feet, formula `1d8+8`, heightening `1d8+8`, concentrate+healing+manipulate+vitality traits, no defense
- **2 actions (vs. Undead):** Range 30 feet, target "1 undead", damage kinds: ["damage"] only
- **3 actions:** Area emanation 30, target "all living and undead creatures"

**Description:**
> You channel vital energy to heal the living or damage the undead. If the target is a willing living creature, you restore 1d8 Hit Points. If the target is undead, you deal that amount of vitality damage to it, and it gets a basic Fortitude save. The number of actions you spend when Casting this Spell determines its targets, range, area, and other parameters.
>
> **1 action** — Range touch.
> **2 actions** (concentrate) — Range 30 feet. If you're healing a living creature, increase the Hit Points restored by 8.
> **3 actions** (concentrate) — Disperse vital energy in a 30-foot emanation. Targets all living and undead creatures.
>
> **Heightened (+1)** Amount of healing or damage increases by 1d8, and the extra healing for the 2-action version increases by 8.

**Publication:** Pathfinder Player Core (ORC, Remaster)

---

### 10. Fear

| Field | Value |
|-------|-------|
| **Name** | Fear |
| **Rank** | 1 |
| **Traditions** | Arcane, Divine, Occult, Primal (ALL traditions!) |
| **Cast** | 2 actions (concentrate, manipulate) |
| **Range** | 30 feet |
| **Targets** | 1 creature |
| **Duration** | Varies |
| **Save** | Will (non-basic) |
| **Area** | None |
| **Is Cantrip** | No |
| **Traits** | concentrate, emotion, fear, manipulate, mental |

**Damage:** None

**Defense:**
```json
{
  "save": {
    "basic": false,
    "statistic": "will"
  }
}
```

**Heightening:**
```json
{
  "type": "fixed",
  "levels": {
    "3": {
      "target": {
        "value": "5 creatures"
      }
    }
  }
}
```
- **Heightened (3rd):** You can target up to five creatures.

**Description:**
> You plant fear in the target; it must attempt a Will save.
>
> **Critical Success** The target is unaffected.
> **Success** The target is Frightened 1.
> **Failure** The target is Frightened 2.
> **Critical Failure** The target is Frightened 3 and Fleeing for 1 round.
>
> **Heightened (3rd)** You can target up to five creatures.

**Publication:** Pathfinder Player Core (ORC, Remaster)

---

### 11. Grease

| Field | Value |
|-------|-------|
| **Name** | Grease |
| **Rank** | 1 |
| **Traditions** | Arcane, Primal |
| **Cast** | 2 actions (concentrate, manipulate) |
| **Range** | 30 feet |
| **Targets** | 1 object of Bulk 1 or less |
| **Duration** | 1 minute |
| **Save** | Reflex (non-basic) |
| **Area** | None (but description mentions 4 contiguous 5-foot squares) |
| **Is Cantrip** | No |
| **Traits** | concentrate, manipulate |

**Damage:** None

**Defense:**
```json
{
  "save": {
    "basic": false,
    "statistic": "reflex"
  }
}
```

**Heightening:** None

**Description:**
> You conjure grease, choosing an area or target.
>
> * **Area [4 contiguous 5-foot squares]** All solid ground in the area is covered with grease. Each creature standing on the greasy surface must succeed at a Reflex save or an Acrobatics check against your spell DC or fall Prone. Creatures using an action to move onto the greasy surface during the spell's duration must attempt either a Reflex save or an Acrobatics check to Balance. A creature that Steps or Crawls doesn't have to attempt a check or save.
> * **Target [1 object of Bulk 1 or less]** If you Cast the Spell on an unattended object, anyone trying to pick up the object must succeed at an Acrobatics check or Reflex save against your spell DC to do so. If you target an attended object, the creature that has the object must attempt an Acrobatics check or Reflex save. On a failure, the holder or wielder takes a –2 circumstance penalty to all checks that involve using the object; on a critical failure, the holder or wielder releases the item. The object lands in an adjacent square of the GM's choice. If you Cast this Spell on a worn object, the wearer gains a +2 circumstance bonus to Fortitude saves against attempts to grapple them.

**Publication:** Pathfinder Player Core (ORC, Remaster)

---

### 12. Sure Strike (Remaster name for True Strike)

| Field | Value |
|-------|-------|
| **Name** | Sure Strike |
| **Rank** | 1 |
| **Traditions** | Arcane, Occult |
| **Cast** | 1 action (concentrate) |
| **Range** | — (self) |
| **Targets** | — |
| **Duration** | Until the end of your turn |
| **Save** | None |
| **Area** | None |
| **Is Cantrip** | No |
| **Traits** | concentrate, fortune |

**Damage:** None

**Defense:** None

**Heightening:** None

**Description:**
> The next time you make an attack roll before the end of your turn, roll it twice and use the better result. The attack ignores circumstance penalties to the attack roll and any flat check required due to the target being Concealed or Hidden. You are then temporarily immune to sure strike for 10 minutes.

**Publication:** Pathfinder Player Core (ORC, Remaster)

---

## RANK 3 SPELLS

---

### 13. Fireball

| Field | Value |
|-------|-------|
| **Name** | Fireball |
| **Rank** | 3 |
| **Traditions** | Arcane, Primal |
| **Cast** | 2 actions (concentrate, manipulate) |
| **Range** | 500 feet |
| **Targets** | — (area) |
| **Duration** | — |
| **Save** | Basic Reflex |
| **Area** | 20-foot burst |
| **Is Cantrip** | No |
| **Traits** | concentrate, fire, manipulate |

**Damage:**
```json
{
  "0": {
    "applyMod": false,
    "category": null,
    "formula": "6d6",
    "kinds": ["damage"],
    "materials": [],
    "type": "fire"
  }
}
```
- **Formula:** 6d6
- **Type:** fire

**Area:**
```json
{
  "type": "burst",
  "value": 20
}
```

**Defense:**
```json
{
  "save": {
    "basic": true,
    "statistic": "reflex"
  }
}
```

**Heightening:**
```json
{
  "type": "interval",
  "interval": 1,
  "damage": {
    "0": "2d6"
  }
}
```
- **Heightened (+1):** Damage increases by 2d6.

**Description:**
> A roaring blast of fire detonates at a spot you designate, dealing 6d6 fire damage.
>
> **Heightened (+1)** The damage increases by 2d6.

**Publication:** Pathfinder Player Core (ORC, Remaster)

---

### 14. Haste

| Field | Value |
|-------|-------|
| **Name** | Haste |
| **Rank** | 3 |
| **Traditions** | Arcane, Occult, Primal |
| **Cast** | 2 actions (concentrate, manipulate) |
| **Range** | 30 feet |
| **Targets** | 1 creature |
| **Duration** | 1 minute |
| **Save** | None |
| **Area** | None |
| **Is Cantrip** | No |
| **Traits** | concentrate, manipulate |

**Damage:** None

**Defense:** None

**Heightening:**
```json
{
  "type": "fixed",
  "levels": {
    "7": {
      "target": {
        "value": "6 creatures"
      }
    }
  }
}
```
- **Heightened (7th):** You can target up to 6 creatures.

**Description:**
> Magic empowers the target to act faster. It gains the Quickened condition and can use the extra action each round only for Strike and Stride actions.
>
> **Heightened (7th)** You can target up to 6 creatures.

**Publication:** Pathfinder Player Core (ORC, Remaster)

---

### 15. Slow

| Field | Value |
|-------|-------|
| **Name** | Slow |
| **Rank** | 3 |
| **Traditions** | Arcane, Occult, Primal |
| **Cast** | 2 actions (concentrate, manipulate) |
| **Range** | 30 feet |
| **Targets** | 1 creature |
| **Duration** | 1 minute |
| **Save** | Fortitude (non-basic) |
| **Area** | None |
| **Is Cantrip** | No |
| **Traits** | concentrate, manipulate |

**Damage:** None

**Defense:**
```json
{
  "save": {
    "basic": false,
    "statistic": "fortitude"
  }
}
```

**Heightening:**
```json
{
  "type": "fixed",
  "levels": {
    "6": {
      "target": {
        "value": "10 creatures"
      }
    }
  }
}
```
- **Heightened (6th):** You can target up to 10 creatures.

**Description:**
> You dilate the flow of time around the target, slowing its actions.
>
> **Critical Success** The target is unaffected.
> **Success** The target is Slowed 1 for 1 round.
> **Failure** The target is Slowed 1 for 1 minute.
> **Critical Failure** The target is Slowed 2 for 1 minute.
>
> **Heightened (6th)** You can target up to 10 creatures.

**Publication:** Pathfinder Player Core (ORC, Remaster)

---

### 16. Lightning Bolt

| Field | Value |
|-------|-------|
| **Name** | Lightning Bolt |
| **Rank** | 3 |
| **Traditions** | Arcane, Primal |
| **Cast** | 2 actions (concentrate, manipulate) |
| **Range** | — (originates from caster) |
| **Targets** | — (area) |
| **Duration** | — |
| **Save** | Basic Reflex |
| **Area** | 120-foot line |
| **Is Cantrip** | No |
| **Traits** | concentrate, electricity, manipulate |

**Damage:**
```json
{
  "0": {
    "applyMod": false,
    "category": null,
    "formula": "4d12",
    "kinds": ["damage"],
    "materials": [],
    "type": "electricity"
  }
}
```
- **Formula:** 4d12
- **Type:** electricity

**Area:**
```json
{
  "type": "line",
  "value": 120
}
```

**Defense:**
```json
{
  "save": {
    "basic": true,
    "statistic": "reflex"
  }
}
```

**Heightening:**
```json
{
  "type": "interval",
  "interval": 1,
  "damage": {
    "0": "1d12"
  }
}
```
- **Heightened (+1):** Damage increases by 1d12.

**Description:**
> A bolt of lightning strikes outward from your hand, dealing 4d12 electricity damage.
>
> **Heightened (+1)** The damage increases by 1d12.

**Publication:** Pathfinder Player Core (ORC, Remaster)

---

### 17. Heroism

| Field | Value |
|-------|-------|
| **Name** | Heroism |
| **Rank** | 3 |
| **Traditions** | Divine, Occult |
| **Cast** | 2 actions (concentrate, manipulate) |
| **Range** | Touch |
| **Targets** | 1 creature |
| **Duration** | 10 minutes |
| **Save** | None |
| **Area** | None |
| **Is Cantrip** | No |
| **Traits** | concentrate, manipulate, mental |

**Damage:** None

**Defense:** None

**Heightening:** Fixed (described in text, no structured damage data)
> **Heightened (6th)** The status bonus increases to +2.
> **Heightened (9th)** The status bonus increases to +3.

**Description:**
> You unlock the target's inner heroism, granting it a +1 status bonus to attack rolls, Perception checks, saving throws, and skill checks.
>
> **Heightened (6th)** The status bonus increases to +2.
> **Heightened (9th)** The status bonus increases to +3.

**Publication:** Pathfinder Player Core (ORC, Remaster)

---

## SUMMARY TABLE

| # | Spell | Rank | Traditions | Actions | Range | Damage | Defense | Heightening |
|---|-------|------|------------|---------|-------|--------|---------|-------------|
| 1 | Shield | Cantrip | Arc/Div/Occ | 1 | Self | — | — | +2: +5 hardness |
| 2 | Ignition | Cantrip | Arc/Pri | 2 | 30 ft (or touch) | 2d4 fire (2d6 melee) | Spell attack | +1: +1d4 |
| 3 | Electric Arc | Cantrip | Arc/Pri | 2 | 30 ft | 2d4 electricity | Basic Reflex | +1: +1d4 |
| 4 | Telekinetic Projectile | Cantrip | Arc/Occ | 2 | 30 ft | 2d6 B/P/S | Spell attack | +1: +1d6 |
| 5 | Daze | Cantrip | Arc/Div/Occ | 2 | 60 ft | 1d6 mental | Basic Will | +2: +1d6 |
| 6 | Warp Step | Cantrip | Arc/Occ | 2 | Self | — | — | — |
| 7 | Force Barrage | 1 | Arc/Occ | 1-3 | 120 ft | 1d4+1 force | Auto-hit | +2: +1 shard/action |
| 8 | Breathe Fire | 1 | Arc/Pri | 2 | — (15ft cone) | 2d6 fire | Basic Reflex | +1: +2d6 |
| 9 | Heal | 1 | Div/Pri | 1-3 | Varies | 1d8 vitality | Basic Fort (undead) | +1: +1d8 (+8 for 2-action) |
| 10 | Fear | 1 | Arc/Div/Occ/Pri | 2 | 30 ft | — | Will | 3rd: 5 targets |
| 11 | Grease | 1 | Arc/Pri | 2 | 30 ft | — | Reflex | — |
| 12 | Sure Strike | 1 | Arc/Occ | 1 | Self | — | — | — |
| 13 | Fireball | 3 | Arc/Pri | 2 | 500 ft | 6d6 fire | Basic Reflex | +1: +2d6 |
| 14 | Haste | 3 | Arc/Occ/Pri | 2 | 30 ft | — | — | 7th: 6 targets |
| 15 | Slow | 3 | Arc/Occ/Pri | 2 | 30 ft | — | Fortitude | 6th: 10 targets |
| 16 | Lightning Bolt | 3 | Arc/Pri | 2 | — (120ft line) | 4d12 electricity | Basic Reflex | +1: +1d12 |
| 17 | Heroism | 3 | Div/Occ | 2 | Touch | — | — | 6th: +2, 9th: +3 |

---

## KEY FINDINGS FOR IMPLEMENTATION VERIFICATION

### Important Notes:
1. **Warp Step IS a cantrip** — confirmed in the data. It has `"cantrip"` in `traits.value` and `level.value: 1`. It is located in the `cantrip/` directory.
2. **Produce Flame → Ignition** — The Remaster renamed this. Uses spell attack (not a save). Has melee/ranged overlays.
3. **Magic Missile → Force Barrage** — Auto-hit, 1d4+1 force per shard, 1-3 actions.
4. **Burning Hands → Breathe Fire** — 15-foot cone, 2d6 fire, heightens by 2d6 per rank.
5. **True Strike → Sure Strike** — 1 action, fortune trait, no damage.
6. **Daze heightens every +2** (not +1) — interval is 2.
7. **Heal** has complex overlays for 1/2/3 action variants. The 2-action heal vs living adds +8 to formula and heightens by 1d8+8.
8. **Fear** is in ALL four traditions (arcane, divine, occult, primal).
9. **Haste** is in arcane, occult, AND primal (not divine).
10. **Slow** is in arcane, occult, AND primal (not divine).
11. **Heroism** is only in divine and occult.
12. **Shield** is in arcane, divine, and occult (NOT primal).
