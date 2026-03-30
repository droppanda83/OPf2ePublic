# PF2e AI-Powered Tactical Combat Game

A web-based turn-based tactical combat system for Pathfinder 2e with AI DM integration via ChatGPT.

## Architecture

- **Backend**: Express.js + TypeScript with modular rules engine
- **Frontend**: React + TypeScript with Vite
- **AI**: OpenAI ChatGPT API integration
- **Rules**: Hardcoded PF2e mechanics (expandable)

## Project Structure

```
backend/
  src/
    index.ts           # Express server
    game/
      engine.ts        # Game state management
      rules.ts         # PF2e rules engine (expandable)
    ai/
      manager.ts       # ChatGPT integration

frontend/
  src/
    App.tsx            # Main app component
    components/
      GridDisplay.tsx  # Combat grid visualization
      CreaturePanel.tsx # Creature status display
      GameLog.tsx      # Combat log

shared/
  types.ts             # TypeScript interfaces (shared between backend/frontend)
```

## Setup

### Prerequisites
- Node.js 18+
- OpenAI API key (ChatGPT Plus subscription)

### Installation

1. Install root dependencies:
```bash
npm install
```

2. Create `.env` file in backend directory:
```
OPENAI_API_KEY=your_api_key_here
PORT=3001
```

3. Install backend & frontend dependencies:
```bash
npm install --workspace=backend
npm install --workspace=frontend
```

## Development

### Run both backend and frontend:
```bash
npm run dev
```

### Or run separately:
```bash
npm start           # Backend only (port 3001)
npm run client      # Frontend only (port 5173)
```

The frontend will proxy API calls to `http://localhost:3001`.

## Features (MVP)

### Core Combat
- Grid-based tactical positioning (20x20 default)
- Initiative rolling
- Health tracking
- Turn order management

### Rules Engine
- Strike/Attack resolution with d20 system
- Simplified damage calculation (1d8 + level)
- Movement (6 squares per turn)
- Basic AC vs attack roll comparison

### AI DM
- ChatGPT decides NPC/creature actions
- Receives game context (positions, health, threats)
- Constrained to hardcoded action types
- Cannot invent mechanics outside rules

### UI
- Visual grid with creature placement
- Creature status panel with HP bars
- Combat log
- Turn indicator

## Expandability

The system is designed for easy expansion:

### Adding New Rules
Edit `backend/src/game/rules.ts`:
- Add new methods to `RulesEngine` class
- Update `resolveAction()` switch statement
- Create modular helper functions

### Adding New Actions
1. Add action type to `shared/types.ts` (Action interface)
2. Add case to `resolveAction()` in rules.ts
3. Implement action resolution logic
4. UPDATE AI prompt in `backend/src/ai/manager.ts` with new action details

### Adding Spells/Abilities
Create `backend/src/rules/` subdirectories:
```
rules/
  combat.ts        # Strike, movement
  spells.ts        # Spell system (expandable)
  abilities.ts     # Special abilities
  conditions.ts    # Status effects
```

## Next Steps

1. ✅ Core grid combat system
2. ✅ Basic strikes and movement
3. ✅ AI integration
4. TODO: Click-based action selection (UI)
5. TODO: Spell system
6. TODO: Special abilities
7. TODO: Conditions system (prone, frightened, etc.)
8. TODO: Character persistence
9. TODO: Encounter builder
10. TODO: Multiple maps/scenarios

## Notes

- Health is simplified; no recovery mechanics yet
- Damage calculation doesn't include resistances/immunities (TODO)
- Movement is grid-based; no diagonal modifiers yet
- Save DCs not yet implemented
- Skill checks not yet implemented
