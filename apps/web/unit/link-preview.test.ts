import { describe, expect, test } from "bun:test";
import { makeCard, makePrinting } from "@riftkeeper/cards/testing";
import worker, { type Env } from "../worker/index.ts";

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
  if (url.pathname === "/search") {
    const total = url.searchParams.get("q") === "nothing" ? 0 : 41;
    return Response.json({ data: total ? [card, makeCard({ id: "other", name: "Other" })] : [], meta: { total } });
  }
  return Response.json({ error: { code: "card_not_found" } }, { status: 404 });
}

async function open(path: string, env: Env) {
  const response = await worker.fetch(new Request(`https://riftkeeper.app${path}`), env);
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

  test("pages without a preview, unknown cards and failing API calls serve the page unchanged", async () => {
    for (const [path, api] of [
      ["/", defaultApi],
      ["/?q=%20", defaultApi],
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
