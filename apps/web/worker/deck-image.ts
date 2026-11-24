import { initWasm, Resvg } from "@resvg/resvg-wasm";
import type { Card, Domain } from "@riftkeeper/cards";
import type { Deck, DeckEntry, DeckPrice, FormatVerdict } from "@riftkeeper/cards/deck";
import satori, { init as initSatori } from "satori/standalone";
import { renderAssets } from "./render-assets.ts";

export interface DeckCheck {
  readonly deck: Deck<Card>;
  readonly formats: readonly FormatVerdict[];
  readonly price: DeckPrice | null;
}

export interface DeckImage {
  readonly png: Uint8Array<ArrayBuffer>;
  readonly complete: boolean;
}

export const DECK_IMAGE_WIDTH = 1200;
export const DECK_IMAGE_HEIGHT = 630;

const IMAGE_TIMEOUT_MS = 3000;
const LEAD_CARD_WIDTH = 360;
const MAIN_CARD_WIDTH = 160;
const MAX_MAIN_CARDS = 7;
const CARD_RATIO = 1039 / 744;

const COLOR = {
  background: "#0c0a09",
  surface: "#12100e",
  surfaceMuted: "#1c1917",
  border: "#2a2622",
  text: "#f5f0e8",
  textMuted: "#a8a29e",
  legal: "#7fbf6a",
  warningSurface: "#1f1a0a",
  warningBorder: "#5c4813",
  warningText: "#f5d98c",
  dangerSurface: "#241010",
  dangerBorder: "#6b2626",
  dangerText: "#ffb4b4",
} as const;

const DOMAIN_COLORS: Readonly<Record<Domain, string>> = {
  fury: "#df1620",
  calm: "#488c38",
  mind: "#0f6fa6",
  body: "#e87600",
  chaos: "#6a4094",
  order: "#d2b400",
  colorless: "#8a8580",
};

export const FORMAT_NAMES: Readonly<Record<string, string>> = { standard: "Standard", "2v2": "2v2" };

const LOGO_PATH =
  "M3 2h9v1h-9zM3 3h10v1h-10zM3 4h3v1h-3zM10 4h3v1h-3zM3 5h3v1h-3zM10 5h3v1h-3zM3 6h3v1h-3zM10 6h3v1h-3zM3 7h10v1h-10zM3 8h9v1h-9zM3 9h3v1h-3zM8 9h3v1h-3zM3 10h3v1h-3zM9 10h3v1h-3zM3 11h3v1h-3zM10 11h3v1h-3zM3 12h3v1h-3zM11 12h3v1h-3zM3 13h3v1h-3zM12 13h3v1h-3z";

type Style = Record<string, string | number>;

interface Element {
  readonly type: string;
  readonly props: Record<string, unknown>;
}

type Child = Element | string | null | false;

function box(style: Style, ...children: Child[]): Element {
  const present = children.filter(Boolean);
  return {
    type: "div",
    props: { style: { display: "flex", ...style }, children: present.length === 1 ? present[0] : present },
  };
}

function svg(size: number, viewBox: string, path: Record<string, string | number>): Element {
  return {
    type: "svg",
    props: { width: size, height: size, viewBox, children: { type: "path", props: path } },
  };
}

let ready: Promise<void> | undefined;

function initialize(): Promise<void> {
  ready ??= Promise.all([initSatori(renderAssets.layoutWasm), initWasm(renderAssets.resvgWasm)]).then(
    () => undefined,
    (error: unknown) => {
      ready = undefined;
      throw error;
    },
  );
  return ready;
}

export function deckTitle(deck: Deck<Card>): string {
  const legend = deck.legends[0];
  return legend ? [legend.card.tags[0], legend.card.name].filter(Boolean).join(", ") : "Deck";
}

