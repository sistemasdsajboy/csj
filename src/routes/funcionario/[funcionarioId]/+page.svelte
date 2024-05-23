<script lang="ts">
	import PageLayout from '$lib/components/custom/page-layout.svelte';
	import type { PageData } from './$types';
	import NewNovedadForm from './new-novedad-form.svelte';
	import NovedadesList from './novedades-list.svelte';
	import ResultadosCalificacionFuncionario from './resultados-calificacion-funcionario.svelte';

	export let data: PageData;
</script>

<PageLayout>
	<span slot="header">Jueces</span>

	{#if data.funcionario}
		<h1 class="bold text-lg">{data.funcionario.nombre}</h1>

		<div class="flex flex-row w-full justify-between">
			<div>
				<NovedadesList novedades={data.funcionario.novedades} />
				<NewNovedadForm />
			</div>

			<div>
				<ResultadosCalificacionFuncionario {data} />
			</div>
		</div>
	{:else}
		<h1>Funcionario no encontrado</h1>
	{/if}
</PageLayout>
