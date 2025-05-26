import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// Cek apakah build di Vercel
const isVercel = process.env.VERCEL === '1';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    proxy: {
      '/api/broadcastDevNotification': {
        target: 'https://laundrypro-fcm-broadcast-cmx7x9un7-devgabutincs-projects.vercel.app',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  plugins: [
    react(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      // Mengabaikan plugin Capacitor saat build di Vercel
      external: isVercel ? [
        '@codetrix-studio/capacitor-google-auth',
        '@capacitor/browser',
        '@capacitor/app',
        '@capacitor/core',
        '@capacitor/filesystem',
        '@capacitor/local-notifications',
        '@capacitor/push-notifications',
        '@capacitor/share',
        '@capacitor/toast'
      ] : []
    }
  }
}));
