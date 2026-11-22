import { createContext } from 'react';

/** The spot in the top bar where the active document puts its actions (outline, Aa, done, next). */
export const ToolbarSlot = createContext<HTMLElement | null>(null);
