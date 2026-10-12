import { ACTION_ICON_BASE64 } from './action-icon-data.js';

const ACTIVE_ICON = {
  16: ACTION_ICON_BASE64.active['16'],
  32: ACTION_ICON_BASE64.active['32']
};

const INACTIVE_ICON = {
  16: ACTION_ICON_BASE64.inactive['16'],
  32: ACTION_ICON_BASE64.inactive['32']
};

const ICON_DATA_CACHE = new Map();
const YOUTUBE_CONTENT_FILES = [
  'content/runtime/content-core.js',
  'content/runtime/caption-language.js',
  'content/runtime/video-pause.js',
  'content/runtime/main.js',
  'content/content-app.js'
];

function isLocalDictionaryUrl(url) {
  return url.protocol === 'http:'
    && url.port === '5173'
    && ['localhost', '127.0.0.1'].includes(url.hostname)
    && url.pathname === '/dictionary/dictionary.html';
}

function isSupportedUrl(value) {
  try {
    const url = new URL(value || '');
    return (url.protocol === 'https:' && url.hostname === 'www.youtube.com')
      || isLocalDictionaryUrl(url);
  } catch {
    return false;
  }
}

function loadIconData(icon) {
  const key = Object.values(icon).join(':');
  if (!ICON_DATA_CACHE.has(key)) {
    ICON_DATA_CACHE.set(key, Promise.all(Object.entries(icon).map(async ([size, encodedPng]) => {
      const binary = atob(encodedPng);
      const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
      const bitmap = await createImageBitmap(new Blob([bytes], { type: 'image/png' }));
      const canvas = new OffscreenCanvas(Number(size), Number(size));
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Could not create an offscreen canvas context.');
      context.drawImage(bitmap, 0, 0);
      bitmap.close();
      return [size, context.getImageData(0, 0, Number(size), Number(size))];
    })).then(Object.fromEntries));
  }
  return ICON_DATA_CACHE.get(key);
}

function setActionIcon(tabId, icon) {
  loadIconData(icon).then((imageData) => (
    chrome.action.setIcon({ tabId, imageData })
  )).catch((error) => {
    const errorMessage = error?.message || String(error);
    console.error(
      'Vocabee: could not set the action icon from embedded image data.',
      `Error: ${errorMessage}`
    );
  });
}

function updateTabAction(tabId, url) {
  const isActive = isSupportedUrl(url);
  setActionIcon(tabId, isActive ? ACTIVE_ICON : INACTIVE_ICON);
  chrome.action.setTitle({
    tabId,
    title: isActive ? 'Vocabee' : 'Vocabee работает только на YouTube'
  });

  if (isActive) chrome.action.setBadgeText({ tabId, text: '' });
}

function updateCurrentTabAction() {
  chrome.tabs.query({ active: true, lastFocusedWindow: true }, ([tab]) => {
    if (tab?.id !== undefined) updateTabAction(tab.id, tab.url);
  });
}

function showUnsupportedSiteNotice(tabId) {
  chrome.action.setBadgeBackgroundColor({ tabId, color: '#b3261e' });
  chrome.action.setBadgeText({ tabId, text: 'YT' });

  chrome.scripting.executeScript({
    target: { tabId },
    func: () => {
      const hostId = 'vocabee-site-restriction-toast';
      document.getElementById(hostId)?.remove();

      const host = document.createElement('div');
      host.id = hostId;
      host.style.cssText = 'position:fixed;right:20px;bottom:20px;z-index:2147483647';

      const shadowRoot = host.attachShadow({ mode: 'closed' });
      const style = document.createElement('style');
      style.textContent = `
        .notice {
          padding: 12px 16px;
          border-radius: 10px;
          background: #25242c;
          color: #fff;
          box-shadow: 0 4px 18px #0005;
          font: 14px/1.4 system-ui, sans-serif;
        }
      `;

      const notice = document.createElement('div');
      notice.className = 'notice';
      notice.textContent = 'Расширение Vocabee работает только на YouTube.';
      shadowRoot.append(style, notice);
      document.documentElement.append(host);
      setTimeout(() => host.remove(), 3500);
    }
  }).catch(() => {
    // Protected browser pages cannot host the notice; the action badge remains visible.
  });
}

