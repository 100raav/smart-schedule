import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/three')) return 'three';
          if (id.includes('node_modules/html2canvas')) return 'export';
          if (id.includes('node_modules/jspdf')) return 'export';
          if (id.includes('node_modules/react') || id.includes('node_modules/framer-motion')) return 'react-vendor';
        },
      },
    },
  },
  server: {
    port: 5173,
    host: true,
  },
});