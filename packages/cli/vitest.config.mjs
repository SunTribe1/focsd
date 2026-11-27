import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.mjs'],
    environment: 'node',
    // Coverage floor: raise it when coverage rises, never lower it to make a change pass.
    coverage: {
      enabled: true,
      provider: 'v8',
      include: ['src/**'],
      reporter: ['text-summary'],
      thresholds: { lines: 85, branches: 75 },
    },
  },
});
