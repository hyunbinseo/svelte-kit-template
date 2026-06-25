## Comments

- Don't add unless requested
- No trailing period
- Sentences are standalone and capitalized
- Inline comments and labels are lowercase

## TypeScript

- Use `type` over `interface`
- Use arrow syntax over function expressions and declarations
- Blank `//` comments can be used to force multiline formatting
- Don't use `!` non-null assertions (except in Drizzle insert returning)

```json
{
  "noUncheckedIndexedAccess": true,
  "exactOptionalPropertyTypes": true
}
```

## Drizzle ORM

- `src/lib/server/database/client.ts`
- `src/lib/database/schema.ts`
- `src/lib/database/relations.ts`

Retrieve only necessary columns:

```ts
const users = await db.query.userTable.findMany({
  columns: { contact: true }, // never use false to exclude
});
```

For `db.select`, use the sync API:

```diff
- await db.select().from(userTable);
```

```ts
db.select().from(userTable).all(); // returns User[]
db.select().from(userTable).get(); // returns User | undefined
```

For `db.query` API, use Relational Queries v2:

```ts
const users = await db.query.userTable.findMany({
  // sort keys in this order: orderBy, offset, where, columns, extras, with
  orderBy: { id: 'asc' },
  where: {
    contact: '010', // same as `eq`
    deactivatedAt: { isNull: true },
    activeRoles: { role: 'admin' }, // filter by relations (uses subquery)
  },
});
```

Use a `UNIQUE INDEX` to avoid duplicate records (e.g. a user's active role should be unique):

```ts
uniqueIndex('active_user_role_user_id_role_idx')
  .on(table.userId, table.role)
  .where(isNull(table.revokedAt));
```

- Don't hard `DELETE`. Soft delete using columns such as `deactivatedAt` or `revokedAt`
- Use `TRIGGER` for cascade (e.g. deactivating a user should revoke all active roles)

```shell
# Trigger API unsupported; write custom migration
# See drizzle/*_triggers/migration.sql for examples
pnpm drizzle-kit generate --custom --name=triggers
```

```sql
-- Add this comment in-between statements:
--> statement-breakpoint
```

SQLite async transactions don't work, so leave a comment instead:

```ts
// BLOCKED Use transaction for <a> + <b>
```

## SvelteKit

Call `getRequestEvent()` directly in utility functions. Don't receive `event` as a parameter

### Environment Variables

Define them in `src/env.ts` and import from `$app/env`:

```ts
import { browser } from '$app/env'; // SvelteKit provided
import { SENTRY_DSN } from '$app/env/public';
import { DATABASE_URL } from '$app/env/private';
```

### Remote Functions

- RPC functions must be exported from `*.remote.ts` files
- There are 4 types: `query`, `form`, `command`, `prerender`
- Requests must be public or authenticated and authorized

```ts
import { requireNoSession, requireSession } from '#lib/server/auth/session.ts';
import { form, query } from '$app/server';

export const getPublicPosts = query(async () => {
  // Use prerender if static or cacheable
});

export const getPrivatePosts = query(async () => {
  const session = requireSession();
});

export const sendLoginCode = form(PublicSendCodeSchema, async (data, issue) => {
  requireNoSession(); // must be logged out
});
```

#### `form`

See `src/routes/login/` for conventions

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
  // Form data has already passed schema validation
  if (businessLogicFails) invalid(issue.title('ERROR_MESSAGE'));

  // When inserting a single row, use [0]! to assert that a row is returned
  const newPost = (await db.insert(postTable).values(data).returning())[0]!;

  return newPost; // populates `createPost.result` in Svelte
});
```

If the form includes a `<select>`, the default value must be defined:

```svelte
<select {...remoteForm.fields.fruit.as('select', 'apple')}>
  <option>apple</option>
  <option>banana</option>
</select>
```

#### `query.batch`

Batches requests within the same macrotask:

```ts
export const getWeather = query.batch(pipe(number(), integer()), (cityIds) => {
  // Return named tuples to reduce wire size
  // See https://github.com/sveltejs/kit/issues/15784
  const lookup = new Map<number, [minTemp: number, maxTemp: number]>();
  return (cityId) => lookup.get(cityId);
});
```

### await

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

### resolve

Internal navigation must use `resolve()`:

```svelte
<script lang="ts">
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';

  // Applies to `pushState` and `replaceState` navigation as well
  goto(resolve('/blog/tags?svelte')); // append search string or hash
</script>

<a href={externalURL} rel="external">Click me!</a>

<a href={resolve('/blog/posts')}>All Posts</a>

<!-- with params: -->
<a href={resolve('/blog/[slug]', { slug: 'hello' })}>Hello</a>
```

### Feature Detection

Check for browser API support at the client:

```svelte
<script lang="ts">
  import { browser } from '$app/env';
</script>

<!-- Does not trigger a hydration mismatch -->
{#if browser && !CSS.supports('<selector>')}
  <!-- warning message -->
{:else}
  {@render children()}
{/if}
```

## Svelte

- Use the Svelte 5 API (e.g. runes, `createContext`)
- Use the array syntax for class names:

```svelte
<div class={[faded && 'opacity-50 saturate-0', large && 'scale-200']}>...</div>
```

### $effect

Don't use `$effect` for a derived state. Use it only for side effects like logging, DOM manipulation, and browser-only APIs (e.g. syncing with `localStorage`)

### $derived

Derived values can be reassigned (e.g. optimistic UI); they revert when dependencies update:

```svelte
<script lang="ts">
  import type { HTMLButtonAttributes } from 'svelte/elements';

  let { post, like } = $props();

  let likes = $derived(post.likes);

  // For non-inline event handler, import the appropriate type
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
<!-- Can be placed anywhere -->
{let name = $state('')}
{const profile = $derived(imgFromText(name))}
<input bind:value={name} />
<img src={profile} />

{#each boxes as box}
  <!-- non-reactive values -->
  {const area = box.width * box.height}
  {const label = `${box.width} × ${box.height} = ${area}`}
  <p>{label}</p>
{/each}
```

### onMount

Accepts async functions, but cannot return a cleanup function:

```ts
import { onMount, onDestroy } from 'svelte';
import { browser } from '$app/env';

let mounted = true;

onMount(async () => {
  await promise;
  if (!mounted) return; // skip side effects
  addEventListener(/* */);
});

// Also runs on the server
onDestroy(() => {
  if (!browser) return;
  mounted = false;
  removeEventListener(/* */);
});
```

### Reference

Svelte MCP provides Svelte 5 and SvelteKit docs:

- `list-sections` to discover all available sections
- `get-documentation` to retrieve specific sections

## Tailwind CSS

- Create utility components for shared styles in `src/routes/+layout.css`
- Don't style individual form controls. Use `StyledLabels.svelte` instead:

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
    <!-- Tailwind utility components -->
    <button class="btn btn-primary disabled:btn-busy" disabled={!!remoteForm.pending}>
      인증번호 전송
    </button>
  </form>
</StyledLabels>
```

Use child selectors to avoid duplicate class names:

```svelte
<ul class="*:border-sky-100 *:bg-sky-50">
  <!-- valid each block without an item -->
  {#each { length: 12 }, index}
    <!-- Use per-element class for non-uniform styles -->
    <li class={[index % 2 === 0 && 'font-bold']}>{index}</li>
  {/each}
</ul>
```

For `<img>` and `<video>`, define a height to avoid layout shift:

- Set `width` and `height` attributes matching source dimensions
- Set `aspect-ratio` or `height` in CSS — if it differs from the source, use `object-fit`
