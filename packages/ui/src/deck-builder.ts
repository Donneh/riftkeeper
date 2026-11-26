import type { CardOrientation } from "./card-summary.ts";
import type { Domain } from "./domain.ts";

export interface BuilderCard {
  readonly id: string;
  readonly name: string;
  readonly imageUrl: string;
  readonly srcset: string;
  readonly orientation: CardOrientation;
  readonly domains: readonly Domain[];
  readonly detail: string;
}

export interface BuilderResult extends BuilderCard {
  readonly count: number;
  readonly canAdd: boolean;
}

export interface PickerCard extends BuilderCard {
  readonly selected: boolean;
}

export interface PileCard extends BuilderCard {
  readonly count: number;
  readonly opening: string | null;
  readonly champion: boolean;
  readonly canAdd: boolean;
}

export interface PileGroup {
  readonly label: string;
  readonly count: number;
  readonly cards: readonly PileCard[];
}

export const BUILDER_SCOPES = ["cards", "battlefields"] as const;
export type BuilderScope = (typeof BUILDER_SCOPES)[number];

export const PILE_GROUPINGS = ["cost", "type"] as const;
export type PileGrouping = (typeof PILE_GROUPINGS)[number];

export interface BuilderRunes {
  readonly domain: Domain;
  readonly count: number;
}

export interface BuilderBar {
  readonly label: string;
  readonly count: number;
  readonly domain?: Domain;
}

export interface BuilderStatsContent {
  readonly count: string;
  readonly averageCost: string;
  readonly price: string;
  readonly signatures: string;
  readonly curve: readonly number[];
  readonly types: readonly BuilderBar[];
  readonly domains: readonly BuilderBar[];
  readonly total: number;
  readonly drawSummary: string;
  readonly cheapOpening: string;
  readonly cheapByTurn: string;
  readonly canDraw: boolean;
}

export type BuilderLegality =
  | { readonly kind: "checking" }
  | { readonly kind: "checked"; readonly problems: readonly string[] }
  | { readonly kind: "error"; readonly message: string };

export interface SavedDeckSummary {
  readonly id: string;
  readonly name: string;
  readonly legend: string | null;
  readonly updated: string;
  readonly href: string;
}

export const domainGlyph = (domain: Domain) => (domain === "colorless" ? "colorless" : (`rune_${domain}` as const));
