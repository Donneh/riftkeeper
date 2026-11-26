import { type Deck as CodeDeck, getCodeFromDeck, getDeckFromCode } from "@piltoverarchive/riftbound-deck-codes";
import type { Card, CardId, Domain, Printing } from "./card.ts";
import { marketPrice, type PricedCard, type PriceSnapshot } from "./price.ts";
import type { PriceHistory } from "./price-history.ts";
import { type Errata, type Format, isBanned, type RulesSnapshot } from "./rules.ts";
import {
  BATTLEFIELD_COUNT,
  FORMATS,
  MAIN_DECK_SIZE,
  MAX_COPIES,
  MAX_SIDEBOARD_SIZE,
  MAX_SIGNATURE_CARDS,
  RUNE_DECK_SIZE,
} from "./values.ts";

export { BATTLEFIELD_COUNT, MAIN_DECK_SIZE, MAX_COPIES, MAX_SIDEBOARD_SIZE, MAX_SIGNATURE_CARDS, RUNE_DECK_SIZE };

export interface DeckEntry<C extends Card = Card> {
  readonly card: C;
  readonly printing: C["printings"][number];
  readonly count: number;
}

export interface Deck<C extends Card = Card> {
  readonly legends: readonly DeckEntry<C>[];
  readonly additionalLegends: readonly DeckEntry<C>[];
  readonly champion: DeckEntry<C> | null;
  readonly main: readonly DeckEntry<C>[];
  readonly battlefields: readonly DeckEntry<C>[];
  readonly runes: readonly DeckEntry<C>[];
  readonly sideboard: readonly DeckEntry<C>[];
  readonly unknown: readonly string[];
}

export interface DeckProblem {
  readonly message: string;
  readonly cards: readonly CardId[];
}

export interface UpcomingBan {
  readonly card: CardId;
  readonly name: string;
  readonly effective: string;
  readonly source: string;
}

export interface FormatVerdict {
  readonly format: Format;
  readonly legal: boolean;
  readonly problems: readonly DeckProblem[];
  readonly upcomingBans: readonly UpcomingBan[];
}

export interface DeckErrata extends Errata {
  readonly name: string;
}

export interface PrintingPrice {
  readonly each: number | null;
  readonly cheapest: { readonly code: string; readonly each: number } | null;
}

export interface DeckPrice {
  readonly total: number;
  readonly cheapest: number;
  readonly currency: PriceSnapshot["currency"];
  readonly unpriced: number;
  readonly printings: Readonly<Record<string, PrintingPrice>>;
}

export interface DeckPriceTrend {
  readonly days: readonly { readonly date: string; readonly total: number }[];
  readonly change: number;
}

export interface DeckChange {
  readonly card: CardId;
  readonly name: string;
  readonly before: number;
  readonly after: number;
}

export interface SectionChanges {
  readonly section: string;
  readonly changes: readonly DeckChange[];
}

export class DeckCodeError extends Error {}

export function cardName(card: Card): string {
  return card.subtitle === null ? card.name : `${card.name}, ${card.subtitle}`;
}

export function printingCode(printing: Printing): string {
  return printing.publicCode.split("/")[0] as string;
}

type Section = "legends" | "additionalLegends" | "champion" | "main" | "battlefields" | "runes" | "sideboard";

class DeckBuilder<C extends Card> {
  private readonly sections = new Map<Section, DeckEntry<C>[]>();
  readonly unknown: string[] = [];

  add(section: Section | "deck", card: C, printing: C["printings"][number], count: number) {
    const target = section === "deck" ? sectionOf(card) : section;
    const entries = this.sections.get(target) ?? [];
    const index = entries.findIndex((entry) => entry.printing.id === printing.id);
    const existing = entries[index];
    if (existing) entries[index] = { ...existing, count: existing.count + count };
    else entries.push({ card, printing, count });
    this.sections.set(target, entries);
  }

  remove(section: Section, printing: C["printings"][number]) {
    const entries = this.sections.get(section) ?? [];
    const index = entries.findIndex((entry) => entry.printing.id === printing.id);
    const existing = entries[index];
    if (!existing) return;
    if (existing.count > 1) entries[index] = { ...existing, count: existing.count - 1 };
    else entries.splice(index, 1);
  }

