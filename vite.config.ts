
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // FIXED: Base URL sesuai repository GitHub
  base: '/ABSENSAKATO/', 
  build: {
    target: 'esnext',
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true, // Enable sourcemap for better debugging in prod
    cssCodeSplit: true,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false, // KEEP CONSOLE LOGS for debugging on GitHub Pages
        drop_debugger: true,
        passes: 2
      },
    },
    rollupOptions: {
      output: {
        manualChunks: {
          'react-core': ['react', 'react-dom', 'react-router-dom'],
          'ui-libs': ['framer-motion'],
          'viz-libs': ['recharts'],
          'data-utils': ['xlsx', 'jspdf', 'jspdf-autotable'],
          'hardware': ['html5-qrcode'],
          'supabase': ['@supabase/supabase-js']
        }
      }
    },
    chunkSizeWarningLimit: 800
  },
  server: {
    hmr: { overlay: false }
  }
})
