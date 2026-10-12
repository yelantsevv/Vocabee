import { useCallback, useEffect, useState } from 'react';

export function usePanelPreferences(app) {
  const [enabled, setEnabled] = useState(app.state.enabled);

  useEffect(() => {
    app.storage.get({ enabled: true }, (settings) => {
      if (chrome.runtime.lastError) {
        console.error('Vocabee: could not load panel settings', chrome.runtime.lastError.message);
        return;
      }
      setEnabled(Boolean(settings.enabled));
    });

    const onStorageChange = (changes, areaName) => {
      if (areaName !== 'sync' && areaName !== 'local') return;
      if (changes.enabled) setEnabled(Boolean(changes.enabled.newValue));
    };
    app.storage.onChanged.addListener(onStorageChange);
    return () => app.storage.onChanged.removeListener(onStorageChange);
  }, [app]);

  const changeEnabled = useCallback((nextEnabled) => {
    setEnabled(nextEnabled);
    app.userEnabled = nextEnabled;
    app.state.enabled = nextEnabled && app.state.tabEnabled !== false;
    app.storage.set({ enabled: nextEnabled }, () => {
      if (chrome.runtime.lastError) {
        console.error('Vocabee: could not save translation setting', chrome.runtime.lastError.message);
      }
    });
  }, [app]);

  return { enabled, changeEnabled };
}
