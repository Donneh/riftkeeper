import type { Card } from "@riftkeeper/cards";
import { parseCardText } from "@riftkeeper/ui/card-text";
import { glyphLabel } from "@riftkeeper/ui/glyph";

interface Service {
  fetch(request: Request): Promise<Response>;
}

export interface Env {
  readonly ASSETS: Service;
  readonly API: Service;
}

interface SearchResponse {
  readonly data: readonly Card[];
  readonly meta: { readonly total: number };
}

interface DeckCheck {
  readonly deck: {
    readonly legends: readonly { readonly card: Card; readonly printing: Card["printings"][number] }[];
    readonly champion: { readonly card: Card } | null;
  };
  readonly formats: readonly {
    readonly format: string;
    readonly legal: boolean;
    readonly problems: readonly unknown[];
    readonly upcomingBans: readonly unknown[];
  }[];
  readonly price: { readonly total: number; readonly currency: string } | null;
}

interface LinkPreview {
  readonly pageTitle: string;
  readonly title: string;
  readonly description: string;
  readonly image: { readonly url: string; readonly alt: string } | null;
  readonly largeImage: boolean;
}

const SITE_NAME = "Riftkeeper";
const API_TIMEOUT_MS = 1500;
const MAX_DESCRIPTION_LENGTH = 300;
const MAX_LISTED_NAMES = 5;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const [page, preview] = await Promise.all([
      env.ASSETS.fetch(request),
      request.method === "GET" ? linkPreview(url, env.API).catch(() => null) : null,
    ]);
    if (!preview || page.status !== 200 || !page.headers.get("content-type")?.startsWith("text/html")) return page;
    return withPreview(page, url, preview);
  },
};

async function linkPreview(url: URL, api: Service): Promise<LinkPreview | null> {
  const cardId = /^\/cards\/([^/]+)\/?$/.exec(url.pathname)?.[1];
  if (cardId !== undefined) {
    const card = await apiJson<{ data: Card }>(api, `/cards/${cardId}`);
    return card && cardPreview(card.data, url.searchParams.get("printing"));
  }
  const deck = url.pathname === "/deck" ? url.searchParams.get("d")?.trim() : undefined;
  if (deck) {
    const partner = url.searchParams.get("p")?.trim();
    const params = new URLSearchParams({ code: deck, ...(partner ? { partner } : {}) });
    const check = await apiJson<{ data: DeckCheck }>(api, `/decks/check?${params}`);
    return check && deckPreview(check.data);
  }
  const query = url.pathname === "/" ? url.searchParams.get("q")?.trim() : undefined;
  if (!query) return null;
  const view = url.searchParams.get("view") === "cards" ? "cards" : "printings";
  const result = await apiJson<SearchResponse>(api, `/search?${new URLSearchParams({ q: query, view })}`);
  return result && searchPreview(query, view, result);
}

async function apiJson<T>(api: Service, path: string): Promise<T | null> {
  const response = await api.fetch(
    new Request(new URL(path, "https://api.riftkeeper.app"), { signal: AbortSignal.timeout(API_TIMEOUT_MS) }),
  );
  return response.ok ? ((await response.json()) as T) : null;
}

function cardPreview(card: Card, requestedPrinting: string | null): LinkPreview {
  const printing = card.printings.find(({ id }) => id === requestedPrinting) ?? card.printings[0];
  const kind = capitalize([card.supertype, card.type].filter((word) => word !== null).join(" "));
  const domains = card.domains.map(capitalize).join(", ");
  const text = [card.ability, card.effect].filter((part) => part !== null).map(plainText);
  const name = card.subtitle ? `${card.name}, ${card.subtitle}` : card.name;
  return {
    pageTitle: `${card.name} · ${SITE_NAME}`,
    title: name,
    description: [[kind, domains].filter(Boolean).join(" · "), text.join(" ")].filter(Boolean).join(". "),
    image: printing ? { url: printing.imageUrl, alt: name } : null,
    largeImage: true,
  };
}

