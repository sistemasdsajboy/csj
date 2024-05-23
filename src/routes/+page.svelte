<script lang="ts">
	import PageLayout from '$lib/components/custom/page-layout.svelte';
	import FileLoader from './FileLoader.svelte';

	const { data, form } = $props();
</script>

<PageLayout>
	<div slot="sidebar" class="max-w-md">
		<FileLoader />
		{#if !form?.success && form?.error}
			<div>{form.error}</div>
		{/if}
	</div>

	<div>
		{#each data.funcionarios as funcionario}
			<div>
				<a href="/funcionario/{funcionario.id}">{funcionario.nombre}</a>
			</div>
		{/each}
	</div>
</PageLayout>
