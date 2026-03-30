import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  // Serve textures and other static assets from the main frontend's public dir
  publicDir: path.resolve(__dirname, '../frontend/public'),
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, '../shared'),
    },
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
  },
  optimizeDeps: {
    exclude: ['../shared'],
  },
  server: {
    port: 5175,
    fs: {
      // Allow importing from parent directories (shared/, frontend/public/)
      allow: ['..'],
    },
  },
});
