import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const projectRoot = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  root: projectRoot,
  plugins: [react()],
  build: {
    outDir: resolve(projectRoot, 'dist'),
    emptyOutDir: false,
    cssCodeSplit: false,
    rollupOptions: {
      input: resolve(projectRoot, 'src/content/content-app.jsx'),
      output: {
        format: 'iife',
        name: 'VocabeeContentApp',
        entryFileNames: 'content/content-app.js',
        assetFileNames: 'content/content-app.css',
        inlineDynamicImports: true
      }
    }
  }
});
