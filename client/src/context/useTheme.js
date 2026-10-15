import { createContext, useContext } from 'react';

export const ThemeCtx = createContext(null);
export function useTheme() { return useContext(ThemeCtx); }
