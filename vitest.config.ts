import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    css: true,
    coverage: {
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/app/**',
        'src/components/ui/**',
        'src/components/__mocks__/**',
        'src/types/**',
      ],
      thresholds: {
        lines: 35,
        statements: 35,
        branches: 30,
        functions: 34,
      },
    },
  },
  resolve: {
    alias: {
      '@': '/Users/timomoss/nice-robots/src',
    },
  },
});


