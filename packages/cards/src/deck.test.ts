import { describe, expect, test } from "bun:test";
import type { z } from "zod";
import {
  makeCard,
  makePriceHistory,
  makePriceSnapshot,
  makePrinting,
  makeRulesSnapshot,
} from "../test-support/fixtures.ts";
import type { Card, CardId, CardSchema } from "./card.ts";
import {
  checkDeck,
  constructionProblems,
  type Deck,
  DeckCodeError,
  deckCode,
  deckDiff,
  deckErrata,
  deckListText,
  deckPrice,
  deckPriceTrend,
  readDeckCode,
  readDeckList,
} from "./deck.ts";
import { withPrices } from "./price.ts";

function card(id: string, number: number, overrides: Partial<z.input<typeof CardSchema>> = {}): Card {
  const code = String(number).padStart(3, "0");
  return makeCard({
    id,
    name: id.replace(/-/g, " "),
    domains: ["fury"],
    printings: [makePrinting({ id: `ogn-${code}-298`, publicCode: `OGN-${code}/298`, collectorNumber: number })],
    ...overrides,
  });
}

const legend = card("loose-cannon", 1, { type: "legend", domains: ["fury", "chaos"], tags: ["Jinx"] });
const champion = card("jinx-rebel", 2, { name: "Jinx", subtitle: "Rebel", supertype: "champion", tags: ["Jinx"] });
const signature = card("super-mega-death-rocket", 3, { type: "spell", supertype: "signature", tags: ["Jinx"] });
const fillers = Array.from({ length: 12 }, (_, index) => card(`filler-${index}`, 10 + index));
const furyRune = card("fury-rune", 40, { type: "rune", supertype: "basic" });
const chaosRune = card("chaos-rune", 41, { type: "rune", supertype: "basic", domains: ["chaos"] });
const battlefields = [50, 51, 52].map((number) =>
  card(`battlefield-${number}`, number, { type: "battlefield", domains: ["colorless"] }),
);
const calmUnit = card("calm-unit", 60, { domains: ["calm"] });
const otherSignature = card("other-signature", 61, { type: "spell", supertype: "signature", tags: ["Vi"] });
const unique = card("unique-gear", 62, { type: "gear", ability: "[Unique] (Your deck can have only 1 card.)" });
const swarm = card("spiderling", 63, { ability: "Your deck can have any number of cards named Spiderling." });
const token = card("gold", 64, { type: "gear", supertype: "token" });

const otherLegend = card("piltover-enforcer", 70, { type: "legend", domains: ["fury", "chaos"], tags: ["Jinx"] });
const otherBattlefields = [71, 72, 73].map((number) =>
  card(`battlefield-${number}`, number, { type: "battlefield", domains: ["colorless"] }),
);
const altArtBattlefield = card("battlefield-50", 50, {
  type: "battlefield",
  domains: ["colorless"],
  printings: [
    makePrinting({ id: "ogn-050a-298", publicCode: "OGN-050a/298", collectorNumber: 50, variant: "alt-art" }),
  ],
});

const allCards = [legend, champion, signature, ...fillers, furyRune, chaosRune, ...battlefields];
const library = [...allCards, calmUnit, otherSignature, unique, swarm, token, otherLegend, ...otherBattlefields];

const LEGAL_LIST = [
  "Legend:",
  "1 Loose Cannon",
  "Champion:",
  "1 Jinx, Rebel",
  "MainDeck:",
  "2 Jinx, Rebel",
  "3 super mega death rocket",
  ...fillers.slice(0, 11).map((filler) => `3 ${filler.name}`),
  "1 filler 11",
  "Battlefields:",
  ...battlefields.map((battlefield) => `1 ${battlefield.name}`),
  "Runes:",
  "6 fury rune",
  "6 chaos rune",
].join("\n");

const legalDeck = () => readDeckList(LEGAL_LIST, library);
const messages = (deck: Deck) => constructionProblems(deck).map((problem) => problem.message);

describe("readDeckList", () => {
  test("files each card in its section, with the chosen champion apart from the main deck", () => {
    const deck = legalDeck();

    expect(deck.legends.map(({ card }) => String(card.id))).toEqual(["loose-cannon"]);
    expect(String(deck.champion?.card.id)).toBe("jinx-rebel");
    expect(deck.main.find(({ card }) => String(card.id) === "jinx-rebel")?.count).toBe(2);
    expect(deck.runes.map(({ count }) => count)).toEqual([6, 6]);
    expect(deck.battlefields).toHaveLength(3);
    expect(deck.unknown).toEqual([]);
  });

  test("reads printed codes, trailing counts, sideboard prefixes and reports unknown names", () => {
    const deck = readDeckList("OGN-010\nfiller 1 x2\nSB: 2 filler 2\n1 No Such Card", library);

    expect(deck.main.map(({ card, count }) => [String(card.id), count])).toEqual([
      ["filler-0", 1],
      ["filler-1", 2],
    ]);
    expect(deck.sideboard.map(({ card, count }) => [String(card.id), count])).toEqual([["filler-2", 2]]);
    expect(deck.unknown).toEqual(["No Such Card"]);
  });
});

