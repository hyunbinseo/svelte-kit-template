<script lang="ts">
	import { setUser } from '@sentry/sveltekit';

	let { children, data } = $props();

	$effect(() => {
		setUser({ id: data.userId });
		return () => {
			setUser(null);
		};
	});
</script>

{@render children()}
