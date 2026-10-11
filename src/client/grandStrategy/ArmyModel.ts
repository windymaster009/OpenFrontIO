/**
 * Experimental Grand Strategy army roster.
 *
 * This is an organizational/planning model, NOT part of the authoritative
 * deterministic battle simulation. No troop or gold balances change here.
 * Server-backed movement, combat and snapshots belong to a later phase.
 */
export const DIVISION_TEMPLATES = [
  { kind: "infantry", label: "Infantry", role: "Hold territory", personnel: 9000 },
  { kind: "armor", label: "Armored", role: "Breakthrough", personnel: 6000 },
  { kind: "artillery", label: "Artillery", role: "Fire support", personnel: 7000 },
  { kind: "recon", label: "Recon", role: "Scouting", personnel: 4000 },
] as const;

export type DivisionKind = (typeof DIVISION_TEMPLATES)[number]["kind"];

export interface PlannedDivision {
  id: string;
  name: string;
  kind: DivisionKind;
  armyId: string | null;
}

export interface PlannedArmy {
  id: string;
  name: string;
}

export interface ArmyRoster {
  armies: PlannedArmy[];
  divisions: PlannedDivision[];
  nextId: number;
}

export const MAX_PLANNED_ARMIES = 12;
export const MAX_PLANNED_DIVISIONS = 120;

export function emptyArmyRoster(): ArmyRoster {
  return { armies: [], divisions: [], nextId: 1 };
}

export function addArmy(roster: ArmyRoster, name?: string): ArmyRoster {
  if (roster.armies.length >= MAX_PLANNED_ARMIES) return roster;
  const id = "army-" + roster.nextId;
  return {
    ...roster,
    nextId: roster.nextId + 1,
    armies: [...roster.armies, { id, name: cleanName(name) || "Army " + (roster.armies.length + 1) }],
  };
}

export function renameArmy(roster: ArmyRoster, id: string, name: string): ArmyRoster {
  const cleaned = cleanName(name);
  if (!cleaned || !roster.armies.some((a) => a.id === id)) return roster;
  return {
    ...roster,
    armies: roster.armies.map((a) => a.id === id ? { ...a, name: cleaned } : a),
  };
}

export function removeArmy(roster: ArmyRoster, armyId: string): ArmyRoster {
  if (!roster.armies.some((a) => a.id === armyId)) return roster;
  return {
    ...roster,
    armies: roster.armies.filter((a) => a.id !== armyId),
    divisions: roster.divisions.map((d) =>
      d.armyId === armyId ? { ...d, armyId: null } : d,
    ),
  };
}

export function addDivision(
  roster: ArmyRoster,
  kind: DivisionKind,
  armyId: string | null = null,
): ArmyRoster {
  if (roster.divisions.length >= MAX_PLANNED_DIVISIONS) return roster;
  const template = DIVISION_TEMPLATES.find((t) => t.kind === kind);
  if (!template) return roster;
  if (armyId !== null && !roster.armies.some((a) => a.id === armyId)) return roster;
  const id = "division-" + roster.nextId;
  const number = roster.divisions.filter((d) => d.kind === kind).length + 1;
  return {
    ...roster,
    nextId: roster.nextId + 1,
    divisions: [
      ...roster.divisions,
      { id, name: number + " " + template.label + " Division", kind, armyId },
    ],
  };
}

export function assignDivision(
  roster: ArmyRoster,
  divisionId: string,
  armyId: string | null,
): ArmyRoster {
  if (armyId !== null && !roster.armies.some((a) => a.id === armyId)) return roster;
  if (!roster.divisions.some((d) => d.id === divisionId)) return roster;
  return {
    ...roster,
    divisions: roster.divisions.map((d) =>
      d.id === divisionId ? { ...d, armyId } : d,
    ),
  };
}

export function removeDivision(roster: ArmyRoster, divisionId: string): ArmyRoster {
  if (!roster.divisions.some((d) => d.id === divisionId)) return roster;
  return { ...roster, divisions: roster.divisions.filter((d) => d.id !== divisionId) };
}

export function divisionsInArmy(
  roster: ArmyRoster,
  armyId: string | null,
): PlannedDivision[] {
  return roster.divisions.filter((d) => d.armyId === armyId);
}

export function plannedPersonnel(roster: ArmyRoster): number {
  return roster.divisions.reduce(
    (sum, division) =>
      sum + (DIVISION_TEMPLATES.find((t) => t.kind === division.kind)?.personnel ?? 0),
    0,
  );
}

function cleanName(value?: string): string {
  return (value ?? "").trim().slice(0, 48);
}