export async function renderDeckImage({ deck, formats, price }: DeckCheck): Promise<DeckImage> {
  const legend = deck.legends[0] ?? null;
  const main = [...deck.main].sort((a, b) => b.count - a.count);
  const shown = main.slice(0, main.length > MAX_MAIN_CARDS ? MAX_MAIN_CARDS - 1 : MAX_MAIN_CARDS);
  const [images] = await Promise.all([
    Promise.all([
      cardImage(legend, LEAD_CARD_WIDTH),
      cardImage(deck.champion, LEAD_CARD_WIDTH),
      ...shown.map((entry) => cardImage(entry, MAIN_CARD_WIDTH)),
    ]),
    initialize(),
  ]);
  const [legendImage = null, championImage = null, ...mainImages] = images;
  const wanted = [legend, deck.champion, ...shown].filter(Boolean).length;
  const complete = images.filter(Boolean).length === wanted;
  const mainCount = deck.main.reduce((sum, entry) => sum + entry.count, deck.champion?.count ?? 0);

  const page = box(
    {
      width: DECK_IMAGE_WIDTH,
      height: DECK_IMAGE_HEIGHT,
      padding: 56,
      backgroundColor: COLOR.background,
      fontFamily: "Inter",
      color: COLOR.text,
    },
    glowLayer((legend?.card.domains ?? []).map((domain) => DOMAIN_COLORS[domain])),
    leadCards(legendImage, championImage),
    box(
      { flexDirection: "column", flexGrow: 1, flexShrink: 1, flexBasis: 0, justifyContent: "space-between" },
      box(
        { flexDirection: "column" },
        box(
          { fontFamily: "JetBrains Mono", fontSize: 20, color: COLOR.textMuted, letterSpacing: 2 },
          `RIFTBOUND DECK${mainCount > 0 ? ` · ${mainCount} CARDS` : ""}`,
        ),
        title(deckTitle(deck)),
        deck.champion &&
          box(
            { fontSize: 26, color: COLOR.textMuted, marginTop: 10 },
            box({ marginRight: 10 }, "Champion"),
            box({ color: COLOR.text, fontWeight: 600 }, cardLabel(deck.champion.card)),
          ),
      ),
      box(
        { flexDirection: "column", gap: 12 },
        box({ flexWrap: "wrap", gap: 12 }, ...formats.map(verdict)),
        problemLine(formats),
      ),
      mainStrip(shown, mainImages, main.length - shown.length),
      box(
        { justifyContent: "space-between", alignItems: "flex-end" },
        priceLabel(price),
        box(
          { alignItems: "center", fontFamily: "JetBrains Mono", fontSize: 22, color: COLOR.textMuted },
          box(
            { marginRight: 10, borderRadius: 4, backgroundColor: COLOR.text },
            svg(28, "0 0 16 16", { d: LOGO_PATH, fill: COLOR.background }),
          ),
          "riftkeeper.app",
        ),
      ),
    ),
  );

  const svgText = await satori(page, { width: DECK_IMAGE_WIDTH, height: DECK_IMAGE_HEIGHT, fonts: renderAssets.fonts });
  const resvg = new Resvg(svgText, { fitTo: { mode: "original" } });
  const rendered = resvg.render();
  const png = new Uint8Array(rendered.asPng());
  rendered.free();
  resvg.free();
  return { png, complete };
}

function glowLayer([first = COLOR.border, second = first]: readonly string[]): Element {
  const gradient = (id: string, color: string, opacity: number) => ({
    type: "radialGradient",
    props: {
      id,
      children: [
        { type: "stop", props: { offset: "0", "stop-color": color, "stop-opacity": opacity } },
        { type: "stop", props: { offset: "1", "stop-color": color, "stop-opacity": 0 } },
      ],
    },
  });
  return {
    type: "svg",
    props: {
      width: DECK_IMAGE_WIDTH,
      height: DECK_IMAGE_HEIGHT,
      viewBox: `0 0 ${DECK_IMAGE_WIDTH} ${DECK_IMAGE_HEIGHT}`,
      style: { position: "absolute", left: 0, top: 0 },
      children: [
        { type: "defs", props: { children: [gradient("first", first, 0.34), gradient("second", second, 0.24)] } },
        { type: "circle", props: { cx: 220, cy: 200, r: 520, fill: "url(#first)" } },
        { type: "circle", props: { cx: 1150, cy: 650, r: 480, fill: "url(#second)" } },
      ],
    },
  };
}

function leadCards(legendImage: string | null, championImage: string | null): Element {
  const legendWidth = 268;
  const championWidth = 222;
  return box(
    { position: "relative", width: 420, height: 518, marginRight: 40 },
    championImage !== null &&
      box(
        { position: "absolute", left: 182, top: 118, transform: "rotate(6deg)" },
        cardArt(championImage, championWidth, 10),
      ),
    box({ position: "absolute", left: 6, top: 30, transform: "rotate(-4deg)" }, cardArt(legendImage, legendWidth, 12)),
  );
}

function cardArt(image: string | null, width: number, radius: number): Element {
  const height = Math.round(width * CARD_RATIO);
  const frame = {
    width,
    height,
    borderRadius: radius,
    border: `2px solid ${COLOR.border}`,
    backgroundColor: COLOR.surfaceMuted,
    overflow: "hidden",
  };
  if (image === null) return box(frame);
  return box(frame, { type: "img", props: { src: image, width, height, style: { width, height } } });
}

function title(text: string): Element {
  const fontSize = text.length <= 18 ? 64 : text.length <= 26 ? 54 : 44;
  return box({ fontSize, fontWeight: 700, letterSpacing: -fontSize * 0.03, lineHeight: 1.05, marginTop: 14 }, text);
}

