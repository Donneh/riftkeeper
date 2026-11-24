export const OPENING_HAND = 4;
export const ODDS_TURN = 3;
export const CHEAP_COST = 2;

export interface OddsCard {
  readonly key: string;
  readonly name: string;
  readonly count: number;
  readonly energyCost: number | null;
}

export interface CardOdds {
  readonly name: string;
  readonly copies: number;
  readonly opening: number;
  readonly byTurn: number;
}

export interface DeckOddsResult {
  readonly deckSize: number;
  readonly byTurnCards: number;
  readonly cheapPlay: number;
  readonly cards: readonly CardOdds[];
}

export function atLeastOne(deckSize: number, copies: number, drawn: number): number {
  if (copies <= 0 || deckSize <= 0) return 0;
  let none = 1;
  for (let draw = 0; draw < Math.min(drawn, deckSize); draw++)
    none *= Math.max(0, deckSize - copies - draw) / (deckSize - draw);
  return 1 - none;
}

export function deckOdds(cards: readonly OddsCard[]): DeckOddsResult | null {
  const deckSize = cards.reduce((total, card) => total + card.count, 0);
  if (deckSize < OPENING_HAND) return null;
  const byTurnCards = OPENING_HAND + ODDS_TURN;
  const byName = new Map<string, number>();
  for (const card of cards) byName.set(card.name, (byName.get(card.name) ?? 0) + card.count);
  const cheap = cards.filter((card) => card.energyCost !== null && card.energyCost <= CHEAP_COST);
  return {
    deckSize,
    byTurnCards,
    cheapPlay: atLeastOne(
      deckSize,
      cheap.reduce((total, card) => total + card.count, 0),
      OPENING_HAND,
    ),
    cards: [...byName]
      .map(([name, copies]) => ({
        name,
        copies,
        opening: atLeastOne(deckSize, copies, OPENING_HAND),
        byTurn: atLeastOne(deckSize, copies, byTurnCards),
      }))
      .toSorted((a, b) => b.copies - a.copies || a.name.localeCompare(b.name)),
  };
}

export function sampleHand<T extends { readonly count: number }>(cards: readonly T[], random = Math.random): T[] {
  const copies = cards.flatMap((card) => Array.from({ length: card.count }, () => card));
  for (let index = 0; index < Math.min(OPENING_HAND, copies.length); index++) {
    const pick = index + Math.floor(random() * (copies.length - index));
    [copies[index], copies[pick]] = [copies[pick] as T, copies[index] as T];
  }
  return copies.slice(0, OPENING_HAND);
}
