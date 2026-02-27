## Common

- AVOID adding code comments

## UI Reference

- Tailwind v4 configuration, utility components:
  - `src/lib/layout.css`
- Form markup and styling - avoid inline classes:
  - `src/lib/components/StyledLabels.svelte`

## TypeScript

- PREFER arrow function expressions over function declarations
- PREFER type over interface

## SvelteKit

Form actions are defined using the `form` function.

```ts
import { form } from '$app/server';
import { db } from '$lib/server/database';
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

## Svelte

- ALWAYS use the Svelte 5 API
- NEVER use template literals for class names. Use the array syntax:

```svelte
<!-- if `faded` and `large` are both truthy, -->
<!-- results in `class="saturate-0 opacity-50 scale-200"` -->
<div class={[faded && 'opacity-50 saturate-0', large && 'scale-200']}>...</div>
```

### await

You can use the `await` keyword inside your components in three places:

- at the top level of your component’s `<script>`
- inside `$derived(...)` declarations
- inside your markup

```svelte
<script lang="ts">
  import { getPost } from '../data.remote';

  let { params } = $props();

  const post = $derived(await getPost(params.slug));
</script>
```

### $effect

<!-- All reactive states are automatically registered as dependencies -->

- `$effect` executes functions when reactive state changes. For example:

```svelte
<script>
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
<script>
  let post = $props().post;
  let likes = $derived(post.likes); // writable
  async function onclick() {
    likes += 1; // can be temporarily overridden
    try {
      await post.like();
    } catch {
      likes -= 1;
    }
  }
</script>
```
