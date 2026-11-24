import { describe, expect, test } from "bun:test";
import { atLeastOne, deckOdds, sampleHand } from "../app/utils/deck-odds.ts";

const choose = (n: number, k: number): number => (k === 0 ? 1 : (choose(n - 1, k - 1) * n) / k);
const missAll = (deckSize: number, copies: number, drawn: number) =>
  1 - choose(deckSize - copies, drawn) / choose(deckSize, drawn);

describe("atLeastOne", () => {
  test("matches the hypergeometric chance of drawing a copy", () => {
    expect(atLeastOne(39, 3, 4)).toBeCloseTo(missAll(39, 3, 4), 10);
    expect(atLeastOne(39, 3, 4)).toBeCloseTo(0.2838, 4);
    expect(atLeastOne(40, 1, 7)).toBeCloseTo(7 / 40, 10);
  });

  test("is certain once the copies cannot all stay in the deck, and impossible without copies", () => {
    expect(atLeastOne(6, 3, 4)).toBe(1);
    expect(atLeastOne(39, 0, 4)).toBe(0);
  });
});

describe("deckOdds", () => {
  test("adds up printings of the same card and counts cards that cost 2 or less", () => {
    const odds = deckOdds([
      { key: "a", name: "Jinx, Rebel", count: 2, energyCost: 3 },
      { key: "a-alt", name: "Jinx, Rebel", count: 1, energyCost: 3 },
      { key: "b", name: "Get Excited!", count: 2, energyCost: 1 },
      { key: "c", name: "Filler", count: 35, energyCost: null },
    ]);

    expect(odds?.deckSize).toBe(40);
    expect(odds?.cards.map((card) => [card.name, card.copies])).toEqual([
      ["Filler", 35],
      ["Jinx, Rebel", 3],
      ["Get Excited!", 2],
    ]);
    expect(odds?.cards[1]?.byTurn).toBeCloseTo(missAll(40, 3, 7), 10);
    expect(odds?.cheapPlay).toBeCloseTo(missAll(40, 2, 4), 10);
  });

  test("has no odds for a deck smaller than a hand", () => {
    expect(deckOdds([{ key: "a", name: "A", count: 3, energyCost: 1 }])).toBeNull();
  });
});

describe("sampleHand", () => {
  test("draws four cards without taking more copies than the deck has", () => {
    const cards = [
      { name: "A", count: 1 },
      { name: "B", count: 4 },
    ];
    for (const random of [() => 0, () => 0.999]) {
      const hand = sampleHand(cards, random);
      expect(hand).toHaveLength(4);
      expect(hand.filter((card) => card.name === "A").length).toBeLessThanOrEqual(1);
    }
    expect(sampleHand(cards, () => 0).map((card) => card.name)).toEqual(["A", "B", "B", "B"]);
  });
});
