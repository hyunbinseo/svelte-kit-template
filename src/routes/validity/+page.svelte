<script lang="ts">
	import { remoteForm } from './form.remote';

	let input: HTMLInputElement;
</script>

<form
	onsubmit={(e) => {
		e.preventDefault();
		window.alert('onsubmit');
	}}
	class="w-fit p-4 outline"
>
	<input
		bind:this={input}
		type="text"
		required
		minlength="6"
		maxlength="6"
	/>
	<button
		type="button"
		onclick={() => console.log(input.checkValidity())}
	>
		Check Validity
	</button>
	<span>/</span>
	<button>Vanilla Submit</button>
</form>

<form
	{...remoteForm}
	class="mt-4 w-fit p-4 outline"
>
	<input
		{...remoteForm.fields.name.as('text')}
		required
		minlength="6"
		maxlength="6"
	/>
	<button>Remote Form Submit</button>
	<ul>
		<!-- eslint-disable-next-line svelte/require-each-key -->
		{#each remoteForm.fields.allIssues() as issue}
			<li>{issue.message}</li>
		{/each}
	</ul>
</form>
