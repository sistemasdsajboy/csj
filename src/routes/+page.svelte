<script lang="ts">
	import FileLoader from './FileLoader.svelte';

	const { data, form } = $props();
	let despacho: string = $state('');
	let funcionarios: string[] = $state([]);

	$effect(() => {
		funcionarios = data.records.find((r) => r.despacho === despacho)?.funcionarios || [];
	});
</script>

{#if !form?.success && form?.error}
	<div>{form.error}</div>
{/if}

<FileLoader />

{#if data.records.length}
	<h3>Generar calificaciones de rendimiento</h3>
	<form method="post" action="?/gradeData">
		<select name="despacho" bind:value={despacho}>
			{#each data.records as record}
				<option value={record.despacho}>{record.despacho}</option>
			{/each}
		</select>
		{#if funcionarios.length}
			<select name="funcionario">
				{#each funcionarios as funcionario}
					<option value={funcionario}>{funcionario}</option>
				{/each}
			</select>
		{/if}
		<button type="submit">Calificar</button>
	</form>
{/if}

{#if form?.success && form.funcionario}
	<h3>{form.despacho}</h3>
	<h3>{form.funcionario}</h3>

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
