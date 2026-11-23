import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';

const dir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    // The static (GitHub Pages) build reuses the server's detection engine and
    // text utilities instead of keeping a second copy that could drift.
    alias: {
      '@shared': path.resolve(dir, '..', 'server', 'services'),
    },
  },
  css: {
    postcss: {
      plugins: [tailwindcss({ config: path.join(dir, 'tailwind.config.js') }), autoprefixer()],
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    fs: {
      // @shared points outside the Vite root (client/).
      allow: [path.resolve(dir, '..')],
    },
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:4000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: path.join(dir, 'dist'),
    emptyOutDir: true,
  },
});
