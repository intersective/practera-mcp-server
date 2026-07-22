import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: '../../dist/widget',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        // Single bundle for MCP resource serving
        manualChunks: undefined,
      },
    },
  },
  base: './',
});
