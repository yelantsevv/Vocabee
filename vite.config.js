import { cpSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const projectRoot = fileURLToPath(new URL('.', import.meta.url));
const sourceDirectory = resolve(projectRoot, 'src');
const outputDirectory = resolve(projectRoot, 'dist');

function copyExtensionRuntime() {
  return {
    name: 'copy-extension-runtime',
    closeBundle() {
      cpSync(
        resolve(sourceDirectory, 'content'),
        resolve(outputDirectory, 'content'),
        { recursive: true }
      );
      writeFileSync(
        resolve(outputDirectory, 'background.js'),
        readFileSync(resolve(sourceDirectory, 'background.js'), 'utf8')
      );
      cpSync(
        resolve(sourceDirectory, 'icons'),
        resolve(outputDirectory, 'icons'),
        { recursive: true }
      );
      const manifest = JSON.parse(readFileSync(resolve(projectRoot, 'manifest.json'), 'utf8'));
      manifest.background.service_worker = manifest.background.service_worker.replace(/^src\//, '');
      manifest.icons = Object.fromEntries(
        Object.entries(manifest.icons).map(([size, file]) => [size, file.replace(/^src\//, '')])
      );
      manifest.action.default_icon = Object.fromEntries(
        Object.entries(manifest.action.default_icon).map(([size, file]) => [size, file.replace(/^src\//, '')])
      );
      manifest.content_scripts = manifest.content_scripts.map((contentScript) => ({
        ...contentScript,
        css: contentScript.css.map((file) => file.replace(/^src\//, '')),
        js: contentScript.js.map((file) => file.replace(/^src\//, ''))
      }));
      writeFileSync(
        resolve(outputDirectory, 'manifest.json'),
        `${JSON.stringify(manifest, null, 2)}\n`
      );
    }
  };
}

export default defineConfig({
  root: sourceDirectory,
  base: './',
  publicDir: false,
  plugins: [copyExtensionRuntime()],
  build: {
    outDir: outputDirectory,
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(sourceDirectory, 'popup/popup.html')
    }
  }
});
