import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const projectRoot = fileURLToPath(new URL('.', import.meta.url));
const sourceDirectory = resolve(projectRoot, 'src');
const extensionDirectory = resolve(sourceDirectory, 'vocabee');

export default defineConfig({
  root: extensionDirectory,
  base: './',
  publicDir: false,
  plugins: [react()],
  build: {
    outDir: resolve(projectRoot, 'dist/vocabee'),
    emptyOutDir: false,
    rollupOptions: {
      input: resolve(extensionDirectory, 'popup/popup.html')
    }
  }
});
