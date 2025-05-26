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
      presentationStyle: 'fullscreen', // Ubah ke fullscreen untuk pengalaman lebih baik
      toolbarColor: '#3880ff',
      browserCloseButtonPosition: 'end',
      showTitle: true
    }
  },
  // Konfigurasi yang lebih lengkap untuk deep linking
  android: {
    intentFilters: [
      {
        action: 'VIEW',
        autoVerify: true,
        data: [
          {
            scheme: 'com.laundrypro.app',
            host: '*',
          },
          // Tambahkan format alternatif untuk memastikan semua URL callback ditangkap
          {
            scheme: 'https',
            host: 'laundrypro.vercel.app',
            pathPrefix: '/login-callback'
          }
        ],
        categories: ['DEFAULT', 'BROWSABLE'],
      },
    ],
  },
  ios: {
    scheme: 'com.laundrypro.app'
  }
};

export default config;
