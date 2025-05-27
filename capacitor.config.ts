import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.laundrypro.app',
  appName: 'LaundryPro',
  webDir: 'dist',
  // Konfigurasi server yang aman
  server: {
    androidScheme: 'https',
    cleartext: true
  },
  plugins: {
    BluetoothSerial: {
      // konfigurasi tambahan jika diperlukan
    },
    Browser: {
      // Konfigurasi Browser plugin untuk pengalaman yang lebih terintegrasi
      presentationStyle: 'fullscreen', // Gunakan fullscreen untuk pengalaman lebih baik
      toolbarColor: '#3880ff',
      browserCloseButtonPosition: 'end',
      showTitle: true
    },
    // Konfigurasi App untuk URL handling dan deep linking
    App: {
      // Konfigurasi URL scheme untuk deep linking
      appUrlOpen: {
        // Skema kustom untuk deep link
        schemes: ['laundrypro']
      }
    }
  },
  // Konfigurasi untuk deep linking di Android
  android: {
    // Konfigurasi untuk app links dan deep links
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: true
  },
  // Konfigurasi untuk deep linking di iOS
  ios: {
    scheme: 'laundrypro',
    contentInset: 'always'
  }
};

export default config;
