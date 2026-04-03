# PF2e — Conditions Reference (Remastered)

Precise mechanical definitions for every condition. The rules engine enforces these;
the AI GM must apply them consistently. LLMs commonly get reduction timing and stacking wrong.

---

## Core Rule: Conditions Don't Stack

Unless stated otherwise, conditions do NOT stack. If you gain a condition you already have,
use the **higher value**. Example: if you're Frightened 2 and gain Frightened 1, you stay Frightened 2.

**Exception:** Persistent damage of different types stacks (fire + bleed = both apply).

---

## Blinded

- Flat-footed (all creatures and terrain are undetected to you)
- All terrain is difficult terrain
- Auto-fail Perception checks that require sight
- Immune to visual effects
- -4 status penalty to Perception checks

## Broken

- Applies to items, not creatures
- Item can't be used for its normal function
- Armor: no AC bonus, still imposes penalties
- Weapon: no damage, can't attack
- Repaired via Repair action or Crafting

## Clumsy

- **Value:** 1–4
- Status penalty equal to value to Dex-based checks and DCs (includes AC, Reflex saves, Dex-based attack rolls, Dex-based skill checks)
- **Common sources:** poisons, spells, monster abilities

## Concealed

- Flat check DC 5 to target the creature
- Not the same as hidden — you know what space the creature is in
- Typically caused by fog, dim light for creatures without darkvision, blur spell

## Confused

- Off-guard (flat-footed)
- Can't take reactions
- Can't Delay or Ready
- Each turn: use 1 action to Strike random adjacent creature (or move toward one)
- If no targets, wastes actions babbling
- **Critical distinction:** You don't choose targets. GM determines randomly.

## Controlled

