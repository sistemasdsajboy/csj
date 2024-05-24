<script lang="ts">
	import PageLayout from '$lib/components/custom/page-layout.svelte';
	import type { PageData } from './$types';
	import NewNovedadForm from './new-novedad-form.svelte';
	import NovedadesList from './novedades-list.svelte';
	import ResultadosCalificacionFuncionario from './resultados-calificacion-funcionario.svelte';

	export let data: PageData;
</script>

<PageLayout>
	<div slot="header" class="text-2xl font-bold">{data.funcionario.nombre} - {data.despacho}</div>

	<div class="container mx-auto px-4">
		<NewNovedadForm />
		<NovedadesList novedades={data.funcionario.novedades} />
		<ResultadosCalificacionFuncionario {data} />
	</div>
</PageLayout>
