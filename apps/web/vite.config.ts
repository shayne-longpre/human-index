import path from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const here = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: here,
  publicDir: path.join(here, 'public'),
  plugins: [react()],
  resolve: {
    alias: {
      '@atlas/contracts': path.resolve(here, '../../packages/contracts/src/index.ts'),
    },
  },
  optimizeDeps: {
    // MapLibre resolves its worker at runtime; Vite pre-bundling can leave a
    // stale worker path after dependency updates during development.
    exclude: ['maplibre-gl'],
  },
  build: {
    outDir: path.resolve(here, '../../dist'),
    emptyOutDir: true,
    sourcemap: true,
  },
  test: {
    environment: 'node',
    include: [
      path.resolve(here, '../../packages/contracts/test/**/*.test.ts'),
      path.resolve(here, 'src/**/*.test.ts'),
    ],
  },
});
