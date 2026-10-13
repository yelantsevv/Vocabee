import { useCallback, useEffect, useState } from 'react';
import { getDefaultPosition } from '../settings.js';

const initialPanelState = {
  visible: false,
  minimized: false,
  activeView: 'dictionary',
  ...getDefaultPosition()
};

function normalizeSavedState(savedState) {
  const isOldDefaultPosition = savedState.x === 24 && savedState.y === 92;
  return {
    ...initialPanelState,
    ...savedState,
    width: Number.isFinite(savedState.width) ? savedState.width : undefined,
    height: Number.isFinite(savedState.height) ? savedState.height : undefined,
    activeView: savedState.activeView === 'settings' ? 'settings' : 'dictionary',
    ...(isOldDefaultPosition ? getDefaultPosition() : {})
  };
}

export function usePanelState(app) {
  const [panelState, setPanelState] = useState(initialPanelState);
  const [hydrated, setHydrated] = useState(false);

  const save = useCallback((state) => {
    app.storage.set({ vocabeePanel: state }, () => {
      if (chrome.runtime.lastError) {
        console.error('Vocabee: could not save panel state', chrome.runtime.lastError.message);
      }
    });
  }, [app]);

  const update = useCallback((change) => {
    setPanelState((current) => {
      const nextState = typeof change === 'function' ? change(current) : { ...current, ...change };
      save(nextState);
      return nextState;
    });
  }, [save]);

  useEffect(() => {
    app.storage.get({ vocabeePanel: initialPanelState }, (settings) => {
      if (chrome.runtime.lastError) {
        console.error('Vocabee: could not load panel state', chrome.runtime.lastError.message);
        setHydrated(true);
        return;
      }
      setPanelState(normalizeSavedState(settings.vocabeePanel || {}));
      setHydrated(true);
    });
  }, [app]);

  useEffect(() => {
    const onToggle = (message, _sender, sendResponse) => {
      if (message?.type !== 'TOGGLE_VOCABEE_PANEL') return false;
      let visible;
      update((current) => {
        visible = !(current.visible && !current.minimized);
        if (!visible) return { ...current, visible: false };
        return {
          ...current,
          ...(current.visible ? {} : { activeView: 'dictionary' }),
          visible: true,
          minimized: false
        };
      });
      sendResponse?.({ visible });
      return false;
    };
    chrome.runtime.onMessage.addListener(onToggle);
    app.panelStateListenerReady = true;
    return () => {
      chrome.runtime.onMessage.removeListener(onToggle);
      app.panelStateListenerReady = false;
    };
  }, [update]);

  useEffect(() => {
    const onAppStateChange = (message) => {
      if (message?.type !== 'VOCABEE_APP_STATE_CHANGED') return;
      update((current) => ({
        ...current,
        visible: Boolean(message.enabled),
        minimized: false,
        ...(!current.visible && message.enabled ? { activeView: 'dictionary' } : {})
      }));
    };
    chrome.runtime.onMessage.addListener(onAppStateChange);
    return () => chrome.runtime.onMessage.removeListener(onAppStateChange);
  }, [update]);

  useEffect(() => {
    const onResize = () => {
      setPanelState((current) => {
        const maxWidth = Math.max(1, window.innerWidth - 16);
        const maxHeight = Math.max(1, window.innerHeight - 16);
        const next = {
          ...current,
          ...(Number.isFinite(current.width)
            ? { width: Math.max(Math.min(280, maxWidth), Math.min(current.width, maxWidth)) }
            : {}),
          ...(Number.isFinite(current.height)
            ? { height: Math.max(Math.min(200, maxHeight), Math.min(current.height, maxHeight)) }
            : {})
        };
        save(next);
        return next;
      });
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [save]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape' && panelState.visible) update({ visible: false });
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [panelState.visible, update]);

  return { panelState, setPanelState, hydrated, update, save };
}
