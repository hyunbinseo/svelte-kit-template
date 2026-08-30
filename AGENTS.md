Before finalizing changes, update any `*.md` files that reference changed code or config to avoid stale content (e.g. this file).

## Debugging

Consider whether a bug may originate from a library or framework, not just application code. If so, ask before checking issues, writing an MRE, or inspecting the source.

## Documentation

- Prose sentences are capitalized and end with a period.
- List items are capitalized and uniform per list: all sentence-style (period) or fragment-style (no period).
- Acronyms and proper nouns keep their casing (e.g. `JWT ID`, not `jwt id`).
- Don't add a trailing period after a bare URL, even at the end of a sentence.

### Code Comments

- Don't add comments unless requested.
- Trailing comments are lowercase fragments — move full sentences into a standalone comment.
- Standalone comments are capitalized — sentences end with a period, fragments don't.
- Comment tags (`TODO`, `FIXME`, `BLOCKED`) take no colon — apply the rules above to the text after the tag (e.g. `TODO lowercase fragment`).

## TypeScript

These options are enabled:

```json
{
	"noUncheckedIndexedAccess": true,
	"exactOptionalPropertyTypes": true
}
```

- Use `type` over `interface`.
- Use arrow syntax over function expressions and declarations.
- Blank `//` comments can be used to force multiline formatting.
- Don't use `!` non-null assertions, except:

```ts
// Assert only if insertion is guaranteed.
// e.g. No `onConflictDoNothing()` inserts all or throws
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

Enum types, values, and label maps (not TypeScript's `enum`) live in `src/lib/enums/` — see `example.ts` for the available patterns.

## SQLite

If a `PRAGMA` matters, verify it against runtime and document it.

```ts
import { DatabaseSync } from 'node:sqlite';

new DatabaseSync(':memory:').prepare('PRAGMA recursive_triggers').get();
```

- `PRAGMA recursive_triggers` (off by default)
  - Direct (`A -> A`) — blocked
  - Cycle (`A -> B -> A`) — blocked
  - Unrelated cascade (`A -> B -> C`) — not blocked

## Drizzle ORM

- `src/lib/server/database/client.ts`
- `src/lib/database/schema.ts`
- `src/lib/database/relations.ts`

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

Don't use insert `.get()`. See https://github.com/drizzle-team/drizzle-orm/issues/6107

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

Use a `UNIQUE INDEX` to avoid duplicate records (e.g. a user's active role should be unique):

```ts
uniqueIndex('active_user_role_user_id_role_idx')
	.on(table.userId, table.role)
	.where(isNull(table.revokedAt));
```

Prefer soft-delete (e.g. `deactivatedAt`, `revokedAt`) over hard `DELETE` if an audit trail is needed — join-table rows typically don't need one.

### Triggers

Use `TRIGGER`s for cascades (e.g. deactivating a user should revoke all active roles).

- When modifying the db schema, review `drizzle/*/*_triggers/migration.sql` and edit `drizzle/*-triggers.staged.sql` accordingly.
- When running `drizzle-kit generate`, or if `drizzle/*/` has been modified, check if `*-triggers.staged.sql` needs to be flushed.

```shell
# Trigger API unsupported; write migration in raw SQL.
pnpm drizzle-kit generate --custom --name=triggers
```

Order triggers by owning table's declaration order in `schema.ts`; `BEFORE` guards precede `AFTER` cascades within a table.

```sql
-- Add this comment in-between trigger statements.
--> statement-breakpoint
```

Add a test case in `test/db-app-triggers/<trigger_name>.ts` for each new or changed trigger, covering the conditions it encodes — not SQL/SQLite mechanics (e.g. multi-row application, `JOIN` scoping, comparison boundaries) already guaranteed by the engine:

- Direct effect: the cascade fires under the trigger's condition.
- Guards: each condition that blocks the effect (e.g. already revoked, already banned, already expired).
- Transition guard: the `WHEN` clause blocks re-firing on a repeat update.
- Cross-trigger state: a condition reading another trigger's output (e.g. `revoke_reason != 'deactivate'`) — test it directly, not only through that trigger's cascade.

Run these tests only after `*-triggers.staged.sql` is flushed into a migration.

### Transactions

Don't pass async callbacks to `db.transaction()`. See https://github.com/drizzle-team/drizzle-orm/issues/2275

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

## SvelteKit

Call `getRequestEvent()` directly in utility functions instead of passing `event`.

### Environment Variables

Define them in `src/env.ts` and import from `$app/env`:

```ts
import { browser } from '$app/env'; // SvelteKit provided
import { SENTRY_DSN } from '$app/env/public';
import { DATABASE_URL } from '$app/env/private';
```

### Remote Functions (RPC)

- Remote functions must be exported from `*.remote.ts` files.
- There are 4 types: `command`, `form`, `query`, `prerender`.
- Requests must be either public, or authenticated and authorized.
- Inside callbacks, `event.url` refers to the page, not the endpoint.

```ts
import { requireLoggedOut, requireSession } from '#lib/server/auth/session.ts';
import { form, query } from '$app/server';

