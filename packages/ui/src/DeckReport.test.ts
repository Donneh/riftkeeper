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
      lines: [
        {
          count: 3,
          name: "Jinx, Rebel",
          code: "OGN-030",
          href: "/cards/jinx-rebel",
          status: "problem",
          imageUrl: "/jinx.png",
          srcset: "",
          orientation: "portrait",
          price: "$1.50",
          cheaper: "$0.40 as OGN-030a",
        },
        {
          count: 1,
          name: "Vi, Destructive",
          code: "OGN-040",
          href: "/cards/vi-destructive",
          status: "upcoming",
          imageUrl: "/vi.png",
          srcset: "",
          orientation: "portrait",
          price: null,
          cheaper: null,
        },
      ],
    },
  ],
  errata: [],
  price: { total: "$4.50", note: "TCGplayer market price", cheapest: null, trend: null },
  code: "CEAAAAA",
  list: "Main deck:\n3 Jinx, Rebel (OGN-030)",
  odds: null,
  comparison: null,
};
const props = { report, view: "list" as const, hand: null };

describe("DeckReport", () => {
  test("shows each format's verdict with its problems and the bans announced for later", () => {
    render(DeckReport, { props });

    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Jinx, Loose Cannon");
    const upcoming = screen.getByRole("list", { name: "Standard upcoming bans" });
    expect(upcoming.textContent).toContain("Jinx, Rebel is banned from Dec 1, 2026.");
    expect(within(upcoming).getByRole("link", { name: "Bans" }).getAttribute("href")).toBe(announcement);
    expect(screen.queryByRole("list", { name: "Standard problems" })).toBeNull();
    expect(screen.getByRole("list", { name: "2v2 Constructed problems" }).textContent).toBe("Banned: Jinx, Rebel.");
    expect(screen.getByText("Checked with your partner's deck.")).toBeTruthy();
  });

  test("links each card, follows plain clicks in the app, and copies the deck code", async () => {
    const { emitted } = render(DeckReport, { props });

    const line = within(screen.getByRole("list", { name: "Main deck" })).getAllByRole("listitem")[0] as HTMLElement;
    expect(line.dataset.status).toBe("problem");
    await fireEvent.click(within(line).getByRole("link", { name: "Jinx, Rebel" }));
    await fireEvent.click(screen.getByRole("button", { name: "Copy deck code" }));

    expect(emitted().navigate).toEqual([["/cards/jinx-rebel"]]);
    expect(emitted().copy).toEqual([["CEAAAAA"]]);
    expect(screen.getByRole("button", { name: "Deck code copied" })).toBeTruthy();
  });

  test("names each card with its count and status in the image views, and asks to switch views", async () => {
    const { emitted } = render(DeckReport, { props: { ...props, view: "stacks" } });

    const cards = within(screen.getByRole("list", { name: "Main deck" })).getAllByRole("link");
    expect(cards.map((card) => card.getAttribute("aria-label"))).toEqual([
      "3 × Jinx, Rebel, problem",
      "1 × Vi, Destructive, ban coming",
    ]);
    expect(screen.getByRole("button", { name: "Stacks" }).getAttribute("aria-pressed")).toBe("true");
    await fireEvent.click(screen.getByRole("button", { name: "List" }));

    expect(emitted().view).toEqual([["list"]]);
  });

  test("shows the cheaper printing in the list, compares by code, and copies the tournament list", async () => {
    const { emitted, rerender } = render(DeckReport, { props });

    expect(screen.getByText("$0.40 as OGN-030a")).toBeTruthy();
    await fireEvent.update(screen.getByLabelText(/Compare with another deck code/), "  CMAAAA  ");
    await fireEvent.submit(screen.getByRole("button", { name: "Compare" }));
    await fireEvent.click(screen.getByRole("button", { name: "Copy tournament list" }));
    expect(emitted().compare).toEqual([["CMAAAA"]]);
    expect(emitted()["copy-list"]).toEqual([[report.list]]);

    await rerender({
      ...props,
      report: {
        ...report,
        comparison: {
          title: "Older list",
          href: "/deck?d=CMAAAA",
          sections: [
            {
              title: "Main deck",
              lines: [
                {
                  name: "Vi, Destructive",
                  href: "/cards/vi-destructive",
                  change: "+1",
                  direction: "added",
                  detail: "0 → 1",
                },
              ],
            },
          ],
        },
      },
    });
    expect(screen.getByRole("list", { name: "Main deck changes" }).textContent).toContain("+1Vi, Destructive0 → 1");
    await fireEvent.click(screen.getByRole("button", { name: "Stop comparing" }));
    expect(emitted()["clear-comparison"]).toHaveLength(1);
  });
});
