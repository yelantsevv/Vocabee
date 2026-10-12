import { useEffect, useRef, useState } from 'react';

export function useStoredSetting({ app, key, initialValue, normalize, delay = 500 }) {
  const [value, setValue] = useState(initialValue);
  const saveTimer = useRef(null);

  useEffect(() => {
    app.storage.get({ [key]: initialValue }, (settings) => {
      if (chrome.runtime.lastError) {
        console.error(`Vocabee: could not load ${key}`, chrome.runtime.lastError.message);
        return;
      }
      setValue(normalize(settings[key]));
    });

    const onStorageChange = (changes, areaName) => {
      if ((areaName === 'sync' || areaName === 'local') && changes[key]) {
        setValue(normalize(changes[key].newValue));
      }
    };
    app.storage.onChanged.addListener(onStorageChange);
    return () => {
      clearTimeout(saveTimer.current);
      app.storage.onChanged.removeListener(onStorageChange);
    };
  }, [app, initialValue, key, normalize]);

  function change(nextValue) {
    const normalizedValue = normalize(nextValue);
    setValue(normalizedValue);
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      app.storage.set({ [key]: normalizedValue }, () => {
        if (chrome.runtime.lastError) {
          console.error(`Vocabee: could not save ${key}`, chrome.runtime.lastError.message);
        }
      });
    }, delay);
  }

  return [value, change, setValue];
}
