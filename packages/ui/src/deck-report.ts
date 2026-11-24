import type { CardLink, PriceDay } from "./card-detail.ts";
import type { CardOrientation } from "./card-summary.ts";

export const DECK_VIEWS = ["list", "images", "stacks"] as const;
export type DeckView = (typeof DECK_VIEWS)[number];

export function isDeckView(value: unknown): value is DeckView {
  return typeof value === "string" && (DECK_VIEWS as readonly string[]).includes(value);
}

export type DeckLineStatus = "ok" | "problem" | "upcoming";

export interface DeckLine {
  readonly count: number;
  readonly name: string;
  readonly code: string;
  readonly href: string | null;
  readonly status: DeckLineStatus;
  readonly imageUrl: string;
  readonly srcset: string;
  readonly orientation: CardOrientation;
  readonly price: string | null;
  readonly cheaper: string | null;
}

export interface DeckSection {
  readonly title: string;
  readonly count: string;
  readonly lines: readonly DeckLine[];
}

export interface DeckUpcomingBan {
  readonly text: string;
  readonly source: CardLink;
}

export interface DeckVerdict {
  readonly format: string;
  readonly legal: boolean;
  readonly label: string;
  readonly note?: string;
  readonly problems: readonly string[];
  readonly upcoming: readonly DeckUpcomingBan[];
}

export interface DeckErrataNote {
  readonly name: string;
  readonly href: string;
  readonly current: string;
  readonly previous: string;
  readonly source: CardLink;
}

export interface DeckPriceSummary {
  readonly total: string;
  readonly note: string;
  readonly cheapest: string | null;
  readonly trend: { readonly change: string; readonly description: string; readonly days: readonly PriceDay[] } | null;
}

export interface DeckChangeLine {
  readonly name: string;
  readonly href: string;
  readonly change: string;
  readonly direction: "added" | "removed";
  readonly detail: string;
}

export interface DeckComparison {
  readonly title: string;
  readonly href: string;
  readonly sections: readonly { readonly title: string; readonly lines: readonly DeckChangeLine[] }[];
}

export interface DeckOddsRow {
  readonly name: string;
  readonly copies: number;
  readonly opening: string;
  readonly byTurn: string;
}

export interface DeckOdds {
  readonly deckSize: number;
  readonly openingSize: number;
  readonly byTurnCards: number;
  readonly turn: number;
  readonly cheapPlay: string;
  readonly rows: readonly DeckOddsRow[];
}

export interface DeckHandCard {
  readonly name: string;
  readonly imageUrl: string;
  readonly srcset: string;
}

export interface DeckReportContent {
  readonly title: string;
  readonly checkedOn: string;
  readonly verdicts: readonly DeckVerdict[];
  readonly sections: readonly DeckSection[];
  readonly errata: readonly DeckErrataNote[];
  readonly price: DeckPriceSummary | null;
  readonly code: string | null;
  readonly list: string;
  readonly odds: DeckOdds | null;
  readonly comparison: DeckComparison | null;
}
