import { Capacitor } from '@capacitor/core';

// Tipe untuk Google Auth
export interface GoogleUser {
  authentication: {
    idToken: string;
    accessToken: string;
  };
  email: string;
  familyName: string;
  givenName: string;
  id: string;
  imageUrl: string;
  name: string;
}

// Interface untuk Google Auth
export interface IGoogleAuth {
  initialize(options: { clientId: string; scopes: string[]; grantOfflineAccess: boolean }): Promise<void>;
  signIn(): Promise<GoogleUser>;
  refresh(): Promise<GoogleUser>;
  signOut(): Promise<void>;
}

// Dummy implementasi untuk web
const WebGoogleAuth: IGoogleAuth = {
  initialize: async () => {
    console.log('GoogleAuth initialize dipanggil di web, tidak melakukan apa-apa');
  },
  signIn: async () => {
    console.log('GoogleAuth signIn dipanggil di web, tidak melakukan apa-apa');
    throw new Error('Google Auth tidak tersedia di web');
  },
  refresh: async () => {
    console.log('GoogleAuth refresh dipanggil di web, tidak melakukan apa-apa');
    throw new Error('Google Auth tidak tersedia di web');
  },
  signOut: async () => {
    console.log('GoogleAuth signOut dipanggil di web, tidak melakukan apa-apa');
  }
};

// Ekspor GoogleAuth yang sesuai dengan platform
let GoogleAuthInstance: IGoogleAuth;

// Cek apakah berjalan di lingkungan mobile
if (Capacitor.isNativePlatform()) {
  try {
    // Import langsung untuk Android/iOS
    // Gunakan import langsung, bukan require
    import('@codetrix-studio/capacitor-google-auth')
      .then((module) => {
        // Setelah modul dimuat, gunakan GoogleAuth dari modul tersebut
        const { GoogleAuth } = module;
        GoogleAuthInstance = GoogleAuth as unknown as IGoogleAuth;
      })
      .catch((e) => {
        console.error('Error loading GoogleAuth:', e);
        GoogleAuthInstance = WebGoogleAuth;
      });
  } catch (e) {
    console.error('Error during import GoogleAuth:', e);
    GoogleAuthInstance = WebGoogleAuth;
  }
} else {
  // Gunakan dummy implementasi untuk web
  GoogleAuthInstance = WebGoogleAuth;
}

// Karena import adalah asynchronous, kita perlu membuat proxy
const GoogleAuthProxy = new Proxy({} as IGoogleAuth, {
  get: (target, prop) => {
    return (...args: any[]) => {
      if (GoogleAuthInstance) {
        return (GoogleAuthInstance as any)[prop](...args);
      } else {
        console.warn(`GoogleAuth belum diinisialisasi, menggunakan fallback untuk ${String(prop)}`);
        return WebGoogleAuth[prop as keyof IGoogleAuth](...args);
      }
    };
  }
});

export const GoogleAuth = GoogleAuthProxy;
