// sw.js - Service Worker for basic offline caching

const CACHE_NAME = 'todo-pwa-cache-v1'; // キャッシュの名前 (バージョン管理用)
// キャッシュするファイルのリスト
// 注意: CDN経由のTailwindはオフラインキャッシュが難しい場合があります。
// 完全なオフライン対応には、CSSをローカルに持つかビルドプロセスが必要です。
const urlsToCache = [
  '/', // ルートURL (通常は index.html)
  '/index.html', // HTMLファイル自体
  // '/styles.css', // もしローカルCSSファイルがあれば追加
  // '/script.js', // もしローカルJSファイルがあれば追加
  // アイコンファイルもキャッシュすると良いでしょう
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
  // 注意: ここでは localStorage を使っているので、主要なJSロジックはHTML内にあります。
  // CDNのTailwindは、オンラインでないとスタイルが適用されない可能性があります。
];

// Service Worker インストール時の処理
self.addEventListener('install', event => {
  console.log('Service Worker: Installing...');
  // waitUntil() はインストールが完了するまで待機させる
  event.waitUntil(
    caches.open(CACHE_NAME) // 指定した名前でキャッシュストレージを開く
      .then(cache => {
        console.log('Service Worker: Caching app shell');
        // 指定されたURLのファイルをキャッシュに追加する
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('Service Worker: Installation complete');
        // 新しいService Workerをすぐに有効化する (推奨)
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('Service Worker: Cache addAll failed:', error);
      })
  );
});

// Service Worker 有効化時の処理 (古いキャッシュの削除など)
self.addEventListener('activate', event => {
  console.log('Service Worker: Activating...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // 現在のキャッシュ名(CACHE_NAME)と異なる古いキャッシュを削除
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
        console.log('Service Worker: Activation complete');
        // Service Workerが有効化されたらすぐにクライアント(ページ)を制御下に置く
        return self.clients.claim();
    })
  );
});

// Fetch イベント (ネットワークリクエスト) の処理
self.addEventListener('fetch', event => {
  // console.log('Service Worker: Fetching ', event.request.url);
  // Cache-first strategy: キャッシュにあればそれを返し、なければネットワークから取得
  event.respondWith(
    caches.match(event.request) // キャッシュにリクエストと一致するものがあるか確認
      .then(response => {
        // キャッシュが見つかればそれを返す
        if (response) {
          // console.log('Service Worker: Serving from cache:', event.request.url);
          return response;
        }
        // キャッシュになければネットワークから取得
        // console.log('Service Worker: Fetching from network:', event.request.url);
        return fetch(event.request)
          .then(networkResponse => {
            // オプション: 取得したレスポンスをキャッシュに追加することも可能
            // ただし、何でもキャッシュすると容量を圧迫するので注意
            // if (networkResponse.ok && urlsToCache.includes(new URL(event.request.url).pathname)) {
            //   let responseToCache = networkResponse.clone();
            //   caches.open(CACHE_NAME).then(cache => {
            //     cache.put(event.request, responseToCache);
            //   });
            // }
            return networkResponse;
          })
          .catch(error => {
            console.error('Service Worker: Fetch failed:', error);
            // オフラインでキャッシュにもない場合の代替コンテンツ表示なども可能
            // return new Response("オフラインのためコンテンツを取得できません。", { status: 503, statusText: "Service Unavailable" });
          });
      })
  );
});
