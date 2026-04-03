# PF2e — Common Creature Abilities Reference

Standard creature building blocks for the AI GM. When the AI designs monsters, it selects
from these pre-defined abilities to ensure mechanical correctness. Each ability includes
the exact rules text the rules engine needs to resolve.

---

## Reactive Abilities (Reactions / Free Actions)

### Attack of Opportunity ◆◇
- **Trigger:** A creature within your reach uses a manipulate or move action, makes a ranged attack, or leaves a square during a move action it's using
- **Effect:** Make a melee Strike against the triggering creature. On critical hit with a manipulate action: disrupt the action.
- **Who has it:** ONLY specific creatures. Most PF2e monsters do NOT have AoO. Fighters, champions, and certain monsters (golems, giants, high-level martials) do.
- **AI GM Note:** This is the most commonly over-assigned ability. Be conservative — only give it to martial-focused creature designs.

### Ferocity ◇
- **Trigger:** The creature would be reduced to 0 HP
- **Effect:** The creature avoids being knocked out and remains at 1 HP. It gains the wounded 1 condition (or increases wounded by 1). Can only trigger once per encounter.
- **Common users:** Orcs, dire animals, barbarian-type creatures

### Shield Block ◆◇
- **Trigger:** The creature takes physical damage while it has its shield raised
- **Effect:** Reduce damage by the shield's Hardness. The shield takes the remaining damage (both the damage reduced and any overflow to the shield's HP).
- **Shield stats to define:** Hardness, HP, Broken Threshold (BT)

### Reactive Strike ◆◇
- **Remastered name for Attack of Opportunity**
- Same rules as Attack of Opportunity above
- Use "Reactive Strike" in remastered stat blocks

### Retributive Strike ◆◇ (Champion-type)
- **Trigger:** An enemy damages the creature's ally within 15 ft
- **Effect:** The ally gains resistance equal to 2 + the creature's level. The creature can Strike the attacker if within reach.

---

## Offensive Abilities

### Grab ◆
- **Action cost:** Free action (on a successful Strike with specified attack)
- **Effect:** The target is grabbed by the creature. They become grabbed (off-guard, immobilized). Escape DC = creature's Athletics DC.
- **How it works:** Listed as "Grab" after a Strike entry. If the Strike hits, the creature can use Grab as a free action.
- **Sustaining:** The creature must use 1 action on its turn to sustain the grab, or the target is released at end of creature's turn.

### Knockdown ◆
- **Action cost:** Free action (on a successful Strike)
- **Effect:** Target is knocked prone
- **Like Grab but causes prone instead of grabbed**

### Improved Knockdown ◆
- **Same as Knockdown but the target can't use its reaction to avoid falling** (no Reflex save)

### Push ◆
- **Action cost:** Free action (on a successful Strike)
- **Effect:** Push target 5 ft away (10 ft on critical hit). Creature can Stride after.

### Improved Push ◆
- **Same as Push but pushes 10 ft (15 ft on critical hit)**

### Constrict ◆
- **Action cost:** 1 action
- **Requirements:** The creature has a creature grabbed or restrained
- **Effect:** Deal listed bludgeoning damage. The target can attempt a basic Fortitude save to reduce.
- **Typical damage:** Roughly equal to the creature's Strike damage

### Rend ◆
- **Action cost:** Free action
- **Trigger:** The creature hits with two melee Strikes of the same type in the same turn
- **Effect:** Deal additional damage equal to one of those Strikes (no attack roll needed)
- **Example:** Two claw Strikes hit → Rend deals claw damage automatically

