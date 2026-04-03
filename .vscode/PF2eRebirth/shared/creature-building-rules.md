# PF2e — Creature Building Rules Reference

Mechanical reference for the AI GM's custom creature design (Gamemastery Guide formulae).
The AI designs thematic abilities and flavor; the rules engine enforces mathematical constraints.

---

## Creature Building Overview

PF2e creatures are built from **level-appropriate statistics**, not point-buy. The Gamemastery Guide provides target values for each stat at each level. Creatures can be **Extreme** (signature stat), **High**, **Moderate**, or **Low** in each statistic, creating varied but balanced creatures.

**Key Principle:** A creature's level determines its mathematical floor and ceiling. A Level 5 creature with Extreme AC is still within a predictable range. This prevents the AI from accidentally creating broken stat blocks.

---

## Ability Modifiers by Level

| Level | Extreme | High | Moderate | Low |
|-------|---------|------|----------|-----|
| -1 | +3 | +2 | +1 | +0 |
| 0 | +3 | +2 | +1 | +0 |
| 1 | +5 | +4 | +3 | +1 |
| 2 | +5 | +4 | +3 | +1 |
| 3 | +5 | +4 | +3 | +2 |
| 4 | +6 | +5 | +3 | +2 |
| 5 | +7 | +6 | +4 | +2 |
| 6 | +7 | +6 | +4 | +3 |
| 7 | +8 | +7 | +5 | +3 |
| 8 | +8 | +7 | +5 | +3 |
| 9 | +9 | +8 | +5 | +4 |
| 10 | +9 | +8 | +6 | +4 |
| 11 | +10 | +9 | +6 | +4 |
| 12 | +10 | +9 | +7 | +5 |
| 13 | +11 | +10 | +7 | +5 |
| 14 | +11 | +10 | +8 | +5 |
| 15 | +12 | +11 | +8 | +6 |
| 16 | +13 | +12 | +9 | +6 |
| 17 | +13 | +12 | +9 | +6 |
| 18 | +14 | +13 | +10 | +7 |
| 19 | +14 | +13 | +10 | +7 |
| 20 | +15 | +14 | +11 | +8 |
| 21 | +16 | +15 | +11 | +8 |
| 22 | +16 | +15 | +12 | +8 |
| 23 | +17 | +16 | +12 | +9 |
| 24 | +18 | +17 | +13 | +9 |

---

## Armor Class by Level

| Level | Extreme | High | Moderate | Low |
|-------|---------|------|----------|-----|
| -1 | 18 | 15 | 14 | 12 |
| 0 | 19 | 16 | 15 | 13 |
| 1 | 19 | 16 | 15 | 14 |
| 2 | 21 | 18 | 17 | 15 |
| 3 | 22 | 19 | 18 | 16 |
| 4 | 24 | 21 | 20 | 18 |
| 5 | 25 | 22 | 21 | 19 |
| 6 | 27 | 24 | 23 | 21 |
| 7 | 28 | 25 | 24 | 22 |
| 8 | 30 | 27 | 26 | 24 |
| 9 | 31 | 28 | 27 | 25 |
| 10 | 33 | 30 | 29 | 27 |
| 11 | 34 | 31 | 30 | 28 |
| 12 | 36 | 33 | 32 | 30 |
| 13 | 37 | 34 | 33 | 31 |
| 14 | 39 | 36 | 35 | 33 |
| 15 | 40 | 37 | 36 | 34 |
| 16 | 42 | 39 | 38 | 36 |
| 17 | 43 | 40 | 39 | 37 |
| 18 | 45 | 42 | 41 | 39 |
| 19 | 46 | 43 | 42 | 40 |
| 20 | 48 | 45 | 44 | 42 |
| 21 | 49 | 46 | 45 | 43 |
| 22 | 51 | 48 | 47 | 45 |
| 23 | 52 | 49 | 48 | 46 |
| 24 | 54 | 51 | 50 | 48 |

---

## Hit Points by Level

