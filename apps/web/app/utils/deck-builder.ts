import type { Domain } from "@riftkeeper/cards";
import type { Deck } from "@riftkeeper/cards/deck";
import type { PricedCard, PricedPrinting } from "@riftkeeper/cards/prices";
import {
  BATTLEFIELD_COUNT,
  MAIN_DECK_SIZE,
  MAX_COPIES,
  MAX_SIGNATURE_CARDS,
  RUNE_DECK_SIZE,
} from "@riftkeeper/cards/values";
import { atLeastOne, CHEAP_COST, ODDS_TURN, OPENING_HAND } from "./deck-odds";

export { BATTLEFIELD_COUNT, MAIN_DECK_SIZE, MAX_COPIES, MAX_SIGNATURE_CARDS, RUNE_DECK_SIZE };

export const CURVE_TOP = 7;
export const MAIN_TYPES = ["unit", "spell", "gear"] as const;
export type MainType = (typeof MAIN_TYPES)[number];

export interface BuilderEntry {
  readonly card: PricedCard;
  readonly count: number;
}

export interface BuilderDeck {
  readonly name: string;
  readonly legend: PricedCard | null;
  readonly champion: PricedCard | null;
  readonly main: readonly BuilderEntry[];
  readonly battlefields: readonly PricedCard[];
  readonly runes: Readonly<Partial<Record<Domain, number>>>;
}

export const DEFAULT_DECK_NAME = "Untitled deck";

export function emptyDeck(name = DEFAULT_DECK_NAME): BuilderDeck {
  return { name, legend: null, champion: null, main: [], battlefields: [], runes: {} };
}

export const cardName = (card: PricedCard) => (card.subtitle === null ? card.name : `${card.name}, ${card.subtitle}`);

export function defaultPrinting(card: PricedCard): PricedPrinting {
  return card.printings.find((printing) => printing.variant === "standard") ?? (card.printings[0] as PricedPrinting);
}

export function marketPrice(card: PricedCard): number | null {
  const prices = defaultPrinting(card).prices;
  const normal = prices?.normal?.market ?? null;
  const foil = prices?.foil?.market ?? null;
  if (normal === null) return foil;
  return foil === null ? normal : Math.min(normal, foil);
}

const sum = (entries: readonly BuilderEntry[]) => entries.reduce((total, entry) => total + entry.count, 0);

export const fitsIdentity = (card: PricedCard, legend: PricedCard) =>
  card.domains.every((domain) => domain === "colorless" || legend.domains.includes(domain));

const signatureFits = (card: PricedCard, legend: PricedCard) =>
  card.supertype !== "signature" || card.tags.some((tag) => legend.tags.includes(tag));

export const isChampionOf = (card: PricedCard, legend: PricedCard) =>
  card.type === "unit" && card.supertype === "champion" && legend.tags.includes(card.name);

const quoted = (text: string) => `"${text.replaceAll('"', "")}"`;
const anyOf = (terms: readonly string[]) => (terms.length === 1 ? (terms[0] as string) : `(${terms.join(" or ")})`);

function withUserQuery(base: string, query: string): string {
  const user = query.trim();
  return user === "" ? base : `(${user}) ${base}`;
}

export function legalCardsQuery(legend: PricedCard, query: string): string {
  const signatures = legend.tags.map((tag) => `tag:${quoted(tag)}`);
  const base = [
    `id:${legend.domains.join(",")}`,
    anyOf(MAIN_TYPES.map((type) => `type:${type}`)),
    "-supertype:token",
    "format:standard",
    signatures.length === 0 ? "-supertype:signature" : `(-supertype:signature or ${signatures.join(" or ")})`,
  ].join(" ");
  return withUserQuery(base, query);
}

export function battlefieldsQuery(query: string): string {
  return withUserQuery("type:battlefield -supertype:token", query);
}

export function championsQuery(legend: PricedCard): string | null {
  if (legend.tags.length === 0) return null;
  return `type:unit supertype:champion ${anyOf(legend.tags.map((tag) => `name:${quoted(tag)}`))}`;
}

export function copies(deck: BuilderDeck, name: string): number {
  return (
    deck.main.reduce((total, entry) => total + (entry.card.name === name ? entry.count : 0), 0) +
    (deck.champion?.name === name ? 1 : 0)
  );
}

