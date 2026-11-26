import { expect, test } from "./browser-console.ts";

test("a legend, a champion choice and an added card build a deck that survives a reload", async ({ page }) => {
  await page.goto("/build");
  await page.getByRole("list", { name: "Pick your legend" }).getByRole("button").first().click();
  const skip = page.getByRole("button", { name: "Skip for now" });
  if (await skip.isVisible()) await skip.click();

  const results = page.getByRole("list", { name: "Cards you can add" });
  const add = results.getByRole("button", { name: /^Add / }).first();
  await expect(add).toBeEnabled();
  const name = ((await add.getAttribute("aria-label")) ?? "").replace(/^Add /, "");
  await add.click();
  await add.click();

  await expect(page).toHaveURL(/\/build\?id=/);
  const pile = page.getByRole("listitem", { name: `2 × ${name}`, exact: false });
  await expect(pile).toBeVisible();

  await page.reload();
  await expect(page.getByRole("listitem", { name: `2 × ${name}`, exact: false })).toBeVisible();
  await expect(page.getByText("Saved on this device")).toBeVisible();
});
