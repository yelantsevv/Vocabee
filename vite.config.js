import { cpSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const projectRoot = fileURLToPath(new URL('.', import.meta.url));
const sourceDirectory = resolve(projectRoot, 'src');
const outputDirectory = resolve(projectRoot, 'dist');

function copyExtensionRuntime() {
  return {
    name: 'copy-extension-runtime',
    closeBundle() {
      mkdirSync(resolve(outputDirectory, 'vocabee'), { recursive: true });
      cpSync(
        resolve(sourceDirectory, 'vocabee/content'),
        resolve(outputDirectory, 'vocabee/content'),
        { recursive: true }
      );
      writeFileSync(
        resolve(outputDirectory, 'vocabee/background.js'),
        readFileSync(resolve(sourceDirectory, 'vocabee/background.js'), 'utf8')
      );
      cpSync(
        resolve(sourceDirectory, 'vocabee/icons'),
        resolve(outputDirectory, 'vocabee/icons'),
        { recursive: true }
      );
      const manifest = JSON.parse(readFileSync(resolve(sourceDirectory, 'vocabee/manifest.json'), 'utf8'));
      manifest.background.service_worker = manifest.background.service_worker.replace(/^src\//, '');
      manifest.icons = Object.fromEntries(
        Object.entries(manifest.icons).map(([size, file]) => [size, file.replace(/^src\//, '')])
      );
      manifest.action.default_icon = Object.fromEntries(
        Object.entries(manifest.action.default_icon).map(([size, file]) => [size, file.replace(/^src\//, '')])
      );
      manifest.content_scripts = manifest.content_scripts.map((contentScript) => ({
        ...contentScript,
        ...(contentScript.css ? {
          css: contentScript.css.map((file) => file.replace(/^src\//, '').replace(/^dist\//, ''))
        } : {}),
        js: contentScript.js.map((file) => file.replace(/^src\//, '').replace(/^dist\//, ''))
      }));
      writeFileSync(
        resolve(outputDirectory, 'vocabee/manifest.json'),
        `${JSON.stringify(manifest, null, 2)}\n`
      );
    }
  };
}

export default defineConfig({
  root: sourceDirectory,
  base: './',
  publicDir: false,
  plugins: [react(), copyExtensionRuntime()],
  build: {
    outDir: outputDirectory,
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: resolve(sourceDirectory, 'vocabee/popup/popup.html'),
        dictionary: resolve(sourceDirectory, 'dictionary/dictionary.html')
      }
    }
  }
});