| Level | High | Moderate | Low |
|-------|------|----------|-----|
| -1 | 9 | 8 | 7 |
| 0 | 17 | 14 | 11 |
| 1 | 26 | 20 | 16 |
| 2 | 40 | 32 | 25 |
| 3 | 54 | 42 | 34 |
| 4 | 72 | 57 | 46 |
| 5 | 84 | 67 | 54 |
| 6 | 100 | 80 | 64 |
| 7 | 116 | 93 | 74 |
| 8 | 130 | 104 | 84 |
| 9 | 145 | 116 | 93 |
| 10 | 160 | 128 | 102 |
| 11 | 176 | 141 | 113 |
| 12 | 195 | 156 | 125 |
| 13 | 214 | 171 | 137 |
| 14 | 235 | 188 | 150 |
| 15 | 256 | 205 | 164 |
| 16 | 280 | 224 | 179 |
| 17 | 305 | 244 | 195 |
| 18 | 330 | 264 | 211 |
| 19 | 355 | 284 | 227 |
| 20 | 380 | 304 | 243 |
| 21 | 405 | 324 | 259 |
| 22 | 440 | 352 | 282 |
| 23 | 475 | 380 | 304 |
| 24 | 510 | 408 | 326 |

---

## Attack Bonus by Level

| Level | Extreme | High | Moderate | Low |
|-------|---------|------|----------|-----|
| -1 | +10 | +8 | +6 | +4 |
| 0 | +10 | +8 | +6 | +4 |
| 1 | +11 | +9 | +7 | +5 |
| 2 | +13 | +11 | +9 | +7 |
| 3 | +14 | +12 | +10 | +8 |
| 4 | +16 | +14 | +12 | +9 |
| 5 | +17 | +15 | +13 | +11 |
| 6 | +19 | +17 | +15 | +12 |
| 7 | +20 | +18 | +16 | +13 |
| 8 | +22 | +20 | +18 | +15 |
| 9 | +23 | +21 | +19 | +16 |
| 10 | +25 | +23 | +21 | +17 |
| 11 | +27 | +24 | +22 | +19 |
| 12 | +28 | +26 | +24 | +20 |
| 13 | +29 | +27 | +25 | +21 |
| 14 | +31 | +29 | +27 | +23 |
| 15 | +32 | +30 | +28 | +24 |
| 16 | +34 | +32 | +30 | +25 |
| 17 | +35 | +33 | +31 | +27 |
| 18 | +37 | +35 | +33 | +28 |
| 19 | +38 | +36 | +34 | +29 |
| 20 | +40 | +38 | +36 | +31 |
| 21 | +41 | +39 | +37 | +32 |
| 22 | +43 | +41 | +39 | +34 |
| 23 | +44 | +42 | +40 | +35 |
| 24 | +46 | +44 | +42 | +37 |

---

## Strike Damage by Level

Average damage per Strike. Use this to set damage dice + bonus.

| Level | Extreme | High | Moderate | Low |
|-------|---------|------|----------|-----|
| -1 | 4 | 3 | 2 | 2 |
| 0 | 5 | 4 | 3 | 2 |
| 1 | 8 | 6 | 5 | 4 |
| 2 | 11 | 9 | 7 | 5 |
| 3 | 14 | 11 | 9 | 6 |
| 4 | 18 | 14 | 11 | 8 |
| 5 | 20 | 16 | 13 | 9 |
| 6 | 23 | 18 | 15 | 11 |
| 7 | 26 | 21 | 17 | 12 |
| 8 | 29 | 24 | 19 | 14 |
| 9 | 32 | 26 | 21 | 15 |
| 10 | 36 | 29 | 23 | 17 |
| 11 | 39 | 31 | 25 | 18 |
| 12 | 43 | 34 | 28 | 20 |
| 13 | 46 | 37 | 30 | 22 |
| 14 | 50 | 40 | 32 | 23 |
| 15 | 53 | 43 | 34 | 25 |
| 16 | 57 | 46 | 37 | 27 |
| 17 | 60 | 48 | 39 | 28 |
| 18 | 64 | 51 | 41 | 30 |
| 19 | 68 | 54 | 44 | 32 |
| 20 | 72 | 58 | 46 | 34 |
| 21 | 76 | 61 | 49 | 35 |
| 22 | 80 | 64 | 51 | 37 |
| 23 | 84 | 67 | 54 | 39 |
| 24 | 88 | 70 | 56 | 41 |

---

## Saving Throws by Level

