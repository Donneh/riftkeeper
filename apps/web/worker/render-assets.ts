import inter400 from "@fontsource/inter/files/inter-latin-400-normal.woff";
import inter600 from "@fontsource/inter/files/inter-latin-600-normal.woff";
import inter700 from "@fontsource/inter/files/inter-latin-700-normal.woff";
import mono500 from "@fontsource/jetbrains-mono/files/jetbrains-mono-latin-500-normal.woff";
import resvgWasm from "@resvg/resvg-wasm/index_bg.wasm";
import type { Font } from "satori/standalone";
import layoutWasm from "satori/yoga.wasm";

const fonts: Font[] = [
  { name: "Inter", data: inter400, weight: 400 },
  { name: "Inter", data: inter600, weight: 600 },
  { name: "Inter", data: inter700, weight: 700 },
  { name: "JetBrains Mono", data: mono500, weight: 500 },
];

export const renderAssets = { layoutWasm, resvgWasm, fonts };
