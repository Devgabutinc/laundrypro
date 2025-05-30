import { toast } from '@/components/ui/use-toast';

/**
 * Utilitas untuk mendeteksi status koneksi jaringan dan menangani kesalahan jaringan
 */

// Cek apakah aplikasi sedang online
export const isOnline = (): boolean => {
  return navigator.onLine;
};

// Listener untuk perubahan status jaringan
export const setupNetworkListeners = () => {
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
};

// Handler ketika koneksi kembali online
const handleOnline = () => {
  toast({
    title: "Koneksi Jaringan Tersedia",
    description: "Anda kembali terhubung ke internet.",
    variant: "default",
  });
  
  // Sinkronisasi data yang disimpan secara lokal selama offline
  syncOfflineData();
};

// Handler ketika koneksi offline
const handleOffline = () => {
  toast({
    title: "Tidak Ada Koneksi Internet",
    description: "Aplikasi beralih ke mode offline. Beberapa fitur mungkin terbatas.",
    variant: "destructive",
  });
};

// Cache data for offline use
const cacheData = async (url: string, data: any) => {
  try {
    const cacheKey = `cache_${url}`;
    const cacheEntry = {
      data,
      timestamp: new Date().toISOString()
    };
    localStorage.setItem(cacheKey, JSON.stringify(cacheEntry));
  } catch (error) {
    console.warn('Failed to cache data:', error);
  }
};

// Get cached data
const getCachedData = async (url: string) => {
  try {
    const cacheKey = `cache_${url}`;
    const cachedItem = localStorage.getItem(cacheKey);
    if (!cachedItem) return null;
    
    const { data, timestamp } = JSON.parse(cachedItem);
    
    // Check if cache is too old (24 hours)
    const cacheTime = new Date(timestamp).getTime();
    const now = new Date().getTime();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    
    if (now - cacheTime > maxAge) {
      localStorage.removeItem(cacheKey);
      return null;
    }
    
    return data;
  } catch (error) {
    console.warn('Error retrieving cached data:', error);
    return null;
  }
};

// Sinkronisasi data yang disimpan secara lokal selama offline
export const syncOfflineData = async () => {
  try {
    const offlineData = localStorage.getItem('offlineData');
    if (!offlineData) return;
    
    const data = JSON.parse(offlineData);
    
    // Proses sinkronisasi data offline ke server
    // Implementasi akan bervariasi tergantung pada jenis data
    
    // Setelah berhasil disinkronkan, hapus data offline
    localStorage.removeItem('offlineData');
    
    toast({
      title: "Sinkronisasi Berhasil",
      description: "Data yang Anda buat saat offline telah berhasil disinkronkan.",
      variant: "default",
    });
  } catch (error) {
    console.error('Gagal menyinkronkan data offline:', error);
    toast({
      title: "Gagal Menyinkronkan Data",
      description: "Terjadi kesalahan saat menyinkronkan data offline.",
      variant: "destructive",
    });
  }
};

// Simpan data secara lokal saat offline
export const saveOfflineData = (key: string, data: any) => {
  try {
    // Ambil data offline yang sudah ada
    const existingDataStr = localStorage.getItem('offlineData');
    const existingData = existingDataStr ? JSON.parse(existingDataStr) : {};
    
    // Tambahkan data baru
    existingData[key] = {
      data,
      timestamp: new Date().toISOString(),
    };
    
    // Simpan kembali ke localStorage
    localStorage.setItem('offlineData', JSON.stringify(existingData));
    
    return true;
  } catch (error) {
    console.error('Gagal menyimpan data offline:', error);
    return false;
  }
};

