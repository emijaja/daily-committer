// キャラの線（src/components/mascot-art.tsx）から PWA のアイコンと favicon を書き出す。
// 頭と顔（ふつうの表情）だけを黄色地に置く（体まで入れると枝や体の白がはみ出して見えるため）。
// 使い方: pnpm icons
import { readFileSync, writeFileSync } from "node:fs";
import sharp from "sharp";

const YELLOW = "#fff100"; // --color-yellow
const src = readFileSync("src/components/mascot-art.tsx", "utf8");

/** JSX の <path> を SVG の属性に直す（黒は currentColor、白は fill-white で書かれている） */
const toSvg = (jsx) =>
  jsx
    .replace(/<\/?>/g, "")
    .replace(/className="fill-white"/g, 'fill="#ffffff"')
    .replace(/currentColor/g, "#000000")
    .replace(/strokeWidth=/g, "stroke-width=")
    .replace(/strokeLinecap=/g, "stroke-linecap=")
    .replace(/strokeLinejoin=/g, "stroke-linejoin=");

const pick = (re, what) => {
  const m = src.match(re);
  if (!m) throw new Error(`mascot-art.tsx に ${what} が見つからない`);
  return m[1];
};
const body = pick(/export const mascotBody = \(([\s\S]*?)\);\n/, "mascotBody");
const face = pick(/normal: \(([\s\S]*?)\),\n\s*grumpy/, "normal の顔");

// 頭の輪郭・目の模様（左右）・鼻の4本。頭の輪郭は白で塗る
const head = body
  .match(/<path[\s\S]*?\/>/g)
  .filter((p) => /d="M(98\.8|98\.0|147\.7|125\.7)/.test(p));
if (head.length !== 4)
  throw new Error(`頭の線が4本ではない（${head.length}本）`);
head[0] = head[0].replace("<path", '<path className="fill-white"');
const art = toSvg(head.join("\n") + face);

/** 頭を中心にした正方形（元の SVG の座標） */
const HEAD = { cx: 124.3, cy: 88.2, size: 56 };

/** scale: アイコンの一辺に対して頭が占める割合 */
function svg(scale) {
  const view = HEAD.size / scale;
  const x = HEAD.cx - view / 2;
  const y = HEAD.cy - view / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${view} ${view}" fill="none">
<rect x="${x - 10}" y="${y - 10}" width="${view + 20}" height="${view + 20}" fill="${YELLOW}"/>
${art}
</svg>`;
}

const png = (s, size) =>
  sharp(Buffer.from(s), { density: 600 })
    .resize(size, size)
    .flatten({ background: YELLOW })
    .png()
    .toBuffer();

// any は頭を大きめに、maskable と apple-icon は丸く切り抜かれても欠けないよう小さめ（セーフゾーンの内側）
const any = svg(0.84);
const mask = svg(0.62);
const outputs = [
  [any, 192, "public/icons/icon-192.png"],
  [any, 512, "public/icons/icon-512.png"],
  [mask, 512, "public/icons/icon-maskable-512.png"],
  [mask, 180, "src/app/apple-icon.png"],
];
for (const [s, size, path] of outputs) writeFileSync(path, await png(s, size));

// favicon.ico（PNG を埋め込んだ ICO。16・32・48px）
// ICO の中の PNG は RGBA でないと Next.js のビルドが読めないので、アルファを付ける
const sizes = [16, 32, 48];
const images = await Promise.all(
  sizes.map((n) =>
    png(any, n).then((b) => sharp(b).ensureAlpha().png().toBuffer()),
  ),
);
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0); // reserved
header.writeUInt16LE(1, 2); // type: icon
header.writeUInt16LE(sizes.length, 4);
let offset = 6 + 16 * sizes.length;
const entries = sizes.map((n, i) => {
  const e = Buffer.alloc(16);
  e.writeUInt8(n, 0);
  e.writeUInt8(n, 1);
  e.writeUInt16LE(1, 4); // color planes
  e.writeUInt16LE(32, 6); // bits per pixel
  e.writeUInt32LE(images[i].length, 8);
  e.writeUInt32LE(offset, 12);
  offset += images[i].length;
  return e;
});
writeFileSync(
  "src/app/favicon.ico",
  Buffer.concat([header, ...entries, ...images]),
);
