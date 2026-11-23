import { fireEvent, render, screen, within } from "@testing-library/vue";
import { describe, expect, test } from "vitest";
import CardLegality from "./CardLegality.vue";
import type { LegalityRow } from "./card-detail.ts";

const announcement = "https://playriftbound.com/en-us/news/announcements/july-ban-list-updates";
const rows: LegalityRow[] = [
  { format: "Standard", status: "legal", label: "Legal" },
  {
    format: "2v2 Constructed",
    status: "banned",
    label: "Banned",
    banList: { label: "Ban list", href: "/?q=banned%3A2v2" },
    source: { label: "July Ban List Updates", href: announcement },
  },
  { format: "Sealed", status: "legal", label: "Legal", note: "No ban list" },
];

describe("CardLegality", () => {
  test("pairs each format with its status, and lists the notes and links of the formats that have them", () => {
    render(CardLegality, { props: { rows } });

    const region = screen.getByRole("region", { name: "Legality" });
    const terms = within(region)
      .getAllByRole("term")
      .map((term) => term.textContent);
    const definitions = within(region)
      .getAllByRole("definition")
      .map((definition) => definition.textContent);
    expect(terms).toEqual(["Standard", "2v2 Constructed", "Sealed"]);
    expect(definitions).toEqual(["Legal", "Banned", "Legal"]);
    const details = within(region)
      .getAllByRole("listitem")
      .map((item) => [...item.children].map((part) => part.textContent));
    expect(details).toEqual([
      ["2v2 Constructed:", "Ban list", "July Ban List Updates"],
      ["Sealed:", "No ban list"],
    ]);
    expect(within(region).getByRole("link", { name: "July Ban List Updates" }).getAttribute("href")).toBe(announcement);
  });

  test("the ban list link names its format and navigates in the app on a plain click only", async () => {
    const { emitted } = render(CardLegality, { props: { rows } });
    const link = screen.getByRole("link", { name: "2v2 Constructed ban list" });

    expect(link.getAttribute("href")).toBe("/?q=banned%3A2v2");
    await fireEvent.click(link, { ctrlKey: true });
    await fireEvent.click(link);
    expect(emitted("navigate")).toEqual([["/?q=banned%3A2v2"]]);
  });
});