export const getPublicPosts = query(async () => {
	// Use prerender if static or cacheable.
});

export const getPrivatePosts = query(async () => {
	const session = requireSession();
});

export const sendLoginCode = form(PublicSendCodeSchema, async (data, issue) => {
	requireLoggedOut(); // must be logged out
});
```

#### `command`

Don't use for user-triggered actions (e.g. a button click) — use `form` instead. See https://github.com/sveltejs/kit/issues/16275

#### `form`

See `src/routes/login/` for conventions.

```ts
// src/lib/remotes/create-post.ts
import { nonEmpty, object, pipe, string } from 'valibot';

export const CreatePostSchema = object({
	title: pipe(string(), nonEmpty()),
	content: pipe(string(), nonEmpty()),
});
```

```ts
// src/lib/remotes/create-post.remote.ts
import { db } from '#lib/server/database.ts';
import { form } from '$app/server';
import { invalid } from '@sveltejs/kit';
import { CreatePostSchema } from './create-post.ts';

export const createPost = form(CreatePostSchema, async (data, issue) => {
	// Form data has already passed schema validation.
	if (businessLogicFails) invalid(issue.title('ERROR_MESSAGE'));

	// Insertion is guaranteed to return exactly one row.
	const newPost = db.insert(postTable).values(data).returning().all()[0]!;

	return newPost; // populates `createPost.result` in Svelte
});
```

##### Single-Flight Mutations

A successful `form` submission calls `invalidateAll()` by default, re-running every load function and query on the page. This is wasteful and slow: the refresh is a second round-trip after the submission response comes back.

Use client-requested refreshes instead: request queries with `.updates(...)` on submit, then `requested(...).refreshAll()` on the server, returning the refreshed data in the same response as the mutation. See https://github.com/sveltejs/kit/issues/16904

```ts
import { requested } from '$app/server';

export const createPost = form(CreatePostSchema, async (data, issue) => {
	db.insert(postTable).values(data).run();
	await requested(getPosts, 10).refreshAll(); // limit bounds refresh requests
});
```

```svelte
<form
	{...createPost.enhance(async (form) => {
		await form.submit().updates(getPosts);
		form.element.reset(); // must be called manually
	})}
></form>
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
	import { getPost, getPosts } from '../data.remote';

	let { params } = $props();

	const post = $derived(await getPost(params.slug));
</script>

<h1>{post.title}</h1>
<p>{post.body}</p>

{#each await getPosts() as post}
	<a href={resolve('/posts/[slug]', { slug: post.slug })}>{post.title}</a>
{/each}
```

### `resolve`

Internal navigation must use `resolve()`:

```svelte
<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';

	// Applies to `pushState` and `replaceState` navigation as well.
	goto(resolve('/blog/tags?svelte')); // append search string or hash
</script>

<a href={externalURL} rel="external">Click me!</a>

<a href={resolve('/blog/posts')}>All Posts</a>

<!-- with params: -->
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
	<!-- warning message -->
{:else}
	{@render children()}
{/if}
```

## Svelte

Use the Svelte 5 API (e.g. runes, `createContext`).

```svelte
<div
	// Comments are valid in attribute list.
	// Use the array syntax for class names.
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

	// For non-inline event handler, import the appropriate type.
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
import { onMount, onDestroy } from 'svelte';
import { browser } from '$app/env';

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

- Create utility components for shared styles in `src/routes/+layout.css`.
- Don't style individual form controls — use `StyledLabels.svelte` instead:

```svelte
<script lang="ts">
	import StyledLabels from '#lib/components/StyledLabels.svelte';
</script>

<StyledLabels>
	<form>
		<label>
			<span>이메일</span>
			<input {...remoteForm.fields.contact.as('email')} />
		</label>
		<button
			// Utility components
			class="btn btn-primary disabled:btn-busy"
			disabled={!!remoteForm.pending}
		>
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
