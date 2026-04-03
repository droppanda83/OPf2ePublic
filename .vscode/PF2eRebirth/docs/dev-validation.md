# Developer Validation Guide

Local commands for validating the PF2e Rebirth rules engine.

## Prerequisites

```bash
npm install
```

## Validation Commands

| Command | Purpose | Pass criteria |
|---|---|---|
| `npm run validate:syntax` | TypeScript parse & compile guard | Zero diagnostics |
| `npm run validate:types` | Strict type checking | Zero diagnostics |
| `npm run validate` | Default validation (syntax) | Zero diagnostics |

## Current State

**Phase G0** — Validation surface bootstrapped. The commands above are the canonical
local validation path. External dependencies (`pf2e-shared`, local module stubs)
are not yet resolved in this workspace, so expect import errors until module paths
are wired up.

## Roadmap

| Phase | Gate | Status |
|---|---|---|
| G0 | Local validation commands exist | **Done** |
| G1 | Advisory CI (non-blocking) | Not started |
| G2 | Correctness hard gate (blocking) | Not started |
| G3 | Type/contract hard gate (blocking) | Not started |
| G4 | Full validation gate | Not started |

See `audit-planned-fixes-2026-04-02.md` Phase 1G for full rollout plan and failure policies.
