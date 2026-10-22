import { fileURLToPath } from 'url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  // tsconfig.json keeps `jsx: "preserve"` for Next.js; compile JSX here so
  // .tsx modules (e.g. react-pdf documents) can be imported by tests.
  oxc: { jsx: { runtime: 'automatic' } },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // Each file runs in a fresh module graph (own DB name, own mocks).
    isolate: true,
    // Starts one in-memory mongod for the whole run and stops it afterwards,
    // even when tests fail.
    globalSetup: ['tests/setup/global-setup.ts'],
    // Per test file: points the app at an isolated database, guards against
    // remote URIs, mocks email/audit side effects, cleans up.
    setupFiles: ['tests/setup/per-file.ts'],
    // Vitest does not load .env.local into process.env, and per-file.ts
    // overwrites the DB/JWT variables anyway — tests never see real config.
    testTimeout: 20_000,
    hookTimeout: 120_000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      reportsDirectory: 'coverage',
      include: [
        'src/server/adminAuth.ts',
        'src/server/totp.ts',
        'src/app/api/auth/**/*.ts',
        'src/app/api/admin/2fa/**/*.ts',
        'src/app/api/admin/users/**/*.ts',
      ],
    },
  },
});