| Level | Extreme | High | Moderate | Low | Terrible |
|-------|---------|------|----------|-----|----------|
| -1 | +9 | +8 | +5 | +2 | +0 |
| 0 | +10 | +9 | +6 | +3 | +1 |
| 1 | +11 | +10 | +7 | +4 | +2 |
| 2 | +12 | +11 | +8 | +5 | +3 |
| 3 | +14 | +12 | +9 | +6 | +4 |
| 4 | +15 | +14 | +11 | +8 | +6 |
| 5 | +17 | +15 | +12 | +9 | +7 |
| 6 | +18 | +17 | +14 | +11 | +8 |
| 7 | +20 | +18 | +15 | +12 | +10 |
| 8 | +21 | +19 | +16 | +13 | +11 |
| 9 | +23 | +21 | +18 | +15 | +12 |
| 10 | +24 | +22 | +19 | +16 | +14 |
| 11 | +26 | +24 | +21 | +18 | +15 |
| 12 | +27 | +25 | +22 | +19 | +16 |
| 13 | +29 | +26 | +23 | +20 | +18 |
| 14 | +30 | +28 | +25 | +22 | +19 |
| 15 | +32 | +29 | +26 | +23 | +20 |
| 16 | +33 | +30 | +28 | +25 | +22 |
| 17 | +35 | +32 | +29 | +26 | +23 |
| 18 | +36 | +33 | +30 | +27 | +24 |
| 19 | +38 | +35 | +32 | +29 | +26 |
| 20 | +39 | +36 | +33 | +30 | +27 |
| 21 | +41 | +38 | +35 | +32 | +28 |
| 22 | +43 | +39 | +36 | +33 | +30 |
| 23 | +44 | +41 | +38 | +35 | +31 |
| 24 | +46 | +42 | +39 | +36 | +32 |

---

## Spell DC and Attack by Level

| Level | Extreme DC | High DC | Moderate DC | Extreme Attack | High Attack | Moderate Attack |
|-------|-----------|---------|-------------|----------------|-------------|-----------------|
| -1 | 19 | 16 | 13 | +11 | +8 | +5 |
| 0 | 19 | 16 | 13 | +11 | +8 | +5 |
| 1 | 20 | 17 | 14 | +12 | +9 | +6 |
| 2 | 22 | 18 | 15 | +14 | +10 | +7 |
| 3 | 23 | 20 | 17 | +15 | +12 | +9 |
| 4 | 25 | 21 | 18 | +17 | +13 | +10 |
| 5 | 26 | 22 | 19 | +18 | +14 | +11 |
| 6 | 27 | 24 | 21 | +19 | +16 | +13 |
| 7 | 29 | 25 | 22 | +21 | +17 | +14 |
| 8 | 30 | 26 | 23 | +22 | +18 | +15 |
| 9 | 32 | 28 | 25 | +24 | +20 | +17 |
| 10 | 33 | 29 | 26 | +25 | +21 | +18 |
| 11 | 34 | 30 | 27 | +26 | +22 | +19 |
| 12 | 36 | 32 | 29 | +28 | +24 | +21 |
| 13 | 37 | 33 | 30 | +29 | +25 | +22 |
| 14 | 39 | 34 | 31 | +31 | +26 | +23 |
| 15 | 40 | 36 | 33 | +32 | +28 | +25 |
| 16 | 42 | 37 | 34 | +34 | +29 | +26 |
| 17 | 43 | 38 | 35 | +35 | +30 | +27 |
| 18 | 45 | 40 | 37 | +37 | +32 | +29 |
| 19 | 46 | 41 | 38 | +38 | +33 | +30 |
| 20 | 48 | 43 | 40 | +40 | +35 | +32 |

---

## Perception by Level