function cardLabel(card: Card): string {
  return card.subtitle ? `${card.name}, ${card.subtitle}` : card.name;
}

function verdict({ format, legal, upcomingBans }: FormatVerdict): Element {
  const name = FORMAT_NAMES[format] ?? format;
  const bans = legal && upcomingBans.length > 0;
  const colors = legal
    ? bans
      ? { surface: COLOR.warningSurface, border: COLOR.warningBorder, text: COLOR.warningText, icon: COLOR.warningText }
      : { surface: COLOR.surface, border: COLOR.border, text: COLOR.text, icon: COLOR.legal }
    : { surface: COLOR.dangerSurface, border: COLOR.dangerBorder, text: COLOR.dangerText, icon: COLOR.dangerText };
  const icon = legal
    ? svg(22, "0 0 24 24", {
        d: "M4 12.5l5 5L20 6.5",
        fill: "none",
        stroke: colors.icon,
        "stroke-width": 3.2,
        "stroke-linecap": "round",
        "stroke-linejoin": "round",
      })
    : svg(22, "0 0 24 24", {
        d: "M6 6l12 12M18 6L6 18",
        fill: "none",
        stroke: colors.icon,
        "stroke-width": 3.2,
        "stroke-linecap": "round",
      });
  return box(
    {
      alignItems: "center",
      gap: 10,
      padding: "10px 18px 10px 14px",
      borderRadius: 8,
      border: `1.5px solid ${colors.border}`,
      backgroundColor: colors.surface,
      color: colors.text,
      fontSize: 24,
    },
    icon,
    box({ fontWeight: 700 }, name),
    box({}, bans ? "Legal, bans coming" : legal ? "Legal" : "Not legal"),
  );
}

function problemLine(formats: readonly FormatVerdict[]): Element | null {
  const problem = formats.flatMap(({ problems }) => problems)[0];
  if (!problem) return null;
  return box(
    {
      display: "block",
      fontSize: 20,
      color: COLOR.textMuted,
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis",
    },
    problem.message,
  );
}

function mainStrip(entries: readonly DeckEntry[], images: readonly (string | null)[], hidden: number): Element | null {
  if (entries.length === 0) return null;
  const width = 84;
  return box(
    { gap: 8 },
    ...entries.map((entry, index) =>
      box(
        { position: "relative", flexDirection: "column" },
        cardArt(images[index] ?? null, width, 5),
        box(
          {
            position: "absolute",
            right: 4,
            bottom: 4,
            padding: "1px 6px",
            borderRadius: 4,
            backgroundColor: "rgba(12, 10, 9, 0.85)",
            fontFamily: "JetBrains Mono",
            fontSize: 16,
            color: COLOR.text,
          },
          `${entry.count}×`,
        ),
      ),
    ),
    hidden > 0 &&
      box(
        {
          width,
          height: Math.round(width * CARD_RATIO),
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 5,
          border: `2px solid ${COLOR.border}`,
          backgroundColor: COLOR.surface,
          fontFamily: "JetBrains Mono",
          fontSize: 20,
          color: COLOR.textMuted,
        },
        `+${hidden}`,
      ),
  );
}

function priceLabel(price: DeckPrice | null): Element {
  if (!price) return box({});
  const total = new Intl.NumberFormat("en-US", { style: "currency", currency: price.currency }).format(price.total);
  return box(
    { flexDirection: "column" },
    box({ fontSize: 18, color: COLOR.textMuted, letterSpacing: 1.5, fontFamily: "JetBrains Mono" }, "TCGPLAYER"),
    box(
      { alignItems: "baseline", gap: 12 },
      box({ fontFamily: "JetBrains Mono", fontSize: 40, color: COLOR.text }, total),
      price.unpriced > 0 && box({ fontSize: 20, color: COLOR.textMuted }, `+ ${price.unpriced} unpriced`),
    ),
  );
}

async function cardImage(entry: DeckEntry | null, width: number): Promise<string | null> {
  if (!entry) return null;
  const url = new URL(entry.printing.imageUrl);
  url.searchParams.set("w", String(width));
  url.searchParams.set("fm", "jpg");
  url.searchParams.set("q", "85");
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(IMAGE_TIMEOUT_MS) });
    const type = response.headers.get("content-type") ?? "";
    if (!response.ok || !/^image\/(jpeg|png)/.test(type)) return null;
    return `data:${type.split(";")[0]};base64,${base64(new Uint8Array(await response.arrayBuffer()))}`;
  } catch {
    return null;
  }
}

function base64(bytes: Uint8Array): string {
  let binary = "";
  for (let index = 0; index < bytes.length; index += 0x8000)
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  return btoa(binary);
}
