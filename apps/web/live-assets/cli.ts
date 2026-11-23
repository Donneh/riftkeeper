import { keepLiveAssets } from "./live-assets.ts";

const [siteUrl, assetsDir] = process.argv.slice(2);
if (!siteUrl || !assetsDir) throw new Error("Usage: bun live-assets/cli.ts <site URL> <assets directory>");

const kept = await keepLiveAssets(siteUrl, assetsDir);
console.log(`Kept ${kept.length} files that ${siteUrl} still serves:`);
for (const file of kept) console.log(`  ${file}`);
