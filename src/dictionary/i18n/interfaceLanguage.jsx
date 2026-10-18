import { createContext, createElement, useContext } from 'react';

const InterfaceTextContext = createContext((text) => text);

export function InterfaceLanguageProvider({ children }) {
  return createElement(InterfaceTextContext.Provider, { value: (text) => text }, children);
}

export function useInterfaceText() {
  return useContext(InterfaceTextContext);
}
