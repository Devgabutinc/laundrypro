// Service Worker untuk LaundryPro
// Versi cache - ubah ini saat ada perubahan pada service worker
const CACHE_VERSION = 'v1.1.0';
const CACHE_NAME = `laundrypro-cache-${CACHE_VERSION}`;

// Aset yang akan di-cache saat instalasi
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/assets/index-MK1v0ErH.css',
  '/assets/index-C5TXuuvB.js',
  '/favicon.ico',
  '/offline.html' // Halaman fallback saat offline
];

// Aset API yang akan di-cache
const API_CACHE_NAME = `laundrypro-api-cache-${CACHE_VERSION}`;
const API_URLS = [
  // Tambahkan URL API yang penting untuk di-cache
  '/api/product-categories',
  '/api/services'
];

// Install Service Worker
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing Service Worker...', event);
  
  // Skip waiting agar service worker baru langsung aktif
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[Service Worker] Static assets cached successfully');
      })
      .catch((error) => {
        console.error('[Service Worker] Error caching static assets:', error);
      })
  );
});

// Activate Service Worker
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating Service Worker...', event);
  
  // Claim clients agar service worker mengontrol semua tab
  event.waitUntil(self.clients.claim());
  
  // Hapus cache lama
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== API_CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Intercept fetch requests
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);
  
  // Jangan cache permintaan ke API Supabase Auth
  if (requestUrl.pathname.includes('/auth/v1/')) {
    return;
  }
  
  // Deteksi permintaan ke Supabase API
  const isSupabaseRequest = requestUrl.hostname.includes('supabase.co');
  
  // Jika ini adalah permintaan ke Supabase dan bukan permintaan GET, jangan intercept
  if (isSupabaseRequest && event.request.method !== 'GET') {
    return;
  }
  
  // Strategi cache untuk API
  if (requestUrl.pathname.startsWith('/api/') || isSupabaseRequest) {
    event.respondWith(safeNetworkFirstThenCache(event.request));
    return;
  }
  
  // Strategi cache untuk aset statis
  event.respondWith(cacheFirstThenNetwork(event.request));
});

// Strategi Cache First, Network Fallback untuk aset statis
async function cacheFirstThenNetwork(request) {
  try {
    // Coba ambil dari cache dulu
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Jika tidak ada di cache, ambil dari network
    const networkResponse = await fetch(request);
    
    // Simpan ke cache jika response valid
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('[Service Worker] Fetch failed:', error);
    
    // Jika offline dan request adalah halaman HTML atau navigasi, tampilkan halaman offline
    if (request.mode === 'navigate' || (request.headers.get('Accept') && request.headers.get('Accept').includes('text/html'))) {
      console.log('[Service Worker] Serving offline page for URL:', request.url);
      
      // Cek apakah offline.html ada di cache
      const offlineResponse = await caches.match('/offline.html');
      if (offlineResponse) {
        console.log('[Service Worker] Found offline.html in cache');
        return offlineResponse;
      }
      
      // Jika tidak ada di cache, coba ambil dari network (mungkin masih online)
      try {
        console.log('[Service Worker] Trying to fetch offline.html from network');
        const networkOfflineResponse = await fetch('/offline.html');
        
        // Simpan ke cache untuk penggunaan berikutnya
        const cache = await caches.open(CACHE_NAME);
        await cache.put('/offline.html', networkOfflineResponse.clone());
        
        return networkOfflineResponse;
      } catch (offlineError) {
        console.error('[Service Worker] Failed to fetch offline.html:', offlineError);
        
        // Jika gagal, kembalikan response HTML sederhana
        return new Response(
          `<!DOCTYPE html>
          <html lang="id">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>LaundryPro - Mode Offline</title>
            <style>
              body { font-family: system-ui, sans-serif; padding: 2rem; text-align: center; }
              .container { max-width: 500px; margin: 0 auto; }
              h1 { color: #2563eb; }
              p { color: #4b5563; }
              button { background: #2563eb; color: white; border: none; padding: 0.5rem 1rem; border-radius: 0.25rem; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>Mode Offline</h1>
              <p>Aplikasi LaundryPro sedang dalam mode offline. Beberapa fitur mungkin tidak tersedia.</p>
              <p>Silakan periksa koneksi internet Anda dan coba lagi.</p>
              <button onclick="location.reload()">Coba Lagi</button>
            </div>
          </body>
          </html>`,
          {
            headers: { 'Content-Type': 'text/html' }
          }
        );
      }
    }
    
    throw error;
  }
}

// Strategi Network First, Cache Fallback untuk API dengan penanganan error yang lebih baik
async function safeNetworkFirstThenCache(request) {
  try {
    // Coba ambil dari network dulu
    const networkResponse = await fetch(request);
    
    // Simpan ke cache jika response valid
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(API_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[Service Worker] Network request failed, trying cache:', request.url);
    
    // Jika offline, coba ambil dari cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      console.log('[Service Worker] Returning cached response for:', request.url);
      return cachedResponse;
    }
    
    console.error('[Service Worker] API fetch failed and no cache available:', error);
    
    // Untuk permintaan API, kembalikan respons JSON kosong untuk mencegah crash aplikasi
    const requestUrl = new URL(request.url);
    if (requestUrl.hostname.includes('supabase.co')) {
      // Cek jenis permintaan Supabase
      if (request.headers.get('Accept')?.includes('application/json')) {
        console.log('[Service Worker] Returning empty JSON response for Supabase request');
        return new Response(JSON.stringify([]), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
    
    // Jika bukan permintaan JSON, lempar error seperti biasa
    throw error;
  }
}

// Strategi Network First, Cache Fallback untuk API (versi lama)
async function networkFirstThenCache(request) {
  return safeNetworkFirstThenCache(request);
}

// Background sync untuk data yang dibuat saat offline
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-offline-data') {
    event.waitUntil(syncOfflineData());
  }
});

// Sinkronisasi data offline
async function syncOfflineData() {
  try {
    // Ambil semua client
    const clients = await self.clients.matchAll();
    
    // Kirim pesan ke client untuk melakukan sinkronisasi
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_OFFLINE_DATA'
      });
    });
    
    return true;
  } catch (error) {
    console.error('[Service Worker] Error syncing offline data:', error);
    return false;
  }
}