export const countOf = (deck: BuilderDeck, card: PricedCard) =>
  deck.main.find((entry) => entry.card.id === card.id)?.count ?? 0;

export const signatureCount = (deck: BuilderDeck) =>
  sum(deck.main.filter((entry) => entry.card.supertype === "signature"));

export const mainCount = (deck: BuilderDeck) => sum(deck.main) + (deck.champion === null ? 0 : 1);

export function canAdd(deck: BuilderDeck, card: PricedCard): boolean {
  if (deck.legend === null || !fitsIdentity(card, deck.legend) || !signatureFits(card, deck.legend)) return false;
  if (copies(deck, card.name) >= MAX_COPIES) return false;
  return card.supertype !== "signature" || signatureCount(deck) < MAX_SIGNATURE_CARDS;
}

export function withCard(deck: BuilderDeck, card: PricedCard): BuilderDeck {
  if (!canAdd(deck, card)) return deck;
  const existing = countOf(deck, card);
  const main =
    existing === 0
      ? [...deck.main, { card, count: 1 }]
      : deck.main.map((entry) => (entry.card.id === card.id ? { ...entry, count: entry.count + 1 } : entry));
  return { ...deck, main };
}

export function withoutCard(deck: BuilderDeck, card: PricedCard): BuilderDeck {
  return {
    ...deck,
    main: deck.main
      .map((entry) => (entry.card.id === card.id ? { ...entry, count: entry.count - 1 } : entry))
      .filter((entry) => entry.count > 0),
  };
}

function evenRunes(legend: PricedCard): Partial<Record<Domain, number>> {
  const domains = legend.domains.filter((domain) => domain !== "colorless");
  return Object.fromEntries(
    domains.map((domain, index) => [
      domain,
      Math.floor(RUNE_DECK_SIZE / domains.length) + (index < RUNE_DECK_SIZE % domains.length ? 1 : 0),
    ]),
  );
}

export function withLegend(deck: BuilderDeck, legend: PricedCard): BuilderDeck {
  const keeps = (card: PricedCard) => fitsIdentity(card, legend) && signatureFits(card, legend);
  return {
    ...deck,
    legend,
    champion: deck.champion !== null && isChampionOf(deck.champion, legend) ? deck.champion : null,
    main: deck.main.filter((entry) => keeps(entry.card)),
    runes: evenRunes(legend),
  };
}

export function withChampion(deck: BuilderDeck, champion: PricedCard | null): BuilderDeck {
  const cleared = { ...deck, champion: null };
  if (champion === null) return cleared;
  const crowded = copies(cleared, champion.name) >= MAX_COPIES;
  const main = crowded ? withoutCard(cleared, champion).main : cleared.main;
  return { ...cleared, champion, main };
}

export function withBattlefield(deck: BuilderDeck, card: PricedCard): BuilderDeck {
  if (deck.battlefields.some((battlefield) => battlefield.id === card.id)) return deck;
  if (deck.battlefields.length >= BATTLEFIELD_COUNT) return deck;
  return { ...deck, battlefields: [...deck.battlefields, card] };
}

export function withoutBattlefield(deck: BuilderDeck, card: PricedCard): BuilderDeck {
  return { ...deck, battlefields: deck.battlefields.filter((battlefield) => battlefield.id !== card.id) };
}

export function withRunes(deck: BuilderDeck, domain: Domain, count: number): BuilderDeck {
  const others = Object.keys(deck.runes).filter((key) => key !== domain) as Domain[];
  const own = Math.max(0, Math.min(RUNE_DECK_SIZE, Math.round(count)));
  const [other] = others;
  if (other === undefined || others.length > 1) return deck;
  return { ...deck, runes: { [domain]: own, [other]: RUNE_DECK_SIZE - own } };
}

const runeName = (domain: Domain) => `${domain.charAt(0).toUpperCase()}${domain.slice(1)} Rune`;

function cardLine(card: PricedCard, count: number): string {
  const code = defaultPrinting(card).publicCode.split("/")[0];
  return `${count} ${cardName(card)} (${code})`;
}

