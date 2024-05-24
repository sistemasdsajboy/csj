<script lang="ts">
	import type { PageData } from './$types';
	import { formatDate } from '$lib/utils/dates';
	import { Badge } from '$lib/components/ui/badge';

	export let data: PageData;

	const c = data.calificacion;
</script>

<h3 class="bold pt-8 text-2xl font-bold text-slate-800">
	Calificación factor eficiencia o rendimiento
</h3>
<h3 class="bold pt-8 text-2xl font-bold text-sky-800">
	{c.calificacionTotalFactorEficiencia?.toFixed(2)}
</h3>

<h3 class="bold pt-8 text-2xl font-bold text-slate-800">Novedades</h3>
<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
	<div class="rounded-lg bg-gray-100 p-4 shadow-md dark:bg-gray-800">
		<h3 class="text-md mb-2 font-medium">Días hábiles del despacho</h3>
		<p class="text-center text-xl font-bold">{c.diasHabilesDespacho}</p>
	</div>
	<div class="rounded-lg bg-gray-100 p-4 shadow-md dark:bg-gray-800">
		<h3 class="text-md mb-2 font-medium">Días descontados</h3>
		<p class="text-center text-xl font-bold">{c.diasDescontados}</p>
	</div>
	<div class="rounded-lg bg-gray-100 p-4 shadow-md dark:bg-gray-800">
		<h3 class="text-md mb-2 font-medium">Días laborados</h3>
		<p class="text-center text-xl font-bold">{c.diasHabilesLaborados}</p>
	</div>
</div>

