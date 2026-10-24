import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createReadStream, existsSync } from 'node:fs';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const here = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: here,
  publicDir: path.join(here, 'public'),
  // Ignored research artifacts are inspectable only by a browser on this machine
  // during development. They never enter Vite's public directory or production build.
  plugins: [react(), {
    name: 'atlas-loopback-research-artifacts',
    apply: 'serve' as const,
    configureServer(server) {
      const files: Record<string, string> = {
        '/local-research/wrp.json': 'data/derived/religion/wrp-national-v1.1.json',
        '/local-research/ccp.json': 'data/derived/institutions/ccp-religion-local.json',
        '/local-research/seshat.json': 'data/derived/institutions/seshat-equinox-local.json',
        '/local-research/candidates.json': 'data/derived/institutions/wrp-ccp-candidates-local.json',
      };
      server.middlewares.use((request, response, next) => {
        const relative = files[request.url?.split('?')[0] ?? ''];
        if (!relative) return next();
        const peer = request.socket.remoteAddress;
        if (!['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(peer ?? '')) {
          response.writeHead(403).end('Local research artifacts are loopback-only');
          return;
        }
        const artifact = path.resolve(here, '../..', relative);
        if (!existsSync(artifact)) {
          response.writeHead(404).end(`Run the local stage command for ${relative}`);
          return;
        }
        response.setHeader('Content-Type', 'application/json; charset=utf-8');
        response.setHeader('Cache-Control', 'no-store');
        createReadStream(artifact).pipe(response);
      });
    },
  }],
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
  server: {
    fs: {
      deny: ['**/.env', '**/.env.*', '**/*.{crt,pem}', '**/data/raw/**', '**/data/derived/**'],
    },
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
      path.resolve(here, '../../packages/contracts/src/**/*.test.ts'),
      path.resolve(here, 'src/**/*.test.ts'),
    ],
  },
});
