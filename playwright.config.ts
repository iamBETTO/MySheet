import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30_000,
  use: { baseURL: 'http://127.0.0.1:4173'},
  projects: [
    { name: 'phone', use: { viewport: { width: 390, height: 844 }, colorScheme: 'dark' } },
    { name: 'desktop', use: { viewport: { width: 1280, height: 900 }, colorScheme: 'light' } },
  ],
  webServer: { command: 'npx vite preview --port 4173 --strictPort --host 127.0.0.1', url: 'http://127.0.0.1:4173', reuseExistingServer: true },
});
