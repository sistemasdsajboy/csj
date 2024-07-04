<script lang="ts">
	import PageLayout from '$lib/components/custom/page-layout.svelte';
	import FileLoader from './FileLoader.svelte';

	const { data, form } = $props();
</script>

{#snippet header()}
	<h1 class="grow text-lg font-bold uppercase">Funcionarios</h1>
{/snippet}

{#snippet sidebar()}
	<div class="max-w-md">
		<FileLoader />
		{#if form}
			{#if form.success}
				<div>{form.message}</div>
			{:else}
				<div>{form.error}</div>
			{/if}
		{/if}
	</div>
{/snippet}

<PageLayout {header} {sidebar} username={data.user}>
	<div>
		{#each data.funcionarios as funcionario}
			<div>
				<a href="/funcionario/{funcionario.id}">{funcionario.nombre}</a>
			</div>
		{/each}
	</div>
</PageLayout>
