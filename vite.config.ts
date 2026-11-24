import { defineConfig } from 'vitest/config';
import preact from '@preact/preset-vite';

// The build is published as one Claude artifact page, so everything is bundled into one script and one stylesheet,
// which scripts/artifact.mjs then inlines into the page.
export default defineConfig({
  plugins: [preact()],
  base: './',
  build: {
    target: 'es2022',
    cssCodeSplit: false,
    assetsInlineLimit: 100000000,
    modulePreload: false,
    rollupOptions: { output: { inlineDynamicImports: true } },
  },
  test: { include: ['src/**/*.test.ts'], environment: 'node' },
});
