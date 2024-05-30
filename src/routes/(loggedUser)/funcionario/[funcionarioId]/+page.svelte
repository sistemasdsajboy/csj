<script lang="ts">
	import PageLayout from '$lib/components/custom/page-layout.svelte';
	import type { PageData } from './$types';
	import NewNovedadForm from './new-novedad-form.svelte';
	import NewRegistroAudienciasForm from './new-registro-audiencias-form.svelte';
	import ResultadosCalificacionFuncionario from './resultados-calificacion-funcionario.svelte';

	export let data: PageData;

	const despacho = data.despachos[0]; // TODO: Gestión de múltiples despachos por funcionario
</script>

{#snippet header()}
	<div class="text-2xl font-bold">
		{data.funcionario.nombre} - <a href="/despacho/{despacho.id}">{despacho.nombre}</a>
	</div>
{/snippet}

<PageLayout {header} username={data.user}>
	<div class="container mx-auto px-4">
		<div class="text-right print:hidden">
			<NewRegistroAudienciasForm despachoId={despacho.id} />
			<NewNovedadForm />
		</div>
		<ResultadosCalificacionFuncionario {data} />
	</div>
</PageLayout>
