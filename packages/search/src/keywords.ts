import type { Domain } from "@riftkeeper/cards";
import { FORMATS } from "@riftkeeper/cards/values";
import type { FilterField } from "./filter.ts";

export const FORMAT_VALUES = [...FORMATS, "sealed"] as const;
export const IS_VALUES = ["errata"] as const;

export const FILTER_KEYWORDS: { readonly [F in FilterField]: readonly [F, ...string[]] } = {
  cost: ["cost"],
  might: ["might", "m"],
  power: ["power", "p"],
  price: ["price", "usd"],
  domain: ["domain", "d", "c", "color"],
  identity: ["identity", "id"],
  tag: ["tag", "t"],
  type: ["type"],
  supertype: ["supertype"],
  rarity: ["rarity", "r"],
  variant: ["variant"],
  format: ["format", "f", "legal"],
  banned: ["banned"],
  is: ["is"],
  set: ["set", "s"],
  artist: ["artist", "a"],
  ability: ["ability"],
  effect: ["effect"],
  keyword: ["keyword", "k"],
  name: ["name"],
};

export const UNSUPPORTED_KEYWORDS: ReadonlySet<string> = new Set(["promo", "owned", "flavor"]);

export const COLOR_ALIASES: ReadonlyMap<string, Domain> = new Map<string, Domain>([
  ["red", "fury"],
  ["green", "calm"],
  ["blue", "mind"],
  ["orange", "body"],
  ["purple", "chaos"],
  ["yellow", "order"],
]);
