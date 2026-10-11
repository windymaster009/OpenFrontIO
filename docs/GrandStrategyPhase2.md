# Grand Strategy — Phase 2: Real infantry on Solo maps

This feature is an **experimental opt-in, single-player only** vertical slice.
All Classic OpenFront games retain their original engine, economy and controls.
Multiplayer, cross-client divisions, attacks against enemy territory, fronts,
supply, commanders and equipment have **not** been implemented.

## Enable and test

1. Pull the `redesign` branch; run `npm run typecheck`.
2. Run focused tests:
   ```
   npx vitest run tests/GrandStrategyInfantryExecution.test.ts tests/client/GrandStrategyLiveOrders.test.ts tests/client/GrandStrategyCommand.test.ts tests/GameLeftSidebar.test.ts
   ```
3. Start `npm run dev`; choose **Solo**.
4. Turn on **Grand Strategy (experimental)** at the top of the Solo setup.
5. Start the game and choose a starting location.
6. Open **⚑ Command** from the leaderboard in the upper left.
7. In **Live military**, choose **Deploy Infantry (3k)** and click land your nation owns.
8. Observe the actual troop pool decrease by 3,000 and a `▣ 3k` counter
   appear at the tile. There is a limit of 40 active divisions.
9. Click **Move** beside the actual infantry division, then click a destination
   on connected, passable land that you own. Infantry advances one tile every
   4 simulation ticks along a deterministic, bounded friendly path.
10. Test negative cases: insufficient troops, enemy land, blocked paths,
    restarting in Classic (no deploy controls), and replay load.

The original “Recruit a planned division” templates/army grouping remain
*client-side planning notes*. They do not recruit soldiers, and their planning
headcount is not authoritative. Only **Live military / Deploy Infantry (3k)**
changes the engine and the actual troop pool.

## Technical implementation

- `GameConfigSchema.grandStrategy` opts in; default/absent means Classic.
- `UnitType.InfantryDivision` is appended to the unit enum to preserve the
  ordinal order of the legacy values in wire formats.
- Typed wire intents `deploy_infantry` and `move_infantry` go through the
  existing transport and execution manager.
- `DeployInfantryExecution` validates Solo mode, spawn phase, owned passable
  land, player state, division cap and available manpower before building
  the unit. `PlayerImpl.buildUnit` deducts 3,000 troops authoritatively.
- `MoveInfantryExecution` bounds path search and checks each step still
  belongs to the issuing player. Orders run deterministically and register
  snapshot types.
- The GPU sprite atlas is intentionally not changed. Real infantry counters
  are HTML markers drawn from `GameView.unitsOwnedBy()`; they update every
  HUD tick and follow the camera. No fake client-side troop mutation.

## Known limits

- This feature is **not production-tested** until typecheck, tests, a solo
  gameplay smoke check, and a replay/snapshot run pass on a local machine.
- The prototype limits paths to 160 tiles and searches at most 8,000 nodes;
  a failed path order produces no movement.
- Enemy combat, garrisons, attrition, capture of a division, battle plans,
  AI control, logistics, equipment and multiplayer networking are future work.
- Infantry does not refund manpower when destroyed, and no manual disband or
  replenish behavior is available yet.
- The map counters use DOM positions refreshed from the view (once per second);
  polished zoom-level clustering and interpolation are future improvements.
- Replays made with a modified unit enum may not be readable by earlier
  builds. Both live and replay clients should run this fork's same version.

Next: engine-backed army grouping, selected division overlays,
friendly/hostile combat and frontlines. Rework manpower availability and
capture/deletion behavior before multiplayer is enabled.
