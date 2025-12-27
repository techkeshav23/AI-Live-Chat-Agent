import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/services/**', 'src/middleware/**'],
    },
    // Mock environment variables for tests
    env: {
      GEMINI_API_KEY: 'test-api-key',
      DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
    },
  },
});