export function deckList(deck: BuilderDeck): string {
  const sections: [string, string[]][] = [
    ["Legend", deck.legend === null ? [] : [cardLine(deck.legend, 1)]],
    ["Champion", deck.champion === null ? [] : [cardLine(deck.champion, 1)]],
    ["Main deck", deck.main.map(({ card, count }) => cardLine(card, count))],
    ["Battlefields", deck.battlefields.map((card) => cardLine(card, 1))],
    [
      "Runes",
      Object.entries(deck.runes)
        .filter(([, count]) => (count ?? 0) > 0)
        .map(([domain, count]) => `${count} ${runeName(domain as Domain)}`),
    ],
  ];
  return sections
    .filter(([, lines]) => lines.length > 0)
    .map(([title, lines]) => `${title}:\n${lines.join("\n")}`)
    .join("\n\n");
}

export function fromCheckedDeck(checked: Deck<PricedCard>, name: string): BuilderDeck {
  const runes: Partial<Record<Domain, number>> = {};
  for (const { card, count } of checked.runes)
    for (const domain of card.domains) runes[domain] = (runes[domain] ?? 0) + count;
  const legend = checked.legends[0]?.card ?? null;
  return {
    name,
    legend,
    champion: checked.champion?.card ?? null,
    main: checked.main.map(({ card, count }) => ({ card, count })),
    battlefields: checked.battlefields.map(({ card }) => card).slice(0, BATTLEFIELD_COUNT),
    runes: Object.keys(runes).length > 0 || legend === null ? runes : evenRunes(legend),
  };
}

export interface DeckStats {
  readonly count: number;
  readonly drawSize: number;
  readonly averageCost: number | null;
  readonly price: number;
  readonly signatures: number;
  readonly curve: readonly number[];
  readonly types: readonly { readonly type: MainType; readonly count: number }[];
  readonly domains: readonly { readonly domain: Domain; readonly count: number }[];
  readonly cheapOpening: number;
  readonly cheapByTurn: number;
}

export const openingOdds = (deck: BuilderDeck, copiesInDeck: number) =>
  atLeastOne(sum(deck.main), copiesInDeck, OPENING_HAND);

export function deckStats(deck: BuilderDeck): DeckStats {
  const all = deck.champion === null ? deck.main : [{ card: deck.champion, count: 1 }, ...deck.main];
  const count = sum(all);
  const drawSize = sum(deck.main);
  const curve = Array.from({ length: CURVE_TOP + 1 }, () => 0);
  let costTotal = 0;
  let costed = 0;
  for (const { card, count: copiesOf } of all) {
    if (card.energyCost === null) continue;
    const bucket = Math.min(CURVE_TOP, card.energyCost);
    curve[bucket] = (curve[bucket] ?? 0) + copiesOf;
    costTotal += card.energyCost * copiesOf;
    costed += copiesOf;
  }
  const cheap = sum(deck.main.filter(({ card }) => card.energyCost !== null && card.energyCost <= CHEAP_COST));
  const priced = [
    ...(deck.legend === null ? [] : [{ card: deck.legend, count: 1 }]),
    ...all,
    ...deck.battlefields.map((card) => ({ card, count: 1 })),
  ];
  return {
    count,
    drawSize,
    averageCost: costed === 0 ? null : costTotal / costed,
    price: priced.reduce((total, { card, count: copiesOf }) => total + (marketPrice(card) ?? 0) * copiesOf, 0),
    signatures: signatureCount(deck),
    curve,
    types: MAIN_TYPES.map((type) => ({ type, count: sum(all.filter(({ card }) => card.type === type)) })),
    domains: (deck.legend?.domains ?? []).map((domain) => ({
      domain,
      count: sum(all.filter(({ card }) => card.domains.includes(domain))),
    })),
    cheapOpening: atLeastOne(drawSize, cheap, OPENING_HAND),
    cheapByTurn: atLeastOne(drawSize, cheap, OPENING_HAND + ODDS_TURN),
  };
}

const MONEY = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const PERCENT = new Intl.NumberFormat("en-US", { style: "percent", maximumFractionDigits: 0 });
export const formatMoney = (amount: number) => MONEY.format(amount);
export const formatPercent = (chance: number) => PERCENT.format(chance);

export function cardDetail(card: PricedCard): string {
  const price = marketPrice(card);
  return [
    card.energyCost === null ? null : `${card.energyCost}e`,
    card.might === null ? null : `${card.might}m`,
    card.type === null ? null : `${card.type.charAt(0).toUpperCase()}${card.type.slice(1)}`,
    price === null ? null : formatMoney(price),
  ]
    .filter(Boolean)
    .join(" · ");
}