  build(): Deck<C> {
    const of = (section: Section) => this.sections.get(section) ?? [];
    return {
      legends: of("legends"),
      additionalLegends: of("additionalLegends"),
      champion: of("champion")[0] ?? null,
      main: of("main"),
      battlefields: of("battlefields"),
      runes: of("runes"),
      sideboard: of("sideboard"),
      unknown: this.unknown,
    };
  }
}

function sectionOf(card: Card): Section {
  if (card.type === "legend") return "legends";
  if (card.type === "rune") return "runes";
  if (card.type === "battlefield") return "battlefields";
  return "main";
}

function printingsByCode<C extends Card>(cards: readonly C[]) {
  const byCode = new Map<string, { card: C; printing: C["printings"][number] }>();
  for (const card of cards)
    for (const printing of card.printings) {
      const code = printingCode(printing).toLowerCase();
      if (!byCode.has(code)) byCode.set(code, { card, printing });
    }
  return byCode;
}

export function readDeckCode<C extends Card>(code: string, cards: readonly C[]): Deck<C> {
  let decoded: ReturnType<typeof getDeckFromCode>;
  try {
    decoded = getDeckFromCode(code.trim(), { signedSuffix: "*" });
  } catch (error) {
    throw new DeckCodeError(`This is not a deck code that can be read: ${(error as Error).message}`);
  }
  const byCode = printingsByCode(cards);
  const deck = new DeckBuilder<C>();
  const add = (section: Section | "deck", cardCode: string, count: number) => {
    const found = byCode.get(cardCode.toLowerCase());
    if (found) deck.add(section, found.card, found.printing, count);
    else deck.unknown.push(cardCode);
    return found;
  };
  for (const { cardCode, count } of decoded.mainDeck) add("deck", cardCode, count);
  for (const { cardCode, count } of decoded.sideboard) add("sideboard", cardCode, count);
  for (const cardCode of decoded.additionalLegends ?? []) add("additionalLegends", cardCode, 1);
  if (decoded.chosenChampion !== undefined) {
    const champion = add("champion", decoded.chosenChampion, 1);
    if (champion) deck.remove("main", champion.printing);
  }
  return deck.build();
}

const HEADERS: readonly [RegExp, Section | "deck"][] = [
  [/^(?:champion )?legends?$/, "deck"],
  [/^additional legends?$/, "additionalLegends"],
  [/^(?:chosen )?champions?$/, "champion"],
  [/^(?:main ?deck|main|deck)$/, "deck"],
  [/^battlefields?$/, "deck"],
  [/^(?:runes?|rune deck|rune pool)$/, "deck"],
  [/^(?:sideboard|side ?deck|sb)$/, "sideboard"],
];

