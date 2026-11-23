import userEvent from "@testing-library/user-event";
import { render, screen, within } from "@testing-library/vue";
import { describe, expect, test } from "vitest";
import CardPricing from "./CardPricing.vue";
import type { FinishPricing, PricingContent } from "./card-detail.ts";

const normal: FinishPricing = {
  finish: "Normal",
  market: "$0.10",
  range: [
    { label: "Low", amount: "$0.01" },
    { label: "High", amount: "$5.11" },
  ],
};
const foil: FinishPricing = { finish: "Foil", market: null, range: [{ label: "High", amount: "$99.00" }] };
const pricing: PricingContent = {
  finishes: [normal, foil],
  attribution: "Prices: TCGplayer market price via TCGCSV, updated Oct 31, 2026",
};

const isShown = (element: Element) => element.closest<HTMLElement>(".finish")?.style.display !== "none";

describe("CardPricing", () => {
  test("shows one finish with its market price, its low and high and no finish switch", () => {
    render(CardPricing, { props: { pricing: { ...pricing, finishes: [normal] } } });

    const region = screen.getByRole("region", { name: "Market price" });
    expect(within(region).queryByRole("group", { name: "Finish" })).toBeNull();
    expect(within(region).getByText("Normal")).toBeTruthy();
    expect(within(region).getByText("$0.10")).toBeTruthy();
    expect(within(region).getByText("Low").nextElementSibling?.textContent).toBe("$0.01");
    expect(within(region).getByText("High").nextElementSibling?.textContent).toBe("$5.11");
  });

  test("shows the first of several finishes and switches to the finish a reader chooses", async () => {
    render(CardPricing, { props: { pricing } });

    const finishes = screen.getByRole("group", { name: "Finish" });
    const [first, second] = within(finishes).getAllByRole("button");
    expect(first?.getAttribute("aria-pressed")).toBe("true");
    expect(isShown(screen.getByText("$0.10"))).toBe(true);
    expect(isShown(screen.getByText("$99.00"))).toBe(false);

    await userEvent.click(second as HTMLElement);

    expect(second?.getAttribute("aria-pressed")).toBe("true");
    expect(first?.getAttribute("aria-pressed")).toBe("false");
    expect(isShown(screen.getByText("$0.10"))).toBe(false);
    expect(isShown(screen.getByText("$99.00"))).toBe(true);
  });

  test("shows nothing for a missing market price", () => {
    render(CardPricing, { props: { pricing: { ...pricing, finishes: [foil] } } });

    const region = screen.getByRole("region", { name: "Market price" });
    expect(region.textContent).not.toMatch(/\$0\.00|—/);
    expect(region.querySelector("strong")).toBeNull();
  });

  test("shows the change and a chart for a finish with a trend, and neither without one", () => {
    const trend = {
      change: "▲ 12.5%",
      period: "30 days",
      description: "Up 12.5% in 30 days",
      days: [
        { date: "Oct 28", amount: 1, price: "$1.00" },
        { date: "Oct 29", amount: 1.1, price: "$1.10" },
        { date: "Oct 30", amount: null, price: null },
        { date: "Oct 31", amount: 1.125, price: "$1.13" },
      ],
    };
    const { unmount } = render(CardPricing, { props: { pricing: { ...pricing, finishes: [{ ...normal, trend }] } } });

    const region = screen.getByRole("region", { name: "Market price" });
    expect(within(region).getByRole("slider", { name: "Up 12.5% in 30 days" })).toBeTruthy();
    expect(region.textContent).toContain("▲ 12.5%");
    expect(region.textContent).toContain("30 days");
    unmount();

    render(CardPricing, { props: { pricing: { ...pricing, finishes: [normal] } } });
    expect(screen.queryByRole("slider")).toBeNull();
    expect(screen.getByRole("region", { name: "Market price" }).textContent).not.toMatch(/[▲▼]/);
  });

  test("credits the source and the date of the prices", () => {
    render(CardPricing, { props: { pricing } });

    expect(screen.getByText("Prices: TCGplayer market price via TCGCSV, updated Oct 31, 2026")).toBeTruthy();
  });
});
