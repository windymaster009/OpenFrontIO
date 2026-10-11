import { GameType, UnitType } from "@openfront/engine-api/game/GameTypes";
import type { TileRef } from "@openfront/engine-api/game/GameMap";
import { zPlayerRef, zNum } from "@openfront/engine-lib/snapshot/SnapshotType";
import { z } from "zod";
import type { Execution, Game, Player } from "../game/Game";
import { execSnapshotType } from "../snapshot/ExecutionSnapshot";
import type { ExecRecord, SnapshotReader, SnapshotWriter } from "../snapshot/SnapshotContext";

export const INFANTRY_DIVISION_MANPOWER = 3000;
export const MAX_ACTIVE_INFANTRY_DIVISIONS = 40;

/** One-shot, deterministic and server-authoritative deployment. */
export class DeployInfantryExecution implements Execution {
  constructor(private owner: Player, private tile: TileRef) {}

  init(game: Game, _tick: number): void {
    if (
      game.config().gameConfig().grandStrategy !== true ||
      game.config().gameConfig().gameType !== GameType.Singleplayer ||
      game.inSpawnPhase() ||
      !game.isValidRef(this.tile) ||
      !this.owner.isAlive() ||
      !this.owner.hasSpawned() ||
      this.owner.troops() < INFANTRY_DIVISION_MANPOWER ||
      this.owner.units(UnitType.InfantryDivision).length >= MAX_ACTIVE_INFANTRY_DIVISIONS ||
      game.config().isUnitDisabled(UnitType.InfantryDivision)
    ) {
      return;
    }

    const spawn = this.owner.canBuild(UnitType.InfantryDivision, this.tile);
    if (spawn === false) return;
    // buildUnit deducts the supplied 3,000 manpower and publishes a UnitUpdate
    // through GameImpl. Neither the UI nor an untrusted client sets balances.
    this.owner.buildUnit(UnitType.InfantryDivision, spawn, {
      troops: INFANTRY_DIVISION_MANPOWER,
    });
  }

  tick(): void {}
  isActive(): boolean { return false; }
  activeDuringSpawnPhase(): boolean { return false; }

  snapshot(w: SnapshotWriter): ExecRecord {
    return DeployInfantryExecutionSnapshot.write({ owner: w.player(this.owner), tile: this.tile });
  }

  restoreSnapshot(s: DeployState, r: SnapshotReader): void {
    this.owner = r.player(s.owner);
    this.tile = s.tile;
  }
}

const DeployStateSchema = z.object({ owner: zPlayerRef(), tile: zNum() });
type DeployState = z.infer<typeof DeployStateSchema>;
export const DeployInfantryExecutionSnapshot = execSnapshotType({
  name: "DeployInfantry",
  version: 1,
  schema: DeployStateSchema,
  cls: () => DeployInfantryExecution,
});
