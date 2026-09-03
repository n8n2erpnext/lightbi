/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'node:fs'

const routing = JSON.parse(readFileSync(new URL('./src/lib/lightbi-routing.json', import.meta.url), 'utf8')) as Record<'production' | 'next', { publicOrigin: string }>
const allowedHosts = ['production', 'next'].map(environment => new URL(routing[environment as 'production' | 'next'].publicOrigin).hostname)

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'lightbi-distribution-trailing-slash',
      configureServer(server) {
        server.middlewares.use(async (request, response, next) => {
          const current = new URL(request.url || '/', 'http://lightbi.local');
          if (request.method === 'GET' && (current.pathname === '/distribution' || current.pathname === '/distribution/')) {
            response.statusCode = 308;
            response.setHeader('location', `/${current.search}`);
            response.end();
            return;
          }
          if (request.method === 'GET' && current.pathname === '/distribution/admin') {
            response.statusCode = 308;
            response.setHeader('location', `/admin${current.search}`);
            response.end();
            return;
          }
          if (request.method === 'GET' && (current.pathname === '/' || current.pathname === '/admin' || current.pathname === '/account')) {
            try {
              const upstream = await fetch(`http://127.0.0.1:5174${current.pathname}${current.search}`);
              response.statusCode = upstream.status;
              upstream.headers.forEach((value, key) => response.setHeader(key, value));
              response.end(Buffer.from(await upstream.arrayBuffer()));
              return;
            } catch {
              response.statusCode = 503;
              response.end('Distribution portal is starting.');
              return;
            }
          }
          next();
        });
      },
    },
  ],
  server: {
    allowedHosts,
    proxy: {
      '/distribution-assets': {
        target: 'http://127.0.0.1:5174',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/distribution-assets/, '') || '/',
      },
      '/distribution-api': {
        target: 'http://127.0.0.1:5174',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/distribution-api/, '') || '/',
      },
      '/distribution': {
        target: 'http://127.0.0.1:5174',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/distribution/, '') || '/',
      },
      '/api': {
        target: 'http://127.0.0.1:5172',
        changeOrigin: true
      }
    },
  },
  test: {
    exclude: ['**/node_modules/**', '**/dist/**', 'verify.spec.ts', 'concurrency.spec.ts', '**/e2e/**'],
    setupFiles: ['./src/test/vitest.setup.ts'],
  },
  optimizeDeps: {
    include: ['@duckdb/duckdb-wasm/dist/duckdb-browser']
  }
})
