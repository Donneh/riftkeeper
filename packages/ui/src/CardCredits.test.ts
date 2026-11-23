import userEvent from "@testing-library/user-event";
import { fireEvent, render, screen, within } from "@testing-library/vue";
import { describe, expect, test } from "vitest";
import CardCredits from "./CardCredits.vue";
import type { CardInfoContent } from "./card-detail.ts";

const yasuo: CardInfoContent = {
  name: "Unforgiven",
  subtitle: null,
  kicker: [
    { parts: [{ kind: "text", text: "Calm" }], href: "/?q=d%3Acalm" },
    { parts: [{ kind: "text", text: "Legend" }], href: "/?q=type%3Alegend" },
  ],
  stats: [],
  rules: [],
  legendSearch: { label: "Cards for this legend", href: "/?q=id%3Acalm%2Cchaos" },
  tags: [{ label: "Yasuo", href: "/?q=t%3AYasuo" }],
  artist: { label: "Six More Vodka", href: "/?q=a%3A%22Six%20More%20Vodka%22" },
  pricing: null,
  legality: null,
  notes: [],
};

describe("CardCredits", () => {
  test("links the domain, type, legend search, tags and artist on a plain click only", async () => {
    const { emitted } = render(CardCredits, { props: { card: yasuo } });

    const artist = screen.getByRole("link", { name: "Six More Vodka" });
    expect(artist.closest("p")?.textContent?.replace(/\s+/g, " ").trim()).toBe("Illustrated by Six More Vodka");
    const tag = within(screen.getByRole("list", { name: "Tags" })).getByRole("link", { name: "Yasuo" });
    const links = ["Calm", "Legend", "Cards for this legend"].map((name) => screen.getByRole("link", { name }));
    expect(links[2]?.getAttribute("href")).toBe("/?q=id%3Acalm%2Cchaos");

    await fireEvent.click(artist, { ctrlKey: true });
    for (const link of [...links, tag, artist]) await userEvent.click(link);
    expect(emitted("navigate")).toEqual([
      ["/?q=d%3Acalm"],
      ["/?q=type%3Alegend"],
      ["/?q=id%3Acalm%2Cchaos"],
      ["/?q=t%3AYasuo"],
      ["/?q=a%3A%22Six%20More%20Vodka%22"],
    ]);
  });

  test("leaves out the legend search, tags and credit when the card has none", () => {
    const { legendSearch: _, ...card } = yasuo;
    render(CardCredits, { props: { card: { ...card, tags: [], artist: null } } });

    expect(screen.queryByRole("list", { name: "Tags" })).toBeNull();
    expect(screen.queryByText(/Illustrated by/)).toBeNull();
    expect(screen.queryByRole("link", { name: "Cards for this legend" })).toBeNull();
  });
});
