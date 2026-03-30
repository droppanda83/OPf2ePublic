# PF2e AI-Powered Tactical Combat Game - Development Guide

## Project Overview

A full-stack web application for turn-based tactical combat based on Pathfinder 2nd Edition rules, featuring:

- **Backend**: Node.js + Express.js with TypeScript
- **Frontend**: React with TypeScript and Vite
- **AI Integration**: ChatGPT for tactical decision-making
- **Modular Rule System**: Expandable PF2e rules engine
- **Combat Features**: 
  - Turn-based combat with action economy (3 actions/turn)
  - Grid-based tactical battlefield
  - Health and condition tracking
  - Real-time game state updates

## Project Status

**MVP Complete**: Core systems fully implemented:
- ✅ Node.js + TypeScript backend with Express
- ✅ React frontend with TypeScript and Vite
- ✅ Game state management and turn tracking
- ✅ Modular PF2e rules engine with extensible modules
- ✅ ChatGPT integration for AI decision-making
- ✅ Grid-based tactical display
- ✅ Initiative and turn order system
- ✅ Health and condition tracking
- ✅ Action economy management
- ✅ Spell and ability system

## Getting Started

### Prerequisites
- Node.js 18+
- npm 9+
- OpenAI API key

### Quick Start
```bash
npm install
cp backend/.env.example backend/.env
# Edit backend/.env with your OpenAI API key
npm run dev
```

Backend: http://localhost:5000  
Frontend: http://localhost:5173

### Build
```bash
npm run build
npm run type-check
```

## Architecture

### Monorepo Structure
- **backend/**: Express.js server with game engine
- **frontend/**: React client with Vite
- **shared/**: Common TypeScript types and utilities
- **rules-engine/**: Modular rule modules

### Modular Rules System

The engine uses pluggable rule modules:

**Core Modules** (`rules-engine/moduleSystem.ts`):
- `ActionEconomyModule`: 3-action limit tracking
- `MovementModule`: Grid movement with terrain
- `CombatModule`: Attack rolls and damage
- `ConditionModule`: Temporary effect management

**Specialized Modules** (`rules-engine/specialModules.ts`):
- `SpellModule`: Spell casting and slots
- `AbilityModule`: Special abilities with charges
- `ResistanceModule`: Damage resistance/immunity

Each module implements the `RuleModule` interface with validate/apply methods.

## API Reference

REST Endpoints:
- `POST /api/game/create` - New encounter
- `GET /api/game/:gameId` - Get state
- `POST /api/game/:gameId/action` - Execute action
- `GET /health` - Health check

## Extending the System

### Add a New Rule Module

```typescript
export class MyModule extends BaseRuleModule {
  name = 'MyRules';
  version = '1.0.0';

  validate(action: any): boolean {
    return true; // or false if invalid
  }

  apply(actor: Creature, gameState: GameState, action: any): any {
    // Apply rules
    return { success: true, message: '...' };
  }
}
```

Register in `rules-engine/index.ts`:
```typescript
registry.registerModule(new MyModule());
```

### Add a Spell

Edit `SpellModule.registerDefaultSpells()`:
```typescript
this.spellDatabase.set('my-spell', {
  id: 'my-spell',
  name: 'My Spell',
  level: 2,
  school: 'evocation',
  actionCost: 2,
  duration: 0,
  description: 'Description',
  effect: { damage: 5 }
});
```

## Frontend Components

- **CombatInterface**: Main UI container
- **BattleGrid**: 20x20 tactical grid
- **CreaturePanel**: Character status
- **ActionPanel**: Player actions/spells
- **GameLog**: Action history

## Configuration

`backend/.env`:
```env
OPENAI_API_KEY=sk-...
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

## Development Tips

- Type check: `npm run type-check`
- Backend auto-updates: Restart needed
- Frontend hot-reload: Automatic
- Shared types: Import from `shared/types` or `shared/index`

## Troubleshooting

**Port conflicts**: Check `netstat -ano | findstr :5000` (Windows)  
**Dependencies**: Run `npm install` in root  
**Types**: Run `npm run type-check` for errors

---

Last Updated: February 2026 | Status: Ready for Development

