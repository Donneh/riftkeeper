import type { CardId } from "@riftkeeper/cards";
import type { Deck, DeckEntry } from "@riftkeeper/cards/deck";
import type { PricedCard } from "@riftkeeper/cards/prices";
import type { Format } from "@riftkeeper/cards/rules";
import type { DeckComparison, DeckHandCard, DeckLine, DeckOdds, DeckReportContent, DeckSection } from "@riftkeeper/ui";
import { cardHref, describeChange } from "./card-detail";
import { responsiveImage } from "./card-images";
import { deckOdds, ODDS_TURN, OPENING_HAND } from "./deck-odds";
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

type Money = (amount: number) => string;

const moneyFormat = (currency: string): Money => {
  const format = new Intl.NumberFormat("en-US", { style: "currency", currency });
  return (amount) => format.format(amount);
};

function lines(
  check: DeckCheck,
  entries: readonly DeckEntry<PricedCard>[],
  problem: Set<CardId>,
  upcoming: Set<CardId>,
): DeckLine[] {
  const money = check.price === null ? null : moneyFormat(check.price.currency);
  return entries.map(({ card, printing, count }) => {
    const price = check.price?.printings[printing.id];
    return {
      count,
      name: displayName(card),
      code: printing.publicCode.split("/")[0] ?? printing.publicCode,
      href: cardHref(card.id),
      status: problem.has(card.id) ? "problem" : upcoming.has(card.id) ? "upcoming" : "ok",
      imageUrl: printing.imageUrl,
      srcset: responsiveImage(printing.imageUrl, printing.orientation).srcset,
      orientation: printing.orientation,
      price: money && price?.each != null ? money(price.each * count) : null,
      cheaper: money && price?.cheapest ? `${price.cheapest.code} is ${money(price.cheapest.each)} each` : null,
    };
  });
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
    .map(([title, entries, count]) => ({ title, count, lines: lines(check, entries, problem, upcoming) }));
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

const SHORT_DAY = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const PERCENT = new Intl.NumberFormat("en-US", { style: "percent", maximumFractionDigits: 0 });
const DAY_MS = 86_400_000;

function priceSummary(check: DeckCheck): DeckReportContent["price"] {
  const { price, priceTrend } = check;
  if (price === null) return null;
  const money = moneyFormat(price.currency);
  const trend =
    priceTrend === null || priceTrend.days.length < 2
      ? null
      : {
          ...describeChange(
            priceTrend.change,
            `${Math.round((Date.parse(priceTrend.days.at(-1)?.date ?? "") - Date.parse(priceTrend.days[0]?.date ?? "")) / DAY_MS)} days`,
          ),
          days: priceTrend.days.map(({ date, total }) => ({
            date: DAY.format(Date.parse(date)),
            amount: total,
            price: money(total),
          })),
        };
  return {
    total: money(price.total),
    note:
      price.unpriced === 0
        ? "TCGplayer market price"
        : `TCGplayer market price, without ${price.unpriced} unpriced ${price.unpriced === 1 ? "card" : "cards"}`,
    cheapest: price.cheapest < price.total ? `${money(price.cheapest)} with the cheapest printing of each card` : null,
    trend,
  };
}

function odds(deck: Deck<PricedCard>): DeckOdds | null {
  const result = deckOdds(
    deck.main.map(({ card, printing, count }) => ({
      key: printing.id,
      name: displayName(card),
      count,
      energyCost: card.energyCost,
    })),
  );
  if (result === null) return null;
  return {
    deckSize: result.deckSize,
    openingSize: OPENING_HAND,
    byTurnCards: result.byTurnCards,
    turn: ODDS_TURN,
    cheapPlay: `An opening hand has a card costing 2 energy or less ${PERCENT.format(result.cheapPlay)} of the time.`,
    rows: result.cards.map(({ name, copies, opening, byTurn }) => ({
      name,
      copies,
      opening: PERCENT.format(opening),
      byTurn: PERCENT.format(byTurn),
    })),
  };
}

export function handCards(entries: readonly DeckEntry<PricedCard>[]): DeckHandCard[] {
  return entries.map(({ card, printing }) => ({
    name: displayName(card),
    imageUrl: printing.imageUrl,
    srcset: responsiveImage(printing.imageUrl, printing.orientation).srcset,
  }));
}

function comparison(check: DeckCheck): DeckComparison | null {
  const { comparison } = check;
  if (comparison === null) return null;
  return {
    title: title(comparison.deck),
    href: comparison.code === null ? "/deck" : `/deck?d=${encodeURIComponent(comparison.code)}`,
    sections: comparison.changes.map(({ section, changes }) => ({
      title: section,
      lines: changes.map(({ card, name, before, after }) => ({
        name,
        href: cardHref(card),
        change: after > before ? `+${after - before}` : `−${before - after}`,
        direction: after > before ? "added" : "removed",
        detail: `${before} → ${after}`,
      })),
    })),
  };
}

export function deckReport(check: DeckCheck): DeckReportContent {
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
    price: priceSummary(check),
    code: check.code,
    list: check.list,
    odds: odds(check.deck),
    comparison: comparison(check),
  };
}
