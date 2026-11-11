import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

import { copyFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('.', import.meta.url));
const dictionaryDirectory = resolve(projectRoot, 'src/dictionary');

function dictionaryServiceWorkerPlugin() {
  return {
    name: 'dictionary-service-worker',
    closeBundle() {
      const outputDirectory = resolve(projectRoot, 'dist/dictionary');
      mkdirSync(outputDirectory, { recursive: true });
      copyFileSync(
        resolve(dictionaryDirectory, 'service-worker.js'),
        resolve(outputDirectory, 'service-worker.js')
      );
    }
  };
}

export default defineConfig(({ mode }) => ({
  root: dictionaryDirectory,
  base: mode === 'github-pages' ? '/Vocabee/' : './',
  publicDir: false,
  plugins: [react(), dictionaryServiceWorkerPlugin()],
  build: {
    outDir: resolve(projectRoot, 'dist/dictionary'),
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(dictionaryDirectory, mode === 'github-pages' ? 'index.html' : 'dictionary.html')
    }
  }
}));