### Swallow Whole ◆
- **Action cost:** 1 action
- **Requirements:** Creature has target grabbed in jaws (or similar)
- **Effect:** Target moves into creature's body. While swallowed:
  - Take listed damage at start of each of the creature's turns (usually acid or bludgeoning)
  - Can attack the inside of the creature (AC is usually much lower, typically creature's AC - 4)
  - If the swallowing creature takes X damage from inside: ruptures, releasing all swallowed creatures
  - Escape: DC is the creature's Athletics DC
  - **Capacity:** Defined per creature (usually 1 Medium or smaller creature)

### Engulf ◆◆
- **Action cost:** 2 actions
- **Effect:** Creature Strides up to its Speed; each creature in its path must attempt a Reflex save
  - **Failure:** Engulfed (like swallowed whole but usually for amorphous creatures like oozes)
  - **Success:** Avoid by moving to nearest empty space
- Used by: gelatinous cubes, oozes, swarms

### Trample ◆◆◆
- **Action cost:** 3 actions
- **Effect:** Creature Strides up to double its Speed through enemies' spaces. Each creature entered must attempt a Reflex save:
  - **Failure:** Take trampling damage and knocked prone
  - **Success:** Take no damage
  - **Critical Failure:** Double damage and prone
- Creature can only trample each creature once per use
- Used by: Large+ quadrupeds, cavalry, dinosaurs

### Breath Weapon ◆◆
- **Action cost:** 2 actions
- **Effect:** Area damage (typically cone or line) with a basic save
- **Cooldown:** Usually 1d4 rounds (can't use again until recharge)
- **Common types:** Fire cone, lightning line, acid line, cold cone, poison cloud
- **The AI must track recharge rounds**

### Throw Rock ◆
- **Action cost:** 1 action
- **Used by:** Giants, trolls, earth elementals
- **Range:** Typically 120 ft
- **Damage:** Usually comparable to melee Strike damage

---

## Defensive Abilities

### All-Around Vision
- Can't be flanked (no off-guard from flanking)
- Used by: multi-headed creatures, creatures with compound eyes

### Frightful Presence (Aura)
- **Type:** Aura, emotion, fear, mental
- **Range:** Usually 30-60 ft
- **Effect:** Each creature entering the aura must attempt a Will save
  - **Success:** Temporarily immune for 1 minute
  - **Failure:** Frightened 1 (Frightened 2 on critical failure)
- **AI GM Note:** Creatures only save when they first enter or start their turn in the aura. Don't re-trigger every round for the same creature.

### Regeneration
- **Value:** X HP per round (e.g., Regeneration 15)
- **Effect:** At start of creature's turn, regain HP equal to regeneration value
- **Deactivation:** Specific damage type suppresses regeneration until start of creature's next turn
  - Troll: fire or acid
  - Vampire: positive (vitality) energy
  - Various: cold iron, good, etc.
- **While deactivated:** Creature doesn't regenerate AND can be killed normally
- **While active:** The creature can't die from damage (even at 0 HP, it regenerates back)
- **AI GM Critical:** Always define the deactivation type. Regeneration without a weakness is nearly unbeatable.

### Fast Healing
- **Like Regeneration** but simpler
- Regain HP at start of turn
- **No deactivation type** — just always heals
- Less HP per round than regeneration (same level creature)
- The creature CAN die normally; fast healing doesn't prevent death

### Resistance
- **Format:** Resistance X [type] (e.g., Resistance 10 fire)
- Reduce incoming damage of that type by the value
- If resistance exceeds damage, take 0
- Can have multiple resistances (Resistance 5 fire, Resistance 5 cold)

### Weakness
- **Format:** Weakness X [type] (e.g., Weakness 5 cold iron)
- Increase incoming damage of that type by the value
- Triggers even on 0 damage (if the attack deals 0 fire damage but creature has weakness fire, it takes the weakness value)
- **Typical values:** 5 + half creature level

### Immunity
- **Format:** Immune to [condition/damage type]
- Completely negates that damage type or condition
- Common immunities: undead immune to death effects/poison/disease, constructs immune to mental, oozes immune to precision/critical hits

---

## Movement Abilities

### Flyby Attack ◆◆
- **Action cost:** 2 actions or built into flying movement
- **Effect:** Fly, make a Strike at any point during movement, continue flying
- **Key rule:** Does NOT provoke Reactive Strike from the target if creature doesn't remain in reach

### Aquatic Ambush ◆
- **Action cost:** 1 action
- **Requirements:** Creature is hiding in water
- **Effect:** Stride up to half speed toward a target and Strike. Target is off-guard to this attack.

### Sneak Attack
- **Effect:** Deal extra precision damage (usually 1d6–3d6) when target is off-guard
- **Used by:** Rogue-type creatures, assassins, shadows

### Pounce ◆◆
- **Action cost:** 2 actions
- **Effect:** Stride and make a Strike at the end. If target hasn't acted this combat yet, creature deals extra damage.

---

## Aura Abilities

### Aura Template
- **Type:** [element/emotion/etc.], aura
- **Range:** X ft emanation
- **Effect:** [Continuous effect within the aura]
- **Save:** [If applicable]

### Common Aura Types

| Aura | Range | Effect |
|------|-------|--------|
| Frightful Presence | 30-60 ft | Will save or frightened |
| Stench | 15-30 ft | Fort save or sickened |
| Heat | 5-10 ft | Fire damage to adjacent creatures |
| Cold | 5-10 ft | Cold damage to adjacent creatures |
| Protective | 15-30 ft | Allies gain +1 status bonus to saves |
| Despair | 30 ft | Will save or enfeebled/slowed |
| Disease Cloud | 10 ft | Fort save or exposure to disease |

---

## Spellcasting (Creature)

Creatures can be innate or prepared/spontaneous casters:

### Innate Spellcasting
- Uses Charisma (usually)
- Each spell listed separately with uses per day
- Format: **3rd** fireball (×2), **2nd** invisibility (at will), **Cantrips** detect magic
- "At will" = unlimited uses
- "Constant" = always active, suppressed for 1 round if counteracted

### Prepared/Spontaneous
- Format like a PC: spell slots by rank
- Uses the creature's spellcasting tradition (arcane, divine, occult, primal)

### Creature Spellcasting DC
- Use the Spell DC table from creature-building-rules.md
- Typically High or Moderate for the creature's level

---

## Special Senses

| Sense | Effect |
|-------|--------|
| Darkvision | See in darkness as if dim light, dim light as bright. No color. |
| Greater Darkvision | See in magical darkness too |
| Low-Light Vision | Treat dim light as bright light |
| Scent (Imprecise) X ft | Detect creatures within X ft by smell (imprecise = know square but not exact) |
| Tremorsense (Imprecise) X ft | Detect creatures touching same surface within X ft |
| Echolocation (Precise) X ft | "See" via sound within X ft (precise targeting) |
| Lifesense (Imprecise) X ft | Detect living creatures within X ft |
| Wavesense (Imprecise) X ft | Detect movement in water within X ft |
| Telepathy X ft | Communicate mentally within X ft |
| At-Will Detection | Constantly detects specific things (alignment, magic, etc.) |

---

## Size and Reach Reference

| Size | Space | Typical Reach | Examples |
|------|-------|--------------|---------|
| Tiny | 2.5 ft | 0 ft (must enter space) | Sprites, cats, familiars |
| Small | 5 ft | 5 ft | Goblins, halflings, gnomes |
| Medium | 5 ft | 5 ft | Humans, elves, orcs |
| Large | 10 ft | 5 ft (or 10 ft if tall) | Horses, ogres, owlbears |
| Huge | 15 ft | 10 ft (or 15 ft if tall) | Giants, young dragons |
| Gargantuan | 20+ ft | 15 ft (or 20 ft) | Ancient dragons, kaiju |

**Tall vs. Long:** Tall creatures (giants, treants) get reach = space size. Long creatures (horses, basilisks) get reach 5 ft less than space.
