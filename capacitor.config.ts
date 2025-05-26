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
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: '1043175099828-bfgdj6e1vqcfnqj7kgdkvvdnvvqv6aqb.apps.googleusercontent.com',
      forceCodeForRefreshToken: true
    }
  },
  // Konfigurasi yang lebih lengkap untuk deep linking
  android: {
    intentFilters: [
      {
        action: 'VIEW',
        autoVerify: true,
        data: [
          // Skema kustom untuk deep link
          {
            scheme: 'com.laundrypro.app',
            host: '*',
          },
          // URL callback dari Supabase/Google OAuth
          {
            scheme: 'https',
            host: 'laundrypro.vercel.app',
            pathPrefix: '/auth/v1/callback'
          },
          // URL alternatif dari Supabase
          {
            scheme: 'https',
            host: 'igogxmfqfsxubjbtrguf.supabase.co',
            pathPrefix: '/auth/v1/callback'
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
