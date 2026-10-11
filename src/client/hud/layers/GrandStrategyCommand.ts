import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import type { Controller } from "../../Controller";
import type { GameView } from "../../view";
import {
  addArmy,
  addDivision,
  assignDivision,
  DIVISION_TEMPLATES,
  divisionsInArmy,
  emptyArmyRoster,
  MAX_PLANNED_ARMIES,
  MAX_PLANNED_DIVISIONS,
  plannedPersonnel,
  removeArmy,
  removeDivision,
  renameArmy,
  type ArmyRoster,
  type DivisionKind,
} from "../../grandStrategy/ArmyModel";

/**
 * Opt-in tactical planning overlay.
 *
 * All orders and formations are currently LOCAL planning metadata. The
 * deterministic worker/server has no division combat logic yet. In particular,
 * creating a division does not spend troops, gold, or affect multiplayer.
 */
@customElement("grand-strategy-command")
export class GrandStrategyCommand extends LitElement implements Controller {
  @property({ attribute: false }) public game: GameView | null = null;
  @state() private expanded = false;
  @state() private roster: ArmyRoster = emptyArmyRoster();
  @state() private selectedArmyId: string | null = null;

  init(): void {
    // New match = new planning session. Never carry armies into another match.
    this.expanded = false;
    this.selectedArmyId = null;
    this.roster = emptyArmyRoster();
    this.style.display = "none";
  }

  /** Invoked by the existing, always-visible in-game leaderboard toolbar. */
  public togglePanel(): void {
    if (this.game === null || this.game.config().isReplay()) return;
    this.expanded = !this.expanded;
    // Keep the host visible even when a generated utility class hides it.
    this.style.display = this.expanded ? "block" : "none";
  }

  private closePanel(): void {
    this.expanded = false;
    this.style.display = "none";
  }

  private createArmy(): void {
    const next = addArmy(this.roster);
    if (next === this.roster) return;
    this.roster = next;
    this.selectedArmyId = next.armies[next.armies.length - 1].id;
  }

  private createDivision(kind: DivisionKind): void {
    this.roster = addDivision(this.roster, kind, this.selectedArmyId);
  }

  private moveDivision(id: string, value: string): void {
    this.roster = assignDivision(this.roster, id, value || null);
  }

  private disbandSelectedArmy(): void {
    if (this.selectedArmyId === null) return;
    this.roster = removeArmy(this.roster, this.selectedArmyId);
    this.selectedArmyId = null;
  }

  static styles = css`
    :host {
      position: fixed;
      /* The player leaderboard occupies the upper-left corner (z-900).
         Place the command launcher beside it, above both map and sidebar. */
      z-index: 1100;
      left: max(320px, env(safe-area-inset-left));
      top: calc(12px + env(safe-area-inset-top));
      pointer-events: none;
      font: 13px/1.4 Inter, system-ui, sans-serif;
      color: #eee9d7;
    }
    button, input, select { font: inherit; }
    button { cursor: pointer; }
    button:disabled { opacity: .35; cursor: not-allowed; }
    button:focus-visible, input:focus-visible, select:focus-visible {
      outline: 2px solid #e1c47d;
      outline-offset: 2px;
    }
    .panel {
      pointer-events: auto;
      margin-top: 8px;
      width: min(440px, calc(100vw - 24px));
      max-height: min(73vh, 710px);
      overflow: auto;
      overscroll-behavior: contain;
      background: #101713f5;
      border: 1px solid #726645;
      box-shadow: 0 24px 60px #000c;
      border-radius: 10px;
      padding: 16px;
    }
    header { display: flex; justify-content: space-between; align-items: start; gap: 8px; }
    .eyebrow { color: #c8aa65; text-transform: uppercase; letter-spacing: .2em; font-size: 10px; font-weight: 800; }
    h2 { font-size: 21px; line-height: 1.3; margin: 5px 0 8px; }
    .note { color: #b6baa9; font-size: 11px; margin: 6px 0 12px; }
    .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 7px; margin: 12px 0 18px; }
    .stat { background: #222e25; border: 1px solid #465443; padding: 9px; border-radius: 6px; }
    .stat strong { font-size: 19px; display: block; color: #f2e6bd; }
    .stat span { font-size: 10px; color: #b7c0b5; }
    .row { display: flex; flex-wrap: wrap; align-items: center; gap: 7px; }
    .heading { display: flex; justify-content: space-between; align-items: center; gap: 7px; margin: 14px 0 9px; }
    .heading strong { letter-spacing: .08em; text-transform: uppercase; font-size: 11px; color: #d6c38e; }
    .subbtn, .army, .remove {
      color: #ece7d7;
      background: #27332b;
      border: 1px solid #5b6a59;
      padding: 7px 9px;
      border-radius: 5px;
    }
    .army.selected { background: #75613b; border-color: #d8b76b; color: #fff3ca; }
    .army { flex: 1 1 auto; }
    .remove { color: #f0abab; border-color: #905b52; }
    .editor { margin: 10px 0; display: flex; gap: 8px; }
    input, select { min-width: 0; background: #1b251e; border: 1px solid #51614f; color: #f5eedb; border-radius: 5px; padding: 7px; }
    input { flex: 1; }
    .templates { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 7px; }
    .template { text-align: left; border: 1px solid #506451; background: #1f2b22; color: #f0e4c3; border-radius: 6px; padding: 9px; }
    .template b { display: block; }
    .template span { display: block; color: #b0b9a9; font-size: 10px; margin-top: 4px; }
    .division { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 8px; align-items: center; border-top: 1px solid #39473b; padding: 9px 0; }
    .division small { display: block; color: #9da99b; }
    .division .controls { display: flex; align-items: center; gap: 6px; }
    .division select { max-width: 120px; font-size: 11px; }
    .empty { padding: 16px; border: 1px dashed #5d6556; color: #b5bcae; border-radius: 6px; }
    @media (max-width: 850px) {
      /* On compact screens the map sidebar may fill the top edge.
         Dock the launcher above the bottom HUD instead. */
      :host {
        left: max(12px, env(safe-area-inset-left));
        top: auto;
        bottom: calc(175px + env(safe-area-inset-bottom));
      }
      .panel { max-height: min(57vh, 520px); }
    }
  `;

