(() => {
  const CHANNEL = 'VOCABEE_LOCAL_DICTIONARY';
  const isLocalHost = window.location.protocol === 'http:'
    && ['localhost', '127.0.0.1'].includes(window.location.hostname);

  if (!isLocalHost || window.location.pathname !== '/dictionary.html') {
    return;
  }

  window.addEventListener('message', (event) => {
    if (event.source !== window || event.origin !== window.location.origin) return;
    const message = event.data;
    if (message?.channel !== CHANNEL || message.type !== 'REQUEST' || typeof message.id !== 'string') return;

    if (message.action === 'GET_DICTIONARY_WORDS') {
      chrome.runtime.sendMessage({ type: 'GET_DICTIONARY_WORDS' }, (response) => {
        const error = chrome.runtime.lastError?.message;
        window.postMessage({
          channel: CHANNEL,
          type: 'RESPONSE',
          id: message.id,
          result: response?.ok ? response.words : undefined,
          error: error || response?.error
        }, window.location.origin);
      });
      return;
    }

    if (message.action === 'GET_SETTINGS') {
      chrome.storage.sync.get(message.keys, (settings) => {
        window.postMessage({
          channel: CHANNEL,
          type: 'RESPONSE',
          id: message.id,
          result: chrome.runtime.lastError ? undefined : settings,
          error: chrome.runtime.lastError?.message
        }, window.location.origin);
      });
      return;
    }

    if (message.action === 'SAVE_SETTINGS' && message.settings && typeof message.settings === 'object') {
      chrome.storage.sync.set(message.settings, () => {
        window.postMessage({
          channel: CHANNEL,
          type: 'RESPONSE',
          id: message.id,
          result: chrome.runtime.lastError ? undefined : true,
          error: chrome.runtime.lastError?.message
        }, window.location.origin);
      });
    }
  });

  window.postMessage({ channel: CHANNEL, type: 'READY' }, window.location.origin);
})();
