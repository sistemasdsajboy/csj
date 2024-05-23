<script lang="ts">
	import type { PageData } from './$types';

	export let data: PageData;

	const c = data.calificacion;
	const { nombre } = data.funcionario;
</script>

<h3 class="text-lg bold text-slate-800 pt-4">{data.despacho}</h3>
<h3 class="text-lg bold text-slate-800 pt-4">{nombre}</h3>

<h3 class="text-lg bold text-slate-800 pt-4">Novedades</h3>
<div>Días hábiles del despacho: {c.diasHabilesDespacho}</div>
<div>Días descontados por novedades: {c.diasDescontados}</div>
<div>Días laborados: {c.diasHabilesLaborados}</div>

<h3 class="text-lg bold text-slate-800 pt-4">Oral</h3>
<div>Total inventario inicial: {c.oral?.totalInventarioInicial}</div>
<div>Carga base del despacho (modificada): {c.oral?.cargaBaseCalificacionDespacho}</div>
<div>
	Carga base del funcionario (modificada): {c.oral?.cargaBaseCalificacionFuncionario}
</div>
<div>Egreso del funcionario: {c.oral?.egresoFuncionario}</div>
<div>Carga proporcional: {c.oral?.cargaProporcional?.toFixed(2)}</div>
<div>
	Subfactor respuesta efectiva a la demanda de justicia:
	{c.oral?.subfactorRespuestaEfectiva?.toFixed(2)}
</div>
<div>Calificación audiencias: {c.calificacionAudiencias}</div>
<div>Calificación final factor eficiencia: {c.factorEficienciaAudiencias?.toFixed(2)}</div>

<h3 class="text-lg bold text-slate-800 pt-4">Garantías</h3>
<div>Total inventario inicial: {c.garantias?.totalInventarioInicial}</div>
<div>
	Carga base del despacho (modificada): {c.garantias?.cargaBaseCalificacionDespacho}
</div>
<div>
	Carga base del funcionario (modificada): {c.garantias?.cargaBaseCalificacionFuncionario}
</div>
<div>Egreso del funcionario: {c.garantias?.egresoFuncionario}</div>
<div>Carga proporcional: {c.garantias?.cargaProporcional?.toFixed(2)}</div>
<div>Subfactor garantías: {c.garantias?.subfactorGarantias?.toFixed(2)}</div>

<h3 class="text-lg bold text-slate-800 pt-4">Calificación factor eficiencia o rendimiento</h3>
<h3 class="text-lg bold text-slate-800">{c.calificacionTotalFactorEficiencia?.toFixed(2)}</h3>
