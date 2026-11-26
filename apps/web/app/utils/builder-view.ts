import type { PricedCard } from "@riftkeeper/cards/prices";
import type {
  BuilderCard,
  BuilderResult,
  BuilderStatsContent,
  PickerCard,
  PileGroup,
  PileGrouping,
} from "@riftkeeper/ui";
import { responsiveImage } from "./card-images";
import {
  type BuilderDeck,
  CURVE_TOP,
  canAdd,
  cardDetail,
  cardName,
  countOf,
  deckStats,
  defaultPrinting,
  formatMoney,
  formatPercent,
  MAIN_DECK_SIZE,
  MAIN_TYPES,
  MAX_SIGNATURE_CARDS,
  openingOdds,
} from "./deck-builder";
import { ODDS_TURN, OPENING_HAND } from "./deck-odds";

const capitalize = (word: string) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`;

export function builderCard(card: PricedCard, detail = cardDetail(card)): BuilderCard {
  const printing = defaultPrinting(card);
  return {
    id: card.id,
    name: cardName(card),
    imageUrl: printing.imageUrl,
    srcset: responsiveImage(printing.imageUrl, printing.orientation).srcset,
    orientation: printing.orientation,
    domains: card.domains,
    detail,
  };
}

export function builderResult(deck: BuilderDeck, card: PricedCard, battlefields: boolean): BuilderResult {
  if (battlefields) {
    const chosen = deck.battlefields.some((battlefield) => battlefield.id === card.id);
    return {
      ...builderCard(card, card.ability ?? ""),
      count: chosen ? 1 : 0,
      canAdd: !chosen && deck.battlefields.length < 3,
    };
  }
  return { ...builderCard(card), count: countOf(deck, card), canAdd: canAdd(deck, card) };
}

export function pickerCard(card: PricedCard, selected: boolean, detail: string): PickerCard {
  return { ...builderCard(card, detail), selected };
}

export function pileGroups(deck: BuilderDeck, grouping: PileGrouping): PileGroup[] {
  const entries = [
    ...(deck.champion === null ? [] : [{ card: deck.champion, count: 1, champion: true }]),
    ...deck.main
      .map((entry) => ({ ...entry, champion: false }))
      .toSorted(
        (a, b) => (a.card.energyCost ?? 0) - (b.card.energyCost ?? 0) || a.card.name.localeCompare(b.card.name),
      ),
  ];
  const pile = (selected: typeof entries) => ({
    count: selected.reduce((total, entry) => total + entry.count, 0),
    cards: selected.map(({ card, count, champion }) => ({
      ...builderCard(card),
      count,
      champion,
      opening: champion ? null : formatPercent(openingOdds(deck, count)),
      canAdd: canAdd(deck, card),
    })),
  });
  if (grouping === "type")
    return MAIN_TYPES.map((type) => ({
      label: `${capitalize(type)}s`,
      ...pile(entries.filter(({ card }) => card.type === type)),
    }));
  return Array.from({ length: CURVE_TOP + 1 }, (_, cost) => ({
    label: cost === CURVE_TOP ? `${cost}+` : `${cost}`,
    ...pile(entries.filter(({ card }) => Math.min(CURVE_TOP, card.energyCost ?? 0) === cost)),
  }));
}

export function statsContent(deck: BuilderDeck): BuilderStatsContent {
  const stats = deckStats(deck);
  return {
    count: `${stats.count}/${MAIN_DECK_SIZE}`,
    averageCost: stats.averageCost === null ? "–" : stats.averageCost.toFixed(2),
    price: formatMoney(stats.price),
    signatures: `${stats.signatures}/${MAX_SIGNATURE_CARDS}`,
    curve: stats.curve,
    types: stats.types.map(({ type, count }) => ({ label: capitalize(type), count })),
    domains: stats.domains.map(({ domain, count }) => ({ label: capitalize(domain), count, domain })),
    total: Math.max(1, stats.count),
    drawSummary: `You draw ${OPENING_HAND} of ${stats.drawSize} cards and see ${OPENING_HAND + ODDS_TURN} by your turn ${ODDS_TURN} draw.`,
    cheapOpening: formatPercent(stats.cheapOpening),
    cheapByTurn: formatPercent(stats.cheapByTurn),
    canDraw: stats.drawSize >= OPENING_HAND,
  };
}
