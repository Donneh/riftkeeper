import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from "bun:test";
import { makeCard, makePrinting } from "@riftkeeper/cards/testing";
import worker, { type Env } from "../worker/index.ts";

const assetBytes = (specifier: string) => Bun.file(new URL(import.meta.resolve(specifier))).arrayBuffer();
const font = async (name: string, path: string, weight: number) => ({ name, data: await assetBytes(path), weight });

mock.module("../worker/render-assets.ts", async () => ({
  renderAssets: {
    layoutWasm: new WebAssembly.Module(await assetBytes("satori/yoga.wasm")),
    resvgWasm: new WebAssembly.Module(await assetBytes("@resvg/resvg-wasm/index_bg.wasm")),
    fonts: await Promise.all([
      font("Inter", "@fontsource/inter/files/inter-latin-400-normal.woff", 400),
      font("Inter", "@fontsource/inter/files/inter-latin-600-normal.woff", 600),
      font("Inter", "@fontsource/inter/files/inter-latin-700-normal.woff", 700),
      font("JetBrains Mono", "@fontsource/jetbrains-mono/files/jetbrains-mono-latin-500-normal.woff", 500),
    ]),
  },
}));

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const TINY_PNG = Uint8Array.from(
  atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="),
  (char) => char.charCodeAt(0),
);

const SHELL =
  '<!DOCTYPE html><html lang="en"><head><title>Riftkeeper</title><meta name="description" content="Search the Riftbound card list."></head><body><div id="__nuxt"></div></body></html>';

const card = makeCard({
  id: "jinx-demolitionist",
  name: "Jinx",
  subtitle: 'Demolitionist "Boom" <b>',
  type: "unit",
  supertype: "champion",
  domains: ["fury", "chaos"],
  ability: "[Assault 2] (+2 :rb_might: while I'm an attacker.)",
  effect: "Pay :rb_energy_1::rb_rune_fury: to draw.",
  printings: [
    makePrinting({ id: "ogn-001-298", imageUrl: "https://cdn.example.com/first.png" }),
    makePrinting({ id: "ogn-001a-298", imageUrl: "https://cdn.example.com/alt.png" }),
  ],
});

const legend = makeCard({
  id: "loose-cannon",
  name: "Loose Cannon",
  type: "legend",
  tags: ["Jinx"],
  printings: [makePrinting({ id: "ogn-251-298", imageUrl: "https://cdn.example.com/legend.png" })],
});

function environment({
  api = defaultApi,
  assets = shellAssets,
}: {
  api?: Env["API"]["fetch"];
  assets?: Env["ASSETS"]["fetch"];
} = {}) {
  const apiPaths: string[] = [];
  const env: Env = {
    ASSETS: { fetch: assets },
    API: {
      fetch: (request) => {
        const url = new URL(request.url);
        apiPaths.push(url.pathname + url.search);
        return api(request);
      },
    },
  };
  return { env, apiPaths };
}

async function shellAssets() {
  return new Response(SHELL, { headers: { "content-type": "text/html; charset=utf-8", etag: '"shell"' } });
}

async function defaultApi(request: Request) {
  const url = new URL(request.url);
  if (url.pathname === `/cards/${card.id}`) return Response.json({ data: card });
  if (url.pathname === "/decks/check") {
    if (url.searchParams.get("code") === "unreadable") {
      return Response.json({ error: { code: "invalid_deck_code" } }, { status: 400 });
    }
    return Response.json({
      data: {
        deck: {
          legends: [{ card: legend, printing: legend.printings[0], count: 1 }],
          additionalLegends: [],
          champion: { card, printing: card.printings[0], count: 1 },
          main: [
            { card, printing: card.printings[1], count: 2 },
            { card: makeCard({ id: "other" }), printing: makePrinting({ id: "other-p1" }), count: 3 },
          ],
          battlefields: [],
          runes: [],
          sideboard: [],
          unknown: [],
        },
        formats: [
          {
            format: "standard",
            legal: true,
            problems: [],
            upcomingBans: [{ card: card.id, name: card.name, effective: "2026-12-01", source: "" }],
          },
          {
            format: "2v2",
            legal: false,
            problems: [
              { message: "Banned: Jinx.", cards: [card.id] },
              { message: "The main deck has 6 cards; it needs exactly 40.", cards: [] },
            ],
            upcomingBans: [],
          },
        ],
        price: { total: 261.49, currency: "USD", unpriced: 0 },
      },
    });
  }
  if (url.pathname === "/search") {
    const total = url.searchParams.get("q") === "nothing" ? 0 : 41;
    return Response.json({ data: total ? [card, makeCard({ id: "other", name: "Other" })] : [], meta: { total } });
  }
  return Response.json({ error: { code: "card_not_found" } }, { status: 404 });
}

