<script lang="ts">
	import { FormSchema } from './ids';
	import { addId } from './ids.remote';
</script>

<!-- eslint-disable svelte/require-each-key -->

<form {...addId.preflight(FormSchema)}>
	<fieldset>
		{#each ['windows', 'mac', 'linux'] as os, index}
			<label>
				<!-- windows is not checked -->
				<input {...addId.fields.operatingSystem.as('radio', os)} defaultChecked={!index} />
				{os}
			</label>
		{/each}
	</fieldset>
	<fieldset>
		{#each ['windows', 'mac', 'linux'] as os, index}
			<label>
				<!-- windows is checked -->
				<input type="radio" name="os" value={os} defaultChecked={!index} />
				{os}
			</label>
		{/each}
	</fieldset>
</form>
