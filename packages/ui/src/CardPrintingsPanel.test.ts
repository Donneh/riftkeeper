import userEvent from "@testing-library/user-event";
import { render, screen, within } from "@testing-library/vue";
import { describe, expect, test } from "vitest";
import CardPrintingsPanel from "./CardPrintingsPanel.vue";
import type { PricingContent } from "./card-detail.ts";

const printing = { setName: "Origins", orientation: "portrait" as const, prices: [] };
const printings = [
  { ...printing, id: "ogn-119", code: "OGN-119/298", details: ["Standard"], imageUrl: "https://e.com/1.png" },
  { ...printing, id: "ogn-119a", code: "OGN-119a/298", details: ["Alt art"], imageUrl: "https://e.com/2.png" },
];
const pricing: PricingContent = {
  finishes: [{ finish: "Foil", market: "$12.34", range: [] }],
  attribution: "Prices: TCGplayer market price via TCGCSV, updated Oct 31, 2026",
};

describe("CardPrintingsPanel", () => {
  test("lists the printings above the market price and reports the printing a reader chooses", async () => {
    const { emitted } = render(CardPrintingsPanel, { props: { printings, selected: "ogn-119", pricing } });

    const list = screen.getByRole("list", { name: "Printings" });
    const price = screen.getByRole("region", { name: "Market price" });
    expect(list.compareDocumentPosition(price) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(within(list).getByRole("button", { pressed: true }).textContent).toContain("OGN-119/298");
    await userEvent.click(within(list).getByRole("button", { name: /OGN-119a/ }));
    expect(emitted("select")).toEqual([["ogn-119a"]]);
  });

  test("shows no market price for a printing without one", () => {
    render(CardPrintingsPanel, { props: { printings, selected: "ogn-119", pricing: null } });

    expect(screen.getByRole("list", { name: "Printings" })).toBeTruthy();
    expect(screen.queryByRole("region", { name: "Market price" })).toBeNull();
  });
});