function searchPreview(query: string, view: "cards" | "printings", { data, meta }: SearchResponse): LinkPreview {
  const noun = view === "cards" ? "card" : "printing";
  const names = [...new Set(data.map((card) => card.name))];
  const listed = names.slice(0, MAX_LISTED_NAMES).join(", ");
  const more = names.length > MAX_LISTED_NAMES || data.length < meta.total ? ", and more" : "";
  const [first] = data;
  const image = first?.printings[0];
  return {
    pageTitle: `${query} · ${SITE_NAME}`,
    title: `Search: ${query}`,
    description:
      meta.total === 0
        ? `No ${noun}s match.`
        : `${meta.total.toLocaleString("en")} ${meta.total === 1 ? `${noun} matches` : `${noun}s match`}: ${listed}${more}`,
    image: first && image ? { url: image.imageUrl, alt: first.name } : null,
    largeImage: false,
  };
}

const FORMAT_NAMES: Readonly<Record<string, string>> = { standard: "Standard", "2v2": "2v2" };

function deckPreview({ deck, formats, price }: DeckCheck): LinkPreview {
  const legend = deck.legends[0];
  const name = legend ? [legend.card.tags[0], legend.card.name].filter(Boolean).join(", ") : "Deck";
  const verdicts = formats.map(({ format, legal, problems, upcomingBans }) => {
    const label = FORMAT_NAMES[format] ?? format;
    if (!legal) return `${label}: not legal (${problems.length} ${problems.length === 1 ? "problem" : "problems"})`;
    return upcomingBans.length > 0 ? `${label}: legal, bans coming` : `${label}: legal`;
  });
  const champion = deck.champion ? `Champion: ${deck.champion.card.name}` : null;
  const cost = price
    ? new Intl.NumberFormat("en-US", { style: "currency", currency: price.currency }).format(price.total)
    : null;
  return {
    pageTitle: `${name} deck · ${SITE_NAME}`,
    title: `${name} deck`,
    description: [verdicts.join(" · "), champion, cost && `TCGplayer ${cost}`].filter(Boolean).join(". "),
    image: legend ? { url: legend.printing.imageUrl, alt: legend.card.name } : null,
    largeImage: false,
  };
}

function plainText(source: string): string {
  return parseCardText(source)
    .map((part) => {
      if (part.kind === "text") return part.text;
      if (part.kind === "glyph") return ` ${glyphLabel(part.name)} `;
      const cost = part.cost.map((name) => ` ${glyphLabel(name)}`).join("");
      return `${part.joined ? " " : ""}${part.text}${part.arrow ? " →" : ""}${cost}`;
    })
    .join("")
    .replace(/\s+/g, " ")
    .replace(/\s([.,:;)])/g, "$1")
    .replace(/\(\s/g, "(")
    .trim();
}

function withPreview(page: Response, url: URL, preview: LinkPreview): Response {
  const description = truncate(preview.description, MAX_DESCRIPTION_LENGTH);
  const properties: [string, string][] = [
    ["og:site_name", SITE_NAME],
    ["og:type", "website"],
    ["og:url", url.href],
    ["og:title", preview.title],
    ["og:description", description],
    ...(preview.image
      ? ([
          ["og:image", preview.image.url],
          ["og:image:alt", preview.image.alt],
        ] as [string, string][])
      : []),
  ];
  const tags = [
    `<meta name="description" content="${escapeAttribute(description)}">`,
    ...properties.map(([property, content]) => `<meta property="${property}" content="${escapeAttribute(content)}">`),
    `<meta name="twitter:card" content="${preview.image && preview.largeImage ? "summary_large_image" : "summary"}">`,
  ].join("");
  const rewritten = new HTMLRewriter()
    .on("title", { element: (title) => void title.setInnerContent(preview.pageTitle) })
    .on('meta[name="description"]', { element: (meta) => void meta.remove() })
    .on("head", { element: (head) => void head.append(tags, { html: true }) })
    .transform(page);
  const response = new Response(rewritten.body, rewritten);
  response.headers.delete("etag");
  response.headers.delete("content-length");
  return response;
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function truncate(text: string, length: number): string {
  return text.length <= length ? text : `${text.slice(0, length - 1).trimEnd()}…`;
}

function escapeAttribute(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}
