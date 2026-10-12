import { useEffect, useRef } from 'react';
import clsx from 'clsx';
import {
  DEFAULT_DICTIONARY_FONT_SIZE,
  DEFAULT_INTERFACE_FONT_SCALE,
  normalizeDictionaryFontSize,
  normalizeInterfaceFontScale
} from '../../shared/settings/display.js';
import { PanelDictionary } from './components/PanelDictionary.jsx';
import { PanelHeader } from './components/PanelHeader.jsx';
import { PanelSettings } from './components/PanelSettings.jsx';
import { useDictionary } from './hooks/useDictionary.js';
import { usePanelInteractions } from './hooks/usePanelInteractions.js';
import { usePanelPreferences } from './hooks/usePanelPreferences.js';
import { usePanelState } from './hooks/usePanelState.js';
import { useStoredSetting } from './hooks/useStoredSetting.js';
import { useTheme } from '../../shared/hooks/useTheme.js';
import styles from './FloatingPanel.module.css';

export function FloatingPanel({ app }) {
  const panelRef = useRef(null);
  const [theme, changeTheme] = useTheme();
  const preferences = usePanelPreferences(app);
  const { panelState, setPanelState, hydrated, update, save } = usePanelState(app);
  const [dictionaryFontSize, changeDictionaryFontSize] = useStoredSetting({
    app,
    key: 'dictionaryFontSize',
    initialValue: DEFAULT_DICTIONARY_FONT_SIZE,
    normalize: normalizeDictionaryFontSize
  });
  const [interfaceFontScale, changeInterfaceFontScale] = useStoredSetting({
    app,
    key: 'interfaceFontScale',
    initialValue: DEFAULT_INTERFACE_FONT_SCALE,
    normalize: normalizeInterfaceFontScale
  });
  const dictionary = useDictionary(app, hydrated && panelState.visible && !panelState.minimized && panelState.activeView === 'dictionary');
  const interactions = usePanelInteractions({ panelRef, panelState, setPanelState, save });

  useEffect(() => {
    app.refreshDictionaryView = dictionary.load;
    return () => {
      if (app.refreshDictionaryView === dictionary.load) delete app.refreshDictionaryView;
    };
  }, [app, dictionary.load]);

  const panelStyle = {
    left: `${panelState.x}px`,
    top: `${panelState.y}px`,
    ...(Number.isFinite(panelState.width) ? { width: `${panelState.width}px` } : {}),
    ...(!panelState.minimized && Number.isFinite(panelState.height) ? { height: `${panelState.height}px` } : {}),
    '--vocabee-dictionary-font-size': `${dictionaryFontSize}px`,
    '--vocabee-ui-font-scale': String(interfaceFontScale / 100)
  };

  function selectView(view) {
    update((current) => ({ ...current, activeView: view, minimized: false }));
  }

  return (
    <section
      ref={panelRef}
      className={clsx(styles.floatingPanel, {
        [styles.minimized]: panelState.minimized,
        [styles.hasCustomSize]: Number.isFinite(panelState.width) && Number.isFinite(panelState.height)
      })}
      aria-label="Vocabee"
      hidden={!hydrated || !panelState.visible}
      style={panelStyle}
      data-theme={theme}
      onPointerDown={(event) => event.stopPropagation()}
      onPointerUp={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
      onDoubleClick={(event) => event.stopPropagation()}
    >
      <PanelHeader
        minimized={panelState.minimized}
        activeView={panelState.activeView}
        onSelectView={selectView}
        onMinimize={() => update((current) => ({ ...current, minimized: !current.minimized }))}
        onClose={() => update({ visible: false })}
        onPointerDown={interactions.handleHeaderPointerDown}
        onPointerMove={interactions.handleHeaderPointerMove}
        onPointerUp={interactions.handleHeaderPointerUp}
      />
      <div className={styles.floatingContent}>
        {panelState.activeView === 'settings'
          ? <PanelSettings
              preferences={preferences}
              dictionaryFontSize={dictionaryFontSize}
              interfaceFontScale={interfaceFontScale}
              theme={theme}
              onThemeChange={changeTheme}
              onDictionaryFontSizeChange={changeDictionaryFontSize}
              onInterfaceFontScaleChange={changeInterfaceFontScale}
            />
          : <PanelDictionary {...dictionary} fill={Number.isFinite(panelState.width) && Number.isFinite(panelState.height)} />}
      </div>
      <div
        className={styles.resizeHandle}
        role="separator"
        aria-label="Изменить размер панели"
        title="Перетащите, чтобы изменить размер"
        onPointerDown={interactions.handleResizePointerDown}
        onPointerMove={interactions.handleResizePointerMove}
        onPointerUp={interactions.handleResizePointerUp}
        onPointerCancel={interactions.handleResizePointerUp}
      />
    </section>
  );
}
