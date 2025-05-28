import React from 'react';

/**
 * Utilitas untuk mengoptimalkan kinerja aplikasi pada perangkat kelas menengah-bawah
 */

// Deteksi apakah perangkat adalah low-end berdasarkan memori dan CPU
export const isLowEndDevice = (): boolean => {
  // Deteksi berdasarkan jumlah logical processor
  const cpuCores = navigator.hardwareConcurrency || 4;
  
  // Deteksi berdasarkan memori (jika tersedia)
  // @ts-ignore - properti ini memang tidak ada di semua browser
  const deviceMemory = navigator.deviceMemory || 4;
  
  // Perangkat dianggap low-end jika memiliki <= 2 core atau <= 2GB RAM
  return cpuCores <= 2 || deviceMemory <= 2;
};

// Pengaturan kualitas rendering berdasarkan kemampuan perangkat
export const getOptimalSettings = () => {
  const isLowEnd = isLowEndDevice();
  
  return {
    // Kurangi animasi pada perangkat low-end
    enableAnimations: !isLowEnd,
    
    // Kurangi efek bayangan pada perangkat low-end
    enableShadows: !isLowEnd,
    
    // Batasi jumlah item yang di-render sekaligus
    pageSize: isLowEnd ? 10 : 20,
    
    // Gunakan lazy loading untuk gambar
    lazyLoadImages: true,
    
    // Kurangi polling interval untuk perangkat low-end
    pollingInterval: isLowEnd ? 30000 : 15000, // 30 detik vs 15 detik
  };
};

// Lazy loading untuk komponen React
export const lazyLoadComponent = (importFn: () => Promise<any>) => {
  // Gunakan dynamic import untuk lazy loading
  return React.lazy(importFn);
};

// Debounce fungsi untuk mencegah terlalu banyak pemanggilan
export const debounce = (func: Function, wait: number) => {
  let timeout: NodeJS.Timeout;
  
  return function executedFunction(...args: any[]) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Throttle fungsi untuk membatasi frekuensi pemanggilan
export const throttle = (func: Function, limit: number) => {
  let inThrottle: boolean;
  
  return function executedFunction(...args: any[]) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
};

// Optimasi rendering list dengan virtualisasi
export const optimizeListRendering = (items: any[], visibleItemsCount: number = 10) => {
  // Implementasi sederhana dari windowing/virtualisasi
  // Untuk implementasi yang lebih baik, gunakan library seperti react-window atau react-virtualized
  
  // Fungsi ini hanya mengembalikan subset dari item yang perlu di-render
  // berdasarkan posisi scroll saat ini
  
  // Dalam implementasi nyata, ini akan dihubungkan dengan event scroll
  // dan menghitung item yang terlihat berdasarkan posisi scroll
  
  // Untuk contoh sederhana, kita hanya mengembalikan N item pertama
  return items.slice(0, visibleItemsCount);
};

// Fungsi untuk membersihkan memori yang tidak digunakan
export const cleanupUnusedMemory = () => {
  // Hapus cache yang tidak digunakan
  if ('caches' in window) {
    caches.keys().then(cacheNames => {
      const oldCaches = cacheNames.filter(cacheName => {
        // Logika untuk menentukan cache yang sudah tidak digunakan
        // Misalnya berdasarkan timestamp atau versi
        return cacheName.startsWith('old-cache-');
      });
      
      return Promise.all(oldCaches.map(cacheName => caches.delete(cacheName)));
    });
  }
  
  // Bersihkan localStorage yang tidak digunakan
  const keysToKeep = [
    'auth_token',
    'user_preferences',
    'privacy_consent',
    'offlineData'
  ];
  
  Object.keys(localStorage).forEach(key => {
    if (!keysToKeep.includes(key) && !key.startsWith('essential_')) {
      localStorage.removeItem(key);
    }
  });
};

// Fungsi untuk mengoptimalkan penggunaan memori pada perangkat low-end
export const setupMemoryOptimization = () => {
  if (isLowEndDevice()) {
    // Bersihkan memori secara berkala
    setInterval(cleanupUnusedMemory, 5 * 60 * 1000); // Setiap 5 menit
    
    // Tambahkan listener untuk membersihkan memori saat aplikasi di background
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        cleanupUnusedMemory();
      }
    });
  }
};
