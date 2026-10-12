import React from 'react';
import { createRoot } from 'react-dom/client';
import { FloatingPanel } from './panel/FloatingPanel.jsx';
import { TranslationTooltip } from './tooltip/TranslationTooltip.jsx';

const app = globalThis.Vocabee;
if (!app) {
  throw new Error('Vocabee content runtime must load before the React UI.');
}

const isLocalDictionaryPage = window.location.protocol === 'http:'
  && ['localhost', '127.0.0.1'].includes(window.location.hostname)
  && window.location.pathname === '/dictionary/dictionary.html';

if (!isLocalDictionaryPage) {
  const panelHost = document.createElement('div');
  panelHost.id = 'vocabee-react-panel-root';
  document.body.appendChild(panelHost);
  createRoot(panelHost).render(<FloatingPanel app={app} />);

  const tooltipHost = document.createElement('div');
  tooltipHost.id = 'vocabee-react-tooltip-root';
  document.body.appendChild(tooltipHost);
  createRoot(tooltipHost).render(<TranslationTooltip app={app} />);
}
