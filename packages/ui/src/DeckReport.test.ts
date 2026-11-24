import { fireEvent, render, screen, within } from "@testing-library/vue";
import { describe, expect, test } from "vitest";
import DeckReport from "./DeckReport.vue";
import type { DeckReportContent } from "./deck-report.ts";

const announcement = "https://playriftbound.com/en-us/news/announcements/bans";
const report: DeckReportContent = {
  title: "Jinx, Loose Cannon",
  checkedOn: "Nov 24, 2026",
  verdicts: [
    {
      format: "Standard",
      legal: true,
      label: "Legal today",
      problems: [],
      upcoming: [{ text: "Jinx, Rebel is banned from Dec 1, 2026.", source: { label: "Bans", href: announcement } }],
    },
    {
      format: "2v2 Constructed",
      legal: false,
      label: "Not legal (1)",
      note: "Checked with your partner's deck.",
      problems: ["Banned: Jinx, Rebel."],
      upcoming: [],
    },
  ],
  sections: [
    {
      title: "Main deck",
      count: "3/40",
      lines: [{ count: 3, name: "Jinx, Rebel", code: "OGN-030", href: "/cards/jinx-rebel", status: "problem" }],
    },
  ],
  errata: [],
  price: { total: "$4.50", note: "TCGplayer market price" },
  code: "CEAAAAA",
};

describe("DeckReport", () => {
  test("shows each format's verdict with its problems and the bans announced for later", () => {
    render(DeckReport, { props: { report } });

    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Jinx, Loose Cannon");
    const upcoming = screen.getByRole("list", { name: "Standard upcoming bans" });
    expect(upcoming.textContent).toContain("Jinx, Rebel is banned from Dec 1, 2026.");
    expect(within(upcoming).getByRole("link", { name: "Bans" }).getAttribute("href")).toBe(announcement);
    expect(screen.queryByRole("list", { name: "Standard problems" })).toBeNull();
    expect(screen.getByRole("list", { name: "2v2 Constructed problems" }).textContent).toBe("Banned: Jinx, Rebel.");
    expect(screen.getByText("Checked with your partner's deck.")).toBeTruthy();
  });

  test("links each card, follows plain clicks in the app, and copies the deck code", async () => {
    const { emitted } = render(DeckReport, { props: { report } });

    const line = within(screen.getByRole("list", { name: "Main deck" })).getByRole("listitem");
    expect(line.dataset.status).toBe("problem");
    await fireEvent.click(within(line).getByRole("link", { name: "Jinx, Rebel" }));
    await fireEvent.click(screen.getByRole("button", { name: "Copy deck code" }));

    expect(emitted().navigate).toEqual([["/cards/jinx-rebel"]]);
    expect(emitted().copy).toEqual([["CEAAAAA"]]);
    expect(screen.getByRole("button", { name: "Deck code copied" })).toBeTruthy();
  });
});
