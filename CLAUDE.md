## Common

- AVOID adding code comments

## UI Reference

- Tailwind v4 configuration, utility components:
  - `src/routes/+layout.css`
- Form markup and styling - avoid inline classes:
  - `src/routes/login/+page.svelte`
  - `src/lib/components/StyledLabels.svelte`

## TypeScript

- PREFER arrow function expressions over function declarations
- PREFER type over interface

## Drizzle ORM

- `src/lib/server/database.ts` (client)
- `src/lib/database/schema.ts`
- `src/lib/database/relations.ts`

Drizzle ORM v1 and Relational Queries v2 are used:

```ts
const users = await db.query.userTable.findMany({
  orderBy: { id: 'asc' }, // is now an object
  where: { id: { gt: 10 }, age: 15 }, // is now an object
});
```

IIFE can be used as the `where` value for conditional filters:

```ts
const user = await db.query.userTable.findFirst({
  where: (() => {
    if (session.roles.has('admin')) return { id: userId };
    return {
      id: userId,
      // check if the user is authorized to query this user
    };
  })(),
});
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

SQLite async transactions do not work, so avoid them and add a MAYBE comment when needed.

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

  const newPost = (await db
    .insert(postTable)
    .values(data)
    .returning()
    .then(([post]) => post))!;

  return newPost; // populates `createPost.result` in Svelte
});
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
