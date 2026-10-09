(function (app) {
  function getDefaultPosition() {
    const panelWidth = Math.min(320, window.innerWidth - 16);
    return {
      x: Math.max(8, window.innerWidth - panelWidth - 24),
      y: 24
    };
  }

  let panel;
  let panelState = {
    visible: false,
    minimized: false,
    activeView: 'dictionary',
    ...getDefaultPosition()
  };
  let positionSaveTimer;

  function clampPosition(x, y) {
    const bounds = panel.getBoundingClientRect();
    return {
      x: Math.max(8, Math.min(x, window.innerWidth - bounds.width - 8)),
      y: Math.max(8, Math.min(y, window.innerHeight - Math.min(bounds.height, 48) - 8))
    };
  }

  function applyState() {
    panel.hidden = false;
    panel.style.visibility = panelState.visible ? '' : 'hidden';
    panel.classList.toggle('is-minimized', panelState.minimized);
    panel.style.left = `${panelState.x}px`;
    panel.style.top = `${panelState.y}px`;
    const position = clampPosition(panelState.x, panelState.y);
    panelState = { ...panelState, ...position };
    panel.style.left = `${panelState.x}px`;
    panel.style.top = `${panelState.y}px`;
    panel.querySelectorAll('[data-panel-content]').forEach((view) => {
      view.hidden = view.dataset.panelContent !== panelState.activeView;
    });
    panel.hidden = !panelState.visible;
    panel.style.visibility = '';
    panel.querySelector('.vocabee-panel-minimize').setAttribute(
      'aria-label',
      panelState.minimized ? 'Развернуть панель' : 'Свернуть панель'
    );
    panel.querySelector('.vocabee-panel-minimize').textContent = panelState.minimized ? '+' : '−';
    panel.querySelectorAll('[data-panel-target]').forEach((button) => {
      const isActive = button.dataset.panelTarget === panelState.activeView;
      button.setAttribute('aria-pressed', String(isActive));
    });
  }

  function saveState() {
    app.storage.set({ vocabeePanel: panelState }, () => {
      if (chrome.runtime.lastError) {
        console.error('Vocabee: could not save panel state', chrome.runtime.lastError.message);
      }
    });
  }

  function updateSourceLanguage() {
    app.updateDetectedSourceLanguage();
    const language = app.detectedCaptionLanguage
      ? app.languageNames[app.detectedCaptionLanguage]
      : 'Не найден';
    const languageLabel = panel.querySelector('.vocabee-panel-source-language');
    if (languageLabel.textContent !== language) {
      languageLabel.textContent = language;
    }
  }
  app.refreshFloatingPanelLanguage = updateSourceLanguage;

  function buildPanel() {
    panel = document.createElement('section');
    panel.className = 'vocabee-floating-panel';
    panel.setAttribute('aria-label', 'Vocabee');
    panel.hidden = true;
    panel.innerHTML = `
      <header class="vocabee-floating-header">
        <button class="vocabee-panel-home" type="button" aria-label="Открыть словарь">
          <span class="vocabee-panel-brand-mark" aria-hidden="true">V</span>
          <span class="vocabee-panel-brand">Vocabee</span>
        </button>
        <button class="vocabee-panel-control vocabee-panel-section-switch" type="button" data-panel-target="dictionary" aria-label="Мой словарь" title="Мой словарь">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H17a3 3 0 0 1 3 3v13H7a3 3 0 0 1-3-3V5.5Zm3-.5a.5.5 0 0 0-.5.5v10.6c.16-.06.33-.1.5-.1h11V6a1 1 0 0 0-1-1H7Z"/><path d="M9 8h7v1.8H9zm0 4h7v1.8H9z"/></svg>
        </button>
        <button class="vocabee-panel-control vocabee-panel-section-switch" type="button" data-panel-target="settings" aria-label="Настройки" title="Настройки">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19.4 13a7.8 7.8 0 0 0 0-2l2-1.5-2-3.5-2.4 1a8 8 0 0 0-1.7-1L15 3h-4l-.4 2.9a8 8 0 0 0-1.7 1l-2.4-1-2 3.5 2 1.5a7.8 7.8 0 0 0 0 2l-2 1.5 2 3.5 2.4-1a8 8 0 0 0 1.7 1L11 22h4l.4-2.9a8 8 0 0 0 1.7-1l2.4 1 2-3.5-2.1-1.6ZM13 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8Z" transform="translate(-1 -0.5) scale(.96)"/></svg>
        </button>
        <button class="vocabee-panel-control vocabee-panel-minimize" type="button">−</button>
        <button class="vocabee-panel-control vocabee-panel-close" type="button" aria-label="Закрыть панель">×</button>
      </header>
      <div class="vocabee-floating-content">
        <section class="vocabee-panel-view" data-panel-content="settings" hidden>
          <label class="vocabee-floating-row vocabee-floating-toggle" for="vocabee-panel-enabled">
            <span class="vocabee-floating-label">
              <strong>Перевод</strong>
              <small>Слова и фразы на YouTube</small>
            </span>
            <input type="checkbox" id="vocabee-panel-enabled" />
            <span class="vocabee-floating-switch" aria-hidden="true"></span>
          </label>
          <div class="vocabee-floating-row">
            <span class="vocabee-floating-label">
              <strong>Язык субтитров</strong>
              <small>Определяется автоматически</small>
            </span>
            <span class="vocabee-panel-source-language">Не найден</span>
          </div>
          <label class="vocabee-floating-row" for="vocabee-panel-language">
            <span class="vocabee-floating-label"><strong>Переводить на</strong></span>
            <select id="vocabee-panel-language" aria-label="Язык перевода">
              ${app.targetLanguages.map((language) =>
                `<option value="${language}">${app.languageNames[language]}</option>`
              ).join('')}
            </select>
          </label>
          <p class="vocabee-panel-footer">
            Поддерживаются английские и немецкие субтитры
          </p>
        </section>
        <section class="vocabee-panel-view" data-panel-content="dictionary">
          <h2 class="vocabee-dictionary-title">Мой словарь</h2>
          <div class="vocabee-dictionary">
            <p class="vocabee-dictionary-status" role="status" aria-live="polite">Загружаю словарь…</p>
            <ul class="vocabee-dictionary-list"></ul>
          </div>
          <p class="vocabee-dictionary-hint">Добавляй слова из карточки перевода на YouTube.</p>
        </section>
      </div>
    `;
    document.body.appendChild(panel);

    const enabledInput = panel.querySelector('#vocabee-panel-enabled');
    const languageSelect = panel.querySelector('#vocabee-panel-language');
    enabledInput.checked = app.state.enabled;
    languageSelect.value = app.state.lang;

    enabledInput.addEventListener('change', () => {
      app.state.enabled = enabledInput.checked;
      app.storage.set({ enabled: app.state.enabled }, () => {
        if (chrome.runtime.lastError) {
          console.error('Vocabee: could not save translation setting', chrome.runtime.lastError.message);
        }
      });
    });

    languageSelect.addEventListener('change', () => {
      app.setTargetLanguage(languageSelect.value);
    });

    panel.querySelector('.vocabee-panel-home').addEventListener('click', () => {
      panelState.activeView = 'dictionary';
      panelState.minimized = false;
      applyState();
      saveState();
      loadDictionary();
    });

    panel.querySelectorAll('[data-panel-target]').forEach((button) => {
      button.addEventListener('click', () => {
        panelState.activeView = button.dataset.panelTarget;
        panelState.minimized = false;
        applyState();
        saveState();
        if (panelState.activeView === 'dictionary') loadDictionary();
      });
    });
    panel.querySelector('.vocabee-panel-minimize').addEventListener('click', () => {
      panelState.minimized = !panelState.minimized;
      applyState();
      saveState();
    });
    panel.querySelector('.vocabee-panel-close').addEventListener('click', () => {
      panelState.visible = false;
      applyState();
      saveState();
    });

    const dragHandle = panel.querySelector('.vocabee-floating-header');
    let dragOrigin;
    dragHandle.addEventListener('pointerdown', (event) => {
      if (event.target.closest('button')) return;
      dragOrigin = {
        pointerX: event.clientX,
        pointerY: event.clientY,
        x: panelState.x,
        y: panelState.y
      };
      dragHandle.setPointerCapture(event.pointerId);
      event.preventDefault();
    });
    dragHandle.addEventListener('pointermove', (event) => {
      if (!dragOrigin || !dragHandle.hasPointerCapture(event.pointerId)) return;
      const nextPosition = clampPosition(
        dragOrigin.x + event.clientX - dragOrigin.pointerX,
        dragOrigin.y + event.clientY - dragOrigin.pointerY
      );
      panelState = { ...panelState, ...nextPosition };
      applyState();
    });
    dragHandle.addEventListener('pointerup', (event) => {
      if (!dragOrigin) return;
      dragOrigin = null;
      if (dragHandle.hasPointerCapture(event.pointerId)) {
        dragHandle.releasePointerCapture(event.pointerId);
      }
      saveState();
    });
    dragHandle.addEventListener('pointercancel', () => {
      dragOrigin = null;
      saveState();
    });

    for (const eventName of ['pointerdown', 'pointerup', 'click', 'dblclick']) {
      panel.addEventListener(eventName, (event) => event.stopPropagation());
    }
  }

  function renderDictionary(words) {
    const list = panel.querySelector('.vocabee-dictionary-list');
    const status = panel.querySelector('.vocabee-dictionary-status');
    list.replaceChildren();

    if (words.length === 0) {
      status.textContent = 'Пока нет сохранённых слов. Добавляй их из карточки перевода.';
      return;
    }

    status.textContent = `Сохранено слов: ${words.length}`;
    for (const word of words) {
      const item = document.createElement('li');
      item.className = 'vocabee-dictionary-item';

      const pair = document.createElement('div');
      pair.className = 'vocabee-dictionary-pair';

      const source = document.createElement('strong');
      source.className = 'vocabee-dictionary-source';
      source.textContent = word.sourceText;

      const translated = document.createElement('span');
      translated.className = 'vocabee-dictionary-translation';
      translated.textContent = word.translatedText;

      const details = document.createElement('small');
      details.className = 'vocabee-dictionary-details';
      const date = new Intl.DateTimeFormat('ru', { day: 'numeric', month: 'short' })
        .format(new Date(word.addedAt));
      details.textContent = `${app.languageNames[word.sourceLang] || word.sourceLang} → ${app.languageNames[word.targetLang] || word.targetLang} · ${date}`;

      pair.append(source, translated);
      item.append(pair, details);
      list.append(item);
    }
  }

  function loadDictionary() {
    const status = panel.querySelector('.vocabee-dictionary-status');
    const list = panel.querySelector('.vocabee-dictionary-list');
    status.textContent = 'Загружаю словарь…';
    list.replaceChildren();

    chrome.runtime.sendMessage({ type: 'GET_DICTIONARY_WORDS' }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Vocabee: could not request dictionary', chrome.runtime.lastError.message);
        status.textContent = 'Не удалось загрузить словарь. Попробуйте открыть его снова.';
        return;
      }
      if (!response?.ok) {
        console.error('Vocabee: dictionary request failed', response?.error);
        status.textContent = response?.error || 'Не удалось загрузить словарь.';
        return;
      }
      renderDictionary(response.words);
    });
  }

  app.refreshDictionaryView = function () {
    if (panelState.activeView === 'dictionary') loadDictionary();
  };

  function togglePanel(sendResponse) {
    if (panelState.visible && !panelState.minimized) {
      panelState.visible = false;
    } else {
      if (!panelState.visible) panelState.activeView = 'dictionary';
      panelState.visible = true;
      panelState.minimized = false;
    }
    updateSourceLanguage();
    applyState();
    saveState();
    if (panelState.visible && panelState.activeView === 'dictionary') loadDictionary();
    sendResponse?.({ visible: panelState.visible });
  }

  buildPanel();
  app.storage.get({ vocabeePanel: panelState }, (settings) => {
    if (chrome.runtime.lastError) {
      console.error('Vocabee: could not load panel state', chrome.runtime.lastError.message);
      return;
    }
    const savedState = settings.vocabeePanel || {};
    const isOldDefaultPosition = savedState.x === 24 && savedState.y === 92;
    panelState = {
      ...panelState,
      ...savedState,
      activeView: savedState.activeView === 'settings' ? 'settings' : 'dictionary',
      ...(isOldDefaultPosition ? getDefaultPosition() : {})
    };
    applyState();
    updateSourceLanguage();
    if (panelState.visible && !panelState.minimized && panelState.activeView === 'dictionary') {
      loadDictionary();
    }
  });

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type !== 'TOGGLE_VOCABEE_PANEL') return false;
    togglePanel(sendResponse);
    return false;
  });

  app.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'sync' && areaName !== 'local') return;
    if (changes.enabled) {
      app.state.enabled = Boolean(changes.enabled.newValue);
      panel.querySelector('#vocabee-panel-enabled').checked = app.state.enabled;
    }
    if (changes.lang) {
      app.state.lang = changes.lang.newValue || 'ru';
      panel.querySelector('#vocabee-panel-language').value = app.state.lang;
    }
  });

  window.addEventListener('resize', () => {
    applyState();
    clearTimeout(positionSaveTimer);
    positionSaveTimer = setTimeout(saveState, 150);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || !panelState.visible) return;
    panelState.visible = false;
    applyState();
    saveState();
  });
})(globalThis.Vocabee);