describe("constructionProblems", () => {
  test("finds nothing wrong with a legal deck", () => {
    expect(messages(legalDeck())).toEqual([]);
  });

  test("counts the chosen champion toward the 40 main deck cards", () => {
    const deck = legalDeck();
    const short = { ...deck, champion: null };

    expect(messages(short)).toContain("The main deck has 39 cards; it needs exactly 40.");
    expect(messages(short)).toContain("The deck has no chosen champion.");
  });

  test("needs exactly 12 runes and 3 battlefields with different names", () => {
    const deck = legalDeck();
    const [first, second] = deck.battlefields;
    const broken = {
      ...deck,
      runes: deck.runes.slice(0, 1),
      battlefields: [first, { ...second, card: first?.card, printing: first?.printing }, deck.battlefields[2]],
    } as Deck;

    expect(messages(broken)).toEqual([
      "The rune deck has 6 runes; it needs exactly 12.",
      "Battlefields need different names: battlefield 50.",
    ]);
  });

  test("limits copies of a name to 3 across the main deck and sideboard, 1 for Unique, none for Spiderling", () => {
    const deck = readDeckList(
      `${LEGAL_LIST}\nSideboard:\n1 filler 0\n1 unique gear\n1 unique gear\n9 spiderling`,
      library,
    );

    expect(messages(deck)).toEqual([
      "The sideboard has 12 cards; it can hold at most 10.",
      "4 copies of filler 0 counting the sideboard; the limit is 3.",
      "2 copies of unique gear counting the sideboard; it is Unique, so the limit is 1.",
    ]);
  });

  test("rejects a champion of another legend, foreign signatures, off-domain cards and tokens", () => {
    const deck = readDeckList(
      LEGAL_LIST.replace("Champion:\n1 Jinx, Rebel", "Champion:\n1 filler 0").concat(
        "\nSideboard:\n1 other signature\n1 calm unit\n1 gold",
      ),
      library,
    );

    expect(messages(deck)).toEqual([
      "filler 0 is not a champion unit, so it can't be the chosen champion.",
      "Tokens can't be in a deck: gold.",
      "4 copies of filler 0; the limit is 3.",
      "Signature cards of another champion: other signature.",
      "Outside the legend's domains (Fury and Chaos): calm unit.",
    ]);
  });

  test("allows at most 3 signature cards in the main deck", () => {
    const deck = readDeckList(LEGAL_LIST.replace("1 filler 11", "1 super mega death rocket"), library);

    expect(messages(deck)).toContain("4 copies of super mega death rocket; the limit is 3.");
    expect(messages(deck)).toContain("The main deck has 4 signature cards; the limit is 3.");
  });
});

describe("checkDeck", () => {
  const source = "https://example.com/bans";
  const rules = makeRulesSnapshot({
    sources: [{ url: source, title: "Bans", publishedAt: "2026-11-01" }],
    bans: [
      { card: "filler-0", format: "standard", effective: "2026-11-01", source },
      { card: "filler-1", format: "standard", effective: "2026-12-01", source },
      { card: "filler-1", format: "2v2", effective: "2026-11-01", source },
    ],
  });

  test("applies bans in effect today per format and lists the ones announced for later", () => {
    const [standard, twoVsTwo] = checkDeck(legalDeck(), rules, "2026-11-24");

    expect(standard?.legal).toBe(false);
    expect(standard?.problems.map(({ message }) => message)).toEqual(["Banned: filler 0."]);
    expect(standard?.upcomingBans).toEqual([
      { card: "filler-1" as CardId, name: "filler 1", effective: "2026-12-01", source },
    ]);
    expect(twoVsTwo?.problems.map(({ message }) => message)).toEqual(["Banned: filler 1."]);
    expect(twoVsTwo?.upcomingBans).toEqual([]);
  });

  test("treats a ban as in effect from its effective date", () => {
    const [standard] = checkDeck(legalDeck(), rules, "2026-12-01");

    expect(standard?.problems.map(({ message }) => message)).toEqual(["Banned: filler 0, filler 1."]);
    expect(standard?.upcomingBans).toEqual([]);
  });
});

