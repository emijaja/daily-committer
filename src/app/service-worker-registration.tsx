"use client";

import { useEffect } from "react";

/**
 * Service Worker（public/sw.js）を登録する。
 * 開発中は /_next/static/ のファイル名にハッシュが入らず古いファイルがキャッシュに残るため、本番のみ。
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .catch((error: unknown) => {
        console.error("Service Worker の登録に失敗しました", error);
      });
  }, []);
  return null;
}
