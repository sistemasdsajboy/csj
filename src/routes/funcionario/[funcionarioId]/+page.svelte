<script lang="ts">
	import PageLayout from '$lib/components/custom/page-layout.svelte';
	import type { PageData } from './$types';
	import NewNovedadForm from './new-novedad-form.svelte';
	import NewRegistroAudienciasForm from './new-registro-audiencias-form.svelte';
	import NovedadesList from './novedades-list.svelte';
	import ResultadosCalificacionFuncionario from './resultados-calificacion-funcionario.svelte';

	export let data: PageData;

	const despacho = data.despachos[0]; // TODO: Gestión de múltiples despachos por funcionario
</script>

<PageLayout>
	<div slot="header" class="text-2xl font-bold">{data.funcionario.nombre} - {despacho.nombre}</div>

	<div class="container mx-auto px-4">
		<NewRegistroAudienciasForm despachoId={despacho.id} />
		<NewNovedadForm />
		<NovedadesList novedades={data.funcionario.novedades} />
		<ResultadosCalificacionFuncionario {data} />
	</div>
</PageLayout>