describe("checkDeck with a 2v2 partner", () => {
  const rules = makeRulesSnapshot();
  const partnerList = (battlefield: string) =>
    LEGAL_LIST.replace("1 Loose Cannon", "1 piltover enforcer").replace(
      battlefields.map((field) => `1 ${field.name}`).join("\n"),
      ["1 battlefield 71", "1 battlefield 72", `1 ${battlefield}`].join("\n"),
    );

  test("a legal partner with another legend and other battlefields keeps a legal deck legal in 2v2", () => {
    const partner = readDeckList(partnerList("battlefield 73"), library);

    expect(messages(partner)).toEqual([]);
    expect(checkDeck(legalDeck(), rules, "2026-11-24", partner).map(({ legal }) => legal)).toEqual([true, true]);
  });

  test("flags a shared legend and shared battlefield names, including other printings, only in 2v2", () => {
    const partner = readDeckList(partnerList("battlefield 52"), library);
    const sameLegend = readDeckList(LEGAL_LIST, [
      ...library.filter((entry) => entry !== battlefields[0]),
      altArtBattlefield,
    ]);

    const [standard, twoVsTwo] = checkDeck(legalDeck(), rules, "2026-11-24", partner);
    expect(standard?.legal).toBe(true);
    expect(twoVsTwo?.problems.map(({ message }) => message)).toEqual([
      "Your partner brings the same battlefields: battlefield 52.",
    ]);
    expect(twoVsTwo?.problems[0]?.cards.map(String)).toEqual(["battlefield-52"]);

    expect(checkDeck(legalDeck(), rules, "2026-11-24", sameLegend)[1]?.problems.map(({ message }) => message)).toEqual([
      "Your partner plays the same legend: loose cannon.",
      "Your partner brings the same battlefields: battlefield 50, battlefield 51, battlefield 52.",
    ]);
  });

  test("adds the partner's own 2v2 problems, marked as theirs", () => {
    const partner = readDeckList(partnerList("battlefield 72").replace("6 chaos rune", "5 chaos rune"), library);

    const [, twoVsTwo] = checkDeck(legalDeck(), rules, "2026-11-24", partner);

    expect(twoVsTwo?.legal).toBe(false);
    expect(twoVsTwo?.problems.map(({ message }) => message)).toEqual([
      "Partner's deck: The rune deck has 11 runes; it needs exactly 12.",
      "Partner's deck: Battlefields need different names: battlefield 72.",
    ]);
    expect(twoVsTwo?.problems.every(({ cards }) => cards.length === 0)).toBe(true);
  });
});

describe("deck codes", () => {
  test("round-trip a deck with its chosen champion and sideboard", () => {
    const deck = readDeckList(`${LEGAL_LIST}\nSideboard:\n2 calm unit`, library);
    const code = deckCode(deck);
    if (code === null) throw new Error("expected a code");

    const read = readDeckCode(code, library);

    expect(String(read.champion?.card.id)).toBe("jinx-rebel");
    expect(read.main.find(({ card }) => String(card.id) === "jinx-rebel")?.count).toBe(2);
    expect(read.legends.map(({ card }) => String(card.id))).toEqual(["loose-cannon"]);
    expect(read.sideboard.map(({ card, count }) => [String(card.id), count])).toEqual([["calm-unit", 2]]);
    expect(messages(read)).toEqual(messages(deck));
  });

  test("throws a DeckCodeError for text that is not a deck code", () => {
    expect(() => readDeckCode("not a code!", library)).toThrow(DeckCodeError);
  });
});

