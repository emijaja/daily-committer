import type { Metadata, Viewport } from "next";
import { Inter, Noto_Sans_JP } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const notoJp = Noto_Sans_JP({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-noto-jp",
});

export const metadata: Metadata = {
  title: "Confidently",
  description: "ゆるく、続ける。習慣記録アプリ",
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

/**
 * PC ではスマホ幅の列を画面中央に表示する（docs/web/README.md）。
 * スマホでは幅いっぱい。iPhone の大きい機種（430px）までは広がる。
 */
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ja" className={`${inter.variable} ${notoJp.variable}`}>
      <body>
        <div className="mx-auto min-h-dvh w-full max-w-[430px] bg-white">
          {children}
        </div>
      </body>
    </html>
  );
}
