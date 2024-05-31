<script lang="ts">
	import PageLayout from '$lib/components/custom/page-layout.svelte';

	let { data } = $props();
</script>

{#snippet header()}
	<div class="text-2xl font-bold">
		{data.funcionario.nombre}
	</div>
{/snippet}

<PageLayout {header} username={data.user}>
	<div class="container mx-auto px-4">
		<div class="flex flex-row justify-between print:hidden">
			<div>
				{#each data.despachos as d}
					<a href="/funcionario/{data.funcionario.id}/{d.id}" class="text-sm font-bold">
						{d.nombre}
					</a>
				{/each}
			</div>
		</div>
	</div>
</PageLayout>
