import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { setupNetworkListeners } from './utils/networkUtils'
import { setupMemoryOptimization, isLowEndDevice } from './utils/performanceUtils'

// Inisialisasi aplikasi dengan optimasi kinerja
const initApp = () => {
  // Setup listener untuk status jaringan
  const cleanupNetworkListeners = setupNetworkListeners();
  
  // Setup optimasi memori untuk perangkat low-end
  setupMemoryOptimization();
  
  // Log informasi perangkat untuk debugging
  console.log(`[LaundryPro] Device type: ${isLowEndDevice() ? 'Low-end' : 'High-end'}`);
  console.log(`[LaundryPro] Network status: ${navigator.onLine ? 'Online' : 'Offline'}`);
  
  // Render aplikasi
  createRoot(document.getElementById("root")!).render(<App />);
  
  // Unregister any existing service workers
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(registrations => {
      for (let registration of registrations) {
        registration.unregister();
        console.log('[LaundryPro] Service Worker unregistered');
      }
    });
  }
  
  // Cleanup function untuk event listener
  return () => {
    cleanupNetworkListeners();
  };
};

// Inisialisasi aplikasi
initApp();
