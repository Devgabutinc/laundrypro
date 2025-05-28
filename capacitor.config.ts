import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.laundrypro.app',
  appName: 'LaundryPro',
  webDir: 'dist',
  // Konfigurasi server yang aman
  server: {
    androidScheme: 'https',
    // cleartext tetap aktif untuk fungsi printing
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
    }
  },
  // Konfigurasi Android
  android: {
    // Konfigurasi webContentsDebuggingEnabled untuk build produksi
    webContentsDebuggingEnabled: false
  },
  ios: {
    scheme: 'com.laundrypro.app'
  }
};

export default config;