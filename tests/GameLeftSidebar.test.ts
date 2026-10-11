import { GameMode } from "@openfront/engine-api/game/GameTypes";
import { EventBus } from "@openfront/shared/EventBus";
import { GameLeftSidebar } from "../src/client/hud/layers/GameLeftSidebar";
import type { PlayerStats } from "../src/client/hud/layers/PlayerStats";
import type { TeamStats } from "../src/client/hud/layers/TeamStats";
import { UserSettings } from "../src/client/UserSettings";
import type { GameView, PlayerView } from "../src/client/view";

describe("GameLeftSidebar", () => {
  beforeEach(() => {
    localStorage.clear();
    (
      UserSettings as unknown as { cache: Map<string, string | null> }
    ).cache.clear();
  });

  it("owns the player and team stats tables", async () => {
    const game = {
      config: () => ({ isReplay: () => false, gameConfig: () => ({ gameMode: GameMode.Team }) }),
    } as unknown as GameView;
    const eventBus = new EventBus();
    const sidebar = new GameLeftSidebar();
    sidebar.game = game;
    sidebar.eventBus = eventBus;
    document.body.append(sidebar);

    await sidebar.updateComplete;

    const playerStats = sidebar.querySelector("player-stats");
    const teamStats = sidebar.querySelector("team-stats");
    expect(typeof (playerStats as PlayerStats).refresh).toBe("function");
    expect(typeof (teamStats as TeamStats).refresh).toBe("function");
    expect((playerStats as PlayerStats).game).toBe(game);
    expect((playerStats as PlayerStats).eventBus).toBe(eventBus);
    expect((teamStats as TeamStats).game).toBe(game);

    sidebar.remove();
  });

  it("renders the player stats table after toggling it", async () => {
    const player = {
      id: () => "player-1",
      smallID: () => 0,
      name: () => "Player 1",
      displayName: () => "Player 1",
      clanTag: () => null,
      numTilesOwned: () => 10,
      gold: () => 100n,
      tradeGold: () => 0,
      trainGold: () => 0,
      piracyGold: () => 0,
      goldEarned: () => 0,
      isAlive: () => true,
      isOnSameTeam: () => false,
      team: () => null,
    } as unknown as PlayerView;
    const game = {
      config: () => ({
        isReplay: () => false,
        gameConfig: () => ({ gameMode: GameMode.FFA }),
        maxTroops: () => 1_000,
      }),
      gameID: () => "test-game",
      inSpawnPhase: () => false,
      myPlayer: () => player,
      numLandTiles: () => 100,
      ticks: () => 600,
      numTilesWithFallout: () => 0,
      playerViews: () => [player],
    } as unknown as GameView;
    const sidebar = new GameLeftSidebar();
    sidebar.game = game;
    sidebar.eventBus = new EventBus();
    document.body.append(sidebar);
    sidebar.init();
    await sidebar.updateComplete;

    (sidebar.querySelector('[role="button"]') as HTMLElement).click();
    await sidebar.updateComplete;

    const playerStats = sidebar.querySelector("player-stats") as PlayerStats;
    await playerStats.updateComplete;
    expect(playerStats.visible).toBe(true);
    expect(playerStats.querySelector(".stats-table")).not.toBeNull();

    expect(() => sidebar.tick()).not.toThrow();
    await playerStats.updateComplete;
    expect(playerStats.querySelector(".stats-table-row")).not.toBeNull();

    sidebar.remove();
  });

  it("exposes the Grand Strategy button in the working game toolbar", async () => {
    const game = {
      config: () => ({
        gameConfig: () => ({ gameMode: GameMode.FFA }),
        isReplay: () => false,
      }),
    } as unknown as GameView;
    const planner = document.createElement("grand-strategy-command") as
      HTMLElement & { togglePanel: ReturnType<typeof vi.fn> };
    planner.togglePanel = vi.fn();
    document.body.append(planner);

    const sidebar = new GameLeftSidebar();
    sidebar.game = game;
    sidebar.eventBus = new EventBus();
    document.body.append(sidebar);
    await sidebar.updateComplete;

    const commandButton = sidebar.querySelector(
      '[data-testid="grand-strategy-open"]',
    ) as HTMLButtonElement | null;
    expect(commandButton).not.toBeNull();
    expect(commandButton?.textContent).toContain("Command");
    commandButton?.click();
    expect(planner.togglePanel).toHaveBeenCalledOnce();

    sidebar.remove();
    planner.remove();
  });

  it("hides the Command button in replays", async () => {
    const game = {
      config: () => ({
        gameConfig: () => ({ gameMode: GameMode.FFA }),
        isReplay: () => true,
      }),
    } as unknown as GameView;
    const sidebar = new GameLeftSidebar();
    sidebar.game = game;
    document.body.append(sidebar);
    await sidebar.updateComplete;
    expect(sidebar.querySelector('[data-testid="grand-strategy-open"]')).toBeNull();
    sidebar.remove();
  });

  it("stacks the player and team stats tables vertically at every width", async () => {
    const game = {
      config: () => ({ isReplay: () => false, gameConfig: () => ({ gameMode: GameMode.Team }) }),
    } as unknown as GameView;
    const sidebar = new GameLeftSidebar();
    sidebar.game = game;
    sidebar.eventBus = new EventBus();
    document.body.append(sidebar);
    await sidebar.updateComplete;

    const wrapper = sidebar.querySelector("player-stats")?.parentElement;
    expect(wrapper?.classList).toContain("flex-col");
    expect(wrapper?.className).not.toMatch(/flex-wrap|lg:flex/);
    expect(sidebar.querySelector("team-stats")?.className).not.toContain(
      "lg:flex-initial",
    );

    sidebar.remove();
  });
});
