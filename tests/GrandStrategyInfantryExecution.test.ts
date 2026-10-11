import { describe, expect, it, vi } from "vitest";
import { GameType, UnitType } from "@openfront/engine-api/game/GameTypes";
import { DeployInfantryExecution } from "../packages/engine/src/execution/DeployInfantryExecution";
import { MoveInfantryExecution } from "../packages/engine/src/execution/MoveInfantryExecution";
import type { Game, Player, Unit } from "../packages/engine/src/game/Game";

function makeDeploy(grandStrategy: boolean, validOwner = true) {
  let available = 10000;
  const buildUnit = vi.fn((_type: UnitType, _tile: number, params: {troops: number}) => {
    available -= params.troops;
  });
  const player = {
    isAlive: () => true, hasSpawned: () => true,
    troops: () => available,
    units: () => [],
    canBuild: () => validOwner ? 8 : false,
    buildUnit,
  } as unknown as Player;
  const game = {
    config: () => ({
      gameConfig: () => ({ grandStrategy, gameType: GameType.Singleplayer }),
      isUnitDisabled: () => false,
    }),
    isValidRef: () => true,
    inSpawnPhase: () => false,
  } as unknown as Game;
  return { game, player, buildUnit, troops: () => available };
}

describe("Solo Grand Strategy infantry authority", () => {
  it("rejects deployment in Classic mode without changing manpower", () => {
    const ctx = makeDeploy(false);
    new DeployInfantryExecution(ctx.player, 8).init(ctx.game, 5);
    expect(ctx.buildUnit).not.toHaveBeenCalled();
    expect(ctx.troops()).toBe(10000);
  });

  it("deploys with a validated 3k manpower cost in opt-in Solo mode", () => {
    const ctx = makeDeploy(true);
    new DeployInfantryExecution(ctx.player, 8).init(ctx.game, 5);
    expect(ctx.buildUnit).toHaveBeenCalledWith(UnitType.InfantryDivision, 8, { troops: 3000 });
    expect(ctx.troops()).toBe(7000);
  });

  it("rejects a tile that the player cannot build on", () => {
    const ctx = makeDeploy(true, false);
    new DeployInfantryExecution(ctx.player, 2).init(ctx.game, 5);
    expect(ctx.buildUnit).not.toHaveBeenCalled();
  });

  it("moves infantry along continuous friendly tiles over multiple ticks", () => {
    let position = 1;
    let target: number | undefined;
    const owner = {} as Player;
    const unit = {
      id: () => 5,
      isActive: () => true,
      type: () => UnitType.InfantryDivision,
      owner: () => owner,
      tile: () => position,
      targetTile: () => target,
      setTargetTile: (tile: number | undefined) => { target = tile; },
      move: (tile: number) => { position = tile; },
      touch: vi.fn(),
    } as unknown as Unit;
    const links: Record<number, number[]> = { 1: [2], 2: [1, 3], 3: [2] };
    const game = {
      config: () => ({ gameConfig: () => ({ grandStrategy: true, gameType: GameType.Singleplayer }) }),
      inSpawnPhase: () => false,
      isValidRef: () => true,
      unit: () => unit,
      owner: () => owner,
      isImpassable: () => false,
      manhattanDist: (a: number, b: number) => Math.abs(a-b),
      neighbors: (tile: number) => links[tile] ?? [],
    } as unknown as Game;
    const execution = new MoveInfantryExecution(owner, 5, 3);
    execution.init(game, 0);
    expect(execution.isActive()).toBe(true);
    execution.tick(3);
    expect(position).toBe(1);
    execution.tick(4);
    expect(position).toBe(2);
    execution.tick(8);
    expect(position).toBe(3);
    expect(execution.isActive()).toBe(false);
    expect(target).toBeUndefined();
  });

  it("does not route a division through enemy-held land", () => {
    const owner = {} as Player;
    const enemy = {} as Player;
    const unit = {
      id: () => 5, isActive: () => true,
      type: () => UnitType.InfantryDivision,
      owner: () => owner, tile: () => 1,
    } as unknown as Unit;
    const game = {
      config: () => ({ gameConfig: () => ({ grandStrategy: true, gameType: GameType.Singleplayer }) }),
      inSpawnPhase: () => false,
      isValidRef: () => true,
      unit: () => unit,
      owner: (t: number) => t === 2 ? enemy : owner,
      isImpassable: () => false,
      manhattanDist: (a: number,b: number) => Math.abs(a-b),
      neighbors: (t: number) => t===1 ? [2] : t===2 ? [1,3] : [2],
    } as unknown as Game;
    const execution = new MoveInfantryExecution(owner, 5, 3);
    execution.init(game, 0);
    expect(execution.isActive()).toBe(false);
  });
});
