# Grand Strategy — Phase 1 (experimental command planner)

This phase adds an **opt-in, in-game command planner** for the hybrid
continuous-map Grand Strategy direction. The original Classic gameplay remains
authoritative and unchanged; no new multiplayer game mode or rules are activated.

## What works now

- In any non-replay game, click **⚑ Command** in the upper-left leaderboard toolbar. The military planner opens beside the leaderboard.
- Create up to 12 armies, rename armies, and disband them.
- Add up to 120 planned infantry, armored, artillery, or recon divisions.
- Group divisions into armies or move them to the unassigned reserve.
- Remove divisions. Disbanding an army preserves its divisions in reserve.
- See a planned personnel estimate based on template definitions.
- Planner state resets for each match; it is intentionally not stored remotely.

## Deliberate limitations

These formations are **client-side planning metadata only**. They do not
spawn units, reserve manpower, deduct gold, alter attack mechanics, automate
movements, appear on other players' screens, or survive a page reload.
The displayed planned personnel totals are design estimates, **not** the
game's current troop counts. No authoritative engine snapshot or multiplayer
protocol was changed in Phase 1.

Avoid extending these records into combat by directly mutating client state.
Multiplayer and replay correctness require deterministic engine executions,
wire intents, update synchronization, and snapshot support before any actual
division deployment or movement is exposed to players.

## Next implementation milestones

1. Map-click region assignment and tactical overlays (client view of the
   continuous map; not yet province-based).
2. Authoritative division deployment backed by troop/equipment costs and
   engine snapshots.
3. Deterministic orders: move, hold, frontline, and planned offensive.
4. Divisional supply, combat, fortifications, production and doctrines.
5. A lobby-level opt-in Grand Strategy ruleset and dedicated balance tests.

## Verification

Run from the repo root with Node 24.15+ and npm 12.1+:

```bash
npm run inst
npx vitest run tests/client/GrandStrategyArmyModel.test.ts tests/client/GrandStrategyCommand.test.ts tests/GameLeftSidebar.test.ts
npm run typecheck
npm run dev
```

Manual smoke checks:

- Classic solo and public/private lobby actions are unchanged.
- Open the command panel in a solo game, create and group divisions.
- Move a division to reserve, rename an army, then disband it.
- Close and reopen the panel within a match; the roster stays.
- Start a new match; the planner starts empty.
- Verify no planner controls appear on the menu or in a replay.
- Check narrow/mobile viewport scrolling and keyboard focus.
