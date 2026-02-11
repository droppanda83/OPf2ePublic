# Pathbuilder 2e Character Import Guide

## Overview
You can now import character sheets from Pathbuilder 2e as JSON files directly into your PF2e Tactical Combat system. This allows you to quickly populate your encounters with fully-configured player characters and NPCs.

## How to Import Characters

### Step 1: Export from Pathbuilder
1. Open your character in Pathbuilder 2e
2. Click the menu icon ☰
3. Select **Export**
4. Choose **JSON Format**
5. Save the file to your computer

### Step 2: Import into Combat
1. Start a new combat encounter in PF2e Tactical Combat
2. Click the **📋 Import Character** button in the top menu
3. The import dialog will appear
4. Either:
   - Click the upload area and select one or more JSON files
   - Drag & drop JSON files onto the upload area
5. Review the selected files
6. Click **Import** to add them to your encounter

### Step 3: Position Characters
After import, characters will appear at position (0, 0) on the grid. You'll need to move them to their desired starting positions using the movement UI.

## Supported Character Properties

The importer converts the following Pathbuilder properties:

### Basic Info
- **name**: Character name (required)
- **playerName**: Player's name (optional)
- **level**: Character level 1-20 (required)
- **alignment**: Character alignment (optional, stored as metadata)
- **traits**: Character traits/tags (optional)

### Attributes
- **maxHP**: Maximum hit points (required, minimum 1)
- **armorClass**: Total armor class including bonuses (required)
- **abilities**: Ability scores (STR, DEX, CON, INT, WIS, CHA)
  - Expected range: 3-20 per ability
  - If not provided, defaults to 10 (modifier +0)

### Skills & Proficiencies
- **skills**: Skill proficiency ranks
  - Proficiency levels: U (Untrained), T (Trained), E (Expert), M (Master), L (Legendary)
  - Converted to numerical ranks: 0-4

- **saves**: Saving throw proficiencies (Fortitude, Reflex, Will)
  - Uses same proficiency level format as skills

- **proficiencies**: Weapon and armor proficiencies
  - `weapons`: Can include "simple", "martial", "unarmed"
  - `armor`: Can include "light", "medium", "heavy", "unarmored-defense"

### Equipment
- **equippedWeapon**: Currently equipped weapon name/ID
- **equippedArmor**: Currently equipped armor
- **equippedShield**: Currently equipped shield
- **equippedItems**: List of other equipment

### Spellcasting
- **spellcasting.keyAbility**: Key ability for spells (str, dex, con, int, wis, cha)
- **spellcasting.spellDC**: Spell DC (optional)
- **spellcasting.spells**: Array of spell names the character can cast

## Validation Rules

The importer validates your JSON before import:
- ✓ Character name is required
- ✓ Level must be between 1-20
- ✓ Max HP must be at least 1
- ✓ Ability scores must be 3-20 if provided
- ✓ File must be valid JSON format

## Error Handling

If an import encounters errors:
1. **Parse Errors**: File is not valid JSON → Check file format
2. **Validation Errors**: Missing required fields → Check character sheet
3. **Field Errors**: Invalid ability scores, negative HP, etc. → Update character in Pathbuilder

The importer will show you which files succeeded and which failed. Successful imports are added to your encounter even if some files fail.

## Example Format

See [Pathbuilder Format](../PATHBUILDER_FORMAT.md) for a detailed explanation of the JSON structure.

Example character files are included in the `examples/` directory:
- `aldrich-stormborn.json` - Fighter example
- `lyria-moonwhisper.json` - Wizard example

## Tips & Best Practices

### Before Export
- Ensure your character sheet is complete and accurate in Pathbuilder
- Double-check ability scores, hit points, and armor class
- Equip weapons and armor before export
- Add any spells or special abilities

### After Import
- Characters are imported as "player" type by default
- HP is set to maximum (ready for combat)
- Position will be (0, 0) - move them to the battlefield
- Equipment names should match your system's catalog
- Shield readiness defaults to false

### Multiple Imports
- You can import multiple characters at once
- Upload multiple JSON files and they'll all be added
- Useful for adding enemy NPCs or party members

### Character Updates
- If you modify a character in Pathbuilder, export the new version
- Create a new encounter and import the updated JSON
- The system will recognize it as a new character based on the name and ID

## Troubleshooting

**"Invalid JSON format"**
- Ensure the file is properly formatted JSON from Pathbuilder
- Try re-exporting from Pathbuilder

**"Missing character name"**
- The character sheet must have a name field
- Check your Pathbuilder export settings

**"Invalid level"**
- Level must be 1-20
- Check the character's level in Pathbuilder

**"Ability score out of range"**
- Ability scores must be between 3 and 20
- Check ability modifiers in Pathbuilder (they might be exported as modifiers instead of scores)

**Characters appear at (0,0)**
- This is intentional - you'll need to move them after import
- Use the drag-to-move feature on the grid

## Technical Details

### Conversion Logic

**Ability Score to Modifier**: `(score - 10) / 2`, rounded down
- Str 16 → +3 modifier
- Dex 14 → +2 modifier
- Con 13 → +1 modifier

**Proficiency Rank Conversion**:
- U (Untrained) → 0
- T (Trained) → 1
- E (Expert) → 2
- M (Master) → 3
- L (Legendary) → 4

**Character Type**: All imported characters default to "player" type

**Position**: Defaults to `{ x: 0, y: 0 }`

**Initiative**: Defaults to 0 (will be calculated in combat)

**HP**: Import uses maxHP for both current and max HP

### Files Involved
- **Frontend**: `Frontend/src/components/PathbuilderUploadModal.tsx` - Upload UI
- **Utils**: `Frontend/src/utils/pathbuilderImport.ts` - Parser and converter
- **Backend**: `/api/game/:gameId/add-creatures` - API endpoint

## Support

For issues with:
- **Pathbuilder export format**: Check Pathbuilder 2e documentation
- **Character validation**: Review this guide's "Validation Rules" section
- **Combat system**: Refer to main PF2e Tactical Combat documentation

## Future Enhancements

Planned improvements:
- Import multiple characters as a party template
- Bulk edit imported characters before committing
- Save import presets for common party configurations
- Support for Pathbuilder cloud sync
