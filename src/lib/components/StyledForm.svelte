<script lang="ts">
	import type { HTMLFormAttributes } from 'svelte/elements';

	// Spreads a remote form's attributes, e.g. <StyledForm {...login}>
	let { children, ...attributes }: HTMLFormAttributes = $props();
</script>

<form {...attributes}>
	{@render children?.()}
</form>

<style>
	/* Base layer, so utilities on the controls still win */
	@layer base {
		/* A label wraps its text and control; issues follow the label. */
		form :global(label) {
			display: block;
		}

		form :global(input:not([type='checkbox'], [type='radio'], [type='hidden'])),
		form :global(select),
		form :global(textarea) {
			display: block;
			margin-top: calc(var(--spacing) * 1);
			width: 100%;
			border-radius: var(--radius-sm);
		}

		form :global([aria-invalid='true']) {
			border-color: var(--color-red-700);
		}
	}
</style>
