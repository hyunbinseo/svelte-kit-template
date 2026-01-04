## Common

- AVOID adding code comments

## TypeScript

- PREFER arrow function expressions over function declarations
- PREFER type over interface

## Drizzle ORM

For `db.query` API, the object key should follow this order:

```
orderBy, offset, where, columns, extras, with
```

## Svelte

- ALWAYS use the Svelte 5 API
- NEVER use template literals for class names. Use the array syntax:

```svelte
<!-- if `faded` and `large` are both truthy, -->
<!-- results in `class="saturate-0 opacity-50 scale-200"` -->
<div class={[faded && 'opacity-50 saturate-0', large && 'scale-200']}>...</div>
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

- You can reassign a derived value for features like optimistic UI. It will go back to the `$derived` value once an update in its dependencies happen. For example:

```svelte
<script>
  let post = $props().post;
  let likes = $derived(post.likes); // writable
  async function onclick() {
    likes += 1;
    try {
      await post.like();
    } catch {
      likes -= 1;
    }
  }
</script>
```
