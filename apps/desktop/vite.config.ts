/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: ['lightbi.thaiduy.digital'],
  },
  test: {
    exclude: ['**/node_modules/**', '**/dist/**', 'verify.spec.ts', 'concurrency.spec.ts', '**/e2e/**'],
  },
  optimizeDeps: {
    exclude: ['@duckdb/duckdb-wasm']
  }
})
