# PF2e Rebirth Development Plan

Last updated: 2026-03-31

This is the canonical roadmap for non-AI-GM product work. AI GM-specific planning remains in `AI-GM-DEVELOPMENT.md`.

## Milestone Status

### M0. Monorepo Foundation
Status: COMPLETE

- Backend, frontend, shared, and rules-engine workspaces are in place.
- TypeScript build and workspace scripts are established.

### M1. Core Combat Loop
Status: PARTIAL_COMPLETE

- Encounter flow, turn order, action execution, and combat state management exist.
- Ongoing completion remains for some action families and advanced subsystems.

### M2. Data Catalog Expansion
Status: PARTIAL_COMPLETE

- Large spell, feat, and creature catalogs are present.
- Ongoing data quality, completeness, and Remaster terminology alignment remain active.

### M3. Character Builder and UX Infrastructure
Status: PARTIAL_COMPLETE

- Builder and character workflows exist.
- Remaining parity/validation and UI density passes are still active.

### M4. Test, Type-Safety, and Quality Controls
Status: PARTIAL_COMPLETE

- Linting, type-checking, and initial test suites exist.
- Remaining hardening includes deeper coverage and unresolved engine stubs.

### M5. AI GM Track
Status: IN_PROGRESS (SEPARATE TRACK)

- Planned and managed in `AI-GM-DEVELOPMENT.md`.

## Active Priority Work (Current)

1. Archetype audit and completion
2. Background audit and completion
3. Documentation collation and cleanup
4. Builder data integrity sweep
5. Exploration and downtime engine completion
6. Bestiary completeness backfill
7. Public release-readiness pass

## Open Risks

- Incomplete exploration/downtime runtime support can cause gameplay gaps outside encounter mode.
- Large data catalogs require ongoing consistency validation to avoid drift.
- Documentation drift can reappear unless canonical ownership is kept strict.

## Completion Criteria for Next Review

The next roadmap review should mark milestones complete only when verified in code:

1. Exploration and downtime handlers are implemented and tested.
2. Background and archetype datasets pass parity validation checks.
3. Active fix tracker contains only truly unresolved defects.
4. Public docs and developer docs remain aligned with actual architecture and commands.
