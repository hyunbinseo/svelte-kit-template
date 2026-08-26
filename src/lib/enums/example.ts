// Option 1. Pure type - exists only for TypeScript.
// e.g. a server-only value not used in the client
export type ExampleStatus1 = 'draft' | 'published';

// Option 2. `const` array - values needed at runtime.
// e.g. select option values via `v.picklist()`
export const exampleStatuses2 = ['draft', 'published'] as const;
export type ExampleStatus2 = (typeof exampleStatuses2)[number];

// Option 3. `const` object - values paired with labels.
// e.g. rendering the label text in `<option>`
export const exampleStatusLabels = {
	draft: '임시저장',
	published: '게시됨',
} as const;

export const exampleStatuses3 = Object.keys(exampleStatusLabels) as readonly ExampleStatus3[];
export type ExampleStatus3 = keyof typeof exampleStatusLabels;
