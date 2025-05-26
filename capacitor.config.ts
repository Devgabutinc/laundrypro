import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.laundrypro.app',
  appName: 'LaundryPro',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: true
  },
  plugins: {
    BluetoothSerial: {
      // konfigurasi tambahan jika diperlukan
    },
    Browser: {
      // Konfigurasi Browser plugin
      presentationStyle: 'fullscreen'
    }
  },
  // Konfigurasi App URL untuk deep linking
  app: {
    appUrl: 'laundrypro://app',
    appUrlScheme: 'laundrypro',
    appUrlHost: 'app'
  }
};

export default config;
