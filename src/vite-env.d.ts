/// <reference types="vite/client" />

// Capacitor global interface
interface Window {
  Capacitor?: {
    isNativePlatform: () => boolean;
    getPlatform: () => string;
  };
}
