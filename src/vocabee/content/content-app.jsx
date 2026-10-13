import { createRoot } from 'react-dom/client';
import { FloatingPanel } from './panel/FloatingPanel.jsx';
import { TranslationTooltip } from './tooltip/TranslationTooltip.jsx';

const app = globalThis.Vocabee;
if (!app) {
  throw new Error('Vocabee content runtime must load before the React UI.');
}

if (!document.getElementById('vocabee-react-panel-root')) {
  const panelHost = document.createElement('div');
  panelHost.id = 'vocabee-react-panel-root';
  document.body.appendChild(panelHost);
  createRoot(panelHost).render(<FloatingPanel app={app} />);
}

if (!document.getElementById('vocabee-react-tooltip-root')) {
  const tooltipHost = document.createElement('div');
  tooltipHost.id = 'vocabee-react-tooltip-root';
  document.body.appendChild(tooltipHost);
  createRoot(tooltipHost).render(<TranslationTooltip app={app} />);
}
