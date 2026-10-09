(function (app) {
  function findCommentNodes() {
    const selectors = [
      'ytd-comment-renderer #content-text',
      'ytd-comment-thread-renderer #content-text',
      '#content-text',
      '#comment-content',
      'ytd-comment-renderer #comment-content',
      'ytd-comment-thread-renderer #comment-content',
      '.ytp-caption-segment'
    ];

    return [...new Set(Array.from(document.querySelectorAll(selectors.join(', '))))].filter((node) => {
      const text = (node.textContent || '').trim();
      return text.length > 0 && /\p{Script=Latin}/u.test(text);
    });
  }

  function processComments() {
    app.makeCaptionTextSelectable();
    app.updateDetectedSourceLanguage();
    findCommentNodes().forEach(app.decorateCommentNode);
  }

  function loadSettings() {
    app.storage.get({ enabled: true, lang: 'ru', sourceLang: 'en' }, (settings) => {
      app.state = { ...app.state, ...settings };
      app.updateDetectedSourceLanguage();
    });
  }

  function observePage() {
    const observer = new MutationObserver(processComments);
    observer.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['draggable', 'lang']
    });
  }

  loadSettings();
  processComments();
  observePage();

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') app.hideTooltip(true);
  });

  window.addEventListener('beforeunload', () => {
    document.getElementById('vocabee-tooltip')?.remove();
  });
})(globalThis.Vocabee);
