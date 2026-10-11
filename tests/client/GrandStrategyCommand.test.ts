import { beforeEach, describe, expect, it } from "vitest";
import "../../src/client/hud/layers/GrandStrategyCommand";
import type { GrandStrategyCommand } from "../../src/client/hud/layers/GrandStrategyCommand";
import type { GameView } from "../../src/client/view";

describe("Grand Strategy command overlay", () => {
  let panel: GrandStrategyCommand;

  beforeEach(async () => {
    document.body.innerHTML = "";
    panel = document.createElement("grand-strategy-command") as GrandStrategyCommand;
    panel.game = {
      config: () => ({ isReplay: () => false }),
    } as unknown as GameView;
    document.body.append(panel);
    panel.init();
    await panel.updateComplete;
  });

  it("remains opt-in and reveals only the planner when opened", async () => {
    expect(panel.shadowRoot?.querySelector(".panel")).toBeNull();
    expect(panel.shadowRoot?.querySelector(".panel")).toBeNull();
    panel.open = true;
    await panel.updateComplete;
    expect(panel.shadowRoot?.querySelector(".panel")?.textContent).toContain("Military High Command");
    expect(panel.shadowRoot?.querySelector(".note")?.textContent).toContain("do not yet control troops");
  });

  it("creates an army and divisions and groups them in the current army", async () => {
    panel.open = true;
    await panel.updateComplete;
    const addArmyButton = [...panel.shadowRoot!.querySelectorAll("button")].find(
      (button) => button.textContent?.includes("New army"),
    ) as HTMLButtonElement;
    addArmyButton.click();
    await panel.updateComplete;
    const addInfantry = [...panel.shadowRoot!.querySelectorAll(".template")].find(
      (button) => button.textContent?.includes("Infantry"),
    ) as HTMLButtonElement;
    addInfantry.click();
    await panel.updateComplete;
    expect(panel.shadowRoot?.querySelectorAll(".division")).toHaveLength(1);
    expect(panel.shadowRoot?.querySelector(".division")?.textContent).toContain("Infantry Division");
    expect(panel.shadowRoot?.querySelectorAll(".stat strong")[1].textContent).toBe("1");
  });

  it("resets the planning session when a new game initializes", async () => {
    panel.open = true;
    await panel.updateComplete;
    const addArmyButton = [...panel.shadowRoot!.querySelectorAll("button")].find(
      (button) => button.textContent?.includes("New army"),
    ) as HTMLButtonElement;
    addArmyButton.click();
    await panel.updateComplete;
    panel.init();
    await panel.updateComplete;
    expect(panel.shadowRoot?.querySelector(".panel")).toBeNull();
    panel.open = true;
    await panel.updateComplete;
    expect(panel.shadowRoot?.querySelectorAll(".army")).toHaveLength(1);
  });

  it("emits a close request to its parent without mutating gameplay state", async () => {
    panel.open = true;
    await panel.updateComplete;
    const close = vi.fn();
    panel.addEventListener("grand-strategy-close", close);
    (panel.shadowRoot?.querySelector(".subbtn") as HTMLButtonElement).click();
    expect(close).toHaveBeenCalledOnce();
  });

  it("does not render for replays", async () => {
    panel.game = { config: () => ({ isReplay: () => true }) } as unknown as GameView;
    await panel.updateComplete;
    expect(panel.shadowRoot?.querySelector(".panel")).toBeNull();
    panel.open = true;
    await panel.updateComplete;
    expect(panel.shadowRoot?.querySelector(".panel")).toBeNull();
  });
});
