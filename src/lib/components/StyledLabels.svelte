<script lang="ts">
	import type { Snippet } from 'svelte';

	const { children }: { children: Snippet } = $props();
</script>

<div class="contents">
	{@render children()}
</div>

<style>
	div :global label {
		&:has(> input:is([type='checkbox'], [type='radio']):first-child + span:last-child) {
			display: flex;
			flex-direction: row;
			align-items: center;
			column-gap: calc(var(--spacing) * 2);
		}
		> span:first-child {
			+ select,
				+ textarea,
				/* Reference https://tailwindcss-forms.vercel.app/kitchen-sink.html */
				+ input:not([type='checkbox'], [type='radio'], [type='range'], [type='color'], [type='file']) {
				display: block;
				margin-top: calc(var(--spacing) * 1);
			}
		}
	}
</style>
