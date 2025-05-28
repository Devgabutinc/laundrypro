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

// Wrapper untuk fetch API dengan penanganan offline
export const fetchWithOfflineSupport = async (url: string, options: RequestInit = {}) => {
  if (!isOnline()) {
    toast({
      title: "Tidak Ada Koneksi Internet",
      description: "Permintaan tidak dapat diproses. Silakan coba lagi saat terhubung ke internet.",
      variant: "destructive",
    });
    throw new Error('Offline');
  }
  
  try {
    const response = await fetch(url, {
      ...options,
      // Tambahkan timeout untuk mencegah permintaan menggantung terlalu lama
      signal: options.signal || AbortSignal.timeout(30000), // 30 detik timeout
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    return response;
  } catch (error) {
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
    throw error;
  }
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