function executionContext() {
  const pending: Promise<unknown>[] = [];
  const context = { waitUntil: (promise: Promise<unknown>) => void pending.push(promise) };
  return { context, settled: () => Promise.all(pending) };
}

async function open(path: string, env: Env) {
  const response = await worker.fetch(new Request(`https://riftkeeper.app${path}`), env, executionContext().context);
  const html = await response.text();
  const meta = (key: string) =>
    new RegExp(`<meta (?:name|property)="${key}" content="([^"]*)">`).exec(html)?.[1] ?? null;
  return { response, html, meta, title: /<title>([^<]*)<\/title>/.exec(html)?.[1] };
}

describe("link previews", () => {
  test("a card link describes the card in plain text with the image of the printing it names", async () => {
    const { env } = environment();
    const page = await open(`/cards/${card.id}?printing=ogn-001a-298`, env);

    expect(page.response.status).toBe(200);
    expect(page.title).toBe("Jinx · Riftkeeper");
    expect(page.meta("og:title")).toBe("Jinx, Demolitionist &quot;Boom&quot; &lt;b&gt;");
    const description =
      "Champion unit · Fury, Chaos. Assault 2 (+2 Might while I'm an attacker.) Pay 1 energy Fury rune to draw.";
    expect(page.meta("og:description")).toBe(description);
    expect(page.meta("description")).toBe(description);
    expect(page.html.match(/name="description"/g)).toHaveLength(1);
    expect(page.meta("og:image")).toBe("https://cdn.example.com/alt.png");
    expect(page.meta("twitter:card")).toBe("summary_large_image");
    expect(page.html).toContain('<div id="__nuxt"></div>');
    expect(page.response.headers.get("etag")).toBeNull();
  });

  test("a search link says how many results match and names the first cards", async () => {
    const { env, apiPaths } = environment();
    const page = await open("/?q=%20c%3Afury%20&view=cards", env);

    expect(apiPaths).toEqual(["/search?q=c%3Afury&view=cards"]);
    expect(page.title).toBe("c:fury · Riftkeeper");
    expect(page.meta("og:title")).toBe("Search: c:fury");
    expect(page.meta("og:description")).toBe("41 cards match: Jinx, Other, and more");
    expect(page.meta("og:image")).toBe("https://cdn.example.com/first.png");
    expect(page.meta("twitter:card")).toBe("summary");
  });

  test("a search counts printings unless the link asks for cards, and says when nothing matches", async () => {
    const { env } = environment();
    expect((await open("/?q=jinx", env)).meta("og:description")).toBe("41 printings match: Jinx, Other, and more");

    const empty = await open("/?q=nothing", env);
    expect(empty.meta("og:description")).toBe("No printings match.");
    expect(empty.meta("og:image")).toBeNull();
  });

  test("a deck link names the legend and gives the verdict per format and the price", async () => {
    const { env, apiPaths } = environment();
    const page = await open("/deck?d=CEAAAAA", env);

    expect(apiPaths).toEqual(["/decks/check?code=CEAAAAA"]);
    expect(page.title).toBe("Jinx, Loose Cannon deck · Riftkeeper");
    expect(page.meta("og:description")).toBe(
      "Standard: legal, bans coming · 2v2: not legal (2 problems). Champion: Jinx. TCGplayer $261.49",
    );
    expect(page.meta("og:image")).toBe("https://riftkeeper.app/deck/image.png?d=CEAAAAA");
    expect(page.meta("og:image:width")).toBe("1200");
    expect(page.meta("og:image:height")).toBe("630");
    expect(page.meta("og:image:alt")).toBe("Jinx, Loose Cannon deck");
    expect(page.meta("twitter:card")).toBe("summary_large_image");

    const withPartner = environment();
    const partnerPage = await open("/deck/?d=%20CEAAAAA&p=CEBBBBB&utm=x", withPartner.env);
    expect(withPartner.apiPaths).toEqual(["/decks/check?code=CEAAAAA&partner=CEBBBBB"]);
    expect(partnerPage.meta("og:image")).toBe("https://riftkeeper.app/deck/image.png?d=CEAAAAA&amp;p=CEBBBBB");
  });

  test("pages without a preview, unknown cards and failing API calls serve the page unchanged", async () => {
    for (const [path, api] of [
      ["/", defaultApi],
      ["/?q=%20", defaultApi],
      ["/deck", defaultApi],
      ["/cards/no-such-card", defaultApi],
      [`/cards/${card.id}`, async () => new Response("", { status: 500 })],
      [`/cards/${card.id}`, async () => Promise.reject(new Error("timeout"))],
    ] as const) {
      const { env } = environment({ api });
      const page = await open(path, env);
      expect(page.response.status, path).toBe(200);
      expect(page.html, path).toBe(SHELL);
      expect(page.response.headers.get("etag"), path).toBe('"shell"');
    }
  });

  test("responses that are not a 200 HTML page pass through untouched", async () => {
    const redirect = environment({
      assets: async () => new Response(null, { status: 307, headers: { location: "/cards/x/" } }),
    });
    const page = await open(`/cards/${card.id}`, redirect.env);
    expect(page.response.status).toBe(307);
    expect(page.response.headers.get("location")).toBe("/cards/x/");
  });
});

