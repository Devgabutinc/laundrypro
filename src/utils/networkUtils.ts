import { toast } from '@/components/ui/use-toast';

/**
 * Utilitas untuk mendeteksi status koneksi jaringan dan menampilkan notifikasi
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
};

// Handler ketika koneksi offline
const handleOffline = () => {
  toast({
    title: "Tidak Ada Koneksi Internet",
    description: "Aplikasi membutuhkan koneksi internet untuk berfungsi dengan baik. Silakan periksa koneksi Anda.",
    variant: "destructive",
  });
};

// Function to show network error messages
export const showNetworkError = (message: string) => {
  // Import toast dynamically to avoid circular dependencies
  import("@/components/ui/use-toast").then(({ toast }) => {
    toast({
      title: "Koneksi Internet Tidak Tersedia",
      description: message || "Permintaan tidak dapat diproses saat ini. Periksa koneksi internet Anda.",
      variant: "destructive"
    });
  }).catch(() => {
    // Fallback if toast can't be imported
    console.error("Network Error:", message || "Permintaan tidak dapat diproses saat ini.");
    alert("Koneksi Internet Tidak Tersedia: " + (message || "Permintaan tidak dapat diproses saat ini."));
  });
};

// Wrapper untuk fetch API dengan penanganan error dan retry
export const fetchWithRetry = async (url: string, options: RequestInit = {}, retryCount = 3) => {
  if (!isOnline()) {
    showNetworkError("Operasi ini membutuhkan koneksi internet");
    throw new Error("No internet connection");
  }
  
  let lastError;
  
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
        // Return empty array
        return { json: async () => [] };
      }
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      return response;
    } catch (error) {
      lastError = error;
      console.warn(`Fetch attempt ${attempt + 1} failed:`, error);
      
      // If it's a network error and we're offline, stop retrying
      if (!navigator.onLine) {
        toast({
          title: "Tidak Ada Koneksi Internet",
          description: "Permintaan tidak dapat diproses. Silakan coba lagi saat terhubung ke internet.",
          variant: "destructive",
        });
        throw new Error('Offline');
      }
    }
  }
  
  // If we've exhausted all retries, throw the last error
  throw lastError;
};

// Fungsi untuk mengoptimalkan permintaan jaringan
export const optimizedFetch = async (url: string, options: RequestInit = {}) => {
  try {
    // Cek status jaringan
    if (!navigator.onLine) {
      showNetworkError("Permintaan tidak dapat diproses saat ini. Periksa koneksi internet Anda.");
      throw new Error('Offline');
    }
    
    // Gunakan fetchWithRetry
    return await fetchWithRetry(url, options);
  } catch (error) {
    console.error('optimizedFetch error:', error);
    throw error;
  }
};
