import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const ASSET_REFERENCE =
  /(?:\/_nuxt\/|\.\/)([\w.-]+\.(?:js|css|woff2?|ttf|otf|png|jpe?g|gif|svg|webp|avif|ico))(?![\w.-])/g;

export function assetReferences(text: string): string[] {
  return [...new Set([...text.matchAll(ASSET_REFERENCE)].map(([, file]) => file ?? ""))];
}

async function download(siteUrl: string, path: string, fetchFile: typeof fetch) {
  const url = new URL(path, siteUrl);
  const response = await fetchFile(url);
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return response;
}

async function downloadAsset(siteUrl: string, path: string, fetchFile: typeof fetch) {
  const response = await download(siteUrl, path, fetchFile);
  if (response.headers.get("content-type")?.includes("text/html")) {
    throw new Error(`${new URL(path, siteUrl)}: expected an asset, received HTML`);
  }
  return new Uint8Array(await response.arrayBuffer());
}

function keep(assetsDir: string, file: string, content: Uint8Array) {
  const target = join(assetsDir, file);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, content);
}

export async function keepLiveAssets(siteUrl: string, assetsDir: string, fetchFile: typeof fetch = fetch) {
  const kept: string[] = [];
  const queue = assetReferences(await (await download(siteUrl, "/", fetchFile)).text());
  const seen = new Set(queue);

  for (let file = queue.shift(); file !== undefined; file = queue.shift()) {
    const target = join(assetsDir, file);
    let content: Uint8Array;
    if (existsSync(target)) {
      content = readFileSync(target);
    } else {
      content = await downloadAsset(siteUrl, `/_nuxt/${file}`, fetchFile);
      keep(assetsDir, file, content);
      kept.push(file);
    }
    if (!file.endsWith(".js") && !file.endsWith(".css")) continue;
    for (const reference of assetReferences(new TextDecoder().decode(content))) {
      if (seen.has(reference)) continue;
      seen.add(reference);
      queue.push(reference);
    }
  }

  const latest = JSON.parse(
    new TextDecoder().decode(await downloadAsset(siteUrl, "/_nuxt/builds/latest.json", fetchFile)),
  ) as { id: string };
  const meta = `builds/meta/${latest.id}.json`;
  if (!existsSync(join(assetsDir, meta))) {
    keep(assetsDir, meta, await downloadAsset(siteUrl, `/_nuxt/${meta}`, fetchFile));
    kept.push(meta);
  }

  return kept;
}
