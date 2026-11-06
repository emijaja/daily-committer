import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Confidently",
  description: "ゆるく、続ける。習慣記録アプリ",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
