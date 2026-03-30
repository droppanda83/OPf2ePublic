import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
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
    port: 5173,
    fs: {
      allow: ['..'],
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 5180,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    commonjsOptions: {
      include: [/shared/, /node_modules/],
    },
    rollupOptions: {
      output: {
        manualChunks: {
          // Split large data modules into separate chunks
          'data-bestiary': ['../shared/bestiary'],
          'data-spells': ['../shared/spells'],
          'data-ancestry-ac': ['../shared/ancestryFeatsAC'],
          'data-ancestry-dg': ['../shared/ancestryFeatsDG'],
          'data-ancestry-hn': ['../shared/ancestryFeatsHN'],
          'data-ancestry-ov': ['../shared/ancestryFeatsOV'],
          'data-ancestry-vh': ['../shared/ancestryFeatsVH'],
          'data-feats': [
            '../shared/skillFeats',
            '../shared/fighterFeats',
            '../shared/rogueFeats',
            '../shared/magusFeats',
            '../shared/psychicFeats',
            '../shared/generalFeats',
            '../shared/archetypeFeats',
          ],
          'data-equipment': [
            '../shared/weapons',
            '../shared/ac',
            '../shared/armor',
            '../shared/shields',
            '../shared/runes',
            '../shared/consumables',
          ],
        },
      },
    },
  },
});
