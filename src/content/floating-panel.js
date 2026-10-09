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
    panel.hidden = !panelState.visible;
    panel.style.visibility = '';
    panel.querySelector('.vocabee-panel-minimize').setAttribute(
      'aria-label',
      panelState.minimized ? 'Развернуть панель' : 'Свернуть панель'
    );
    panel.querySelector('.vocabee-panel-minimize').textContent = panelState.minimized ? '+' : '−';
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
        <span class="vocabee-panel-brand-mark" aria-hidden="true">V</span>
        <span class="vocabee-panel-brand">Vocabee</span>
        <button class="vocabee-panel-control vocabee-panel-minimize" type="button">−</button>
        <button class="vocabee-panel-control vocabee-panel-close" type="button" aria-label="Закрыть панель">×</button>
      </header>
      <div class="vocabee-floating-content">
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
        <button class="vocabee-panel-dictionary" type="button">
          <span aria-hidden="true">✦</span>
          <span>Мой словарь</span>
          <span class="vocabee-panel-arrow" aria-hidden="true">→</span>
        </button>
        <p class="vocabee-panel-message" role="status" hidden>
          Словарь скоро появится. Сохранение слов пока в разработке.
        </p>
        <p class="vocabee-panel-footer">
          Поддерживаются английские и немецкие субтитры
        </p>
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

    panel.querySelector('.vocabee-panel-dictionary').addEventListener('click', () => {
      panel.querySelector('.vocabee-panel-message').hidden = false;
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

  function togglePanel(sendResponse) {
    if (panelState.visible && !panelState.minimized) {
      panelState.visible = false;
    } else {
      panelState.visible = true;
      panelState.minimized = false;
    }
    updateSourceLanguage();
    applyState();
    saveState();
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
      ...(isOldDefaultPosition ? getDefaultPosition() : {})
    };
    applyState();
    updateSourceLanguage();
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
