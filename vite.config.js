import { defineConfig } from 'vite';
export default defineConfig({
  build: { assetsDir: 'bundle', chunkSizeWarningLimit: 1200 },
  server: { host: '0.0.0.0', port: 5173, allowedHosts: true },
  preview: { host: '0.0.0.0', port: 5173, allowedHosts: true },
});
