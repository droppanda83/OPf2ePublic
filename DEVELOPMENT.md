# Development Environment Setup

## VS Code Integration

### Available Tasks (Terminal > Run Task)

1. **PF2e: Build All** (Default Build)
   - Compiles all TypeScript workspaces
   - `npm run build`

2. **PF2e: Start Development Servers**
   - Starts both backend and frontend with hot reload
   - `npm run dev`

3. **PF2e: Start Backend Only**
   - Backend on port 5000 only
   - `npm run backend:dev`

4. **PF2e: Start Frontend Only**
   - Frontend on port 5173 only
   - `npm run frontend:dev`

5. **PF2e: Type Check**
   - Runs TypeScript type checking across all workspaces
   - `npm run type-check`

### Debug Configurations (Run > Start Debugging)

- **Backend: Debug** - Node.js debug with breakpoints
- **Frontend: Debug** - Chrome DevTools debugging
- **Full Stack Debug** - Both backend and frontend simultaneously

## Quick Start Guide

### First-Time Setup

```bash
# Install dependencies (already done)
npm install

# Create environment file
cp backend/.env.example backend/.env

# Add your OpenAI API key to backend/.env
OPENAI_API_KEY=sk-your-key-here
```

### Development Workflow

1. **Open VS Code** - automatically loads workspace configuration
2. **Run Task** - Press `Ctrl+Shift+B` or use Terminal > Run Task menu
   - Select "PF2e: Start Development Servers"
3. **Open Browsers**
   - Backend API: http://localhost:5000
   - Frontend UI: http://localhost:5173
4. **Edit code** - Frontend auto-reloads on save, backend requires restart
5. **Debug** - Set breakpoints and use F5 for debugging

### Production Build

```bash
npm run build          # Compile all TypeScript
npm run type-check     # Verify types
npm start              # Start backend production server
```

## Project Architecture

### Workspaces

Each workspace is independently buildable and typecheckable:

- **backend** - Express.js server with game engine and AI manager
- **frontend** - React client with Vite for development
- **shared** - TypeScript types and utilities (imported by all)
- **rules-engine** - Modular rule modules for expandability

### Key Commands

| Command | Purpose |
|---------|---------|
| `npm install` | Install all dependencies across workspaces |
| `npm run build` | TypeScript compilation for all workspaces |
| `npm run dev` | Development servers (both) |
| `npm run backend:dev` | Backend dev server only (port 5000) |
| `npm run frontend:dev` | Frontend dev server only (port 5173) |
| `npm run type-check` | Type validation across workspaces |

## Backend API

### Default Port: 5000

```
GET /health
  Health check endpoint
  Returns: { status: 'ok', timestamp }

POST /api/game/create
  Start new encounter
  
GET /api/game/:gameId
  Get game state
  
POST /api/game/:gameId/action
  Execute player/creature action
```

## Frontend

### Default Port: 5173

- Vite development server with HMR
- Automatically proxies `/api` requests to backend
- Browse to http://localhost:5173

## Troubleshooting

### Build Errors
```bash
# Clean and reinstall
rm -r node_modules package-lock.json
npm install
npm run build
```

### Port Already in Use
- Kill process: `npx kill-port 5000 5173`
- Or change ports in vite.config.ts and backend env

### TypeScript Errors
- Run `npm run type-check` to see all errors
- Check shared/types.ts for interface definitions

### Hot Reload Not Working
- Restart entire dev environment
- Check that file watching is enabled

## Architecture Notes

- **Workspaces**: npm 7+ allows monorepo with shared node_modules
- **Module Imports**: Use package names (e.g., `from 'pf2e-shared'`)
- **Type Safety**: Strict TypeScript across all workspaces
- **Cross-workspace**: Backend, Frontend, Rules-Engine all use shared types

## Contributing

When adding features:

1. Extend rule modules for game mechanics
2. Add React components for UI changes
3. Update shared types if data structures change
4. Run `npm run build && npm run type-check` before committing

## Performance Tips

- **Cold Start**: First npm install takes 2-5 minutes
- **Build Time**: Full build ~5-10 seconds
- **Hot Reload**: Frontend changes instant, backend requires restart
- **Type Check**: 2-3 seconds for all workspaces

---

Last Updated: February 2026
Ready for Development!
