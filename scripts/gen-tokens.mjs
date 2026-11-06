// docs/design/tokens.json から src/styles/tokens.css（Tailwind v4 の @theme）を生成する。
// 使い方: pnpm tokens
import { readFileSync, writeFileSync } from "node:fs";

const tokens = JSON.parse(readFileSync("docs/design/tokens.json", "utf8"));
const kebab = (s) =>
  s
    .replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)
    .replace(/(\D)(\d)/g, "$1-$2");
const pct = (v) =>
  typeof v === "string" && v.endsWith("%") ? `${parseFloat(v) / 100}em` : v;
const lines = [];

for (const [name, value] of Object.entries(tokens.color)) {
  if (Array.isArray(value))
    value.forEach((v, i) => lines.push(`--color-${kebab(name)}-${i}: ${v};`));
  else lines.push(`--color-${kebab(name)}: ${value};`);
}

for (const [name, t] of Object.entries(tokens.font)) {
  if (typeof t !== "object") continue;
  const key = `--text-${kebab(name)}`;
  lines.push(`${key}: ${t.size}px;`);
  if (t.lineHeight)
    lines.push(`${key}--line-height: ${parseFloat(t.lineHeight) / 100};`);
  if (t.letterSpacing)
    lines.push(`${key}--letter-spacing: ${pct(t.letterSpacing)};`);
  lines.push(`${key}--font-weight: ${t.weight};`);
}

for (const [name, v] of Object.entries(tokens.space))
  lines.push(`--spacing-${kebab(name)}: ${v}px;`);
for (const [name, v] of Object.entries(tokens.radius))
  lines.push(`--radius-${kebab(name)}: ${v}px;`);
for (const [name, v] of Object.entries(tokens.stroke))
  lines.push(`--stroke-${kebab(name)}: ${v}px;`);
for (const [name, v] of Object.entries(tokens.size)) {
  if (Array.isArray(v)) {
    lines.push(
      `--size-${kebab(name)}-w: ${v[0]}px;`,
      `--size-${kebab(name)}-h: ${v[1]}px;`,
    );
  } else lines.push(`--size-${kebab(name)}: ${v}px;`);
}

const css = `/* 自動生成。編集しないこと。元: docs/design/tokens.json（pnpm tokens で再生成） */
@theme {
${lines.map((l) => `  ${l}`).join("\n")}
}
`;
writeFileSync("src/styles/tokens.css", css);
console.log(`src/styles/tokens.css: ${lines.length} tokens`);
