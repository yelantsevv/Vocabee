(function (app) {
  function findCaptionNodes() {
    return [...new Set(Array.from(document.querySelectorAll('#ytp-caption-window-container .ytp-caption-segment')))].filter((node) => {
      const text = (node.textContent || '').trim();
      return text.length > 0 && /\p{Script=Latin}/u.test(text);
    });
  }

  function processCaptions() {
    app.makeCaptionTextSelectable();
    findCaptionNodes().forEach(app.decorateCaptionNode);
  }

  function loadSettings() {
    app.storage.get({ enabled: true }, (settings) => {
      app.state = { ...app.state, enabled: Boolean(settings.enabled), lang: 'ru', sourceLang: 'en' };
    });
  }

  function observePage() {
    const observer = new MutationObserver(processCaptions);
    observer.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['draggable']
    });
  }

  loadSettings();
  processCaptions();
  observePage();

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') app.hideTooltip(true);
  });

})(globalThis.Vocabee);
