<script lang="ts">
	import PageLayout from '$lib/components/custom/page-layout.svelte';
	import NewNovedadForm from './new-novedad-form.svelte';
	import NewRegistroAudienciasForm from './new-registro-audiencias-form.svelte';
	import ResultadosCalificacionFuncionario from './resultados-calificacion-funcionario.svelte';

	let { data } = $props();
</script>

{#snippet header()}
	<div class="text-2xl font-bold">
		{data.funcionario.nombre} - <a href="/despacho/{data.despacho.id}">{data.despacho.nombre}</a>
	</div>
{/snippet}

<PageLayout {header} username={data.user}>
	<div class="container mx-auto px-4">
		<div class="flex flex-row justify-between print:hidden">
			<div>
				<!-- {#each data.despachos as d}
					<a href="/funcionario/{data.funcionario.id}/{d.id}" class="text-sm font-bold">
						{d.nombre}
					</a>
				{/each} -->
			</div>

			{#if data.despacho}
				<div class="text-right">
					<NewRegistroAudienciasForm despachoId={data.despacho.id} />
					<NewNovedadForm despacho={data.despacho} />
				</div>
			{/if}
		</div>

		<!-- {#if data.despacho}
			<ResultadosCalificacionFuncionario data={data.calificacion} />
		{/if} -->
	</div>
</PageLayout>
