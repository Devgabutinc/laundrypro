import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.laundrypro.app',
  appName: 'LaundryPro',
  webDir: 'dist',
  // Konfigurasi server yang aman
  server: {
    androidScheme: 'https',
    // cleartext dinonaktifkan untuk keamanan di build produksi
    cleartext: false
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
    }
  },
  android: {
    // allowMixedContent dinonaktifkan untuk keamanan di build produksi
    allowMixedContent: false,
    captureInput: true,
    // webContentsDebuggingEnabled dinonaktifkan untuk build produksi
    webContentsDebuggingEnabled: process.env.NODE_ENV === 'development'
  },
  ios: {
    scheme: 'com.laundrypro.app'
  }
};

export default config;