<h3 class="bold pt-8 text-2xl font-bold text-slate-800">Consolidado de procesos</h3>
<div class="overflow-x-auto">
	<table class="w-full table-auto border-collapse">
		<thead>
			<tr class="bg-gray-100 dark:bg-gray-800">
				<th class="px-2 py-2 text-center font-medium text-gray-700 dark:text-gray-300">
					Funcionario
				</th>
				<th class="px-2 py-2 text-center font-medium text-gray-700 dark:text-gray-300">
					Periodo
				</th>
				<th class="px-2 py-2 text-center font-medium text-gray-700 dark:text-gray-300">
					Días hábiles
				</th>
				<th class="px-2 py-2 text-center font-medium text-gray-700 dark:text-gray-300">
					Inventario Inicial
				</th>
				<th class="px-2 py-2 text-center font-medium text-gray-700 dark:text-gray-300">
					Ingresos Efectivos
				</th>
				<th class="px-2 py-2 text-center font-medium text-gray-700 dark:text-gray-300">
					Carga Efectiva
				</th>
				<th class="px-2 py-2 text-center font-medium text-gray-700 dark:text-gray-300">
					Egresos Efectivos
				</th>
				<th class="px-2 py-2 text-center font-medium text-gray-700 dark:text-gray-300">
					Conciliaciones
				</th>
				<th class="px-2 py-2 text-center font-medium text-gray-700 dark:text-gray-300">
					Inventario Final
				</th>
			</tr>
		</thead>
		<tbody>
			{#each c.consolidadoOrdinario as fila}
				<tr class="border-b border-gray-200 dark:border-gray-700">
					<td class="text-nowrap px-2 text-gray-900 dark:text-gray-100">
						{c.funcionarios.find((f) => f.id === fila.funcionarioId)?.nombre}
					</td>
					<td class="px-2 text-center text-gray-900 dark:text-gray-100">
						<Badge variant="secondary">{formatDate(fila.desde)}-{formatDate(fila.hasta)}</Badge>
					</td>
					<td class="px-2 text-center text-gray-900 dark:text-gray-100">{fila.dias}</td>
					<td class="px-2 text-center text-gray-900 dark:text-gray-100">
						{fila.inventarioInicial}
					</td>
					<td class="px-2 text-center text-gray-900 dark:text-gray-100">
						{fila.ingresoEfectivo}
					</td>
					<td class="px-2 text-center text-gray-900 dark:text-gray-100">{fila.cargaEfectiva}</td>
					<td class="px-2 text-center text-gray-900 dark:text-gray-100">{fila.egresoEfectivo}</td>
					<td class="px-2 text-center text-gray-900 dark:text-gray-100">{fila.conciliaciones}</td>
					<td class="px-2 text-center text-gray-900 dark:text-gray-100">{fila.inventarioFinal}</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>

<h3 class="bold pt-8 text-2xl font-bold text-slate-800">Consolidado tutelas e incidentes</h3>
<div class="overflow-x-auto">
	<table class="w-full table-auto border-collapse">
		<thead>
			<tr class="bg-gray-100 dark:bg-gray-800">
				<th class="px-2 py-2 text-center font-medium text-gray-700 dark:text-gray-300">
					Funcionario
				</th>
				<th class="px-2 py-2 text-center font-medium text-gray-700 dark:text-gray-300">
					Periodo
				</th>
				<th class="px-2 py-2 text-center font-medium text-gray-700 dark:text-gray-300">
					Días hábiles
				</th>
				<th class="px-2 py-2 text-center font-medium text-gray-700 dark:text-gray-300">
					Inventario Inicial
				</th>
				<th class="px-2 py-2 text-center font-medium text-gray-700 dark:text-gray-300">
					Ingresos Efectivos
				</th>
				<th class="px-2 py-2 text-center font-medium text-gray-700 dark:text-gray-300">
					Carga Efectiva
				</th>
				<th class="px-2 py-2 text-center font-medium text-gray-700 dark:text-gray-300">
					Egresos Efectivos
				</th>
				<th class="px-2 py-2 text-center font-medium text-gray-700 dark:text-gray-300">
					Conciliaciones
				</th>
				<th class="px-2 py-2 text-center font-medium text-gray-700 dark:text-gray-300">
					Inventario Final
				</th>
			</tr>
		</thead>
		<tbody>
			{#each c.consolidadoTutelas as fila}
				<tr class="border-b border-gray-200 dark:border-gray-700">
					<td class="text-nowrap px-2 text-gray-900 dark:text-gray-100">
						{c.funcionarios.find((f) => f.id === fila.funcionarioId)?.nombre}
					</td>
					<td class="px-2 text-center text-gray-900 dark:text-gray-100">
						<Badge variant="secondary">{formatDate(fila.desde)}-{formatDate(fila.hasta)}</Badge>
					</td>
					<td class="px-2 text-center text-gray-900 dark:text-gray-100">{fila.dias}</td>
					<td class="px-2 text-center text-gray-900 dark:text-gray-100">
						{fila.inventarioInicial}
					</td>
					<td class="px-2 text-center text-gray-900 dark:text-gray-100">
						{fila.ingresoEfectivo}
					</td>
					<td class="px-2 text-center text-gray-900 dark:text-gray-100">{fila.cargaEfectiva}</td>
					<td class="px-2 text-center text-gray-900 dark:text-gray-100">{fila.egresoEfectivo}</td>
					<td class="px-2 text-center text-gray-900 dark:text-gray-100">{fila.conciliaciones}</td>
					<td class="px-2 text-center text-gray-900 dark:text-gray-100">{fila.inventarioFinal}</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>

<h3 class="bold pt-8 text-2xl font-bold text-slate-800">Oral</h3>
<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
	<div class="rounded-lg bg-gray-100 p-4 shadow-md dark:bg-gray-800">
		<h3 class="text-md mb-2 font-medium">Total inventario inicial</h3>
		<p class="text-center text-xl font-bold">{c.oral?.totalInventarioInicial}</p>
	</div>
	<div class="rounded-lg bg-gray-100 p-4 shadow-md dark:bg-gray-800">
		<h3 class="text-md mb-2 font-medium">Carga base del despacho modificada</h3>
		<p class="text-center text-xl font-bold">{c.oral?.cargaBaseCalificacionDespacho}</p>
	</div>
	<div class="rounded-lg bg-gray-100 p-4 shadow-md dark:bg-gray-800">
		<h3 class="text-md mb-2 font-medium">Carga base del funcionario modificada</h3>
		<p class="text-center text-xl font-bold">{c.oral?.cargaBaseCalificacionFuncionario}</p>
	</div>
	<div class="rounded-lg bg-gray-100 p-4 shadow-md dark:bg-gray-800">
		<h3 class="text-md mb-2 font-medium">Egreso del funcionario</h3>
		<p class="text-center text-xl font-bold">{c.oral?.egresoFuncionario}</p>
	</div>
	<div class="rounded-lg bg-gray-100 p-4 shadow-md dark:bg-gray-800">
		<h3 class="text-md mb-2 font-medium">Carga proporcional</h3>
		<p class="text-center text-xl font-bold">{c.oral?.cargaProporcional?.toFixed(2)}</p>
	</div>
	<div class="rounded-lg bg-gray-100 p-4 shadow-md dark:bg-gray-800">
		<h3 class="text-md mb-2 font-medium">Subfactor respuesta efectiva</h3>
		<p class="text-center text-xl font-bold">{c.oral?.subfactorRespuestaEfectiva?.toFixed(2)}</p>
	</div>
	<div class="rounded-lg bg-gray-100 p-4 shadow-md dark:bg-gray-800">
		<h3 class="text-md mb-2 font-medium">Calificación audiencias</h3>
		<p class="text-center text-xl font-bold">{c.calificacionAudiencias}</p>
	</div>
	<div class="rounded-lg bg-gray-100 p-4 shadow-md dark:bg-gray-800">
		<h3 class="text-md mb-2 font-medium">Calificación final factor eficiencia</h3>
		<p class="text-center text-xl font-bold text-sky-800">{c.factorEficienciaAudiencias?.toFixed(2)}</p>
	</div>
</div>

<h3 class="bold pt-8 text-2xl font-bold text-slate-800">Garantías</h3>
<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
	<div class="rounded-lg bg-gray-100 p-4 shadow-md dark:bg-gray-800">
		<h3 class="text-md mb-2 font-medium">Total inventario inicial</h3>
		<p class="text-center text-xl font-bold">{c.garantias?.totalInventarioInicial}</p>
	</div>
	<div class="rounded-lg bg-gray-100 p-4 shadow-md dark:bg-gray-800">
		<h3 class="text-md mb-2 font-medium">Carga base del despacho modificada</h3>
		<p class="text-center text-xl font-bold">{c.garantias?.cargaBaseCalificacionDespacho}</p>
	</div>
	<div class="rounded-lg bg-gray-100 p-4 shadow-md dark:bg-gray-800">
		<h3 class="text-md mb-2 font-medium">Carga base del funcionario modificada</h3>
		<p class="text-center text-xl font-bold">{c.garantias?.cargaBaseCalificacionFuncionario}</p>
	</div>
	<div class="rounded-lg bg-gray-100 p-4 shadow-md dark:bg-gray-800">
		<h3 class="text-md mb-2 font-medium">Egreso del funcionario</h3>
		<p class="text-center text-xl font-bold">{c.garantias?.egresoFuncionario}</p>
	</div>
	<div class="rounded-lg bg-gray-100 p-4 shadow-md dark:bg-gray-800">
		<h3 class="text-md mb-2 font-medium">Carga proporcional</h3>
		<p class="text-center text-xl font-bold">{c.garantias?.cargaProporcional?.toFixed(2)}</p>
	</div>
	<div class="rounded-lg bg-gray-100 p-4 shadow-md dark:bg-gray-800">
		<h3 class="text-md mb-2 font-medium">Subfactor garantías</h3>
		<p class="text-center text-xl font-bold text-sky-800">{c.garantias?.subfactorGarantias?.toFixed(2)}</p>
	</div>
</div>
