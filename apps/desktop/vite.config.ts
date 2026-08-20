/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: ['lightbi.thaiduy.digital'],
    proxy: {
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
