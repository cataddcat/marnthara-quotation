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
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      // วัด coverage เฉพาะ business logic (pure + deterministic) — ไม่รวม UI/worker
      include: [
        'src/lib/pricing/CostEngine.ts',
        'src/lib/pricing/PricingEngine.ts',
        'src/features/**/logic/*.ts',
        'src/features/**/schemas.ts',
        'src/store/slices/*.ts',
      ],
      exclude: [
        '**/*.{test,spec}.{ts,tsx}',
        'src/lib/pricing/__test-helpers.ts',
        'src/lib/pricing/pricing.worker.ts', // worker รันใน jsdom ไม่ได้
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        statements: 80,
        branches: 75,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
