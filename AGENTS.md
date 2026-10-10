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

- Route-specific code lives next to its route; shared code lives in `src/*/`.
- Avoid top-level files in `src/lib/` — extend a module or folder (e.g. `enums/`).
- `cli/` may import Node-compatible `src/` code, but not vice versa. `check:cli` blocks:
  - `$app/*`, `@sveltejs/kit` (e.g. via `@sentry/sveltekit` — use `@sentry/node`)
  - Vite-only `import.meta` properties (e.g. `env`, `glob` — also via `@sveltejs/kit`)

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

Import test APIs from `vite-plus/test`, and assertions from `node:assert/strict`.

- Group by unit with `describe` when a file tests several.
- Use a fresh `:memory:` database per test (e.g. `createAppDb()`) if possible.
- Seed with shared helpers (e.g. `seedUser`) — add one instead of inserting inline.
- Put repeated setup in a local `setup()` that returns what tests destructure.
- Create temporary files in `createTemporaryDir()` — it cleans up after the file.

### E2E

- Use the custom `test` fixture for a worker-scoped `db`.
- Assert with `expect` — narrow types with `node:assert/strict`.
- Hardcode root-relative paths (e.g. `/login`) — `paths.base` is unset.
- Don't select elements by UI text — use roles, attributes, or actual values.

```ts
page.locator('form[action="/login"]').getByRole('button');
page.getByText(userId); // value the test inserted (e.g. `seedUser(db).id`)
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

Open connections with the shared options or factory in `#database/connection.ts`, which set:

- `PRAGMA busy_timeout` (0 → positive)
  - Only one writer is allowed at a time, even in WAL mode
  - Makes writers wait instead of throwing `SQLITE_BUSY`
- `PRAGMA journal_mode` (`delete` → `wal`, factory only)

If a `PRAGMA` matters, verify it against the runtime in `pragmas/` tests and list it above.

## Drizzle ORM

Database code lives in `src/db/server/`, imported as `#database/*`:

- `app/` — application data, with schema, relations, cascades, clients, and types
- `audit/` — query log, with schema and logger:
  - Logging is off unless `DATABASE_AUDIT_URL` is set.
  - If logging fails, `AuditWriteError` is thrown before the query runs.

Ask before running `drizzle-kit generate`/`migrate`, or the `db:*` scripts wrapping them.

### Clients

Import from `#database/app/`:

