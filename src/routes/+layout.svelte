<script lang="ts">
	import type { LayoutProps } from './$types.ts';
	import './layout.css';

	let { children }: LayoutProps = $props();
</script>

{@render children()}
