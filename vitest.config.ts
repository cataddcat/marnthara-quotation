/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import path from 'path';

// Configuration for Testing (Vitest)
export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom', // จำลอง Browser environment
    setupFiles: './src/test/setup.ts',
    // [FIXED] Scope tests only to src directory to avoid conflict with Playwright (in /tests)
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['tests/**/*', 'node_modules'],
    css: false,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
