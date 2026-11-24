import { describe, expect, test } from "bun:test";
import { codedInput, type DeckCheck, deckInput, deckQuery, typedInput } from "../app/utils/deck-url.ts";

const deck = (unknown: string[] = []) => ({ unknown }) as unknown as DeckCheck["deck"];
const check = (partner: DeckCheck["partner"], unknown: string[] = []) =>
  ({ deck: deck(unknown), code: "MINE", partner }) as unknown as DeckCheck;

describe("deck URLs", () => {
  test("a typed deck and partner become codes or lists, and survive a trip through the URL", () => {
    const input = typedInput("1 Discipline", "CEAAAAA");

    expect(input).toEqual({ list: "1 Discipline", partner: "CEAAAAA" });
    expect(deckInput(deckQuery(input))).toEqual(input);
    expect(deckInput({ p: "CEAAAAA" })).toBeNull();
  });

  test("pasted lists are replaced by codes only when every card in both decks was found", () => {
    const partner = { deck: deck(), code: "THEIRS" };

    expect(codedInput({ list: "x", partner: "THEIRS" }, check(partner))).toEqual({ code: "MINE", partner: "THEIRS" });
    expect(codedInput({ code: "MINE", partnerList: "x" }, check(partner))).toEqual({ code: "MINE", partner: "THEIRS" });
    expect(codedInput({ code: "MINE", partner: "THEIRS" }, check(partner))).toBeNull();
    expect(codedInput({ list: "x" }, check(null, ["Typo"]))).toBeNull();
    expect(codedInput({ code: "MINE", partnerList: "x" }, check({ deck: deck(["Typo"]), code: "THEIRS" }))).toBeNull();
  });
});
