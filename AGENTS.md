Use [Vite+](https://viteplus.dev/) commands instead of package-manager-specific ones:

```shell
vpr <script>  # package.json scripts
vp exec <bin> # project binaries
vpx <package> # local, else downloaded
vp <command>  # built-ins (e.g. fmt, test)
```

Before finalizing changes:

- Update `*.md` files (including this one) affected by the changes.
- Lint and format edited files (skip files outside this project).

```shell
vp exec eslint --fix --no-warn-ignored --no-error-on-unmatched-pattern <files>
vp fmt --write --no-error-on-unmatched-pattern <files>
```

## Structure

- Route-specific code lives next to its route.
- Shared code lives in `src/*/` (e.g. test helpers in `src/tests/`).
- `cli/` is Node-only and may import from `src/`, but not vice versa.

## Remote and Query

- Name route-adjacent query modules exactly `server.ts`. Do not use `query.server.ts`, `repository.ts`, or `+server.ts` for query helpers. Shared authentication queries remain in `src/auth/server/server.ts`.
- Keep authentication guards, processing order, business validation, and response handling in `remote.ts` or the existing entry point.
- Keep all SQL and Drizzle query construction in `server.ts`, even for short queries used only once. Remote modules must not import database schemas, SQL operators, or query builders, or call `select`, `insert`, `update`, `delete`, `execute`, or `db.query` directly.
- Expose individual named query functions. Pass the database client or transaction as the first argument, typed with the shared `Database` type exported from `src/app.d.ts`. Do not bind queries into objects, classes, factories, or prototype extensions.
- Coordinate transactions directly in the entry point with `db.transaction((tx) => { ... })`. Inside that callback, call query functions with `tx` and perform business checks. Outside a transaction, call query functions with `db`.
- Do not introduce `withLoginTransaction`-style wrappers, `createLoginQueries`-style factories, or callback-only types. Query functions must not own the use case's transaction or HTTP response handling.
- Keep dependencies one-way: entry points call query modules; query modules use database definitions. Entry points may import the database client for transaction orchestration and passing it to query functions. Query modules must not import entry points, including type-only imports.
- Use synchronous transaction callbacks and `immediate` for read-before-write transactions. Deliver messages, issue tokens, and perform other asynchronous work after commit.
- Preserve failure semantics: return a business result when an attempt record must commit, and throw when the transaction must roll back.
- Keep form schemas, user-facing error messages, and error-code types in existing `shared.ts` files. Do not add use-case, contract, repository, adapter, or composition layers.
- Keep required data and operation failures explicit. Do not introduce fallback behavior or unrelated abstractions during separation.
- Apply these rules to route query changes. Preserve the existing shared authentication and CLI structures unless explicitly requested.

```text
src/routes/login/send/
├── remote.ts
├── server.ts
└── shared.ts
```

Individual query functions in `server.ts` accept the shared database type:

```ts
import type { Database } from '../../../app.d.ts';

export const findActiveUser = (db: Database, contact: string) =>
	db.query.userTable
		.findFirst({
			where: { contact, deactivatedAt: { isNull: true } },
			columns: { id: true },
		})
		.sync();
```

The entry point coordinates calls without constructing queries:

```ts
const result = db.transaction(
	(tx) => {
		const user = findActiveUser(tx, data.contact);
		if (!user && !AUTH_ALLOW_UNREGISTERED) invalid(issue.contact(sendErrors.UNREGISTERED));
		return insertLogin(tx, {
			contact: data.contact,
			userId: user?.id ?? null,
			code,
			ip,
		});
	},
	{ behavior: 'immediate' },
);
```

## Debugging

Consider whether a bug may originate from a library or framework, not just application code. If so, ask before checking issues, writing an MRE, or inspecting the source.

## Documentation

- Prose sentences end with a period, or a colon if the next block is code or a list illustrating them.
- List items are capitalized and uniform per list: all sentence-style (period) or fragment-style (no period).
- Acronyms and proper nouns keep their casing (e.g. `JWT ID`, not `jwt id`).

### Markdown

- Don't use bare URLs outside code — link with descriptive text.
- Link GitHub issues, PRs, and discussions as `[owner/repo#123](url)`.
- Link GitHub commits as `[owner/repo@abc1234](url)`.

### Code Comments

- Don't add comments unless requested.
- Trailing comments are lowercase fragments — move full sentences into a standalone comment.
- Trailing comments follow a single space — when aligning consecutive ones, measure from the longest line.
- Standalone comments are capitalized — sentences end with a period, fragments don't.
- Don't add a trailing period after a bare URL, even at the end of a sentence.
- Comment tags (`TODO`, `FIXME`, `BLOCKED`) take no colon — apply the rules above to the text after the tag.

```ts
// TODO Handle retries
fetch(url); // TODO handle retries
```

## Testing

### Unit

Run with `vp test`. Import test APIs from `vite-plus/test`, and assertions from `node:assert/strict`.

### E2E

- Use the custom `test` fixture for a worker-scoped `db`.
- Hardcode root-relative paths (e.g. `/login`) — `paths.base` is unset.
- Don't select elements by UI text — use roles, attributes, or actual values.

```ts
page.locator('form[action="/login"]').getByRole('button');
page.getByText(userId); // value the test inserted (e.g. `seedUser(db)`)
```

## TypeScript

These options are enabled:

```json
{
	"noUncheckedIndexedAccess": true,
	"exactOptionalPropertyTypes": true
}
```

- Prefer `type` over `interface`.
- Use arrow syntax over function expressions and declarations.
- Blank `//` comments can be used to force multiline formatting.

Pick import paths like TypeScript's `shortest` auto-import (fewer `/` wins), e.g. in `src/lib/a/x.ts`:

```diff
- '#lib/a/b.ts' // 2
+ './b.ts' // 0, `./` doesn't count

- '../b/c.ts' // 2
+ '#lib/b/c.ts' // 2, `#` wins ties
```

Don't use `!` non-null assertions, except:

```ts
// Assert only if insertion is guaranteed.
// Without `onConflictDoNothing()`, all rows insert or it throws.
db.insert(userTable).values(users).returning().all()[0]!;
```

```ts
// Assert only if the combined condition is guaranteed non-empty.
and(
	eq(isNull(table.a), isNull(table.b)), //
	eq(isNull(table.b), isNull(table.c)),
)!;
```

### Enums

Enum types, values, and label maps (not TypeScript's `enum`) live in `src/lib/enums/` or individual `enums.ts` files — see `src/lib/enums/example.ts` for patterns.

## SQLite

If a `PRAGMA` matters, verify it against runtime in `src/db/server/pragmas/<pragma>.test.ts` and document it:

```ts
import { DatabaseSync } from 'node:sqlite';
import { databaseSyncOptions } from '#database/options.ts';

new DatabaseSync(':memory:', databaseSyncOptions).prepare('PRAGMA recursive_triggers').get();
```

- `PRAGMA busy_timeout` (0 by default, overridden)
- `PRAGMA recursive_triggers` (off by default)
  - Direct (`A -> A`) — blocked
  - Cycle (`A -> B -> A`) — blocked
  - Unrelated cascade (`A -> B -> C`) — not blocked

## Drizzle ORM

Shared database clients, schemas, and relations live in `src/db/server/`, imported by query modules as `#database/*`:

- `src/db/server/client.ts`
- `src/db/server/schema.ts`
- `src/db/server/relations.ts`

Export the shared `Database` type once from `src/app.d.ts`, outside `declare global` and the `App` namespace using `NodeSQLiteDatabase<typeof relations> | NodeSQLiteTransaction<typeof relations>` from `drizzle-orm/node-sqlite`. Import `Database` explicitly with `import type`; keep the Drizzle and relations imports in `src/app.d.ts` type-only. Do not duplicate aliases in query modules or extract transaction types through nested `Parameters`.

Ask before running `drizzle-kit generate`/`migrate`, or the `db:*` scripts wrapping them.

Use the sync API instead of `await`:

```ts
db.query.userTable.findFirst().sync(); // User | undefined
db.query.userTable.findMany().sync(); // User[]

db.select().from(userTable).get(); // User | undefined
db.select().from(userTable).all(); // User[]

db.update(userTable).set(data).where(eq(userTable.id, id)).run();
db.delete(userTable).where(eq(userTable.id, id)).run();

db.insert(userTable).values(data).returning().all(); // User[]
```

See [drizzle-team/drizzle-orm#6107](https://github.com/drizzle-team/drizzle-orm/issues/6107). Don't use insert `.get()`:

```diff
- db.insert(userTable).values(data).returning().get();
```

Use Relational Queries v2:

```ts
const users = db.query.userTable
	.findMany({
		// Sort keys in this order: orderBy, offset, where, columns, extras, with.
		orderBy: { id: 'asc' },
		where: {
			contact: '010', // same as `eq`
			deactivatedAt: { isNull: true },
			activeRoles: { role: 'admin' }, // filter by relations (uses subquery)
		},
		columns: { contact: true }, // never use false to exclude
	})
	.sync();
```

### Schema

Table names follow 2 conventions:

- `<owner><Attribute>` — 1:N tables, no `To` (e.g. `userTable` → `userProfileTable`/`userRoleTable`)
- `<subject>To<Other>` — M:N join tables (e.g. `postToTagTable`)

Tables are grouped by owner in FK order in `schema.ts`:

- Subject table (e.g. `userTable`)
- Subject's own attribute tables (e.g. `userProfileTable`, `userRoleTable`)
- Join table (e.g. `postToTagTable`) — even if it forward-references a table declared later (e.g. `tagTable`)

Prefer soft-delete (e.g. `deactivatedAt`, `revokedAt`) over hard `DELETE` if an audit trail is needed — join-table rows typically don't need one.

#### Indexes

Index foreign key columns used in lookups or triggers.

Index names follow 2 conventions:

- `<table>_<columns>_idx` (e.g. `token_user_id_idx`)
- `active_<table>_<columns>_idx` — filtered on soft-delete (e.g. `active_user_contact_idx`)

Use a `UNIQUE INDEX` to avoid duplicate records (e.g. a user's active role should be unique):

```ts
uniqueIndex('active_user_role_user_id_role_idx')
	.on(table.userId, table.role)
	.where(isNull(table.revokedAt));
```

### Relations

- Add relations only when needed; remove them when unused.
- Soft-deleted tables can use filtered relations (`where`) to drop inactive rows.
- Name filtered relations after their filter (e.g. `activeUserByContact`, `successfulAttempts`).

### Triggers

Use `TRIGGER`s for cascades (e.g. deactivating a user should revoke all active roles).

- When modifying the db schema, review `drizzle/*/*_triggers/migration.sql` and edit `drizzle/*-triggers.staged.sql` accordingly.
- When running `drizzle-kit generate`, or if `drizzle/*/` has been modified, check if `*-triggers.staged.sql` needs to be flushed.

```shell
# Trigger API unsupported; write migration in raw SQL.
vpr db:app:generate --custom --name=triggers
```

Order triggers by owning table's declaration order in `schema.ts`; `BEFORE` guards precede `AFTER` cascades within a table.

Separate trigger statements with a breakpoint comment:

```sql
--> statement-breakpoint
```

Add a test case in `src/db/server/triggers/<trigger_name>.test.ts` for each new or changed trigger, covering the conditions it encodes — not SQL/SQLite mechanics (e.g. multi-row application, `JOIN` scoping, comparison boundaries) already guaranteed by the engine:

- Direct effect: the cascade fires under the trigger's condition.
- Guards: each condition that blocks the effect (e.g. already revoked, already banned, already expired).
- Transition guard: the `WHEN` clause blocks re-firing on a repeat update.
- Cross-trigger state: a condition reading another trigger's output (e.g. `revoke_reason != 'deactivate'`) — test it directly, not only through that trigger's cascade.

Run these tests only after `*-triggers.staged.sql` is flushed into a migration.

### Transactions

See [drizzle-team/drizzle-orm#2275](https://github.com/drizzle-team/drizzle-orm/issues/2275). Don't pass async callbacks to `db.transaction()`:

```ts
db.transaction((tx) => {
	tx.insert(userTable).values(data).run();
	tx.update(postTable).set(data).where(eq(postTable.id, id)).run();
});
```

If the transaction can't be made sync, leave a comment instead:

```ts
// BLOCKED Use transaction for <a> + <b>
```

Transactions are deferred by default. If a transaction reads before writing, use `immediate` to wait on locks instead of throwing (see `src/db/server/pragmas/busy_timeout.test.ts`):

```ts
db.transaction(
	(tx) => {
		const post = tx.select().from(postTable).where(eq(postTable.id, id)).get();
		tx.update(postTable).set(data).where(eq(postTable.id, id)).run();
	},
	{ behavior: 'immediate' },
);
```

## SvelteKit

Use the SvelteKit 3 API (e.g. `$app/env`).

- Call `getRequestEvent()` in utility functions instead of passing `event`.
- Check `load` return types with `satisfies`. See [sveltejs/kit#9799](https://github.com/sveltejs/kit/issues/9799).
- Use `form` remote functions instead of `actions` in `+page.server.ts`.
- Mark server-only modules by name or location:
  - `server.ts` or `*.server.ts` — query modules import server-only `#database/*` modules
  - `server/` directories — outside `src/routes/`
  - Adjacent `server.ts` modules are used only by server entry points and import server-only `#database/*` modules.

### Remote Functions (RPC)

Requests must be public, or guarded via `session.ts` helpers:

```ts
import { form, query } from '$app/server';
import { requireLoggedOut, requireSession } from '#auth/server/session.ts';
import { SendCodeSchema } from './shared.ts';

export const getPublicPosts = query(async () => {
	// Use prerender if static or cacheable.
});

export const getPrivatePosts = query(async () => {
	const session = requireSession();
});

export const sendCode = form(SendCodeSchema, async (data, issue) => {
	requireLoggedOut(); // must be logged out
});
```

Name route-adjacent remote modules exactly `remote.ts`, outside `server/` directories. Do not add descriptive prefixes such as `user.remote.ts`. Shared remote modules outside routes may use `*.remote.ts`. They export only remote functions — move other exports to separate files:

```text
src/routes/posts/new/
├── remote.ts
└── create-post/
    ├── remote.ts
    ├── server.ts # database operations
    └── shared.ts # isomorphic (e.g. schemas)
```

Inside remote functions (via `getRequestEvent()`):

- `event.request.url` is the remote endpoint (`/_app/remote/<id>`).
- `event.url`, `event.route`, and `event.params` describe the calling page:
  - In `query`, they throw — pass page values as arguments instead.
  - In `form` and `command`, they're client-sent — never use them for authorization.

#### `command`

Don't use for user-triggered actions (e.g. a button click) — use `form` instead. See [sveltejs/kit#16275](https://github.com/sveltejs/kit/issues/16275).

#### `form`

See `src/routes/login/` for conventions. For example:

```ts
// src/routes/posts/new/create-post/shared.ts
import { nonEmpty, object, pipe, string } from 'valibot';

export const CreatePostSchema = object({
	title: pipe(string(), nonEmpty()),
	content: pipe(string(), nonEmpty()),
});
```

```ts
// src/routes/posts/new/create-post/remote.ts
import { form } from '$app/server';
import { invalid } from '@sveltejs/kit';
import { db } from '#database/client.ts';
import { insertPost } from './server.ts';
import { CreatePostSchema } from './shared.ts';

export const createPost = form(CreatePostSchema, async (data, issue) => {
	// Form data has already passed schema validation.
	if (businessLogicFails) invalid(issue.title('ERROR_MESSAGE'));

	const newPost = insertPost(db, data);

	return { slug: newPost.slug }; // populates `createPost.result` in Svelte
});
```

##### Refreshing Queries on Mutation

By default, a successful `form` submission calls `refreshAll()`, re-running every load function and query in a second round-trip. Calling `refresh()`, `set()`, or `reconnect()` anywhere in the handler disables that default for the whole submission and folds the update into the mutation response instead — a single-flight mutation.

The client names query instances to refresh with `.updates(...)`; the server must accept them with `requested(...)` — or explicitly skip them with `.ignoreAll()`:

```svelte
<form
	{...createPost.enhance(async (form) => {
		await form.submit().updates(
			// Chain `.withOverride(...)` when an optimistic update is viable.
			getPosts(10).withOverride((posts) => {
				const title = form.fields.title.value(); // undefined if untouched
				return title ? [{ slug: '', title }, ...posts].slice(0, 10) : posts;
			}),
		);
		form.element.reset(); // enhance skips the default auto-reset
	})}
></form>
```

> [!WARNING]
> `query().set()` doesn't narrow to the return type — pass a projection, not a raw row. See [sveltejs/kit#14612](https://github.com/sveltejs/kit/issues/14612).

```ts
// src/routes/posts/new/create-post/remote.ts
import { resolve } from '$app/paths';
import { form, requested } from '$app/server';
import { redirect } from '@sveltejs/kit';
import { getPost, getPosts } from '#remotes/posts.remote.ts';
import { db } from '#database/client.ts';
import { insertPost } from './server.ts';
import { CreatePostSchema } from './shared.ts';

export const createPost = form(CreatePostSchema, async (data) => {
	const post = insertPost(db, data);

	// Unknown args — the client must request it.
	await requested(getPosts, 2).refreshAll(); // max 2 instances

	// Known args — set it directly; survives the redirect.
	getPost(post.slug).set({ title: post.title, content: post.content });

	redirect(303, resolve('/posts/[slug]', { slug: post.slug }));
});
```

#### `query.batch`

Batches requests within the same macrotask:

```ts
export const getWeather = query.batch(pipe(number(), integer()), (cityIds) => {
	// Return named tuples to reduce wire size.
	// See https://github.com/sveltejs/kit/issues/15784
	const lookup = new Map<number, [minTemp: number, maxTemp: number]>();
	return (cityId) => lookup.get(cityId);
});
```

### `await`

Use the `await` keyword directly in components:

```svelte
<script lang="ts">
	import { resolve } from '$app/paths';
	import { getPost, getPosts } from '#remotes/posts.remote.ts';

	let { params } = $props(); // let, not const

	const post = $derived(await getPost(params.slug));
</script>

<h1>{post.title}</h1>
<p>{post.content}</p>

{#each await getPosts() as post}
	<a href={resolve('/posts/[slug]', { slug: post.slug })}>{post.title}</a>
{/each}
```

### `resolve`

Internal navigation must use `resolve()`:

- Pathnames have no leading `/` (e.g. `login`).
- Route IDs have a leading `/` (e.g. `/posts/[slug]`).

```svelte
<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';

	goto(resolve('blog/tags?svelte')); // append search string or hash
</script>

<a href={externalURL} rel="external">Click me!</a>

<a href={resolve('blog/posts')}>All Posts</a>

<!-- With params -->
<a href={resolve('/blog/[slug]', { slug: 'hello' })}>Hello</a>
```

### Feature Detection

Check for browser API support on the client:

```svelte
<script lang="ts">
	import { browser } from '$app/env';
</script>

<!-- Does not trigger a hydration mismatch. -->
{#if browser && !CSS.supports('<selector>')}
	<!-- Warning message -->
{:else}
	{@render children()}
{/if}
```

## Svelte

Use the Svelte 5 API (e.g. runes, `createContext`).

Use the array syntax for class names:

```svelte
<div
	// Comments are valid in attribute lists.
	class={[faded && 'opacity-50 saturate-0', large && 'scale-200']}
>
	...
</div>
```

### `$effect`

Don't use `$effect` for derived state — only for side effects (logging, DOM manipulation, browser APIs like `localStorage`).

### `$derived`

Derived values can be reassigned (e.g. optimistic UI); they revert when dependencies update:

```svelte
<script lang="ts">
	import type { HTMLButtonAttributes } from 'svelte/elements';

	let { post, like } = $props();

	let likes = $derived(post.likes);

	// For non-inline event handlers, import the appropriate type.
	const onclick: HTMLButtonAttributes['onclick'] = async () => {
		likes += 1;
		await like().catch(() => (likes -= 1));
	};
</script>

<button {onclick}>🧡 {likes}</button>
```

### Declaration Tags

`{@const x = y}` is legacy syntax; use `const` or `let`:

```svelte
<!-- Can be placed anywhere. -->
{const now = new Date()}
<p>{now.toLocaleString()}</p>

<!-- Use runes for reactivity. -->
{let name = $state('')}
<input bind:value={name} />

{const profile = $derived(imgFromText(name))}
<img src={profile} />
```

### `onMount`

Accepts async functions; cannot return a cleanup function:

```ts
import { browser } from '$app/env';
import { onMount, onDestroy } from 'svelte';

let mounted = true;

onMount(async () => {
	await promise;
	if (!mounted) return; // skip side effects
	addEventListener(/* */);
});

// Also runs on the server.
onDestroy(() => {
	if (!browser) return;
	mounted = false;
	removeEventListener(/* */);
});
```

### `{#each}` with Fixed Length

```svelte
<script lang="ts">
	const featured = new Set([2, 5, 9]);
</script>

<ul>
	{#each { length: 12 }, index}
		<li class={[featured.has(index) && 'font-bold']}>{index}</li>
	{/each}
</ul>
```

### Reference

Svelte MCP provides Svelte 5 and SvelteKit docs:

- `list-sections` to discover all available sections
- `get-documentation` to retrieve specific sections

## Tailwind CSS

- Define shared styles as custom utilities (`@utility`) in `src/routes/layout.css`.
- Wrap forms with `StyledLabels.svelte` instead of styling individual controls.

Tailwind classes override both:

```svelte
<script lang="ts">
	import StyledLabels from '#lib/components/StyledLabels.svelte';
</script>

<StyledLabels>
	<form>
		<!-- `mt-2` overrides the StyledLabels margin. -->
		<label>
			<span>이메일</span>
			<input {...remoteForm.fields.contact.as('email')} class="mt-2" />
		</label>
		<!-- `py-4` overrides the `btn` padding. -->
		<button class="btn btn-primary py-4 disabled:btn-busy" disabled={!!remoteForm.pending}>
			인증번호 전송
		</button>
	</form>
</StyledLabels>
```

Use child selectors to avoid duplicate class names:

```diff
- <ul>
+ <ul class="*:odd:bg-sky-50 *:even:bg-sky-100">
    {#each { length: 12 }, index}
-     <li class={[index % 2 === 0 ? 'bg-sky-50' : 'bg-sky-100']}></li>
+     <li></li>
    {/each}
  </ul>
```

For `<img>` and `<video>`, define a height to avoid layout shift:

- Set `width` and `height` attributes matching source dimensions.
- Set `aspect-ratio` or `height` in CSS — if it differs from the source, use `object-fit`.
