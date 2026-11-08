/**
 * Service Worker（architecture.md 7章）。
 * MVP ではオフラインの記録には対応しない。することは次の2つだけ：
 * - 静的ファイル（/_next/static/ のハッシュ付きファイルとアイコン）をキャッシュする
 * - オフラインで画面を開いたときに「接続してください」のページ（/offline.html）を出す
 * ページの HTML・RSC・API・Server Actions はキャッシュしない（常にネットワーク）。
 *
 * 中身を変えたら CACHE_VERSION を上げること（古いキャッシュは activate で消える）。
 * 通知（push・notificationclick）は最終フェーズでここに足す。
 */
const CACHE_VERSION = "v1";
const PRECACHE = `precache-${CACHE_VERSION}`;
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const OFFLINE_URL = "/offline.html";
const PRECACHE_URLS = [
  OFFLINE_URL,
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(PRECACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  const keep = new Set([PRECACHE, STATIC_CACHE]);
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => !keep.has(k)).map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

/** ファイル名にハッシュが入っていて中身が変わらないもの（＝キャッシュしてよい静的ファイル） */
function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/")
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // 画面を開く（ページの読み込み）：ネットワークのみ。つながらなければ「接続してください」
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        const cached = await caches.match(OFFLINE_URL);
        return cached ?? Response.error();
      }),
    );
    return;
  }

  // 静的ファイル：キャッシュを優先し、なければ取りに行って保存する
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      }),
    );
  }
  // それ以外（RSC のデータ・API など）は Service Worker を通さない
});
