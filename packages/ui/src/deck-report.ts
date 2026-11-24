import type { CardLink } from "./card-detail.ts";

export type DeckLineStatus = "ok" | "problem" | "upcoming";

export interface DeckLine {
  readonly count: number;
  readonly name: string;
  readonly code: string;
  readonly href: string | null;
  readonly status: DeckLineStatus;
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
}

export interface DeckReportContent {
  readonly title: string;
  readonly checkedOn: string;
  readonly verdicts: readonly DeckVerdict[];
  readonly sections: readonly DeckSection[];
  readonly errata: readonly DeckErrataNote[];
  readonly price: DeckPriceSummary | null;
  readonly code: string | null;
}
