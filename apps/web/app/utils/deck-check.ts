import type { CardId } from "@riftkeeper/cards";
import type { Deck, DeckEntry } from "@riftkeeper/cards/deck";
import type { PricedCard } from "@riftkeeper/cards/prices";
import type { Format } from "@riftkeeper/cards/rules";
import type { DeckLine, DeckReportContent, DeckSection } from "@riftkeeper/ui";
import { cardHref } from "./card-detail";
import type { DeckCheck, DeckInput } from "./deck-url";

export type DeckOutcome =
  | { readonly kind: "deck"; readonly check: DeckCheck }
  | { readonly kind: "invalid"; readonly message: string }
  | { readonly kind: "error"; readonly message: string };

const FORMAT_LABELS: Record<Format, string> = { standard: "Standard", "2v2": "2v2 Constructed" };
const DAY = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" });
const UNREACHABLE_MESSAGE = "The card API could not be reached. Try again in a moment.";

export const formatDay = (date: string) => DAY.format(Date.parse(date));

export async function checkDeck(apiBase: string, input: DeckInput): Promise<DeckOutcome> {
  try {
    const { data } = await $fetch<{ data: DeckCheck }>("/decks/check", { baseURL: apiBase, query: input });
    return { kind: "deck", check: data };
  } catch (error) {
    const response = error as { statusCode?: unknown; data?: { error?: { message?: unknown } } } | null;
    const message = response?.data?.error?.message;
    if (response?.statusCode === 400 && typeof message === "string") return { kind: "invalid", message };
    return { kind: "error", message: typeof message === "string" ? message : UNREACHABLE_MESSAGE };
  }
}

const displayName = (card: PricedCard) => (card.subtitle === null ? card.name : `${card.name}, ${card.subtitle}`);
const sum = (entries: readonly DeckEntry[]) => entries.reduce((total, entry) => total + entry.count, 0);

function lines(entries: readonly DeckEntry<PricedCard>[], problem: Set<CardId>, upcoming: Set<CardId>): DeckLine[] {
  return entries.map(({ card, printing, count }) => ({
    count,
    name: displayName(card),
    code: printing.publicCode.split("/")[0] ?? printing.publicCode,
    href: cardHref(card.id),
    status: problem.has(card.id) ? "problem" : upcoming.has(card.id) ? "upcoming" : "ok",
  }));
}

function sections(check: DeckCheck): DeckSection[] {
  const { deck, formats } = check;
  const problem = new Set(formats.flatMap(({ problems }) => problems.flatMap(({ cards }) => cards)));
  const upcoming = new Set(formats.flatMap(({ upcomingBans }) => upcomingBans.map(({ card }) => card)));
  const main = [...(deck.champion === null ? [] : [deck.champion]), ...deck.main];
  const all: [string, readonly DeckEntry<PricedCard>[], string][] = [
    ["Legend", deck.legends, `${sum(deck.legends)}`],
    ["Chosen champion", deck.champion === null ? [] : [deck.champion], deck.champion === null ? "0/1" : "1/1"],
    ["Additional legends", deck.additionalLegends, `${sum(deck.additionalLegends)}`],
    ["Main deck", deck.main, `${sum(main)}/40`],
    ["Battlefields", deck.battlefields, `${sum(deck.battlefields)}/3`],
    ["Runes", deck.runes, `${sum(deck.runes)}/12`],
    ["Sideboard", deck.sideboard, `${sum(deck.sideboard)}/10`],
  ];
  return all
    .filter(([title, entries]) => entries.length > 0 || title === "Legend" || title === "Main deck")
    .map(([title, entries, count]) => ({ title, count, lines: lines(entries, problem, upcoming) }));
}

function title(deck: Deck<PricedCard>): string {
  const legend = deck.legends[0]?.card;
  if (legend === undefined) return "Deck without a legend";
  return legend.tags.length > 0 ? `${legend.tags[0]}, ${legend.name}` : legend.name;
}

function partnerLegend(deck: Deck<PricedCard>): string {
  const legend = deck.legends[0]?.card;
  return legend === undefined ? "" : `, led by ${legend.tags[0] ? `${legend.tags[0]}, ` : ""}${legend.name}`;
}

const sourceLabel = (url: string) => (url.includes("errata") ? "Riot errata" : "Riot announcement");

export function deckReport(check: DeckCheck): DeckReportContent {
  const money = check.price && new Intl.NumberFormat("en-US", { style: "currency", currency: check.price.currency });
  return {
    title: title(check.deck),
    checkedOn: formatDay(check.checkedOn),
    verdicts: check.formats.map((verdict) => ({
      format: FORMAT_LABELS[verdict.format],
      legal: verdict.legal,
      label: verdict.legal ? "Legal today" : `Not legal (${verdict.problems.length})`,
      ...(verdict.format === "2v2"
        ? {
            note:
              check.partner === null
                ? "Add your partner's deck to check the team rules."
                : `Checked with your partner's deck${partnerLegend(check.partner.deck)}.`,
          }
        : {}),
      problems: verdict.problems.map(({ message }) => message),
      upcoming: verdict.upcomingBans.map((ban) => ({
        text: `${ban.name} is banned from ${formatDay(ban.effective)}.`,
        source: { label: sourceLabel(ban.source), href: ban.source },
      })),
    })),
    sections: sections(check),
    errata: check.errata.map((entry) => ({
      name: entry.name,
      href: cardHref(entry.card),
      current: entry.current,
      previous: entry.previous,
      source: { label: sourceLabel(entry.source), href: entry.source },
    })),
    price:
      check.price && money
        ? {
            total: money.format(check.price.total),
            note:
              check.price.unpriced === 0
                ? "TCGplayer market price"
                : `TCGplayer market price, without ${check.price.unpriced} unpriced ${check.price.unpriced === 1 ? "card" : "cards"}`,
          }
        : null,
    code: check.code,
  };
}
