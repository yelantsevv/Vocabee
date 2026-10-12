(() => {
  const CHANNEL = 'VOCABEE_LOCAL_DICTIONARY';
  const isLocalHost = window.location.protocol === 'http:'
    && window.location.port === '5173'
    && ['localhost', '127.0.0.1'].includes(window.location.hostname);

  if (!isLocalHost || window.location.pathname !== '/dictionary/dictionary.html') {
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

    if (message.action === 'GET_MY_VOCABEE_DICTIONARY') {
      chrome.runtime.sendMessage({ type: 'GET_MY_VOCABEE_DICTIONARY' }, (response) => {
        const error = chrome.runtime.lastError?.message;
        window.postMessage({
          channel: CHANNEL,
          type: 'RESPONSE',
          id: message.id,
          result: response?.ok ? response.entries : undefined,
          error: error || response?.error
        }, window.location.origin);
      });
      return;
    }

    if (message.action === 'OPEN_EXTENSION_SETTINGS') {
      chrome.runtime.sendMessage({ type: 'OPEN_EXTENSION_SETTINGS' }, (response) => {
        const error = chrome.runtime.lastError?.message;
        window.postMessage({
          channel: CHANNEL,
          type: 'RESPONSE',
          id: message.id,
          result: response?.ok ? true : undefined,
          error: error || response?.error
        }, window.location.origin);
      });
      return;
    }

    if (message.action === 'DELETE_INDEXED_DATABASE' && typeof message.databaseName === 'string') {
      chrome.runtime.sendMessage({
        type: 'DELETE_INDEXED_DATABASE',
        databaseName: message.databaseName
      }, (response) => {
        const error = chrome.runtime.lastError?.message;
        window.postMessage({
          channel: CHANNEL,
          type: 'RESPONSE',
          id: message.id,
          result: response?.ok ? true : undefined,
          error: error || response?.error
        }, window.location.origin);
      });
      return;
    }

    if (message.action === 'LIST_INDEXED_DATABASES') {
      chrome.runtime.sendMessage({ type: 'LIST_INDEXED_DATABASES' }, (response) => {
        const error = chrome.runtime.lastError?.message;
        window.postMessage({
          channel: CHANNEL,
          type: 'RESPONSE',
          id: message.id,
          result: response?.ok ? response.databases : undefined,
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
      return;
    }

  });

  chrome.runtime.onMessage.addListener((message) => {
    if (message?.type === 'MY_DICTIONARY_UPDATED') {
      window.postMessage({
        channel: CHANNEL,
        type: 'MY_DICTIONARY_UPDATED'
      }, window.location.origin);
    }
  });

  window.postMessage({ channel: CHANNEL, type: 'READY' }, window.location.origin);
})();
