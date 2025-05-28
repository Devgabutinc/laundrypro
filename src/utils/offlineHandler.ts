import { toast } from '@/components/ui/use-toast';

/**
 * Utilitas untuk menangani status offline dan menampilkan halaman offline
 */

// Simpan referensi ke halaman asli
let originalContent: string | null = null;
let isShowingOfflinePage = false;

// Fungsi untuk menampilkan halaman offline
export const showOfflinePage = () => {
  if (isShowingOfflinePage) return;
  
  // Simpan konten asli halaman
  originalContent = document.documentElement.innerHTML;
  
  // Ganti konten dengan halaman offline
  document.documentElement.innerHTML = `
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>LaundryPro - Mode Offline</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
          background-color: #f5f5f5;
          color: #333;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          min-height: 100vh;
          align-items: center;
          justify-content: center;
          text-align: center;
        }
        
        .container {
          max-width: 90%;
          width: 400px;
          background-color: white;
          border-radius: 12px;
          padding: 2rem;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        
        .logo {
          width: 120px;
          height: auto;
          margin-bottom: 1.5rem;
        }
        
        h1 {
          color: #2563eb;
          font-size: 1.5rem;
          margin-bottom: 1rem;
        }
        
        p {
          color: #4b5563;
          line-height: 1.6;
          margin-bottom: 1.5rem;
        }
        
        .button {
          background-color: #2563eb;
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 0.375rem;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s;
          text-decoration: none;
          display: inline-block;
        }
        
        .button:hover {
          background-color: #1d4ed8;
        }
        
        .offline-icon {
          font-size: 3rem;
          margin-bottom: 1rem;
          color: #6b7280;
        }
        
        .feature-list {
          text-align: left;
          margin: 1.5rem 0;
        }
        
        .feature-list li {
          margin-bottom: 0.5rem;
          color: #4b5563;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="offline-icon">📶</div>
        <h1>Mode Offline</h1>
        <p>Anda sedang dalam mode offline. Beberapa fitur LaundryPro masih dapat digunakan meskipun tidak ada koneksi internet.</p>
        
        <div class="feature-list">
          <p><strong>Fitur yang tersedia dalam mode offline:</strong></p>
          <ul>
            <li>Melihat data pesanan yang sudah di-cache</li>
            <li>Membuat pesanan baru (akan disinkronkan saat online)</li>
            <li>Mencetak struk dari pesanan yang sudah di-cache</li>
            <li>Mengakses laporan yang sudah di-cache sebelumnya</li>
          </ul>
        </div>
        
        <p>Silakan periksa koneksi internet Anda dan coba lagi.</p>
        
        <button class="button" onclick="window.location.reload()">Coba Lagi</button>
      </div>
      
      <script>
        // Cek koneksi secara berkala
        setInterval(() => {
          if (navigator.onLine) {
            window.location.reload();
          }
        }, 5000); // Cek setiap 5 detik
      </script>
    </body>
    </html>
  `;
  
  isShowingOfflinePage = true;
};

// Fungsi untuk mengembalikan halaman asli
export const restoreOriginalPage = () => {
  if (!isShowingOfflinePage || !originalContent) return;
  
  document.documentElement.innerHTML = originalContent;
  isShowingOfflinePage = false;
  originalContent = null;
};

// Setup listener untuk status jaringan
export const setupOfflineHandler = () => {
  // Handler ketika koneksi offline
  const handleOffline = () => {
    toast({
      title: "Tidak Ada Koneksi Internet",
      description: "Aplikasi beralih ke mode offline. Beberapa fitur mungkin terbatas.",
      variant: "destructive",
    });
    
    // Jika mencoba navigasi ke halaman baru, tampilkan halaman offline
    window.addEventListener('unhandledrejection', (event) => {
      // Cek apakah error terkait fetch/network
      if (event.reason && 
          (event.reason.name === 'TypeError' || event.reason.message?.includes('fetch')) && 
          !navigator.onLine) {
        showOfflinePage();
      }
    });
    
    // Tambahkan listener untuk error fetch
    window.addEventListener('error', (event) => {
      // Cek apakah error terkait network
      if (event.message?.includes('net::ERR') && !navigator.onLine) {
        showOfflinePage();
      }
    }, true);
  };
  
  // Handler ketika koneksi kembali online
  const handleOnline = () => {
    toast({
      title: "Koneksi Jaringan Tersedia",
      description: "Anda kembali terhubung ke internet.",
      variant: "default",
    });
    
    // Kembalikan halaman asli jika sedang menampilkan halaman offline
    restoreOriginalPage();
  };
  
  // Setup listener
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  
  // Cek status awal
  if (!navigator.onLine) {
    handleOffline();
  }
  
  // Cleanup function
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
};

// Ekspor fungsi untuk digunakan di luar
export const isOnline = (): boolean => {
  return navigator.onLine;
};