  render() {
    // Gameplay-only experimental planning UI; never shown on replays.
    if (this.game === null || this.game.config().isReplay() || !this.expanded) return nothing;
    const visible = divisionsInArmy(this.roster, this.selectedArmyId);
    const selected = this.roster.armies.find((a) => a.id === this.selectedArmyId);
    return html`
        <section class="panel" id="grand-strategy-panel" aria-label="Military command planner">
          <header>
            <div>
              <div class="eyebrow">Experimental • Phase 1</div>
              <h2>Military High Command</h2>
            </div>
            <button class="subbtn" type="button" @click=${() => this.closePanel()}>Close</button>
          </header>
          <p class="note">Planning only: formations are local to this match.
            They do not yet control troops, consume resources, or send orders.</p>
          <div class="stats">
            <div class="stat"><strong>${this.roster.armies.length}</strong><span>Armies</span></div>
            <div class="stat"><strong>${this.roster.divisions.length}</strong><span>Divisions</span></div>
            <div class="stat"><strong>${plannedPersonnel(this.roster).toLocaleString()}</strong><span>Planned personnel</span></div>
          </div>
          <div class="heading">
            <strong>Army groups</strong>
            <button class="subbtn" type="button" ?disabled=${this.roster.armies.length >= MAX_PLANNED_ARMIES}
              @click=${() => this.createArmy()}>+ New army</button>
          </div>
          <div class="row">
            <button type="button" class="army ${this.selectedArmyId === null ? "selected" : ""}"
              @click=${() => (this.selectedArmyId = null)}>Unassigned</button>
            ${this.roster.armies.map((army) => html`
              <button type="button"
                class="army ${army.id === this.selectedArmyId ? "selected" : ""}"
                @click=${() => (this.selectedArmyId = army.id)}>${army.name}</button>
            `)}
          </div>
          ${selected ? html`
            <div class="editor">
              <input aria-label="Rename selected army" .value=${selected.name} maxlength="48"
                @change=${(e: Event) => (this.roster = renameArmy(
                  this.roster, selected.id, (e.currentTarget as HTMLInputElement).value
                ))} />
              <button type="button" class="remove" title="Move divisions to unassigned reserve"
                @click=${() => this.disbandSelectedArmy()}>Disband</button>
            </div>
          ` : nothing}
          <div class="heading"><strong>Recruit a planned division</strong></div>
          <div class="templates">
            ${DIVISION_TEMPLATES.map((template) => html`
              <button class="template" type="button"
                ?disabled=${this.roster.divisions.length >= MAX_PLANNED_DIVISIONS}
                @click=${() => this.createDivision(template.kind)}>
                <b>+ ${template.label}</b>
                <span>${template.role} · ${template.personnel.toLocaleString()} planned personnel</span>
              </button>
            `)}
          </div>
          <div class="heading"><strong>${selected?.name ?? "Unassigned reserve"} · ${visible.length} divisions</strong></div>
          ${visible.length ? visible.map((division) => html`
            <div class="division">
              <div><b>${division.name}</b><small>${division.kind.toUpperCase()} · planning only</small></div>
              <div class="controls">
                <select aria-label="Assign ${division.name} to army" .value=${division.armyId ?? ""}
                  @change=${(e: Event) => this.moveDivision(
                    division.id, (e.currentTarget as HTMLSelectElement).value
                  )}>
                  <option value="">Reserve</option>
                  ${this.roster.armies.map((army) => html`<option value=${army.id}>${army.name}</option>`)}
                </select>
                <button class="remove" type="button" aria-label="Remove ${division.name}"
                  @click=${() => (this.roster = removeDivision(this.roster, division.id))}>×</button>
              </div>
            </div>
          `) : html`<p class="empty">No divisions here yet. Add a template or assign one from another army.</p>`}
        </section>
    `;
  }
}
