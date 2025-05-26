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
      // Jika di Vercel, buat alias untuk plugin Capacitor ke modul dummy
      ...(isVercel ? {
        '@codetrix-studio/capacitor-google-auth': path.resolve(__dirname, './src/utils/capacitor-shims/empty-module.js'),
        '@capacitor/browser': path.resolve(__dirname, './src/utils/capacitor-shims/empty-module.js'),
        '@capacitor/app': path.resolve(__dirname, './src/utils/capacitor-shims/empty-module.js'),
        '@capacitor/filesystem': path.resolve(__dirname, './src/utils/capacitor-shims/empty-module.js'),
        '@capacitor/local-notifications': path.resolve(__dirname, './src/utils/capacitor-shims/empty-module.js'),
        '@capacitor/push-notifications': path.resolve(__dirname, './src/utils/capacitor-shims/empty-module.js'),
        '@capacitor/share': path.resolve(__dirname, './src/utils/capacitor-shims/empty-module.js'),
        '@capacitor/toast': path.resolve(__dirname, './src/utils/capacitor-shims/empty-module.js')
      } : {})
    },
  },
  build: {
    // Tidak perlu menggunakan external lagi karena kita menggunakan alias
    rollupOptions: {}
  }
}));