- `client.ts` — SvelteKit clients:
  - `db` — logs writes only (plus CTEs)
  - `fullyAuditedDb` — logs every query, including reads
  - `createLocalClient()` — wraps either in a [local client](#local-clients)
- `types.ts` — `AppDb` (client), `AppTx` (transaction), and `AppDbOrTx` (either)

### Local Clients

Each `server.ts` exports a local client — a `db` exposing only its own queries:

```ts
// src/routes/posts/new/create-post/server.ts
import { eq } from 'drizzle-orm';
import { createLocalClient, db as client } from '#database/app/client.ts';
import { postTable } from '#database/app/schema.ts';
import { picked } from '#database/pick.ts';

export const db = createLocalClient(client, (db) => ({
	// One input — type it by its column.
	findPost: (slug: typeof postTable.$inferSelect.slug) =>
		db.query.postTable.findFirst({ where: { slug } }).sync(),
	// Several — list the keys once; `data` is typed and filtered to them.
	insertPost: picked<typeof postTable.$inferInsert>()(
		['title', 'content'],
		// Insertion is guaranteed to return exactly one row.
		(data) => db.insert(postTable).values(data).returning().all()[0]!,
	),
	// Destructure keys that aren't values (e.g. `where` targets).
	updatePost: picked<typeof postTable.$inferSelect>()(['slug', 'title'], ({ slug, ...data }) => {
		db.update(postTable).set(data).where(eq(postTable.slug, slug)).run();
	}),
}));
```

```ts
db.findPost(slug); // runs on `client`
db.transaction((tx) => tx.findPost(slug)); // runs on the transaction
db.insertPost({ title: data.title, content: data.content }); // not the whole form data
```

`picked()` drops unlisted keys at runtime — TypeScript allows extra properties on non-literal arguments.

- Pass `fullyAuditedDb` instead of `db` to log reads.
- Share queries as an exported factory spread into each local client (e.g. `...authQueries(db)` from `#auth/server/queries.ts`).
- Shared modules outside `src/routes/` may also export their own local client next to the factory (e.g. `db` from `#auth/server/queries.ts`).

### Queries

Use Drizzle ORM APIs instead of `` sql`...` ``. If an API is missing or broken, use `` sql`...` `` with a `BLOCKED` comment.

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

Import tables from `#database/<db>/schema.ts`. Group tables by owner:

- Single file — one block per owner in `schema.ts`
- Split — `schema/<owner>.ts`, re-exported from `schema.ts`

Each group declares, in order:

- `<owner>` — owner table (e.g. `userTable`)
- `<owner><Attribute>` — 1:1 and 1:N tables (e.g. `userRoleTable`)
- `<owner>To<Other>` — M:N join tables (e.g. `userToTeamTable`)

Delete rows by:

- Soft-deleting — by default, using nullable columns (e.g. `deactivatedAt`/`deactivatedBy`)
- Hard-deleting — only rows that never took effect (e.g. a login whose code failed to send)

#### Constraints

Keep related nullable columns in sync with a `CHECK` constraint, named `<table>_<action>_check`:

```ts
check(
	'user_deactivate_check',
	eq(
		isNull(table.deactivatedAt), //
		isNull(table.deactivatedBy),
	),
);
```

#### Indexes

Index foreign key columns used in lookups or cascades.

Index names follow 2 conventions:

- `<table>_<columns>_idx` (e.g. `token_user_id_idx`)
- `<filter>_<table>_<columns>_idx` — filtered (e.g. `active_user_contact_idx` on soft-delete)

Use a `UNIQUE INDEX` to avoid duplicate records (e.g. one rotation per token). Write value filters with `` sql`...` ``:

```ts
uniqueIndex('rotate_token_ban_token_id_idx')
	.on(table.tokenId)
	// BLOCKED Use eq()
	// See https://github.com/drizzle-team/drizzle-orm/issues/4790
	.where(sql`${table.reason} = 'rotate'`);
```

### Relations

- Add relations only when needed; remove them when unused.
- Soft-deleted tables can use filtered relations (`where`) to drop inactive rows.
- Name filtered relations after their filter (e.g. `activeUserByContact`, `successfulAttempts`).

### Cascades

Don't use `TRIGGER`s — they are invisible to the audit logger and need raw SQL migrations.

Write cascades (e.g. deactivating a user revokes all active roles) as functions in `src/db/server/app/cascades.ts`, so both `cli/` and SvelteKit can call them:

- Take the client (`AppDb`) as the first parameter.
- Run the whole cascade in one transaction — read the clock inside it.
- Guard (e.g. `isNull(revokedAt)`) and return a boolean — `false` on no-op.
- Set cascade-starting columns (e.g. `revokedAt`) only via the cascade function.

Test each cascade function in `cascades.test.ts`, including each guard (e.g. already revoked).

### Transactions

Pass sync callbacks, or leave a `BLOCKED` comment if impossible. See [drizzle-team/drizzle-orm#2275](https://github.com/drizzle-team/drizzle-orm/issues/2275).

Always wrap read-then-write in a transaction for isolation. Set `behavior` to `immediate` so the write can't fail on a stale read:

```ts
db.transaction(
	(tx) => {
		const post = tx.findPost(/* ... */);
		tx.updatePost(/* ... */);
	},
	{ behavior: 'immediate' },
);
```

To log a transaction's reads, create the local client from `fullyAuditedDb` — don't mix clients.

## SvelteKit

Use the SvelteKit 3 API (e.g. `$app/env`).

- Call `getRequestEvent()` in utility functions instead of passing `event`.
- Check `load` return types with `satisfies`. See [sveltejs/kit#9799](https://github.com/sveltejs/kit/issues/9799).
- Use `form` remote functions instead of `actions` in `+page.server.ts`.
- Mark server-only modules by name or location:
  - `server.ts` or `*.server.ts` — anywhere
  - `server/` directories — outside `src/routes/`

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

Name remote modules `remote.ts` or `*.remote.ts`, outside `server/` directories. They export only remote functions — move other exports to separate files:

```text
src/routes/posts/new/
├── save-draft.remote.ts
└── create-post/
    ├── remote.ts
    ├── server.ts # server-only (e.g. db access)
    └── shared.ts # isomorphic (e.g. schemas)
```

Remote functions run guards, business checks, transactions, and responses. Queries live in the adjacent `server.ts` as a [local client](#local-clients) — remote modules don't import `#database/*`.

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
import { db } from './server.ts';
import { CreatePostSchema } from './shared.ts';

export const createPost = form(CreatePostSchema, async (data, issue) => {
	// Form data has already passed schema validation.
	if (businessLogicFails) invalid(issue.title('ERROR_MESSAGE'));

	const newPost = db.insertPost({ title: data.title, content: data.content });

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
import { db } from './server.ts';
import { CreatePostSchema } from './shared.ts';

export const createPost = form(CreatePostSchema, async (data) => {
	const post = db.insertPost({ title: data.title, content: data.content });

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
