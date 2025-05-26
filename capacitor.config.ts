import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.laundrypro.app',
  appName: 'LaundryPro',
  webDir: 'dist',
  // Konfigurasi server dengan deep linking
  server: {
    androidScheme: 'laundrypro',
    hostname: 'app',
    cleartext: true
  },
  plugins: {
    BluetoothSerial: {
      // konfigurasi tambahan jika diperlukan
    },
    Browser: {
      // Konfigurasi Browser plugin untuk pengalaman yang lebih terintegrasi
      presentationStyle: 'popover',
      toolbarColor: '#3880ff',
      browserCloseButtonPosition: 'end',
      showTitle: true
    }
  }
};

export default config;
