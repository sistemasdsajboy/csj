<script lang="ts">
	import type {
		// PageData,
		ActionData
	} from './$types';

	// export let data: PageData;
	// console.log(data);

	export let form: ActionData;
</script>

<form method="post" enctype="multipart/form-data">
	<input type="file" name="file" />
	{#if form?.success && form.step === 'selectFuncionario' && form.funcionarios}
		<select name="funcionario">
			{#each form.funcionarios as funcionario}
				<option value={funcionario}>{funcionario}</option>
			{/each}
		</select>
	{/if}
	<button type="submit">Cargar</button>
</form>

{#if form?.success && form.step === 'results'}
	<h2>{form.funcionario}</h2>

	<h3>Oral</h3>
	<p>Total inventario inicial: {form.oral?.totalInventarioInicial}</p>
	<p>Carga base de calificación del despacho: {form.oral?.cargaBaseCalificacionDespacho}</p>
	<p>Carga base de calificación del funcionario: {form.oral?.cargaBaseCalificacionFuncionario}</p>
	<p>Egreso del funcionario: {form.oral?.egresoFuncionario}</p>
	<p>Carga proporcional: {form.oral?.cargaProporcional?.toFixed(2)}</p>
	<p>
		Subfactor respuesta efectiva a la demanda de justicia:
		{form.oral?.subfactorRespuestaEfectiva?.toFixed(2)}
	</p>
	<p>Calificación audiencias: {form.calificacionAudiencias}</p>
	<p>Calificación final factor eficiencia: {form.factorEficienciaAudiencias?.toFixed(2)}</p>

	<h3>Garantías</h3>
	<p>Total inventario inicial: {form.garantias?.totalInventarioInicial}</p>
	<p>Carga base de calificación del despacho: {form.garantias?.cargaBaseCalificacionDespacho}</p>
	<p>
		Carga base de calificación del funcionario: {form.garantias?.cargaBaseCalificacionFuncionario}
	</p>
	<p>Egreso del funcionario: {form.garantias?.egresoFuncionario}</p>
	<p>Carga proporcional: {form.garantias?.cargaProporcional?.toFixed(2)}</p>
	<p>Subfactor garantías: {form.garantias?.subfactorGarantias?.toFixed(2)}</p>

	<h3>Calificación factor eficiencia o rendimiento</h3>
	<h3>{form.calificacionTotalFactorEficiencia?.toFixed(2)}</h3>
{/if}
