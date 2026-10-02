import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  build: {
    outDir: '.build',
    emptyOutDir: true,
    assetsInlineLimit: 0,
  },
  test: { environment: 'jsdom' },
});
