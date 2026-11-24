import { describe, expect, test } from "bun:test";
import {
  makeCard,
  makePriceHistory,
  makePriceSnapshot,
  makePrinting,
  makeRulesSnapshot,
} from "@riftkeeper/cards/testing";
import { createApp } from "../app.ts";

const source = "https://playriftbound.com/en-us/news/announcements/bans";
const cards = [
  makeCard({
    id: "loose-cannon",
    name: "Loose Cannon",
    type: "legend",
    domains: ["fury", "chaos"],
    tags: ["Jinx"],
    printings: [makePrinting({ id: "ogn-251-298", publicCode: "OGN-251/298" })],
  }),
  makeCard({
    id: "jinx-rebel",
    name: "Jinx",
    subtitle: "Rebel",
    supertype: "champion",
    tags: ["Jinx"],
    printings: [makePrinting({ id: "ogn-030-298", publicCode: "OGN-030/298" })],
  }),
];
const app = createApp({
  cards,
  prices: makePriceSnapshot({
    printings: { "ogn-030-298": { normal: { market: 1.5, low: null, mid: null, high: null } } },
  }),
  priceHistory: makePriceHistory(),
  rules: makeRulesSnapshot({
    sources: [{ url: source, title: "Bans", publishedAt: "2026-11-01" }],
    bans: [{ card: "jinx-rebel", format: "2v2", effective: "2999-01-01", source }],
  }),
});

interface CheckBody {
  readonly data: {
    readonly deck: unknown;
    readonly code: string;
    readonly price: unknown;
    readonly formats: readonly {
      readonly format: string;
      readonly problems: readonly { readonly message: string }[];
      readonly upcomingBans: readonly unknown[];
    }[];
    readonly partner: { readonly code: string } | null;
  };
  readonly error: { readonly code: string; readonly message: string };
}

async function check(params: Record<string, string>) {
  const response = await app.request(`/decks/check?${new URLSearchParams(params)}`);
  return { response, body: (await response.json()) as CheckBody };
}

describe("GET /decks/check", () => {
  test("checks a pasted list and returns a deck code that reads back as the same deck", async () => {
    const { response, body } = await check({ list: "Legend:\n1 Jinx, Loose Cannon\nChampion:\n2 Jinx, Rebel" });

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("public, max-age=300");
    expect(body.data.price).toEqual({ total: 3, currency: "USD", unpriced: 1 });
    expect(body.data.formats.map((verdict) => [verdict.format, verdict.upcomingBans.length])).toEqual([
      ["standard", 0],
      ["2v2", 1],
    ]);

    const again = await check({ code: body.data.code });
    expect(again.body.data.deck).toEqual(body.data.deck);
    expect(again.body.data.code).toBe(body.data.code);
  });

  test("checks the 2v2 team rules against a partner's deck given as a list, and returns its code", async () => {
    const list = "Legend:\n1 Jinx, Loose Cannon\nChampion:\n2 Jinx, Rebel";
    const { response, body } = await check({ list, partnerList: "1 Loose Cannon" });

    expect(response.status).toBe(200);
    const [standard, twoVsTwo] = body.data.formats;
    const shared = "Your partner plays the same legend: Loose Cannon.";
    expect(standard?.problems.map(({ message }) => message)).not.toContain(shared);
    expect(twoVsTwo?.problems.map(({ message }) => message)).toContain(shared);

    const again = await check({ code: body.data.code, partner: body.data.partner?.code ?? "" });
    expect(again.body.data.formats).toEqual(body.data.formats);
  });

  test("names the partner's deck when its code can't be read", async () => {
    const { response, body } = await check({ list: "1 Jinx, Rebel", partner: "not-a-code" });

    expect(response.status).toBe(400);
    expect(body.error.message).toStartWith("Your partner's deck: ");
  });

  test("responds 400 to a code that can't be read, or without exactly one of code and list", async () => {
    for (const params of [
      { code: "not-a-code" },
      {},
      { code: "CEAAAAA", list: "1 Jinx, Rebel" },
      { list: "1 Jinx, Rebel", partner: "CEAAAAA", partnerList: "x" },
    ]) {
      const { response, body } = await check(params);
      expect(response.status).toBe(400);
      expect(body.error.code).toBe("invalid_request");
    }
  });
});
