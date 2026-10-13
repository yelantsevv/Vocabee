import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('.', import.meta.url));
const dictionaryDirectory = resolve(projectRoot, 'src/dictionary');

export default defineConfig(({ mode }) => ({
  root: dictionaryDirectory,
  base: mode === 'github-pages' ? '/Vocabee/' : './',
  publicDir: false,
  plugins: [react()],
  build: {
    outDir: resolve(projectRoot, 'dist/dictionary'),
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(dictionaryDirectory, mode === 'github-pages' ? 'index.html' : 'dictionary.html')
    }
  }
}));
