import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./tests/helpers/setup.ts'],
    testTimeout: 30000,
    hookTimeout: 30000
  }
});
