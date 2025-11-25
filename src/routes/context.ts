import { createContext } from 'svelte';

export type AppState = { isOnline: boolean | undefined };

export const [getAppState, setAppState] = createContext<AppState>();