const normalize = (text: string) =>
  text
    .toLowerCase()
    .replace(/[’‘`]/g, "'")
    .replace(/[^a-z0-9',!.?&-]+/g, " ")
    .trim();

function namesOf(card: Card): string[] {
  const names = [card.name, cardName(card), card.subtitle === null ? card.name : `${card.name} ${card.subtitle}`];
  if (card.type === "legend") names.push(...card.tags.map((tag) => `${tag}, ${card.name}`));
  return names.map(normalize);
}

function defaultPrinting<C extends Card>(card: C): C["printings"][number] {
  return (
    card.printings.find((printing) => printing.variant === "standard") ?? (card.printings[0] as C["printings"][number])
  );
}

function header(line: string): Section | "deck" | undefined {
  const text = normalize(line.replace(/\(\d+\)|\d+\s*\/\s*\d+|:$/g, ""));
  return HEADERS.find(([pattern]) => pattern.test(text))?.[1];
}

function countedLine(line: string): { count: number; text: string } {
  const leading = /^(\d+)\s*[x×]?\s+(.+)$/i.exec(line);
  if (leading) return { count: Number(leading[1]), text: leading[2] as string };
  const trailing = /^(.+?)\s+[x×]\s*(\d+)$/i.exec(line);
  if (trailing) return { count: Number(trailing[2]), text: trailing[1] as string };
  return { count: 1, text: line };
}

export function readDeckList<C extends Card>(text: string, cards: readonly C[]): Deck<C> {
  const byCode = printingsByCode(cards);
  const byName = new Map<string, C>();
  for (const card of cards) for (const name of namesOf(card)) if (!byName.has(name)) byName.set(name, card);
  const deck = new DeckBuilder<C>();
  let section: Section | "deck" = "deck";
  for (const raw of text.split(/\r?\n/)) {
    let line = raw.trim();
    if (line === "" || line.startsWith("#") || line.startsWith("//")) continue;
    const next = header(line);
    if (next !== undefined) {
      section = next;
      continue;
    }
    let lineSection = section;
    const sideboard = /^(?:SB|Sideboard)\s*:\s*/i.exec(line);
    if (sideboard) {
      lineSection = "sideboard";
      line = line.slice(sideboard[0].length);
    }
    const { count, text: cardText } = countedLine(line);
    const withoutMark = cardText.replace(/\s*[([](?:chosen(?: champion)?|champion)[)\]]\s*$/i, "").trim();
    const printed = /^(.*?)\s*\(([A-Z]{3}-(?:R|SP)?\d+[a-z*]?)(?:\/\d+)?\)$/i.exec(withoutMark);
    const label = printed ? (printed[1] as string) || (printed[2] as string) : withoutMark;
    const code = printed?.[2] ?? /^([A-Z]{3}-(?:R|SP)?\d+[a-z*]?)(?:\/\d+)?$/i.exec(label)?.[1];
    const byCodeMatch = code === undefined ? undefined : byCode.get(code.toLowerCase());
    const card = byCodeMatch?.card ?? byName.get(normalize(label));
    if (card === undefined) {
      deck.unknown.push(label);
      continue;
    }
    const printing = byCodeMatch?.printing ?? defaultPrinting(card);
    if (lineSection === "champion") {
      deck.add("champion", card, printing, 1);
      if (count > 1) deck.add("main", card, printing, count - 1);
    } else deck.add(lineSection, card, printing, count);
  }
  return deck.build();
}

const codeEntries = (entries: readonly DeckEntry[]): CodeDeck => {
  const counts = new Map<string, number>();
  for (const { printing, count } of entries)
    counts.set(printingCode(printing), (counts.get(printingCode(printing)) ?? 0) + count);
  return [...counts].map(([cardCode, count]) => ({ cardCode, count }));
};

export function deckCode(deck: Deck): string | null {
  const champion = deck.champion === null ? [] : [deck.champion];
  const additional = deck.additionalLegends.map(({ printing }) => printingCode(printing));
  try {
    return getCodeFromDeck(
      codeEntries([...deck.legends, ...champion, ...deck.main, ...deck.battlefields, ...deck.runes]),
      codeEntries(deck.sideboard),
      deck.champion === null ? undefined : printingCode(deck.champion.printing),
      additional.length === 0 ? undefined : additional,
    );
  } catch {
    return null;
  }
}

export function deckEntries<C extends Card>(deck: Deck<C>): DeckEntry<C>[] {
  return [
    ...deck.legends,
    ...deck.additionalLegends,
    ...(deck.champion === null ? [] : [deck.champion]),
    ...deck.main,
    ...deck.battlefields,
    ...deck.runes,
    ...deck.sideboard,
  ];
}

const total = (entries: readonly DeckEntry[]) => entries.reduce((sum, entry) => sum + entry.count, 0);
const plural = (count: number, noun: string) => `${count} ${noun}${count === 1 ? "" : "s"}`;
const capitalize = (word: string) => word.charAt(0).toUpperCase() + word.slice(1);
const listed = (cards: readonly Card[]) => [...new Set(cards.map(cardName))].join(", ");
const problem = (message: string, cards: readonly Card[] = []): DeckProblem => ({
  message,
  cards: [...new Set(cards.map((card) => card.id))],
});

function sizeProblems(deck: Deck): DeckProblem[] {
  const problems: DeckProblem[] = [];
  const legends = total(deck.legends);
  if (legends === 0) problems.push(problem("The deck has no legend."));
  if (legends > 1)
    problems.push(
      problem(
        `The deck has ${legends} legends; it needs exactly 1.`,
        deck.legends.map(({ card }) => card),
      ),
    );
  const main = total(deck.main) + (deck.champion === null ? 0 : 1);
  if (main !== MAIN_DECK_SIZE)
    problems.push(problem(`The main deck has ${plural(main, "card")}; it needs exactly ${MAIN_DECK_SIZE}.`));
  const runes = total(deck.runes);
  if (runes !== RUNE_DECK_SIZE)
    problems.push(problem(`The rune deck has ${plural(runes, "rune")}; it needs exactly ${RUNE_DECK_SIZE}.`));
  const battlefields = total(deck.battlefields);
  if (battlefields !== BATTLEFIELD_COUNT)
    problems.push(
      problem(`The deck has ${plural(battlefields, "battlefield")}; it needs exactly ${BATTLEFIELD_COUNT}.`),
    );
  const repeated = deck.battlefields.filter(
    (entry, index) =>
      entry.count > 1 || deck.battlefields.findIndex(({ card }) => cardName(card) === cardName(entry.card)) !== index,
  );
  if (repeated.length > 0)
    problems.push(
      problem(
        `Battlefields need different names: ${listed(repeated.map(({ card }) => card))}.`,
        repeated.map(({ card }) => card),
      ),
    );
  const sideboard = total(deck.sideboard);
  if (sideboard > MAX_SIDEBOARD_SIZE)
    problems.push(problem(`The sideboard has ${sideboard} cards; it can hold at most ${MAX_SIDEBOARD_SIZE}.`));
  return problems;
}

function championProblems(deck: Deck, legend: Card | undefined): DeckProblem[] {
  const champion = deck.champion?.card;
  if (champion === undefined) return [problem("The deck has no chosen champion.")];
  if (champion.type !== "unit" || champion.supertype !== "champion")
    return [problem(`${cardName(champion)} is not a champion unit, so it can't be the chosen champion.`, [champion])];
  if (legend !== undefined && !legend.tags.includes(champion.name))
    return [problem(`${cardName(champion)} doesn't match the legend ${cardName(legend)}.`, [champion, legend])];
  return [];
}

function copyLimit(card: Card): number {
  const text = `${card.ability ?? ""} ${card.effect ?? ""}`;
  if (text.includes("[Unique]")) return 1;
  if (/deck can have any number of cards named/i.test(text)) return Number.POSITIVE_INFINITY;
  return MAX_COPIES;
}

function copyProblems(deck: Deck): DeckProblem[] {
  const byName = new Map<string, { card: Card; count: number }>();
  const counted = [...(deck.champion === null ? [] : [deck.champion]), ...deck.main, ...deck.sideboard];
  for (const { card, count } of counted) {
    const name = cardName(card);
    byName.set(name, { card, count: (byName.get(name)?.count ?? 0) + count });
  }
  return [...byName.values()].flatMap(({ card, count }) => {
    const limit = copyLimit(card);
    if (count <= limit) return [];
    const rule = limit === 1 ? "it is Unique, so the limit is 1" : `the limit is ${limit}`;
    const sideboard = deck.sideboard.some((entry) => cardName(entry.card) === cardName(card));
    const counted = sideboard ? " counting the sideboard" : "";
    return [problem(`${count} copies of ${cardName(card)}${counted}; ${rule}.`, [card])];
  });
}

function signatureProblems(deck: Deck, legend: Card | undefined): DeckProblem[] {
  const problems: DeckProblem[] = [];
  const signatures = deck.main.filter(({ card }) => card.supertype === "signature");
  const count = total(signatures);
  if (count > MAX_SIGNATURE_CARDS)
    problems.push(
      problem(
        `The main deck has ${count} signature cards; the limit is ${MAX_SIGNATURE_CARDS}.`,
        signatures.map(({ card }) => card),
      ),
    );
  if (legend === undefined) return problems;
  const foreign = [...deck.main, ...deck.sideboard]
    .map(({ card }) => card)
    .filter((card) => card.supertype === "signature" && !card.tags.some((tag) => legend.tags.includes(tag)));
  if (foreign.length > 0) problems.push(problem(`Signature cards of another champion: ${listed(foreign)}.`, foreign));
  return problems;
}

function placementProblems(deck: Deck): DeckProblem[] {
  const problems: DeckProblem[] = [];
  const tokens = deckEntries(deck)
    .map(({ card }) => card)
    .filter((card) => card.supertype === "token");
  if (tokens.length > 0) problems.push(problem(`Tokens can't be in a deck: ${listed(tokens)}.`, tokens));
  const misplaced = deck.sideboard
    .map(({ card }) => card)
    .filter((card) => card.type === "legend" || card.type === "rune" || card.type === "battlefield");
  if (misplaced.length > 0)
    problems.push(problem(`The sideboard can only hold units, gear and spells: ${listed(misplaced)}.`, misplaced));
  return problems;
}

const fitsIdentity = (card: Card, domains: readonly Domain[]) =>
  card.domains.every((domain) => domain === "colorless" || domains.includes(domain));

function domainProblems(deck: Deck, legend: Card | undefined): DeckProblem[] {
  if (legend === undefined) return [];
  const outside = deckEntries(deck)
    .map(({ card }) => card)
    .filter((card) => card.type !== "legend" && !fitsIdentity(card, legend.domains));
  if (outside.length === 0) return [];
  const domains = legend.domains.map(capitalize).join(" and ");
  return [problem(`Outside the legend's domains (${domains}): ${listed(outside)}.`, outside)];
}

export function constructionProblems(deck: Deck): DeckProblem[] {
  const legend = deck.legends.length === 1 ? deck.legends[0]?.card : undefined;
  const unknown =
    deck.unknown.length === 0
      ? []
      : [problem(`${plural(deck.unknown.length, "card")} could not be found: ${deck.unknown.join(", ")}.`)];
  return [
    ...unknown,
    ...sizeProblems(deck),
    ...championProblems(deck, legend),
    ...placementProblems(deck),
    ...copyProblems(deck),
    ...signatureProblems(deck, legend),
    ...domainProblems(deck, legend),
  ];
}

export function partnerProblems(deck: Deck, partner: Deck): DeckProblem[] {
  const problems: DeckProblem[] = [];
  const partnerLegends = new Set(partner.legends.map(({ card }) => cardName(card)));
  const legends = deck.legends.map(({ card }) => card).filter((card) => partnerLegends.has(cardName(card)));
  if (legends.length > 0) problems.push(problem(`Your partner plays the same legend: ${listed(legends)}.`, legends));
  const partnerBattlefields = new Set(partner.battlefields.map(({ card }) => cardName(card)));
  const battlefields = deck.battlefields
    .map(({ card }) => card)
    .filter((card) => partnerBattlefields.has(cardName(card)));
  if (battlefields.length > 0)
    problems.push(problem(`Your partner brings the same battlefields: ${listed(battlefields)}.`, battlefields));
  return problems;
}

function formatVerdict(deck: Deck, rules: RulesSnapshot, today: string, format: Format): FormatVerdict {
  const cards = [...new Map(deckEntries(deck).map(({ card }) => [card.id, card])).values()];
  const banned = cards.filter((card) => isBanned(rules, card.id, format, today));
  const construction = constructionProblems(deck);
  const problems =
    banned.length === 0 ? construction : [...construction, problem(`Banned: ${listed(banned)}.`, banned)];
  const upcomingBans = rules.bans
    .filter((ban) => ban.format === format && ban.effective > today)
    .flatMap((ban) => {
      const card = cards.find(({ id }) => id === ban.card);
      if (card === undefined || banned.includes(card)) return [];
      return [{ card: card.id, name: cardName(card), effective: ban.effective, source: ban.source }];
    });
  return { format, legal: problems.length === 0, problems, upcomingBans };
}

export function checkDeck(
  deck: Deck,
  rules: RulesSnapshot,
  today: string,
  partner: Deck | null = null,
): FormatVerdict[] {
  return FORMATS.map((format) => {
    const verdict = formatVerdict(deck, rules, today, format);
    if (format !== "2v2" || partner === null) return verdict;
    const team = [
      ...partnerProblems(deck, partner),
      ...formatVerdict(partner, rules, today, format).problems.map(({ message }) =>
        problem(`Partner's deck: ${message}`),
      ),
    ];
    const problems = [...verdict.problems, ...team];
    return { ...verdict, legal: problems.length === 0, problems };
  });
}

export function deckErrata(deck: Deck, rules: RulesSnapshot): DeckErrata[] {
  const cards = new Map(deckEntries(deck).map(({ card }) => [card.id, card]));
  return rules.errata.flatMap((entry) => {
    const card = cards.get(entry.card);
    return card === undefined ? [] : [{ ...entry, name: cardName(card) }];
  });
}

function cheapestPrinting(card: PricedCard): { code: string; each: number } | null {
  let cheapest: { code: string; each: number } | null = null;
  for (const printing of card.printings) {
    const each = marketPrice(printing);
    if (each !== null && (cheapest === null || each < cheapest.each)) cheapest = { code: printingCode(printing), each };
  }
  return cheapest;
}

export function deckPrice(deck: Deck<PricedCard>): DeckPrice | null {
  const entries = deckEntries(deck);
  const currency = entries.find(({ printing }) => printing.prices !== null)?.printing.prices?.currency;
  if (currency === undefined) return null;
  let cents = 0;
  let cheapestCents = 0;
  let unpriced = 0;
  const printings: Record<string, PrintingPrice> = {};
  for (const { card, printing, count } of entries) {
    const each = marketPrice(printing);
    const cheapest = cheapestPrinting(card);
    printings[printing.id] = {
      each,
      cheapest: cheapest !== null && (each === null || cheapest.each < each) ? cheapest : null,
    };
    if (each === null) unpriced += count;
    else cents += Math.round(each * 100) * count;
    const lowest = cheapest === null ? each : each === null ? cheapest.each : Math.min(each, cheapest.each);
    if (lowest !== null) cheapestCents += Math.round(lowest * 100) * count;
  }
  return { total: cents / 100, cheapest: cheapestCents / 100, currency, unpriced, printings };
}

const MIN_TREND_DAYS = 7;

function filled(series: readonly (number | null)[] | undefined): number[] | null {
  const first = series?.find((amount) => amount !== null);
  if (series === undefined || first === undefined || first === null) return null;
  let last = first;
  return series.map((amount) => {
    if (amount !== null) last = amount;
    return last;
  });
}

function dailyMarket(history: PriceHistory, printing: Printing): number[] | null {
  const series = history.printings[printing.id];
  const normal = filled(series?.normal);
  const foil = filled(series?.foil);
  if (normal === null) return foil;
  if (foil === null) return normal;
  return normal.map((amount, index) => Math.min(amount, foil[index] ?? amount));
}

export function deckPriceTrend(deck: Deck, history: PriceHistory): DeckPriceTrend | null {
  if (history.dates.length < MIN_TREND_DAYS) return null;
  const cents = history.dates.map(() => 0);
  for (const { printing, count } of deckEntries(deck)) {
    const series = dailyMarket(history, printing);
    series?.forEach((amount, index) => {
      cents[index] = (cents[index] ?? 0) + Math.round(amount * 100) * count;
    });
  }
  const first = cents[0] ?? 0;
  const last = cents.at(-1) ?? 0;
  if (first === 0) return null;
  return {
    days: history.dates.map((date, index) => ({ date, total: (cents[index] ?? 0) / 100 })),
    change: (last - first) / first,
  };
}

const DIFF_SECTIONS: readonly [string, (deck: Deck) => readonly DeckEntry[]][] = [
  ["Legend", (deck) => [...deck.legends, ...deck.additionalLegends]],
  ["Chosen champion", (deck) => (deck.champion === null ? [] : [deck.champion])],
  ["Main deck", (deck) => deck.main],
  ["Battlefields", (deck) => deck.battlefields],
  ["Runes", (deck) => deck.runes],
  ["Sideboard", (deck) => deck.sideboard],
];

function countsByCard(entries: readonly DeckEntry[]): Map<CardId, { card: Card; count: number }> {
  const counts = new Map<CardId, { card: Card; count: number }>();
  for (const { card, count } of entries)
    counts.set(card.id, { card, count: (counts.get(card.id)?.count ?? 0) + count });
  return counts;
}

export function deckDiff(before: Deck, after: Deck): SectionChanges[] {
  return DIFF_SECTIONS.flatMap(([section, entriesOf]) => {
    const was = countsByCard(entriesOf(before));
    const now = countsByCard(entriesOf(after));
    const changes = [...new Set([...was.keys(), ...now.keys()])].flatMap((id) => {
      const card = (now.get(id) ?? was.get(id))?.card as Card;
      const beforeCount = was.get(id)?.count ?? 0;
      const afterCount = now.get(id)?.count ?? 0;
      return beforeCount === afterCount
        ? []
        : [{ card: id, name: cardName(card), before: beforeCount, after: afterCount }];
    });
    return changes.length === 0 ? [] : [{ section, changes }];
  });
}

const listLine = ({ card, printing, count }: DeckEntry) => `${count} ${cardName(card)} (${printing.publicCode})`;

export function deckListText(deck: Deck): string {
  const main = total(deck.main);
  const blocks: [string, readonly DeckEntry[]][] = [
    ["Legend", deck.legends],
    ["Additional legends", deck.additionalLegends],
    ["Chosen champion", deck.champion === null ? [] : [deck.champion]],
    [`Main deck (${main})`, deck.main],
    ["Battlefields", deck.battlefields],
    [`Runes (${total(deck.runes)})`, deck.runes],
    [`Sideboard (${total(deck.sideboard)})`, deck.sideboard],
  ];
  return blocks
    .filter(([, entries]) => entries.length > 0)
    .map(([heading, entries]) => [heading, ...entries.map(listLine)].join("\n"))
    .join("\n\n");
}
