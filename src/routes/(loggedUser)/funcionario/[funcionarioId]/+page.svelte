<script lang="ts">
	import PageLayout from '$lib/components/custom/page-layout.svelte';
	import ArrowLeft from 'lucide-svelte/icons/arrow-left';
	import type { PageData } from './$types';
	import NewNovedadForm from './new-novedad-form.svelte';
	import NewRegistroAudienciasForm from './new-registro-audiencias-form.svelte';
	import ResultadosCalificacionFuncionario from './resultados-calificacion-funcionario.svelte';
	import { Button } from '$lib/components/ui/button';

	export let data: PageData;

	const despacho = data.despachos[0]; // TODO: Gestión de múltiples despachos por funcionario
</script>

{#snippet header()}
	<Button variant="link" href="/">
		<ArrowLeft class="h-6 w-6" />
	</Button>
	<div class="text-2xl font-bold">{data.funcionario.nombre} - {despacho.nombre}</div>
{/snippet}

<PageLayout {header} username={data.user}>
	<div class="container mx-auto px-4">
		<NewRegistroAudienciasForm despachoId={despacho.id} />
		<NewNovedadForm />
		<ResultadosCalificacionFuncionario {data} />
	</div>
</PageLayout>
