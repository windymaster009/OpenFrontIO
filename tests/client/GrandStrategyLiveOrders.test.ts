import { describe, expect, it, vi } from "vitest";
import { GameType } from "@openfront/engine-api/game/GameTypes";
import { EventBus } from "@openfront/shared/EventBus";
import "../../src/client/hud/layers/GrandStrategyCommand";
import type { GrandStrategyCommand } from "../../src/client/hud/layers/GrandStrategyCommand";
import type { TransformHandler } from "../../src/client/TransformHandler";
import { DeployInfantryIntentEvent, MoveInfantryIntentEvent } from "../../src/client/Transport";
import type { GameView } from "../../src/client/view";

function harness(ownerID: number, troops = 10000, live = true) {
  const bus = new EventBus();
  const panel = document.createElement("grand-strategy-command") as GrandStrategyCommand;
  panel.game = {
    config: () => ({
      isReplay: () => false,
      gameConfig: () => ({
        grandStrategy: live, gameType: GameType.Singleplayer,
      }),
    }),
    myPlayer: () => ({
      smallID: () => 5, troops: () => troops, isAlive: () => true,
    }),
    ownerID: () => ownerID,
    isValidCoord: () => true,
    isLand: () => true,
    isImpassable: () => false,
    ref: () => 42,
    unitsOwnedBy: () => [],
    inSpawnPhase: () => false,
  } as unknown as GameView;
  panel.transformHandler = {
    screenToWorldCoordinates: () => ({ x: 6, y: 7 }),
  } as unknown as TransformHandler;
  panel.eventBus = bus;
  panel.open = true;
  document.body.append(panel);
  return { panel, bus };
}

describe("live infantry map orders", () => {
  it("emits a real deployment intent on a friendly tile in Solo mode", async () => {
    const {panel, bus} = harness(5);
    const handler = vi.fn();
    bus.on(DeployInfantryIntentEvent, handler);
    (panel as unknown as {pendingOrder: string}).pendingOrder = "deploy";
    panel.handleMapClick(200, 300);
    expect(handler).toHaveBeenCalledOnce();
    expect(handler.mock.calls[0][0].tile).toBe(42);
    panel.remove();
  });

  it("rejects enemy territory and insufficient manpower", () => {
    const {panel, bus} = harness(9);
    const handler = vi.fn();
    bus.on(DeployInfantryIntentEvent, handler);
    (panel as unknown as {pendingOrder: string}).pendingOrder = "deploy";
    panel.handleMapClick(200, 300);
    expect(handler).not.toHaveBeenCalled();
    panel.remove();

    const low = harness(5, 2000);
    low.bus.on(DeployInfantryIntentEvent, handler);
    (low.panel as unknown as {pendingOrder: string}).pendingOrder = "deploy";
    low.panel.handleMapClick(200, 300);
    expect(handler).not.toHaveBeenCalled();
    low.panel.remove();
  });

  it("emits movement for a selected unit, not arbitrary troop teleportation", () => {
    const {panel, bus} = harness(5);
    const handler = vi.fn();
    bus.on(MoveInfantryIntentEvent, handler);
    (panel as unknown as {pendingOrder: string; selectedLiveDivision: number}).pendingOrder = "move";
    (panel as unknown as {pendingOrder: string; selectedLiveDivision: number}).selectedLiveDivision = 12;
    panel.handleMapClick(200, 300);
    expect(handler).toHaveBeenCalledOnce();
    expect(handler.mock.calls[0][0]).toMatchObject({unitId: 12, tile: 42});
    panel.remove();
  });

  it("never emits real orders in Classic mode", () => {
    const {panel, bus} = harness(5, 10000, false);
    const handler = vi.fn();
    bus.on(DeployInfantryIntentEvent, handler);
    (panel as unknown as {pendingOrder: string}).pendingOrder = "deploy";
    panel.handleMapClick(200, 300);
    expect(handler).not.toHaveBeenCalled();
    panel.remove();
  });
});
