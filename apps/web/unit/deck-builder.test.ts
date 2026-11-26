import { describe, expect, test } from "bun:test";
import type { PricedCard } from "@riftkeeper/cards/prices";
import { makeCard, makePrinting } from "@riftkeeper/cards/testing";
import {
  canAdd,
  copies,
  deckStats,
  emptyDeck,
  legalCardsQuery,
  mainCount,
  withCard,
  withChampion,
  withLegend,
  withRunes,
} from "../app/utils/deck-builder.ts";
import { localDeckStore } from "../app/utils/deck-store.ts";

const card = (overrides: Parameters<typeof makeCard>[0]): PricedCard => {
  const made = makeCard(overrides);
  return { ...made, printings: made.printings.map((printing) => ({ ...printing, prices: null })) } as PricedCard;
};

const legend = card({
  id: "agonys-embrace",
  name: "Agony's Embrace",
  type: "legend",
  domains: ["body", "chaos"],
  tags: ["Evelynn"],
  energyCost: null,
  might: null,
  printings: [makePrinting({ id: "rad-153", publicCode: "RAD-153/167" })],
});
const evelynn = card({
  id: "evelynn",
  name: "Evelynn",
  subtitle: "Consuming",
  supertype: "champion",
  domains: ["body"],
});
const filler = card({ id: "filler", name: "Filler", domains: ["chaos"], energyCost: 1 });
const fury = card({ id: "fury", name: "Fury Card", domains: ["fury"] });
const signature = card({ id: "sig", name: "Sig", supertype: "signature", domains: ["chaos"], tags: ["Evelynn"] });

const addTimes = (deck: ReturnType<typeof emptyDeck>, added: PricedCard, times: number) =>
  Array.from({ length: times }).reduce<ReturnType<typeof emptyDeck>>((next) => withCard(next, added), deck);

describe("deck rules", () => {
  test("only cards in the legend's domains can be added, and the chosen champion counts toward the copy limit", () => {
    const deck = withChampion(withLegend(emptyDeck(), legend), evelynn);
    expect(canAdd(deck, fury)).toBe(false);
    const full = addTimes(deck, evelynn, 5);
    expect(copies(full, "Evelynn")).toBe(3);
    expect(mainCount(full)).toBe(3);
  });

  test("choosing a champion already at three copies removes one from the main deck", () => {
    const deck = addTimes(withLegend(emptyDeck(), legend), evelynn, 3);
    expect(copies(withChampion(deck, evelynn), "Evelynn")).toBe(3);
  });

  test("a new legend drops cards outside its domains and splits the runes evenly", () => {
    const deck = addTimes(withLegend(emptyDeck(), legend), filler, 2);
    const other = card({ id: "other", name: "Other", type: "legend", domains: ["fury", "body"], tags: [] });
    const switched = withLegend(deck, other);
    expect(switched.main).toEqual([]);
    expect(switched.runes).toEqual({ fury: 6, body: 6 });
    expect(withRunes(switched, "fury", 9).runes).toEqual({ fury: 9, body: 3 });
  });

  test("the legal search keeps the user's query and allows only the legend's signature cards", () => {
    const query = legalCardsQuery(legend, "cost:<=2 or ability:draw");
    expect(query.startsWith("(cost:<=2 or ability:draw) id:body,chaos")).toBe(true);
    expect(query).toContain('(-supertype:signature or tag:"Evelynn")');
  });

  test("odds count only the cards left after the chosen champion", () => {
    const deck = addTimes(addTimes(withChampion(withLegend(emptyDeck(), legend), evelynn), filler, 3), signature, 1);
    const stats = deckStats(deck);
    expect(stats.count).toBe(5);
    expect(stats.drawSize).toBe(4);
    expect(stats.cheapOpening).toBe(1);
    expect(stats.signatures).toBe(1);
  });
});

describe("localDeckStore", () => {
  test("saves, lists newest first, replaces by id and removes", async () => {
    const items = new Map<string, string>();
    const storage = {
      getItem: (key: string) => items.get(key) ?? null,
      setItem: (key: string, value: string) => void items.set(key, value),
    } as Storage;
    let time = 0;
    const store = localDeckStore(
      () => storage,
      () => new Date(Date.UTC(2026, 0, 1, 0, 0, ++time)),
    );
    await store.save({ id: "a", name: "A", legend: null, list: "" });
    await store.save({ id: "b", name: "B", legend: null, list: "" });
    await store.save({ id: "a", name: "A2", legend: null, list: "" });
    expect((await store.list()).map(({ name }) => name)).toEqual(["A2", "B"]);
    await store.remove("a");
    expect(await store.get("a")).toBeNull();
    items.set("riftkeeper-decks", "not json");
    expect(await store.list()).toEqual([]);
  });
});
