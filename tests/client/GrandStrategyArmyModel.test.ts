import { describe, expect, it } from "vitest";
import {
  addArmy,
  addDivision,
  assignDivision,
  divisionsInArmy,
  emptyArmyRoster,
  MAX_PLANNED_ARMIES,
  MAX_PLANNED_DIVISIONS,
  plannedPersonnel,
  removeArmy,
  removeDivision,
  renameArmy,
} from "../../src/client/grandStrategy/ArmyModel";

describe("Grand Strategy planning roster", () => {
  it("starts empty and creates distinct armies and divisions", () => {
    let roster = addArmy(emptyArmyRoster());
    roster = addArmy(roster, "Northern Command");
    const id = roster.armies[0].id;
    roster = addDivision(roster, "infantry", id);
    roster = addDivision(roster, "armor", id);
    expect(roster.armies.map((a) => a.name)).toEqual(["Army 1", "Northern Command"]);
    expect(roster.divisions.map((d) => d.id)).toEqual(["division-3", "division-4"]);
    expect(divisionsInArmy(roster, id)).toHaveLength(2);
    expect(plannedPersonnel(roster)).toBe(15000);
  });

  it("moves divisions between army and reserve without changing other divisions", () => {
    let roster = addArmy(addArmy(emptyArmyRoster()));
    roster = addDivision(roster, "recon", roster.armies[0].id);
    const id = roster.divisions[0].id;
    const before = roster;
    roster = assignDivision(roster, id, roster.armies[1].id);
    expect(before.divisions[0].armyId).toBe(before.armies[0].id);
    expect(divisionsInArmy(roster, roster.armies[1].id)).toHaveLength(1);
    roster = assignDivision(roster, id, null);
    expect(divisionsInArmy(roster, null)).toHaveLength(1);
  });

  it("does not allow assigning a division to a missing army", () => {
    const original = addDivision(emptyArmyRoster(), "artillery");
    expect(assignDivision(original, original.divisions[0].id, "missing")).toBe(original);
    expect(addDivision(original, "infantry", "missing")).toBe(original);
  });

  it("moves divisions into reserve when their army is removed", () => {
    let roster = addArmy(emptyArmyRoster());
    roster = addDivision(roster, "infantry", roster.armies[0].id);
    roster = removeArmy(roster, roster.armies[0].id);
    expect(roster.armies).toHaveLength(0);
    expect(divisionsInArmy(roster, null)).toHaveLength(1);
    roster = removeDivision(roster, roster.divisions[0].id);
    expect(roster.divisions).toHaveLength(0);
  });

  it("trims army names and protects against blank names", () => {
    let roster = addArmy(emptyArmyRoster());
    const id = roster.armies[0].id;
    roster = renameArmy(roster, id, "  Western Front  ");
    expect(roster.armies[0].name).toBe("Western Front");
    expect(renameArmy(roster, id, "   ")).toBe(roster);
  });

  it("enforces roster limits and keeps ids unique", () => {
    let roster = emptyArmyRoster();
    for (let i = 0; i < MAX_PLANNED_ARMIES + 2; i++) roster = addArmy(roster);
    for (let i = 0; i < MAX_PLANNED_DIVISIONS + 2; i++) roster = addDivision(roster, "infantry");
    expect(roster.armies).toHaveLength(MAX_PLANNED_ARMIES);
    expect(roster.divisions).toHaveLength(MAX_PLANNED_DIVISIONS);
    expect(new Set(roster.divisions.map((d) => d.id)).size).toBe(MAX_PLANNED_DIVISIONS);
  });
});
