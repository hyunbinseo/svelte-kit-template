import { createContext } from 'svelte';

export type Client = { online?: boolean };

export const [getClientContext, setClientContext] = createContext<Client>();
