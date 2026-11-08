import type { MetadataRoute } from "next";

/**
 * Web App Manifest（architecture.md 7章）。
 * 色はトークン（docs/design/tokens.json）に合わせる。画面の上端（ステータスバーの下）は白なので
 * theme_color も白にし、layout.tsx の viewport.themeColor と揃える。
 * アイコンは仮（黒地に白の C と黄色の点）。正式なアイコンができたら public/icons/ を差し替える。
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Confidently",
    short_name: "Confidently",
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
