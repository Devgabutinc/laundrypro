import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { setupNetworkListeners } from './utils/networkUtils'
import { setupMemoryOptimization, isLowEndDevice } from './utils/performanceUtils'
import { setupOfflineHandler } from './utils/offlineHandler'

// Inisialisasi aplikasi dengan optimasi kinerja
const initApp = () => {
  // Setup listener untuk status jaringan
  const cleanupNetworkListeners = setupNetworkListeners();
  
  // Setup handler offline yang lebih baik
  const cleanupOfflineHandler = setupOfflineHandler();
  
  // Setup optimasi memori untuk perangkat low-end
  setupMemoryOptimization();
  
  // Log informasi perangkat untuk debugging
  console.log(`[LaundryPro] Device type: ${isLowEndDevice() ? 'Low-end' : 'High-end'}`);
  console.log(`[LaundryPro] Network status: ${navigator.onLine ? 'Online' : 'Offline'}`);
  
  // Render aplikasi
  createRoot(document.getElementById("root")!).render(<App />);
  
  // Daftarkan service worker untuk fungsionalitas offline
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/service-worker.js')
        .then(registration => {
          console.log('[LaundryPro] Service Worker registered with scope:', registration.scope);
        })
        .catch(error => {
          console.error('[LaundryPro] Service Worker registration failed:', error);
        });
    });
    
    // Listen untuk pesan dari service worker
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'SYNC_OFFLINE_DATA') {
        // Trigger sinkronisasi data offline
        import('./utils/networkUtils').then(module => {
          module.syncOfflineData();
        });
      }
    });
  }
  
  // Cleanup function untuk event listener
  return () => {
    cleanupNetworkListeners();
    cleanupOfflineHandler();
  };
};

// Inisialisasi aplikasi
initApp();
