import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
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
        resolve(sourceDirectory, 'vocabee/content/runtime'),
        resolve(outputDirectory, 'vocabee/content/runtime'),
        { recursive: true }
      );
      cpSync(
        resolve(sourceDirectory, 'vocabee/content/content.css'),
        resolve(outputDirectory, 'vocabee/content/content.css')
      );
      cpSync(
        resolve(sourceDirectory, 'vocabee/background'),
        resolve(outputDirectory, 'vocabee/background'),
        { recursive: true }
      );
      cpSync(
        resolve(sourceDirectory, 'vocabee/icons'),
        resolve(outputDirectory, 'vocabee/icons'),
        { recursive: true }
      );
      const dictionaryDirectory = resolve(outputDirectory, 'dictionary');
      if (existsSync(dictionaryDirectory)) {
        cpSync(dictionaryDirectory, resolve(outputDirectory, 'vocabee/dictionary'), { recursive: true });
      }
      const popupHtmlPath = resolve(outputDirectory, 'vocabee/popup/popup.html');
      const sharedAssetsDirectory = resolve(outputDirectory, 'assets');
      if (existsSync(sharedAssetsDirectory)) {
        cpSync(sharedAssetsDirectory, resolve(outputDirectory, 'vocabee/assets'), { recursive: true });
      }
      if (existsSync(popupHtmlPath) && existsSync(sharedAssetsDirectory)) {
        let popupHtml = readFileSync(popupHtmlPath, 'utf8');
        popupHtml = popupHtml.replaceAll('../../assets/', '../assets/');
        writeFileSync(popupHtmlPath, popupHtml);
      }
      const manifest = JSON.parse(readFileSync(resolve(sourceDirectory, 'vocabee/manifest.json'), 'utf8'));
      const packagedIconPaths = [
        ...Object.values(manifest.icons),
        ...Object.values(manifest.action.default_icon),
        'icons/vocabee-16.png',
        'icons/vocabee-32.png'
      ];
      const missingIcons = packagedIconPaths.filter((iconPath) => (
        !existsSync(resolve(outputDirectory, 'vocabee', iconPath))
      ));
      if (missingIcons.length) {
        throw new Error(`Vocabee extension package is missing icon files: ${missingIcons.join(', ')}`);
      }
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