describe("deckErrata and deckPrice", () => {
  test("lists errata only for cards in the deck", () => {
    const source = "https://example.com/errata";
    const rules = makeRulesSnapshot({
      sources: [{ url: source, title: "Errata", publishedAt: "2026-11-01" }],
      errata: [
        { card: "filler-3", previous: "Old.", current: "New.", source },
        { card: "calm-unit", previous: "Old.", current: "New.", source },
      ],
    });

    expect(deckErrata(legalDeck(), rules).map(({ name }) => name)).toEqual(["filler 3"]);
  });

  test("totals the cheaper market price of each copy and counts copies without a price", () => {
    const snapshot = makePriceSnapshot({
      printings: {
        "ogn-010-298": { normal: { market: 0.1, low: null, mid: null, high: null } },
        "ogn-040-298": {
          normal: { market: 0.25, low: null, mid: null, high: null },
          foil: { market: 0.2, low: null, mid: null, high: null },
        },
      },
    });
    const deck = readDeckList("3 filler 0\n6 fury rune\n2 filler 1", withPrices(library, snapshot));

    expect(deckPrice(deck)).toMatchObject({ total: 1.5, cheapest: 1.5, currency: "USD", unpriced: 2 });
  });

  test("prices each printing and totals the deck as if bought at each card's cheapest printing", () => {
    const quote = (market: number) => ({ normal: { market, low: null, mid: null, high: null } });
    const twoPrintings = card("two-printings", 80, {
      printings: [
        makePrinting({ id: "ogn-080a-298", publicCode: "OGN-080a/298", collectorNumber: 80, variant: "alt-art" }),
        makePrinting({ id: "ogn-080-298", publicCode: "OGN-080/298", collectorNumber: 80 }),
      ],
    });
    const priced = withPrices(
      [twoPrintings, fillers[0] as Card],
      makePriceSnapshot({
        printings: { "ogn-080a-298": quote(10), "ogn-080-298": quote(0.5), "ogn-010-298": quote(1) },
      }),
    );

    const price = deckPrice(readDeckList("2 OGN-080a\n1 OGN-080\n3 filler 0", priced));

    expect(price).toMatchObject({ total: 23.5, cheapest: 4.5, unpriced: 0 });
    expect(price?.printings["ogn-080a-298"]).toEqual({ each: 10, cheapest: { code: "OGN-080", each: 0.5 } });
    expect(price?.printings["ogn-080-298"]).toEqual({ each: 0.5, cheapest: null });
  });
});

describe("deckPriceTrend", () => {
  const dates = Array.from({ length: 8 }, (_, day) => `2026-11-${String(day + 10).padStart(2, "0")}`);
  const deck = () => readDeckList("2 filler 0\n1 filler 1", library);

  test("totals the cheaper finish of each copy per day, filling missing days of each finish from its nearest price", () => {
    const history = makePriceHistory({
      dates,
      printings: {
        "ogn-010-298": { normal: [1, 1, null, 1, 1, 1, 1, 2], foil: [3, 0.5, 3, 3, 3, 3, 3, 3] },
        "ogn-011-298": { normal: [null, 4, 4, 4, 4, 4, 4, 4] },
      },
    });

    const trend = deckPriceTrend(deck(), history);

    expect(trend?.days.map(({ total }) => total)).toEqual([6, 5, 6, 6, 6, 6, 6, 8]);
    expect(trend?.change).toBeCloseTo(1 / 3);
  });

  test("gives no trend with fewer than 7 days or nothing priced on the first day", () => {
    const short = makePriceHistory({
      dates: dates.slice(0, 6),
      printings: { "ogn-010-298": { normal: [1, 1, 1, 1, 1, 1] } },
    });
    expect(deckPriceTrend(deck(), short)).toBeNull();
    expect(deckPriceTrend(deck(), makePriceHistory({ dates, printings: {} }))).toBeNull();
  });
});

describe("deckDiff", () => {
  test("lists per section the cards whose count changed, across printings, in both directions", () => {
    const before = legalDeck();
    const after = readDeckList(
      LEGAL_LIST.replace("3 filler 0", "1 filler 0\n2 calm unit").replace("1 battlefield 52", "1 battlefield 71"),
      library,
    );

    expect(deckDiff(before, after)).toEqual([
      {
        section: "Main deck",
        changes: [
          { card: "filler-0" as CardId, name: "filler 0", before: 3, after: 1 },
          { card: "calm-unit" as CardId, name: "calm unit", before: 0, after: 2 },
        ],
      },
      {
        section: "Battlefields",
        changes: [
          { card: "battlefield-52" as CardId, name: "battlefield 52", before: 1, after: 0 },
          { card: "battlefield-71" as CardId, name: "battlefield 71", before: 0, after: 1 },
        ],
      },
    ]);
    expect(deckDiff(before, legalDeck())).toEqual([]);
  });
});

describe("deckListText", () => {
  test("writes the registration list in Riot's order with printed codes, and reads back as the same deck", () => {
    const deck = readDeckList(`${LEGAL_LIST}\nSideboard:\n2 calm unit`, library);

    const text = deckListText(deck);

    expect(text.split("\n\n").map((block) => block.split("\n")[0])).toEqual([
      "Legend",
      "Chosen champion",
      "Main deck (39)",
      "Battlefields",
      "Runes (12)",
      "Sideboard (2)",
    ]);
    expect(text).toContain("1 Jinx, Rebel (OGN-002/298)");
    expect(readDeckList(text, library)).toEqual(deck);
  });
});
