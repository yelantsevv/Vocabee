import React from 'react';
import { createRoot } from 'react-dom/client';
import { FloatingPanel } from './panel/FloatingPanel.jsx';
import { TranslationTooltip } from './tooltip/TranslationTooltip.jsx';

const app = globalThis.Vocabee;
if (!app) {
  throw new Error('Vocabee content runtime must load before the React UI.');
}

const panelHost = document.createElement('div');
panelHost.id = 'vocabee-react-panel-root';
document.body.appendChild(panelHost);
const panelRoot = createRoot(panelHost);
panelRoot.render(<FloatingPanel app={app} />);

const tooltipHost = document.createElement('div');
tooltipHost.id = 'vocabee-react-tooltip-root';
document.body.appendChild(tooltipHost);
const tooltipRoot = createRoot(tooltipHost);
tooltipRoot.render(<TranslationTooltip app={app} />);

window.addEventListener('beforeunload', () => {
  panelRoot.unmount();
  tooltipRoot.unmount();
  panelHost.remove();
  tooltipHost.remove();
});
