/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: ['lightbi.thaiduy.digital'],
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5172',
        changeOrigin: true
      }
    },
  },
  test: {
    exclude: ['**/node_modules/**', '**/dist/**', 'verify.spec.ts', 'concurrency.spec.ts', '**/e2e/**'],
  },
  optimizeDeps: {
    exclude: ['@duckdb/duckdb-wasm']
  }
})
