import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const projectRoot = fileURLToPath(new URL('.', import.meta.url));
const sourceDirectory = resolve(projectRoot, 'src');
const extensionDirectory = resolve(sourceDirectory, 'vocabee');
const outputDirectory = resolve(projectRoot, 'dist/vocabee');

function packageExtension() {
  return {
    name: 'package-vocabee-extension',
    closeBundle() {
      mkdirSync(outputDirectory, { recursive: true });
      cpSync(resolve(extensionDirectory, 'content/runtime'), resolve(outputDirectory, 'content/runtime'), { recursive: true });
      cpSync(resolve(extensionDirectory, 'content/content.css'), resolve(outputDirectory, 'content/content.css'));
      cpSync(resolve(extensionDirectory, 'background'), resolve(outputDirectory, 'background'), { recursive: true });
      cpSync(resolve(extensionDirectory, 'icons'), resolve(outputDirectory, 'icons'), { recursive: true });

      const popupHtmlPath = resolve(outputDirectory, 'popup/popup.html');
      const sharedAssetsDirectory = resolve(outputDirectory, 'assets');
      if (existsSync(popupHtmlPath) && existsSync(sharedAssetsDirectory)) {
        const popupHtml = readFileSync(popupHtmlPath, 'utf8').replaceAll('../../assets/', '../assets/');
        writeFileSync(popupHtmlPath, popupHtml);
      }

      const manifest = JSON.parse(readFileSync(resolve(extensionDirectory, 'manifest.json'), 'utf8'));
      const iconPaths = [...Object.values(manifest.icons), ...Object.values(manifest.action.default_icon)];
      const missingIcons = iconPaths.filter((iconPath) => !existsSync(resolve(outputDirectory, iconPath)));
      if (missingIcons.length) throw new Error(`Vocabee extension package is missing icons: ${missingIcons.join(', ')}`);
      writeFileSync(resolve(outputDirectory, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
    }
  };
}

export default defineConfig({
  root: extensionDirectory,
  base: './',
  publicDir: false,
  plugins: [react(), packageExtension()],
  build: {
    outDir: outputDirectory,
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(extensionDirectory, 'popup/popup.html')
    }
  }
});
