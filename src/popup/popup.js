const storage = chrome.storage.sync || chrome.storage.local;

const enabledInput = document.getElementById('enabled');
const langSelect = document.getElementById('lang');
const sourceLanguage = document.getElementById('source-language');

function loadSettings() {
  storage.get({ enabled: true, lang: 'ru' }, (result) => {
    enabledInput.checked = Boolean(result.enabled);
    langSelect.value = result.lang || 'ru';
  });
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tabId = tabs[0]?.id;
    if (tabId === undefined) {
      sourceLanguage.textContent = 'Недоступно';
      return;
    }

    chrome.tabs.sendMessage(tabId, { type: 'GET_LANGUAGE_STATUS' }, (status) => {
      if (chrome.runtime.lastError || !status) {
        sourceLanguage.textContent = 'Откройте видео на YouTube';
        return;
      }
      sourceLanguage.textContent = status.sourceLanguage;
    });
  });
}

function saveSettings() {
  storage.set({
    enabled: enabledInput.checked,
    lang: langSelect.value,
  });
}

enabledInput.addEventListener('change', saveSettings);
langSelect.addEventListener('change', saveSettings);

loadSettings();
