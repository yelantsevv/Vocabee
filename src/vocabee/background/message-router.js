import {
  CUSTOM_DICTIONARY_DATABASE_PREFIX,
  DICTIONARY_DATABASE,
  LEGACY_DICTIONARY_DATABASE,
  PREVIOUS_DICTIONARY_DATABASE
} from './constants.js';
import {
  addWordToMyDictionary,
  deleteWordFromMyDictionary,
  deleteIndexedDatabase,
  getDictionaryWords,
  getMyVocabularyEntries,
  listIndexedDatabases
} from './dictionary-store.js';

export function registerMessageHandlers() {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message?.type === 'SET_VOCABEE_TAB_STATE') {
      if (sender.id !== chrome.runtime.id || sender.tab?.id === undefined) {
        sendResponse({ ok: false });
        return false;
      }
      chrome.action.setTitle({
        tabId: sender.tab.id,
        title: message.enabled ? 'Vocabee включён (нажмите, чтобы выключить)' : 'Vocabee выключен (нажмите, чтобы включить)'
      });
      chrome.action.setBadgeText({ tabId: sender.tab.id, text: message.enabled ? '' : 'OFF' });
      chrome.action.setBadgeBackgroundColor({ tabId: sender.tab.id, color: '#5f6368' });
      chrome.tabs.sendMessage(sender.tab.id, {
        type: 'VOCABEE_APP_STATE_CHANGED',
        enabled: Boolean(message.panelVisible)
      });
      sendResponse({ ok: true });
      return false;
    }

    if (message?.type === 'OPEN_EXTENSION_SETTINGS') {
      if (sender.id !== chrome.runtime.id) {
        sendResponse({ ok: false, error: 'Запрос на открытие настроек отклонён.' });
        return false;
      }
      chrome.tabs.create({ url: 'chrome://extensions/' }, () => {
        if (chrome.runtime.lastError) {
          sendResponse({ ok: false, error: chrome.runtime.lastError.message });
          return;
        }
        sendResponse({ ok: true });
      });
      return true;
    }

    if (![
      'ADD_DICTIONARY_WORD',
      'START_DICTIONARY_WORD_LEARNING',
      'GET_DICTIONARY_WORDS',
      'GET_MY_VOCABEE_DICTIONARY',
      'DELETE_MY_VOCABEE_ENTRY',
      'DELETE_INDEXED_DATABASE',
      'LIST_INDEXED_DATABASES'
    ].includes(message?.type)) {
      return false;
    }

    if (sender.id !== chrome.runtime.id) {
      sendResponse({ ok: false, error: 'Запрос на сохранение отклонён.' });
      return false;
    }

    if (message.type === 'DELETE_INDEXED_DATABASE') {
      const allowedDatabaseNames = new Set([
        DICTIONARY_DATABASE,
        PREVIOUS_DICTIONARY_DATABASE,
        'my-vocabee',
        LEGACY_DICTIONARY_DATABASE,
        'en-ru-vocabee',
        'de-ru-vocabee',
        'en-ru-everyday-phrases-vocabee',
        'en-ru-travel-phrases-vocabee',
        'vocabee-catalog'
      ]);
      if (!allowedDatabaseNames.has(message.databaseName)
        && !message.databaseName?.startsWith(CUSTOM_DICTIONARY_DATABASE_PREFIX)) {
        sendResponse({ ok: false, error: 'Неизвестная база данных.' });
        return false;
      }
      deleteIndexedDatabase(message.databaseName)
        .then(() => sendResponse({ ok: true }))
        .catch((error) => sendResponse({ ok: false, error: error.message }));
      return true;
    }

    if (message.type === 'LIST_INDEXED_DATABASES') {
      listIndexedDatabases()
        .then((databases) => sendResponse({ ok: true, databases }))
        .catch((error) => sendResponse({ ok: false, error: error.message }));
      return true;
    }

    if (message.type === 'GET_DICTIONARY_WORDS') {
      getDictionaryWords()
        .then((words) => sendResponse({ ok: true, words }))
        .catch((error) => {
          console.error('Vocabee: could not load dictionary', error);
          sendResponse({ ok: false, error: error.message });
        });
      return true;
    }

    if (message.type === 'GET_MY_VOCABEE_DICTIONARY') {
      getMyVocabularyEntries()
        .then((entries) => sendResponse({ ok: true, entries }))
        .catch((error) => {
          console.error('Vocabee: could not load my vocabulary database', error);
          sendResponse({ ok: false, error: error.message });
        });
      return true;
    }

    if (message.type === 'DELETE_MY_VOCABEE_ENTRY') {
      deleteWordFromMyDictionary(message.entry)
        .then((removed) => {
          sendResponse({ ok: true, removed });
          if (removed) {
            chrome.runtime.sendMessage({ type: 'MY_DICTIONARY_UPDATED' }, () => {
              void chrome.runtime.lastError;
            });
          }
        })
        .catch((error) => sendResponse({ ok: false, error: error.message }));
      return true;
    }

    const saveRequest = addWordToMyDictionary(message.word, {
      startLearning: message.type === 'START_DICTIONARY_WORD_LEARNING'
    });
    saveRequest
      .then((result) => {
        sendResponse({ ok: true, ...result });
        chrome.runtime.sendMessage({ type: 'MY_DICTIONARY_UPDATED' }, () => {
          void chrome.runtime.lastError;
        });
      })
      .catch((error) => {
        console.error('Vocabee: could not add word to dictionary', error);
        sendResponse({ ok: false, error: error.message });
      });
    return true;
  });
}