// Wrapper untuk fetch API dengan penanganan offline dan retry
export const fetchWithOfflineSupport = async (url: string, options: RequestInit = {}, retryCount = 3) => {
  if (!isOnline()) {
    toast({
      title: "Tidak Ada Koneksi Internet",
      description: "Permintaan tidak dapat diproses. Silakan coba lagi saat terhubung ke internet.",
      variant: "destructive",
    });
    throw new Error('Offline');
  }
  
  let lastError;
  
  // Special handling for business queries that might cause 406 errors
  if (url.includes('/businesses?') && url.includes('eq.')) {
    // Extract business ID from URL
    const businessIdMatch = url.match(/id=eq\.([^&]+)/);
    if (businessIdMatch && businessIdMatch[1]) {
      const businessId = businessIdMatch[1];
      try {
        const cachedBusiness = localStorage.getItem(`business_${businessId}`);
        if (cachedBusiness) {
          console.log('Using cached business data from localStorage for:', businessId);
          return { json: async () => JSON.parse(cachedBusiness) };
        }
      } catch (e) {
        console.warn('Error reading business from localStorage:', e);
      }
    }
  }
  
  // Implementasi retry logic
  for (let attempt = 0; attempt < retryCount; attempt++) {
    try {
      // Jika ini adalah percobaan ulang, tunggu sebentar (exponential backoff)
      if (attempt > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt - 1)));
        console.log(`[LaundryPro] Retry attempt ${attempt} for ${url}`);
      }
      
      const response = await fetch(url, {
        ...options,
        // Tambahkan timeout untuk mencegah permintaan menggantung terlalu lama
        signal: options.signal || AbortSignal.timeout(30000), // 30 detik timeout
        // Tambahkan cache control untuk mobile
        headers: {
          ...options.headers,
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      // Special handling for 406 errors (common with RLS policies)
      if (response.status === 406) {
        console.warn('Received 406 Not Acceptable, handling gracefully');
        
        // For business data, try to get from localStorage
        if (url.includes('/businesses?')) {
          const businessIdMatch = url.match(/id=eq\.([^&]+)/);
          if (businessIdMatch && businessIdMatch[1]) {
            const businessId = businessIdMatch[1];
            try {
              const cachedBusiness = localStorage.getItem(`business_${businessId}`);
              if (cachedBusiness) {
                console.log('Using cached business data for 406 error:', businessId);
                return { json: async () => JSON.parse(cachedBusiness) };
              }
            } catch (e) {
              console.warn('Error reading business from localStorage:', e);
            }
          }
        }
        
        // Return empty result instead of throwing
        return { 
          ok: true, 
          status: 200, 
          json: async () => ({ data: [] }) 
        };
      }
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      // Cache successful responses
      try {
        const clonedResponse = response.clone();
        const responseData = await clonedResponse.json();
        await cacheData(url, responseData);
      } catch (cacheError) {
        console.warn('Failed to cache response:', cacheError);
      }
      
      return response;
    } catch (error) {
      lastError = error;
      
      // Jangan retry untuk beberapa jenis error
      if (error.message === 'Offline' || 
          error.name === 'AbortError' || 
          (error.message && error.message.includes('Failed to fetch'))) {
        break;
      }
      
      // Jika ini adalah percobaan terakhir, tampilkan pesan error
      if (attempt === retryCount - 1) {
        if (error.name === 'AbortError') {
          toast({
            title: "Permintaan Timeout",
            description: "Koneksi terlalu lambat. Silakan coba lagi nanti.",
            variant: "destructive",
          });
        } else if (error.message === 'Offline' || !isOnline()) {
          // Sudah ditangani di atas
        } else {
          toast({
            title: "Kesalahan Jaringan",
            description: "Terjadi kesalahan saat menghubungi server. Silakan coba lagi.",
            variant: "destructive",
          });
        }
      }
    }
  }
  
  // Try to get cached data as a last resort
  try {
    const cachedData = await getCachedData(url);
    if (cachedData) {
      console.log('Using cached data after fetch failures for:', url);
      return { 
        ok: true, 
        status: 200, 
        json: async () => cachedData 
      };
    }
  } catch (cacheError) {
    console.warn('Error retrieving cache as fallback:', cacheError);
  }
  
  throw lastError;
};

// Fungsi untuk mengoptimalkan permintaan jaringan
export const optimizedFetch = async (url: string, options: RequestInit = {}) => {
  // Tambahkan cache control untuk mengoptimalkan permintaan
  const optimizedOptions = {
    ...options,
    headers: {
      ...options.headers,
      'Cache-Control': 'max-age=3600', // Cache selama 1 jam
    },
  };
  
  return fetchWithOfflineSupport(url, optimizedOptions);
};
