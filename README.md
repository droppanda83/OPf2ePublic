# PF2e AI-Powered Tactical Combat Game

A full-stack, AI-enhanced tactical combat system for Pathfinder 2nd Edition featuring real-time grid-based combat, modular rule engine, and ChatGPT integration for intelligent NPC decision-making.

## Features

🎲 **Core Combat System**
- Turn-based combat with action economy (3 actions per turn)
- Initiative rolling and turn order management
- d20 attack rolls with damage resolution
- Health tracking and condition system

🤖 **AI-Powered NPCs**
- ChatGPT integration for tactical enemy decisions
- Context-aware decision making
- Constrained output for valid PF2e actions

🗺️ **Tactical Battlefield**
- 20x20 grid-based combat arena
- Terrain types (empty, difficult, impassable)
- Real-time creature positioning
- Visual health indicators

📦 **Modular Rule Engine**
- Pluggable rule modules for easy expansion
- Action Economy, Movement, Combat, Conditions
- Spell system with spell slots
- Ability system with charges
- Damage resistance/immunity system

⚡ **Full-Stack Architecture**
- Node.js + Express backend with TypeScript
- React + Vite frontend with TypeScript
- Shared type system across frontend/backend
- Monorepo workspace structure

## Quick Start

### Prerequisites
- Node.js 18+
- npm 9+
- OpenAI API key (for AI features)

### Installation

```bash
# Clone and install
git clone <repo>
cd OPf2ePublic
npm install

# Configure backend
cp backend/.env.example backend/.env
# Edit backend/.env and add your OpenAI API key
```

### Development

```bash
# Start both backend and frontend
npm run dev

# Or start individually
npm run backend:dev    # http://localhost:5000
npm run frontend:dev   # http://localhost:5173
```

### Production Build

```bash
npm run build
npm run type-check
npm start
```

## Project Structure

```
├── backend/           # Express.js server + game engine
│   ├── src/
│   │   ├── index.ts   # REST API server
│   │   ├── game/      # Game engine & rules
│   │   └── ai/        # ChatGPT integration
│   └── package.json
├── frontend/          # React + Vite UI
│   ├── src/
│   │   ├── components/  # React components
│   │   └── App.tsx
│   └── package.json
├── shared/            # Shared types & utilities
│   ├── types.ts       # TypeScript interfaces
│   └── package.json
├── rules-engine/      # Modular rule system
│   ├── moduleSystem.ts    # Core modules
│   ├── specialModules.ts  # Spells/abilities
│   └── package.json
└── package.json       # Workspace config
```

## API Reference

### REST Endpoints

```
GET /health
  Health check
  Returns: { status: 'ok', timestamp }

POST /api/game/create
  Start new encounter
  Body: { players, creatures, mapSize }
  Returns: GameState

GET /api/game/:gameId
  Get current game state
  Returns: GameState

POST /api/game/:gameId/action
  Execute action
  Body: { creatureId, actionId, targetId, targetPosition }
  Returns: { gameState, result }
```

## Gaming

1. **Create Game**: Click "Start New Combat"
2. **Click Creatures**: Select targets from the grid
3. **Take Actions**: Use action panel to strike, move, cast spells
4. **AI Turns**: Enemies use ChatGPT to decide actions
5. **Track Health**: Watch HP bars and conditions

## Modular Rules System

Extending the game is simple with pluggable modules:

### Add a Rule Module

```typescript
import { BaseRuleModule } from 'pf2e-rules-engine';

export class MyRuleModule extends BaseRuleModule {
  name = 'MyRules';
  version = '1.0.0';

  validate(action: any): boolean {
    return true; // or false if invalid
  }

  apply(actor: Creature, gameState: GameState, action: any): any {
    // Implement your mechanic
    return { success: true, message: '...' };
  }
}
```

### Add a Spell

Edit `rules-engine/specialModules.ts`:

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

## Development

### Available Tasks

- `npm run build` - Compile all TypeScript
- `npm run dev` - Start dev servers
- `npm run type-check` - Type validation
- `npm run backend:dev` - Backend only
- `npm run frontend:dev` - Frontend only

### VS Code Integration

- Press `Ctrl+Shift+B` for build task
- Press `F5` for debugging (requires Chrome)
- See `.vscode/tasks.json` and `.vscode/launch.json`

### Documentation

- [Development Guide](DEVELOPMENT.md) - Setup and workflow
- [Copilot Instructions](.github/copilot-instructions.md) - Architecture details
- [Shared Types](shared/types.ts) - Data structures

## Configuration

### Environment Variables

`backend/.env`:
```env
OPENAI_API_KEY=sk-your-key-here
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

### Customization

- Change port: Edit `backend/.env`
- Modify grid size: Edit encounter creation params
- Adjust spell effects: Edit `specialModules.ts`
- Add creatures: Use rule modules system

## Roadmap

- [ ] Database persistence  
- [ ] WebSocket real-time multiplayer
- [ ] Character sheet system
- [ ] PF2e action economy enforcement
- [ ] Spell library from official rules
- [ ] Mobile-responsive UI
- [ ] Campaign management
- [ ] Audio effects and ambience

## Troubleshooting

**Port in use?**
```bash
npx kill-port 5000 5173
```

**Dependencies issues?**
```bash
rm -r node_modules package-lock.json
npm install
```

**TypeScript errors?**
```bash
npm run type-check
```

**Build failed?**
```bash
npm run build -- --verbose
```

## Contributing

1. Extend via rule modules (preferred)
2. Add TypeScript types to shared/types.ts
3. Test with `npm run build && npm run type-check`
4. Update documentation

## Support

For detailed development information, see:
- [Development Guide](DEVELOPMENT.md)
- [Copilot Instructions](.github/copilot-instructions.md)

## License

MIT

---

**Status**: MVP Complete - Ready for Active Development  
**Last Updated**: February 2026
