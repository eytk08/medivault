import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The Express API. We use the IPv4 address on purpose: on Node 17 and newer, "localhost" can
// resolve to ::1 and the proxy then fails with ECONNREFUSED. Override with VITE_API_TARGET.
const API_TARGET = process.env.VITE_API_TARGET || 'http://127.0.0.1:3000';

export default defineConfig({
  plugins: [react()],
  // The browser only talks to this dev server, which forwards /api to Express, so the
  // session cookie stays first party and works exactly like it does in production.
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': { target: API_TARGET, changeOrigin: true, secure: false },
      '/health': { target: API_TARGET, changeOrigin: true }
    }
  },
  preview: { host: '127.0.0.1', port: 4173 },
  build: { outDir: 'dist', emptyOutDir: true, sourcemap: false }
});
