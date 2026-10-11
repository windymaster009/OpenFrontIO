import { GameType, UnitType } from "@openfront/engine-api/game/GameTypes";
import type { TileRef } from "@openfront/engine-api/game/GameMap";
import { zNum, zPlayerRef, zTiles } from "@openfront/engine-lib/snapshot/SnapshotType";
import { z } from "zod";
import type { Execution, Game, Player, Unit } from "../game/Game";
import { execSnapshotType } from "../snapshot/ExecutionSnapshot";
import type { ExecRecord, SnapshotReader, SnapshotWriter } from "../snapshot/SnapshotContext";

// Keep early prototype movement bounded on enormous world maps.
const MAX_PATH_TILES = 160;
const MAX_PATH_SEARCH_NODES = 8000;
const TICKS_PER_STEP = 4;

/**
 * Moves infantry through contiguous friendly land. Paths and movement cadence
 * are deterministic and snapshotted for replay/resumption.
 * Combat, hostile territory movement and supply are NOT implemented here.
 */
export class MoveInfantryExecution implements Execution {
  private active = false;
  private path: TileRef[] = [];
  private nextIndex = 1;
  private lastStepTick = 0;
  private game!: Game;

  constructor(
    private owner: Player,
    private unitId: number,
    private destination: TileRef,
  ) {}

  init(game: Game, tick: number): void {
    this.game = game;
    if (
      game.config().gameConfig().grandStrategy !== true ||
      game.config().gameConfig().gameType !== GameType.Singleplayer ||
      game.inSpawnPhase() ||
      !game.isValidRef(this.destination)
    ) return;

    const unit = game.unit(this.unitId);
    if (!unit || !unit.isActive() || unit.owner() !== this.owner ||
        unit.type() !== UnitType.InfantryDivision ||
        game.owner(this.destination) !== this.owner ||
        game.isImpassable(this.destination)) return;

    this.path = this.findFriendlyPath(game, unit.tile(), this.destination);
    if (this.path.length <= 1) return;
    this.active = true;
    this.lastStepTick = tick;
    // A later order replaces this one; older executions stop automatically.
    unit.setTargetTile(this.destination);
    unit.touch();
  }

  private findFriendlyPath(game: Game, start: TileRef, target: TileRef): TileRef[] {
    if (start === target) return [start];
    if (game.manhattanDist(start, target) >= MAX_PATH_TILES) return [];
    const seen = new Set<TileRef>([start]);
    const parent = new Map<TileRef, TileRef>();
    const queue: TileRef[] = [start];
    let head = 0;
    while (head < queue.length && head < MAX_PATH_SEARCH_NODES) {
      const tile = queue[head++];
      for (const next of game.neighbors(tile)) {
        if (seen.has(next) || game.isImpassable(next) || game.owner(next) !== this.owner) continue;
        seen.add(next);
        parent.set(next, tile);
        if (next === target) {
          const result: TileRef[] = [target];
          let cursor = target;
          while (cursor !== start) {
            cursor = parent.get(cursor)!;
            result.push(cursor);
            if (result.length > MAX_PATH_TILES) return [];
          }
          return result.reverse();
        }
        queue.push(next);
      }
    }
    return [];
  }

  tick(tick: number): void {
    if (!this.active || tick - this.lastStepTick < TICKS_PER_STEP) return;
    const unit = this.game.unit(this.unitId);
    if (!unit || !unit.isActive() || unit.owner() !== this.owner ||
        unit.type() !== UnitType.InfantryDivision ||
        unit.targetTile() !== this.destination) {
      this.active = false;
      return;
    }
    const next = this.path[this.nextIndex];
    if (next === undefined || this.game.owner(next) !== this.owner ||
        this.game.isImpassable(next)) {
      this.active = false;
      if (unit.targetTile() === this.destination) {
        unit.setTargetTile(undefined);
        unit.touch();
      }
      return;
    }
    // Reject a path whose current tile was forcibly relocated by other logic.
    if (unit.tile() !== this.path[this.nextIndex - 1]) {
      this.active = false;
      return;
    }
    unit.move(next);
    this.nextIndex++;
    this.lastStepTick = tick;
    if (this.nextIndex >= this.path.length) {
      unit.setTargetTile(undefined);
      unit.touch();
      this.active = false;
    }
  }

  isActive(): boolean { return this.active; }
  activeDuringSpawnPhase(): boolean { return false; }

  snapshot(w: SnapshotWriter): ExecRecord {
    return MoveInfantryExecutionSnapshot.write({
      owner: w.player(this.owner),
      unitId: this.unitId,
      destination: this.destination,
      path: w.tiles(this.path),
      nextIndex: this.nextIndex,
      lastStepTick: this.lastStepTick,
      active: this.active,
    });
  }

  restoreSnapshot(s: MoveState, r: SnapshotReader): void {
    this.owner = r.player(s.owner);
    this.game = r.game;
    this.unitId = s.unitId;
    this.destination = s.destination;
    this.path = Array.from(s.path);
    this.nextIndex = s.nextIndex;
    this.lastStepTick = s.lastStepTick;
    this.active = s.active;
  }
}

const MoveStateSchema = z.object({
  owner: zPlayerRef(),
  unitId: zNum(),
  destination: zNum(),
  path: zTiles(),
  nextIndex: zNum(),
  lastStepTick: zNum(),
  active: z.boolean(),
});
type MoveState = z.infer<typeof MoveStateSchema>;
export const MoveInfantryExecutionSnapshot = execSnapshotType({
  name: "MoveInfantry",
  version: 1,
  schema: MoveStateSchema,
  cls: () => MoveInfantryExecution,
});
