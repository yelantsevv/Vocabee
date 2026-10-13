import { createRoot } from 'react-dom/client';
import { DictionaryPage } from './DictionaryPage.jsx';
import { normalizeDictionaryTheme } from './settings.js';

try {
  const settings = JSON.parse(localStorage.getItem('vocabee-settings') || '{}');
  if (settings.theme) {
    document.documentElement.dataset.dictionaryTheme = normalizeDictionaryTheme(settings.theme);
  }
} catch {
  // Use the default theme if saved settings are unavailable.
}

createRoot(document.getElementById('root')).render(<DictionaryPage />);
