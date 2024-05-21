<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import type { NovedadRegistroCalificacion } from '$lib/db/schema';
	import FileLoader from './FileLoader.svelte';
	import NovedadForm from './NovedadForm.svelte';
	import NovedadesList from './NovedadesList.svelte';

	const { data, form } = $props();
	let registroId: string = $state('');
	let funcionario: string = $state('');
	let funcionarios: string[] = $state([]);
	let novedades: NovedadRegistroCalificacion[] = $state([]);

	$effect(() => {
		const registro = data.registros.find(({ id }) => id === registroId);
		funcionarios = registro?.funcionarios || [];
		novedades = registro?.novedades || [];
	});
</script>

{#if !form?.success && form?.error}
	<div>{form.error}</div>
{/if}

<FileLoader />

{#if data.registros.length}
	<h3>Generar calificaciones de rendimiento</h3>
	<form method="post" action="?/gradeData">
		<div>
			<select name="registroId" bind:value={registroId}>
				{#each data.registros as record}
					<option value={record.id}>{record.despacho}</option>
				{/each}
			</select>
		</div>

		{#if funcionarios.length}
			<div>
				<select name="funcionario" bind:value={funcionario}>
					{#each funcionarios as funcionario}
						<option value={funcionario}>{funcionario}</option>
					{/each}
				</select>
			</div>
		{/if}

		<Button type="submit">Calificar</Button>
	</form>
{/if}

{#if funcionario}
	<NovedadesList {novedades} />
	<NovedadForm {registroId} />
{/if}

{#if form?.success && form.funcionario}
	<h3>{form.despacho}</h3>
	<h3>{form.funcionario}</h3>

	<h3>Novedades</h3>
	<div>Días descontados por novedades: {form.diasDescontados}</div>

	<h3>Oral</h3>
	<div>Total inventario inicial: {form.oral?.totalInventarioInicial}</div>
	<div>Carga base de calificación del despacho: {form.oral?.cargaBaseCalificacionDespacho}</div>
	<div>
		Carga base de calificación del funcionario: {form.oral?.cargaBaseCalificacionFuncionario}
	</div>
	<div>Egreso del funcionario: {form.oral?.egresoFuncionario}</div>
	<div>Carga proporcional: {form.oral?.cargaProporcional?.toFixed(2)}</div>
	<div>
		Subfactor respuesta efectiva a la demanda de justicia:
		{form.oral?.subfactorRespuestaEfectiva?.toFixed(2)}
	</div>
	<div>Calificación audiencias: {form.calificacionAudiencias}</div>
	<div>Calificación final factor eficiencia: {form.factorEficienciaAudiencias?.toFixed(2)}</div>

	<h3>Garantías</h3>
	<div>Total inventario inicial: {form.garantias?.totalInventarioInicial}</div>
	<div>
		Carga base de calificación del despacho: {form.garantias?.cargaBaseCalificacionDespacho}
	</div>
	<div>
		Carga base de calificación del funcionario: {form.garantias?.cargaBaseCalificacionFuncionario}
	</div>
	<div>Egreso del funcionario: {form.garantias?.egresoFuncionario}</div>
	<div>Carga proporcional: {form.garantias?.cargaProporcional?.toFixed(2)}</div>
	<div>Subfactor garantías: {form.garantias?.subfactorGarantias?.toFixed(2)}</div>

	<h3>Calificación factor eficiencia o rendimiento</h3>
	<h3>{form.calificacionTotalFactorEficiencia?.toFixed(2)}</h3>
{/if}
