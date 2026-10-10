import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const projectRoot = fileURLToPath(new URL('.', import.meta.url));
const sourceDirectory = resolve(projectRoot, 'src');

export default defineConfig({
  root: sourceDirectory,
  base: './',
  publicDir: false,
  plugins: [react()],
  build: {
    outDir: resolve(projectRoot, 'dist'),
    emptyOutDir: false,
    rollupOptions: {
      input: resolve(sourceDirectory, 'popup/popup.html')
    }
  }
});
