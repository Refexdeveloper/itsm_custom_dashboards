import { createContext, useContext } from 'react';

const ITDashboardUiContext = createContext({ uiVariant: 'mis-modern' });

export function ITDashboardUiProvider({ uiVariant = 'mis-modern', children }) {
  return (
    <ITDashboardUiContext.Provider value={{ uiVariant }}>
      {children}
    </ITDashboardUiContext.Provider>
  );
}

export function useITDashboardUi() {
  return useContext(ITDashboardUiContext);
}

export function useIsMisModern(uiVariantProp) {
  const ctx = useContext(ITDashboardUiContext);
  const variant = uiVariantProp ?? ctx.uiVariant ?? 'default';
  return variant === 'mis-modern' || variant === 'mis';
}
