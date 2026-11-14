import type { MetadataRoute } from "next";

/**
 * Web App Manifest（architecture.md 7章）。
 * 色はトークン（docs/design/tokens.json）に合わせる。画面の上端（ステータスバーの下）は白なので
 * theme_color も白にし、layout.tsx の viewport.themeColor と揃える。
 * アイコンはキャラ（ナマケモノ）の頭を黄色地に置いたもの（src/components/mascot-art.tsx の線から `pnpm icons` で書き出す）。
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Sanpai",
    short_name: "Sanpai",
    description: "ゆるく、続ける。習慣記録アプリ",
    lang: "ja",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