describe("deck images", () => {
  const cached = new Map<string, Response>();
  const imageRequests: string[] = [];
  const realFetch = globalThis.fetch;
  const realCaches = (globalThis as { caches?: unknown }).caches;

  beforeEach(() => {
    cached.clear();
    imageRequests.length = 0;
    Object.assign(globalThis, {
      caches: {
        open: async (name: string) => {
          expect(name).toBe("deck-images");
          return {
            match: async (key: string) => cached.get(key)?.clone(),
            put: async (key: string, response: Response) => void cached.set(key, response),
          };
        },
      },
      fetch: async (input: RequestInfo | URL) => {
        const url = new URL(input instanceof Request ? input.url : input);
        imageRequests.push(url.href);
        if (url.pathname === "/missing.png") return new Response("", { status: 404 });
        return new Response(TINY_PNG, { headers: { "content-type": "image/png" } });
      },
    });
  });

  afterEach(() => {
    Object.assign(globalThis, { caches: realCaches, fetch: realFetch });
  });

  async function image(path: string, env: Env) {
    const { context, settled } = executionContext();
    const response = await worker.fetch(new Request(`https://riftkeeper.app${path}`), env, context);
    await settled();
    return response;
  }

  test("a deck renders as a 1200x630 PNG of its cards that is cached for a day", async () => {
    const { env, apiPaths } = environment();
    const response = await image("/deck/image.png?d=CEAAAAA&p=CEBBBBB", env);

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
    expect(response.headers.get("cache-control")).toBe("public, max-age=86400");
    const png = new Uint8Array(await response.arrayBuffer());
    expect([...png.subarray(0, 8)]).toEqual(PNG_SIGNATURE);
    const header = new DataView(png.buffer, png.byteOffset);
    expect([header.getUint32(16), header.getUint32(20)]).toEqual([1200, 630]);
    expect(apiPaths).toEqual(["/decks/check?code=CEAAAAA&partner=CEBBBBB"]);
    expect(imageRequests).toHaveLength(4);
    for (const request of imageRequests) expect(new URL(request).searchParams.get("fm")).toBe("jpg");

    const again = await image("/deck/image.png?d=CEAAAAA&p=CEBBBBB", env);
    expect(again.status).toBe(200);
    expect([...new Uint8Array(await again.arrayBuffer()).subarray(0, 8)]).toEqual(PNG_SIGNATURE);
    expect(apiPaths).toHaveLength(1);
  });

  test("a deck whose card art fails to load still renders, but only briefly cached", async () => {
    const missingLegend = makeCard({
      ...legend,
      printings: [makePrinting({ id: "ogn-251-298", imageUrl: "https://cdn.example.com/missing.png" })],
    });
    const { env } = environment({
      api: async (request) => {
        const check = (await (await defaultApi(request)).json()) as { data: { deck: { legends: unknown[] } } };
        check.data.deck.legends = [{ card: missingLegend, printing: missingLegend.printings[0], count: 1 }];
        return Response.json(check);
      },
    });
    const response = await image("/deck/image.png?d=CEAAAAA", env);

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("public, max-age=300");
    expect(cached.size).toBe(0);
  });

  test("an unreadable deck, a missing code or a failing API answers without an image", async () => {
    const errors = spyOn(console, "error").mockImplementation(() => {});
    for (const [path, api, status] of [
      ["/deck/image.png?d=unreadable", defaultApi, 404],
      ["/deck/image.png", defaultApi, 404],
      ["/deck/image.png?d=CEAAAAA", async () => new Response("", { status: 500 }), 404],
      ["/deck/image.png?d=CEAAAAA", async () => Promise.reject(new Error("timeout")), 502],
    ] as const) {
      const response = await image(path, environment({ api }).env);
      expect(response.status, path).toBe(status);
      expect(response.headers.get("content-type"), path).not.toBe("image/png");
    }
    expect(cached.size).toBe(0);
    expect(errors).toHaveBeenCalledTimes(1);
    errors.mockRestore();
  });
});
