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
    // Import Google Auth plugin hanya jika di mobile
    require('@codetrix-studio/capacitor-google-auth');
    const { GoogleAuth } = require('@codetrix-studio/capacitor-google-auth');
    GoogleAuthInstance = GoogleAuth as IGoogleAuth;
  } catch (e) {
    console.error('Error loading GoogleAuth:', e);
    GoogleAuthInstance = WebGoogleAuth;
  }
} else {
  // Gunakan dummy implementasi untuk web
  GoogleAuthInstance = WebGoogleAuth;
}

export const GoogleAuth = GoogleAuthInstance;
