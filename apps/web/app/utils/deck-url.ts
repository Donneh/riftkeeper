import type {
  Deck,
  DeckErrata,
  DeckPrice,
  DeckPriceTrend,
  FormatVerdict,
  SectionChanges,
} from "@riftkeeper/cards/deck";
import type { PricedCard } from "@riftkeeper/cards/prices";

export interface DeckCheck {
  readonly deck: Deck<PricedCard>;
  readonly code: string | null;
  readonly checkedOn: string;
  readonly formats: readonly FormatVerdict[];
  readonly errata: readonly DeckErrata[];
  readonly price: DeckPrice | null;
  readonly partner: { readonly deck: Deck<PricedCard>; readonly code: string | null } | null;
  readonly priceTrend: DeckPriceTrend | null;
  readonly list: string;
  readonly comparison: {
    readonly deck: Deck<PricedCard>;
    readonly code: string | null;
    readonly changes: readonly SectionChanges[];
  } | null;
}

export interface DeckInput {
  readonly code?: string;
  readonly list?: string;
  readonly partner?: string;
  readonly partnerList?: string;
  readonly compare?: string;
}

const URL_KEYS = { code: "d", list: "list", partner: "p", partnerList: "plist", compare: "vs" } as const;

export function deckInput(query: Record<string, unknown>): DeckInput | null {
  const input = Object.fromEntries(
    Object.entries(URL_KEYS).flatMap(([key, param]) => {
      const value = query[param];
      return typeof value === "string" && value.trim() ? [[key, value.trim()]] : [];
    }),
  ) as DeckInput;
  return input.code === undefined && input.list === undefined ? null : input;
}

export function deckQuery(input: DeckInput): Record<string, string> {
  return Object.fromEntries(
    Object.entries(URL_KEYS).flatMap(([key, param]) => {
      const value = input[key as keyof DeckInput];
      return value === undefined ? [] : [[param, value]];
    }),
  );
}

const isDeckCode = (text: string) => /^[A-Z2-7]+$/i.test(text);

export function typedInput(deck: string, partner: string): DeckInput {
  return {
    ...(isDeckCode(deck) ? { code: deck } : { list: deck }),
    ...(partner === "" ? {} : isDeckCode(partner) ? { partner } : { partnerList: partner }),
  };
}

export function codedInput(input: DeckInput, check: DeckCheck): DeckInput | null {
  const lists = input.list !== undefined || input.partnerList !== undefined;
  const known = check.deck.unknown.length === 0 && (check.partner?.deck.unknown.length ?? 0) === 0;
  if (!lists || !known || check.code === null || (check.partner !== null && check.partner.code === null)) return null;
  return {
    code: check.code,
    ...(check.partner?.code ? { partner: check.partner.code } : {}),
    ...(input.compare === undefined ? {} : { compare: input.compare }),
  };
}