| Level | Extreme | High | Moderate | Low | Terrible |
|-------|---------|------|----------|-----|----------|
| -1 | +9 | +8 | +5 | +2 | +0 |
| 0 | +10 | +9 | +6 | +3 | +1 |
| 1 | +11 | +10 | +7 | +4 | +2 |
| 2 | +13 | +11 | +8 | +5 | +3 |
| 3 | +14 | +12 | +9 | +6 | +4 |
| 4 | +16 | +14 | +11 | +7 | +5 |
| 5 | +17 | +15 | +12 | +9 | +7 |
| 6 | +19 | +17 | +14 | +10 | +8 |
| 7 | +20 | +18 | +15 | +12 | +10 |
| 8 | +22 | +20 | +17 | +13 | +11 |
| 9 | +23 | +21 | +18 | +15 | +12 |
| 10 | +25 | +23 | +20 | +16 | +14 |
| 11 | +27 | +24 | +21 | +18 | +15 |
| 12 | +28 | +26 | +23 | +19 | +16 |
| 13 | +29 | +27 | +24 | +21 | +18 |
| 14 | +31 | +29 | +26 | +22 | +19 |
| 15 | +32 | +30 | +27 | +24 | +21 |
| 16 | +34 | +32 | +29 | +25 | +22 |
| 17 | +35 | +33 | +30 | +27 | +24 |
| 18 | +37 | +35 | +32 | +28 | +25 |
| 19 | +38 | +36 | +33 | +30 | +27 |
| 20 | +40 | +38 | +35 | +31 | +28 |

---

## Skill Modifiers by Level

| Level | Extreme (Trained) | High | Moderate | Low |
|-------|-------------------|------|----------|-----|
| -1 | +8 | +5 | +4 | +2–1 |
| 0 | +9 | +6 | +5 | +2–1 |
| 1 | +10 | +7 | +6 | +3–2 |
| 2 | +11 | +8 | +7 | +4–2 |
| 3 | +13 | +10 | +9 | +5–3 |
| 4 | +15 | +12 | +10 | +7–4 |
| 5 | +16 | +13 | +12 | +8–5 |
| 6 | +18 | +15 | +13 | +9–6 |
| 7 | +20 | +17 | +15 | +11–7 |
| 8 | +21 | +18 | +16 | +12–8 |
| 9 | +23 | +20 | +18 | +13–9 |
| 10 | +25 | +22 | +19 | +15–10 |
| 11 | +26 | +23 | +21 | +16–11 |
| 12 | +28 | +25 | +22 | +17–12 |
| 13 | +30 | +27 | +24 | +19–13 |
| 14 | +31 | +28 | +25 | +20–14 |
| 15 | +33 | +30 | +27 | +22–16 |
| 16 | +35 | +32 | +28 | +23–17 |
| 17 | +36 | +33 | +30 | +25–18 |
| 18 | +38 | +35 | +31 | +26–19 |
| 19 | +40 | +37 | +33 | +28–20 |
| 20 | +41 | +38 | +34 | +29–22 |

---

## Creature Design Guidelines for the AI GM

### Stat Distribution Rules
1. A creature should have **1-2 Extreme** stats (its signature), **2-3 High**, and **1-2 Moderate or Low**.
2. No creature should have ALL high stats — that's just a higher-level creature.
3. If AC is Extreme, HP should be Moderate or lower (glass tank pattern).
4. If HP is High, AC should be Moderate (damage sponge pattern).
5. Saves should vary: most creatures are strong in 1-2 saves and weak in 1.

### Common Creature Archetypes

| Archetype | AC | HP | Attack | Damage | Saves (Fort/Ref/Will) |
|-----------|----|----|--------|--------|----------------------|
| **Brute** | Moderate | High | High | Extreme | High/Low/Moderate |
| **Skirmisher** | High | Moderate | High | Moderate | Moderate/High/Moderate |
| **Sniper** | Low | Low | Extreme | High | Low/High/Moderate |
| **Soldier** | High | High | High | Moderate | High/Moderate/Moderate |
| **Spellcaster** | Low | Low | Low melee | via spells | Low/Moderate/High |
| **Tank** | Extreme | High | Moderate | Moderate | Extreme/Low/Moderate |

### Resistances & Weaknesses
- Creatures with resistances should have fewer HP to compensate
- Weakness values are typically 5 + half creature level
- Resistance values are typically 2 + half creature level
- Immunity to a common damage type should be offset by vulnerability to another

### Speed
- Standard: 25 ft
- Fast: 30–40 ft
- Very Fast: 45+ ft
- Fly speeds are typically 5–10 ft faster than land speed
- Swim/Climb/Burrow are typically equal to or slightly less than land speed

### Special Abilities Budget
- **Low-level (1-4):** 1-2 special abilities
- **Mid-level (5-10):** 2-3 special abilities
- **High-level (11-16):** 3-4 special abilities
- **Extreme-level (17+):** 4-5 special abilities
- Boss creatures get +1-2 additional abilities
