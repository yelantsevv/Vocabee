import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('.', import.meta.url));
const sourceDirectory = resolve(projectRoot, 'src');

export default defineConfig({
  root: sourceDirectory,
  base: './',
  publicDir: false,
  plugins: [react()],
  build: {
    outDir: resolve(projectRoot, 'dist/dictionary'),
    emptyOutDir: true,
    rollupOptions: { input: resolve(sourceDirectory, 'dictionary/dictionary.html') }
  }
});
