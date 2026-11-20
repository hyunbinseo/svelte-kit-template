<script lang="ts">
	import type { LayoutProps } from './$types.ts';
	// eslint-disable-next-line no-restricted-imports
	import './layout.css';

	let { children }: LayoutProps = $props();
</script>

{@render children()}
