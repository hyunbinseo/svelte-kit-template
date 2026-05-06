## Common

- AVOID adding code comments

## TypeScript

- PREFER arrow function expressions over function declarations
- PREFER type over interface

## Drizzle ORM

- `src/lib/server/database.ts` (client)
- `src/lib/database/schema.ts`
- `src/lib/database/relations.ts`

Drizzle ORM v1 and Relational Queries v2 are used:

```ts
// `orderBy` and `where` are now objects
const users = await db.query.userTable.findMany({
  orderBy: { id: 'asc' },
  where: {
    contact: '010', // same as `eq`
    deactivatedAt: { isNull: true },
    // filter by relations (uses subquery)
    activeRoles: { role: 'admin' },
  },
});
```

Don't hard `DELETE`. Soft delete using columns such as `deactivatedAt` or `revokedAt`.

- Use a `UNIQUE INDEX` to avoid duplicate records (e.g. a user's active role should be unique)
- Use `TRIGGER` for cascade (e.g. deactivating a user should revoke all of their active roles)

```ts
uniqueIndex('active_user_role_user_id_role_idx')
  .on(table.userId, table.role)
  .where(isNull(table.revokedAt));
```

Trigger is not supported so SQL should be written in a custom migration file:

```shell
# See drizzle/*_triggers/migration.sql for examples
pnpm drizzle-kit generate --custom --name=triggers
```

```sql
-- If there are multiple statements, add this comment in-between them:
--> statement-breakpoint
```

For `db.select`, use the sync API:

```diff
- await db.select().from(userTable);
+ db.select().from(userTable).all(); // returns User[]
+ db.select().from(userTable).get(); // returns User | undefined
```

For `db.query` API, the object key should follow this order:

```
orderBy, offset, where, columns, extras, with
```

Only query necessary data by specifying columns to retrieve:

```ts
const users = await db.query.userTable.findMany({
  columns: { contact: true }, // never use false to exclude
});
```

SQLite async transactions do not work, so avoid them and add a BLOCKED comment when needed.

## SvelteKit

### Remote Functions

Remote functions are exported from a `.remote.ts` file, and come in four flavors: `query`, `form`, `command` and `prerender`.

On the client, the exported functions are transformed to `fetch` wrappers that invoke their counterparts on the server via a generated HTTP endpoint.

For example, form actions are defined using the `form` function. See `src/routes/login/` for conventions.

```ts
import { form } from '$app/server';
import { db } from '#lib/server/database.ts';
import { invalid } from '@sveltejs/kit';
import { nonEmpty, object, pipe, string } from 'valibot';

// can be imported from a shared file
const PostSchema = object({
  title: pipe(string(), nonEmpty()),
  content: pipe(string(), nonEmpty()),
});

export const createPost = form(PostSchema, async (data, issue) => {
  // form data has already passed schema validation
  if (businessLogicFails) invalid(issue.title('ERROR_MESSAGE'));

  // when inserting a single row, use [0]! to assert that a row is returned
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

Since they generate HTTP endpoints, the request must be appropriately authenticated and authorized.

```ts
import { requireNoSession, requireSession } from '#lib/server/auth/session.ts';
import { form, query } from '$app/server';

export const getPublicPosts = query(async () => {
  // public. use prerender if static or cacheable
});

export const getCurrentUser = query(async () => {
  const session = requireSession(); // private
});

export const sendLoginCode = form(PublicSendCodeSchema, async (data, issue) => {
  requireNoSession(); // must be logged out
});
```

### await

You can use the `await` keyword inside your components in three places:

- at the top level of your component’s `<script>`
- inside `$derived(...)` declarations
- inside your markup

```svelte
<script lang="ts">
  import { resolve } from '$app/paths';
  import { getPost, getPosts } from '../data.remote';

  let { params } = $props();

  // top-level await using the derived rune
  const post = $derived(await getPost(params.slug));
</script>

<h1>{post.title}</h1>
<p>{post.body}</p>

<nav>
  <!-- inline await in an each loop -->
  {#each await getPosts() as post}
    <a href={resolve('/posts/[slug]', { slug: post.slug })}>{post.title}</a>
  {/each}
</nav>
```

### resolve

Internal navigation via HTML `<a>` tags, SvelteKit’s `goto()`, `pushState()` and `replaceState()` should use `resolve()`.

```svelte
<script lang="ts">
  import { resolve } from '$app/paths';
</script>

<a href={externalURL} rel="external">Click me!</a>

<a href={resolve('/blog/posts')}>All Posts</a>

<!-- for routes with parameters, use the route ID approach: -->
<a href={resolve('/blog/[slug]', { slug: 'hello' })}>Hello</a>
```

## Svelte

- ALWAYS use the Svelte 5 API
- NEVER use template literals for class names. Use the array syntax:

```svelte
<div class={[faded && 'opacity-50 saturate-0', large && 'scale-200']}>...</div>
```

### $effect

`$effect` executes functions when reactive state changes. For example:

```svelte
<script lang="ts">
  let size = $state(50);
  $effect(() => {
    console.log('Size changed:', size);
  });
</script>
```

- Do **NOT** use `$effect` for state synchronization; instead, use it only for side effects like logging or DOM manipulation.
- Do **NOT** try to override derived state via effects; instead, reassign directly when needed.

### $derived

#### Overriding derived values

- You can reassign a derived value for features like optimistic UI. It will go back to the `$derived` value once an update in its dependencies happens. For example:

```svelte
<script lang="ts">
  import type { HTMLButtonAttributes } from 'svelte/elements';

  let { post, like } = $props();

  let likes = $derived(post.likes);

  // for non-inline event handler, import the appropriate type
  const onclick: HTMLButtonAttributes['onclick'] = async () => {
    likes += 1;
    await like().catch(() => (likes -= 1));
  };
</script>

<button {onclick}>🧡 {likes}</button>
```

## Tailwind CSS

- Create utility components for shared styles in `src/routes/+layout.css`.
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
    <!-- use per-element class for non-uniform styles -->
    <li class={[index % 2 === 0 && 'font-bold']}>{index}</li>
  {/each}
</ul>
```
