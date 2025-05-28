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
  
  // Strategi cache untuk API
  if (requestUrl.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstThenCache(event.request));
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
    // Jika offline dan request adalah halaman HTML, tampilkan halaman offline
    if (request.headers.get('Accept').includes('text/html')) {
      return caches.match('/offline.html');
    }
    
    console.error('[Service Worker] Fetch failed:', error);
    throw error;
  }
}

// Strategi Network First, Cache Fallback untuk API
async function networkFirstThenCache(request) {
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
    // Jika offline, coba ambil dari cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    console.error('[Service Worker] API fetch failed and no cache available:', error);
    throw error;
  }
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