- Another creature decides your actions
- The controller must spend their own actions to direct you
- You lose your normal turn
- You can attempt a Will save if commanded to do something suicidal or against nature (GM's discretion)

## Dazzled

- Everything is concealed to you (flat check DC 5 to target)
- Caused by sudden bright light, certain spells
- Less severe than blinded

## Deafened

- Auto-fail Perception checks that require hearing
- -2 status penalty to Perception checks
- Must succeed at a DC 5 flat check to Cast a Spell with verbal components (or the spell fails)
- Immune to auditory effects

## Doomed

- **Value:** 1–4
- Reduces your dying threshold by its value
- Normal dying max = dying 4 → death. Doomed 1 = dying 3 → death.
- **Decreases by 1** each time you get a full night's rest
- Cannot be reduced by healing — only rest
- **Critical for AI GM:** This is the "you're closer to permadeath" condition

## Drained

- **Value:** 1–4
- -1 per value to Constitution-based checks (Fortitude saves, HP per level)
- **Lose HP equal to your level × drained value** (current and max)
- Cannot recover the lost max HP until drained decreases
- **Decreases by 1** each time you get a full night's rest
- **Common sources:** undead, vampires, certain spells, negative energy

## Dying

- **Value:** 1–4 (modified by doomed)
- You're unconscious and near death
- At **dying 4** (or dying 4 − doomed value): you die
- **Start of each turn:** attempt a recovery check (DC 10 + dying value)
  - Critical Success: dying reduced by 2, you gain unconscious condition at 0 HP
  - Success: dying reduced by 1
  - Failure: dying increased by 1
  - Critical Failure: dying increased by 2
- Taking damage while dying: dying increases by 1 (or 2 if from a critical hit or enemy's critical success)
- Being healed while dying: lose dying, gain unconscious at whatever HP you were healed to
- **If dying reaches 0:** you become unconscious at 0 HP (stable)

## Encumbered

- Clumsy 1
- -10 foot penalty to all Speeds
- Occurs when carrying more than 5 + Str modifier Bulk

## Enfeebled

- **Value:** 1–4
- Status penalty equal to value to Str-based checks (attack rolls with Str weapons, Str-based skill checks, Athletics)
- Also reduces damage dealt with Str-based Strikes by the value

## Fascinated

- -2 status penalty to Perception and skill checks
- Can't use concentrate actions that don't relate to the source of fascination
- If a creature uses hostile actions against you or your allies, fascinated ends
- Can't voluntarily end it otherwise

## Fatigued

- -1 status penalty to AC and saving throws
- Can't use exploration activities while traveling
- Recovers after a full night's rest

## Fleeing

- Must spend each action to move away from the source
- Can't Delay or Ready
- If you can't flee, you use other actions (cower, etc.)

## Frightened

- **Value:** 1–4
- Status penalty equal to value to ALL checks and DCs
- **Reduces by 1 at the END of your turn** (not start)
- **This is the #1 thing LLMs get wrong.** Frightened reduces at END of turn, not start.
- **Common sources:** Demoralize, fear spells, dragon Frightful Presence

## Grabbed

- Off-guard (flat-footed) and immobilized
- Can't move or be moved unless you Escape (or the grabber releases)
- If you try to manipulate an item or Cast a Spell: DC 5 flat check or it fails
- **Requires:** The grabber must use at least 1 hand (or equivalent) and the creature can't use that hand for other things

## Hidden

- Observer knows your space but can't see you
- Attacker must pick the correct square; if wrong, the attack auto-misses
- Even if right square: DC 11 flat check to target
- You're off-guard to the hidden creature? No — the HIDDEN creature benefits; the observer is flat-footed vs. the hidden creature's attacks

## Immobilized

- Speed becomes 0
- Can't benefit from bonuses to speed
- Can still teleport, be moved by others (Shove), or be forced-moved

## Invisible

- Undetected by vision (but can be detected by other senses like hearing)
- DC 11 flat check to target if observer knows your square
- Off-guard to invisible creature's attacks
- Can still be targeted by area effects without the flat check

## Observed

- Normal state. No penalties. You can clearly see and identify the creature.

## Off-Guard (Flat-Footed)

- -2 circumstance penalty to AC
- **Remastered name:** Off-Guard (replaces "flat-footed")
- **Common sources:** flanking, prone, grabbed, surprised, clumsy attackers
- You can be off-guard to only certain creatures (e.g., flanking is only vs. flankers)

## Paralyzed

- Off-guard
- Can't act (no actions at all)
- Fortitude and Reflex saves auto-result is critical failure (before rolling)
- **Melee attacks against you are automatically critical hits** if attacker is adjacent

## Persistent Damage

- **Format:** X persistent [type] damage (e.g., 2d6 persistent fire damage)
- Dealt at the **END of your turn**
- After taking damage, attempt a DC 15 flat check to end it
- **Multiple types stack** (fire + bleed = both apply separately)
- **Same type does NOT stack** — use the higher value
- Flat check can be lowered by spending actions:
  - Spending 1 action (interact): reduce to DC 10 (for some types)
  - Getting help (assisted recovery): reduce by 5
  - Stop, drop, and roll (fire): reduces DC
  - Specific counteractions (water for fire, bandage for bleed)
- **The AI GM must track each persistent damage type separately**

## Petrified

- Can't act, speak, or sense anything
- AC becomes 9
- Fortitude/Reflex saves can't be attempted (auto critical failure)
- Immune to most effects while petrified
- If the statue is broken, the creature dies when un-petrified

## Prone

- Off-guard (-2 AC)
- -2 circumstance penalty to attack rolls
- +1 circumstance bonus to AC vs. ranged attacks
- Only movement you can take is Crawl (5 ft) or Stand (1 action)
- Standing up provokes reactions (like Attack of Opportunity if enemy has it)

## Quickened

- Gain 1 extra action at the start of each turn
- **The extra action can only be used for specific actions** (defined by the source)
- Example: "Quickened, and can use the extra action only to Strike" — CANNOT use it for Move or Cast

## Restrained

- Off-guard and immobilized
- Can't use attack or manipulate actions (except to Escape)
- Worse than grabbed — completely locked down

## Sickened

- **Value:** 1–4
- Status penalty equal to value to ALL checks and DCs
- **You can't willingly ingest anything** (potions, elixirs, food) while sickened
- Can spend 1 action to retch: attempt Fortitude save against the DC of the sickening effect to reduce by 1
- **Critical for AI GM:** Players CANNOT drink healing potions while sickened. This is a devastating condition.

## Slowed

- **Value:** 1–3
- Lose actions equal to the value at the **START of your turn** (normally 3, slowed 1 = 2 actions)
- If slowed 3+, you get 0 actions (your turn is essentially skipped, but you can still use free actions)
- **Stacking:** Not really — use the highest value. Slowed 1 + Slowed 2 = Slowed 2.

## Stunned

- **Value:** 1+ OR a duration
- **Numbered stunned (Stunned 1, 2, 3):** Lose that many actions across your turns. When the value reaches 0, you recover. This is NOT "skip your turn" — it eats actions.
  - Example: Stunned 3 with 3 actions = you lose your entire turn. Stunned 2 = lose 2 of your 3 actions.
- **Duration stunned:** Can't act for the duration (like stunned for 1 round = skip entire turn)
- **Key distinction from Slowed:** Stunned eats a specific number of actions total then goes away. Slowed persists each round.

## Stupefied

- **Value:** 1–4
- Status penalty equal to value to Intelligence, Wisdom, and Charisma-based checks
- Includes spell attack rolls and spell DCs
- When you Cast a Spell: DC 5 + stupefied value flat check, or the spell fails and is wasted
- **Common sources:** mental attacks, certain poisons, feeblemind

## Unconscious

- Off-guard, -4 status penalty to AC, Perception, and Reflex saves
- Can't act, can't sense (blinded + deafened equivalent)
- Fall prone, drop held items
- Taking damage or being shaken awake: attempt DC 15 Perception check to wake up
- If at 0 HP: you're also dying (or stable at 0 HP if healed from dying)
- If above 0 HP (e.g., sleeping): wake from damage automatically

## Undetected

- Observer has no idea what space you're in
- Can't be targeted directly (except by area effects)
- If attacker guesses the wrong space: attack auto-misses; attacker doesn't know if they guessed wrong
- Different from Hidden — hidden = known square, undetected = unknown square

## Unnoticed

- Observer doesn't even know you exist
- Can't be targeted at all
- Not even aware there's something to look for

## Wounded

- **Value:** 1–3
- Gained each time you recover from dying (lose the dying condition)
- If you fall to dying again: your dying value starts at 1 + wounded value
  - Example: Wounded 2, drop to 0 HP → you're Dying 3 (1 + 2)
- **Removed only by:** treating wounds (Medicine), full rest, or full HP restoration
- **Stacks with Doomed**: Wounded 2 + Doomed 1 → die at Dying 3, and start at Dying 3 when downed = **instant death on second knockout**
- **Critical for AI GM:** This is the lethality ratchet. Track it carefully for solo play.

---

## Condition Interaction Quick Reference

| Situation | Result |
|-----------|--------|
| Frightened + Sickened | Both penalties apply (different conditions, both status penalties to "all checks" — but same type doesn't stack, use highest if overlapping) |
| Clumsy + Off-Guard | Both apply to AC (clumsy is status, off-guard is circumstance — different types stack) |
| Prone + Off-Guard (from flanking) | Only -2 to AC (both circumstance, don't stack) |
| Grabbed + Restrained | Use Restrained (worse version, replaces grabbed) |
| Stunned + Slowed | Stunned actions are lost first, then slowed applies to remaining |
| Quickened + Slowed | Cancel out action-for-action (quickened 1 + slowed 1 = normal 3 actions) |
| Dying + Wounded + Doomed | Dying starts at 1 + wounded, death threshold = 4 − doomed |
| Invisible + Hidden | Use Invisible (stronger concealment) |

---

## Condition Value Reduction Summary

| Condition | How It Reduces |
|-----------|---------------|
| Frightened | -1 at END of your turn |
| Sickened | Spend action to retch + Fort save |
| Clumsy | When effect ends or counteracted |
| Drained | -1 per full night's rest |
| Doomed | -1 per full night's rest |
| Wounded | Treat Wounds, rest, or full HP restoration |
| Enfeebled | When effect ends |
| Stupefied | When effect ends |
| Persistent Damage | DC 15 flat check at end of turn |
| Stunned (value) | Actions lost = value spent |
| Slowed | When effect ends |
