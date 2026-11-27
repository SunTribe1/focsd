import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.mjs'],
    environment: 'node',
    // The command tests start the CLI as child processes, several per test; under a full parallel
    // `turbo run test` one took 5.3 s against the 5 s default.
    testTimeout: 20_000,
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
