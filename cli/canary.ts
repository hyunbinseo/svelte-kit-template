// Every `@ts-expect-error` below must error, or `tsc` fails.
// Ambient types leaking in (e.g. via imports) also error here.
// Any error satisfies the directive, so keep reasons accurate.

// @ts-expect-error -- `erasableSyntaxOnly` rejects enums
export enum Erasable {}

// @ts-expect-error -- unresolved without SvelteKit
export { dev } from '$app/env';

// @ts-expect-error -- untyped without `vite/client`
export const mode = import.meta.env.MODE;

// Editors may report this directive as unused; `tsc` doesn't.
// See https://github.com/sveltejs/language-tools/issues/2800
// @ts-expect-error -- undeclared without the DOM lib
export const title = document.title;
