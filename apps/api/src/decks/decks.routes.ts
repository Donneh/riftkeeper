import { zValidator } from "@hono/zod-validator";
import {
  checkDeck,
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
} from "@riftkeeper/cards/deck";
import type { PriceHistory } from "@riftkeeper/cards/price-history";
import type { PricedCard } from "@riftkeeper/cards/prices";
import type { RulesSnapshot } from "@riftkeeper/cards/rules";
import { type Context, Hono } from "hono";
import { z } from "zod";
import { errorBody } from "../http/errors.ts";
import { utcToday } from "../search/search.routes.ts";

export const MAX_CODE_LENGTH = 1024;
export const MAX_LIST_LENGTH = 8192;
const CACHE_SECONDS = 300;

const CheckParamsSchema = z
  .object({
    code: z.string().trim().min(1).max(MAX_CODE_LENGTH).optional(),
    list: z.string().trim().min(1).max(MAX_LIST_LENGTH).optional(),
    partner: z.string().trim().min(1).max(MAX_CODE_LENGTH).optional(),
    partnerList: z.string().trim().min(1).max(MAX_LIST_LENGTH).optional(),
    compare: z.string().trim().min(1).max(MAX_CODE_LENGTH).optional(),
  })
  .refine(({ code, list }) => (code === undefined) !== (list === undefined), "Pass either a deck code or a list.")
  .refine(
    ({ partner, partnerList }) => partner === undefined || partnerList === undefined,
    "Pass the partner's deck as a code or a list, not both.",
  );

function readDeck(cards: readonly PricedCard[], code: string | undefined, list: string | undefined) {
  if (code !== undefined) return readDeckCode(code, cards);
  return list === undefined ? null : readDeckList(list, cards);
}

function unreadable(c: Context, error: unknown, prefix: string) {
  if (!(error instanceof DeckCodeError)) throw error;
  return c.json(errorBody({ code: "invalid_request", message: `${prefix}${error.message}` }), 400);
}

export function createDecksRoutes({
  cards,
  priceHistory,
  rules,
}: {
  cards: readonly PricedCard[];
  priceHistory: PriceHistory;
  rules: RulesSnapshot;
}) {
  return new Hono().get(
    "/check",
    zValidator("query", CheckParamsSchema, (result, c) => {
      if (!result.success) {
        return c.json(errorBody({ code: "invalid_request", message: z.prettifyError(result.error) }), 400);
      }
    }),
    (c) => {
      const { code, list, partner: partnerCode, partnerList, compare } = c.req.valid("query");
      let deck: Deck<PricedCard>;
      let partner: Deck<PricedCard> | null;
      try {
        deck = readDeck(cards, code, list) as Deck<PricedCard>;
      } catch (error) {
        return unreadable(c, error, "");
      }
      try {
        partner = readDeck(cards, partnerCode, partnerList);
      } catch (error) {
        return unreadable(c, error, "Your partner's deck: ");
      }
      let compared: Deck<PricedCard> | null;
      try {
        compared = readDeck(cards, compare, undefined);
      } catch (error) {
        return unreadable(c, error, "The deck to compare with: ");
      }
      const today = utcToday();
      c.header("Cache-Control", `public, max-age=${CACHE_SECONDS}`);
      return c.json(
        {
          data: {
            deck,
            code: deckCode(deck),
            checkedOn: today,
            formats: checkDeck(deck, rules, today, partner),
            partner: partner === null ? null : { deck: partner, code: deckCode(partner) },
            errata: deckErrata(deck, rules),
            price: deckPrice(deck),
            priceTrend: deckPriceTrend(deck, priceHistory),
            list: deckListText(deck),
            comparison:
              compared === null
                ? null
                : { deck: compared, code: deckCode(compared), changes: deckDiff(compared, deck) },
          },
        },
        200,
      );
    },
  );
}
