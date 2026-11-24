import { apiBase } from "../playwright.config.ts";
import { expect, failedResponse, test } from "./browser-console.ts";

test("a pasted list is checked per format and replaced by a deck code that loads the same deck", async ({
  page,
  request,
}) => {
  const response = await request.get(`${apiBase}/search`, { params: { q: "type:legend", view: "cards" } });
  const { data } = (await response.json()) as { data: { name: string }[] };
  const legend = data[0]?.name as string;

  await page.goto("/deck");
  await page.getByLabel("Deck code or list", { exact: true }).fill(`Legend:\n1 ${legend}`);
  await page.getByRole("button", { name: "Check deck" }).click();

  await expect(page).toHaveURL(/\/deck\?d=[A-Z2-7]+$/);
  for (const format of ["Standard", "2v2 Constructed"])
    await expect(page.getByRole("list", { name: `${format} problems` })).toContainText("it needs exactly 40");
  await expect(page.getByRole("list", { name: "Legend" })).toContainText(legend);

  await page.reload();
  await expect(page.getByRole("list", { name: "Legend" })).toContainText(legend);
});

test("a 2v2 partner with the same legend fails only the 2v2 verdict and stays in the URL", async ({
  page,
  request,
}) => {
  const response = await request.get(`${apiBase}/search`, { params: { q: "type:legend", view: "cards" } });
  const { data } = (await response.json()) as { data: { name: string }[] };
  const legend = data[0]?.name as string;

  await page.goto("/deck");
  await page.getByLabel("Deck code or list", { exact: true }).fill(`Legend:\n1 ${legend}`);
  await page.getByLabel("2v2 partner's deck code or list (optional)").fill(`1 ${legend}`);
  await page.getByRole("button", { name: "Check deck" }).click();

  await expect(page).toHaveURL(/\/deck\?d=[A-Z2-7]+&p=[A-Z2-7]+$/);
  const shared = "Your partner plays the same legend";
  await expect(page.getByRole("list", { name: "2v2 Constructed problems" })).toContainText(shared);
  await expect(page.getByRole("list", { name: "Standard problems" })).not.toContainText(shared);
  await expect(page.getByText("Checked with your partner's deck")).toBeVisible();

  await page.reload();
  await expect(page.getByRole("list", { name: "2v2 Constructed problems" })).toContainText(shared);
});

test("a deck code that can't be read says why", async ({ page, browserConsole }) => {
  browserConsole.expect(failedResponse(400, "/decks/check"));
  await page.goto("/deck?d=NOTACODE1");

  await expect(page.getByRole("status")).toContainText("Deck could not be read");
  await expect(page).toHaveTitle("Deck could not be read · Riftkeeper");
});

test("a deck keeps its chosen view, draws sample hands and compares with another deck code", async ({
  page,
  request,
}) => {
  const names = async (q: string) => {
    const response = await request.get(`${apiBase}/search`, { params: { q, view: "cards" } });
    const { data } = (await response.json()) as { data: { name: string }[] };
    return data.map((card) => card.name);
  };
  const [legend] = await names("type:legend");
  const [first, second] = await names("type:unit");
  const code = async (list: string) => {
    await page.goto("/deck");
    await page.getByLabel("Deck code or list", { exact: true }).fill(list);
    await page.getByRole("button", { name: "Check deck" }).click();
    await expect(page).toHaveURL(/\/deck\?d=[A-Z2-7]+$/);
    return new URL(page.url()).searchParams.get("d") as string;
  };
  const before = await code(`Legend:\n1 ${legend}\nMain deck:\n3 ${first}`);
  await code(`Legend:\n1 ${legend}\nMain deck:\n3 ${first}\n3 ${second}`);

  await page.getByRole("button", { name: "Images" }).click();
  await page.reload();
  await expect(page.getByRole("button", { name: "Images" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("list", { name: "Main deck" }).getByRole("link").first()).toHaveAttribute(
    "aria-label",
    /^3 × /,
  );

  await page.getByRole("button", { name: "Draw a sample hand" }).click();
  await expect(page.getByRole("list", { name: "Sample hand" }).getByRole("listitem")).toHaveCount(4);

  await page.getByLabel(/Compare with another deck code/).fill(before);
  await page.getByRole("button", { name: "Compare", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`&vs=${before}$`));
  await expect(page.getByRole("list", { name: "Main deck changes" })).toContainText(`+3${second}`);
});
