// Prefixed with `_` to mark them as examples.

// Option 1. Pure type — exists only for TypeScript.
// e.g. a server-only value not used in the client
export type _Status1 = 'draft' | 'published';

// Option 2. `const` array — values needed at runtime.
// e.g. select option values via `v.picklist()`
export const _statuses2 = ['draft', 'published'] as const;
export type _Status2 = (typeof _statuses2)[number];

// Option 3. `const` object — values paired with labels.
// e.g. rendering the label text in `<option>`
export const _statusToLabel = {
	draft: '임시저장',
	published: '게시됨',
} as const;

export const _statuses3 = Object.keys(_statusToLabel) as readonly _Status3[];
export type _Status3 = keyof typeof _statusToLabel;
