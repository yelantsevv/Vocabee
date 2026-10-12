import { execFile } from 'node:child_process';
import { build, createServer } from 'vite';

const watchers = new Set();
let contentWatcher;
let startingContentWatcher = false;
let previewServer;

function reportEvents(name, watcher) {
  watcher.on('event', (event) => {
    if (event.code === 'ERROR') {
      console.error(`[${name}] ${event.error.message}`);
    }
  });
}

async function startContentWatcher() {
  if (startingContentWatcher || contentWatcher) return;
  startingContentWatcher = true;

  try {
    contentWatcher = await build({
      configFile: 'vite.content.config.js',
      build: { watch: {} }
    });
    watchers.add(contentWatcher);
    reportEvents('content', contentWatcher);
    console.log('[dev] Watching content UI and styles.');
  } catch (error) {
    console.error('[content] Initial build failed:', error);
    process.exitCode = 1;
  }
}

async function closeWatchers() {
  await Promise.all([
    ...[...watchers].map((watcher) => watcher.close()),
    previewServer?.close()
  ]);
}

function openPreview(url) {
  const command = process.platform === 'darwin'
    ? 'open'
    : process.platform === 'win32'
      ? 'cmd'
      : 'xdg-open';
  const args = process.platform === 'win32' ? ['/c', 'start', '', url] : [url];
  execFile(command, args, (error) => {
    if (error) console.warn(`[dev] Could not open browser automatically: ${error.message}`);
  });
}

process.env.NODE_ENV = 'development';

try {
  previewServer = await createServer({ configFile: 'vite.config.js' });
  await previewServer.listen();
  const dictionaryUrl = new URL('dictionary/dictionary.html', previewServer.resolvedUrls.local[0]).toString();
  console.log(`[dev] Dictionary available at ${dictionaryUrl}`);
  openPreview(dictionaryUrl);
} catch (error) {
  console.error('[dictionary] Could not start dictionary site:', error);
  process.exitCode = 1;
}

try {
  const popupWatcher = await build({
    configFile: 'vite.config.js',
    build: { watch: {} }
  });

  watchers.add(popupWatcher);
  reportEvents('popup', popupWatcher);
  popupWatcher.on('event', (event) => {
    if (event.code === 'END') void startContentWatcher();
  });
  console.log('[dev] Watching popup; content build starts after the initial popup build.');
} catch (error) {
  console.error('[popup] Initial build failed:', error);
  process.exitCode = 1;
}

process.once('SIGINT', () => void closeWatchers());
process.once('SIGTERM', () => void closeWatchers());
