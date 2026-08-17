import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Dev server proxies every `/api` call to the Node.js gateway so the
// browser only ever talks to same-origin relative URLs (no CORS, works
// identically behind the nginx reverse proxy in Docker).
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    // Accept any preview/ingress host (sandbox preview, LAN IPs, custom domains).
    allowedHosts: true,
    proxy: {
      '/api': {
        target: process.env.VITE_API_TARGET || 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
