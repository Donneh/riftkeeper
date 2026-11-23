import { afterEach, beforeEach, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { keepLiveAssets } from "../live-assets/live-assets.ts";

const site = "https://riftkeeper.test";
let assetsDir: string;
let requested: string[];

let liveFiles: Record<string, { body: string; type: string }>;

const liveSite = (): typeof liveFiles => ({
  "/": {
    body: '<link rel="stylesheet" href="/_nuxt/entry.old1.css"><script type="module" src="/_nuxt/Entry0ld.js"></script>',
    type: "text/html",
  },
  "/_nuxt/Entry0ld.js": {
    body: 'const deps=["./Page0ld.js","./Shared.js","./entry.old1.css"];import("./Page0ld.js")',
    type: "text/javascript",
  },
  "/_nuxt/Page0ld.js": { body: 'import{a}from"./Lazy-0ld_x.js"', type: "text/javascript" },
  "/_nuxt/Lazy-0ld_x.js": { body: "export const a=1", type: "text/javascript" },
  "/_nuxt/entry.old1.css": {
    body: "@font-face{src:url(./inter-latin.F0nt_1.woff2)}",
    type: "text/css",
  },
  "/_nuxt/inter-latin.F0nt_1.woff2": { body: "font bytes", type: "font/woff2" },
  "/_nuxt/builds/latest.json": { body: '{"id":"old-build","timestamp":1}', type: "application/json" },
  "/_nuxt/builds/meta/old-build.json": { body: '{"id":"old-build"}', type: "application/json" },
});

const fakeFetch = (async (input: string | URL | Request) => {
  const { pathname } = new URL(input instanceof Request ? input.url : input);
  requested.push(pathname);
  const file = liveFiles[pathname];
  return file
    ? new Response(file.body, { headers: { "content-type": file.type } })
    : new Response("<!doctype html><div id=__nuxt></div>", { headers: { "content-type": "text/html" } });
}) as typeof fetch;

beforeEach(() => {
  assetsDir = mkdtempSync(join(tmpdir(), "live-assets-"));
  requested = [];
  liveFiles = liveSite();
  mkdirSync(join(assetsDir, "builds", "meta"), { recursive: true });
  writeFileSync(join(assetsDir, "Shared.js"), 'import"./SharedDep.js"');
  writeFileSync(join(assetsDir, "SharedDep.js"), "export{}");
  writeFileSync(join(assetsDir, "builds", "latest.json"), '{"id":"new-build"}');
});

afterEach(() => rmSync(assetsDir, { recursive: true, force: true }));

test("copies every file the live page loads, directly or through other files, that the new build lacks", async () => {
  const kept = await keepLiveAssets(site, assetsDir, fakeFetch);

  expect(kept.sort()).toEqual(
    [
      "Entry0ld.js",
      "Lazy-0ld_x.js",
      "Page0ld.js",
      "builds/meta/old-build.json",
      "entry.old1.css",
      "inter-latin.F0nt_1.woff2",
    ].sort(),
  );
  expect(readFileSync(join(assetsDir, "Lazy-0ld_x.js"), "utf8")).toBe("export const a=1");
  expect(readFileSync(join(assetsDir, "inter-latin.F0nt_1.woff2"), "utf8")).toBe("font bytes");
  expect(readFileSync(join(assetsDir, "builds", "latest.json"), "utf8")).toBe('{"id":"new-build"}');
  expect(requested).not.toContain("/_nuxt/Shared.js");
  expect(requested).not.toContain("/_nuxt/SharedDep.js");
});

test("fails instead of saving the fallback page when the live site does not have a referenced file", async () => {
  liveFiles["/_nuxt/Page0ld.js"] = { body: 'import"./Missing.js"', type: "text/javascript" };

  await expect(keepLiveAssets(site, assetsDir, fakeFetch)).rejects.toThrow(
    "https://riftkeeper.test/_nuxt/Missing.js: expected an asset, received HTML",
  );
  expect(existsSync(join(assetsDir, "Missing.js"))).toBe(false);
});