function handleActionClick(tab) {
  if (tab?.id === undefined) return;

  let url;
  try {
    url = new URL(tab.url || '');
  } catch {
    showUnsupportedSiteNotice(tab.id);
    return;
  }

  if (!isSupportedUrl(url.href)) {
    updateTabAction(tab.id, url.href);
    showUnsupportedSiteNotice(tab.id);
    return;
  }

  updateTabAction(tab.id, url.href);
  if (isLocalDictionaryUrl(url)) return;

  sendAppToggle(tab.id, true);
}

function sendAppToggle(tabId, recoverIfUnavailable = false) {
  chrome.tabs.sendMessage(tabId, { type: 'TOGGLE_VOCABEE_APP' }, (response) => {
    if (chrome.runtime.lastError) {
      if (recoverIfUnavailable) {
        void restoreYouTubeContentScript(tabId, true);
        return;
      }
      console.error('Vocabee: YouTube content script is unavailable', chrome.runtime.lastError.message);
      return;
    }
    chrome.action.setTitle({
      tabId,
      title: response?.enabled ? 'Vocabee включён (нажмите, чтобы выключить)' : 'Vocabee выключен (нажмите, чтобы включить)'
    });
    chrome.action.setBadgeText({ tabId, text: response?.enabled ? '' : 'OFF' });
    chrome.action.setBadgeBackgroundColor({ tabId, color: '#5f6368' });
  });
}

function sendPanelToggle(tabId, recoverIfUnavailable = false) {
  chrome.tabs.sendMessage(tabId, { type: 'TOGGLE_VOCABEE_PANEL' }, () => {
    if (chrome.runtime.lastError) {
      if (recoverIfUnavailable) {
        void restoreYouTubeContentScript(tabId);
        return;
      }
      console.error('Vocabee: YouTube content script is unavailable', chrome.runtime.lastError.message);
    }
  });
}

async function restoreYouTubeContentScript(tabId, toggleApp = false) {
  try {
    const [panelRoot] = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => Boolean(document.getElementById('vocabee-react-panel-root'))
    });

    if (panelRoot?.result) {
      await new Promise((resolve) => setTimeout(resolve, 150));
      if (toggleApp) sendAppToggle(tabId);
      else sendPanelToggle(tabId);
      return;
    }

    await chrome.scripting.insertCSS({
      target: { tabId },
      files: ['content/content.css', 'content/content-app.css']
    });
    await chrome.scripting.executeScript({ target: { tabId }, files: YOUTUBE_CONTENT_FILES });
    await new Promise((resolve) => setTimeout(resolve, 150));
    if (toggleApp) sendAppToggle(tabId);
    else sendPanelToggle(tabId);
  } catch (error) {
    console.error('Vocabee: could not start on this YouTube tab. Reload the page and try again.', error);
  }
}

export function registerActionHandlers() {
  chrome.action.onClicked.addListener(() => {
    chrome.tabs.query({ active: true, lastFocusedWindow: true }, ([tab]) => handleActionClick(tab));
  });

  chrome.tabs.onActivated.addListener(updateCurrentTabAction);
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.url || changeInfo.status === 'complete') {
      updateTabAction(tabId, changeInfo.url || tab.url);
    }
  });
  chrome.windows.onFocusChanged.addListener((windowId) => {
    if (windowId !== chrome.windows.WINDOW_ID_NONE) updateCurrentTabAction();
  });

  chrome.runtime.onStartup.addListener(updateCurrentTabAction);
  chrome.runtime.onInstalled.addListener(updateCurrentTabAction);
}
