<script lang="ts">
	import type { LayoutProps } from './$types.ts';
	import './layout.css'; // eslint-disable-line no-restricted-imports

	let { children }: LayoutProps = $props();
</script>

{@render children()}
