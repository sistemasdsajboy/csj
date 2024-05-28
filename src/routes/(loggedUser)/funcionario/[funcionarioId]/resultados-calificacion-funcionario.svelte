<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import { formatDate } from '$lib/utils/dates';
	import type { PageData } from './$types';
	import NovedadesList from './novedades-list.svelte';

	export let data: PageData;

	const c = data.calificacion;
</script>

<h1 class="hidden text-3xl font-bold print:block">{data.funcionario?.nombre}</h1>
<h2 class="bold pt-8 text-2xl font-bold text-slate-800">
	Calificación factor eficiencia o rendimiento {data.calificacion.periodo}
</h2>
<h3 class="bold pt-8 text-2xl font-bold text-sky-800">
	{c.calificacionTotalFactorEficiencia?.toFixed(2)}
</h3>

<h3 class="bold pt-8 text-2xl font-bold text-slate-800">Novedades</h3>
<div class="grid grid-cols-1 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 print:grid-cols-6">
	<div class="rounded-lg bg-gray-100 p-4 shadow-md dark:bg-gray-800">
		<h3 class="text-md mb-2 font-medium print:leading-none">Días hábiles del despacho</h3>
		<p class="text-center text-xl font-bold">{c.diasHabilesDespacho}</p>
	</div>
	<div class="rounded-lg bg-gray-100 p-4 shadow-md dark:bg-gray-800">
		<h3 class="text-md mb-2 font-medium print:leading-none">Días descontados</h3>
		<p class="text-center text-xl font-bold">{c.diasDescontados}</p>
	</div>
	<div class="rounded-lg bg-gray-100 p-4 shadow-md dark:bg-gray-800">
		<h3 class="text-md mb-2 font-medium print:leading-none">Días laborados</h3>
		<p class="text-center text-xl font-bold">{c.diasHabilesLaborados}</p>
	</div>
</div>

<div class="pt-4">
	<NovedadesList novedades={data.funcionario.novedades} />
</div>

<h3 class="bold break-before-all pt-8 text-2xl font-bold text-slate-800">
	Consolidado de procesos
</h3>
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
<div class="grid grid-cols-1 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 print:grid-cols-7">
	<div class="rounded-lg bg-gray-100 p-4 shadow-md dark:bg-gray-800">
		<h3 class="text-md mb-2 font-medium print:leading-none">Total inventario inicial</h3>
		<p class="text-center text-xl font-bold">{c.oral?.totalInventarioInicial}</p>
	</div>
	<div class="rounded-lg bg-gray-100 p-4 shadow-md dark:bg-gray-800">
		<h3 class="text-md mb-2 font-medium print:leading-none">Carga base del despacho modificada</h3>
		<p class="text-center text-xl font-bold">{c.oral?.cargaBaseCalificacionDespacho}</p>
	</div>
	<div class="rounded-lg bg-gray-100 p-4 shadow-md dark:bg-gray-800">
		<h3 class="text-md mb-2 font-medium print:leading-none">
			Carga base del funcionario modificada
		</h3>
		<p class="text-center text-xl font-bold">{c.oral?.cargaBaseCalificacionFuncionario}</p>
	</div>
	<div class="rounded-lg bg-gray-100 p-4 shadow-md dark:bg-gray-800">
		<h3 class="text-md mb-2 font-medium print:leading-none">Egreso del funcionario</h3>
		<p class="text-center text-xl font-bold">{c.oral?.egresoFuncionario}</p>
	</div>
	<div class="rounded-lg bg-gray-100 p-4 shadow-md dark:bg-gray-800">
		<h3 class="text-md mb-2 font-medium print:leading-none">Carga proporcional</h3>
		<p class="text-center text-xl font-bold">{c.oral?.cargaProporcional?.toFixed(2)}</p>
	</div>
	<div class="rounded-lg bg-gray-100 p-4 shadow-md dark:bg-gray-800">
		<h3 class="text-md mb-2 font-medium print:leading-none">Subfactor respuesta efectiva</h3>
		<p class="text-center text-xl font-bold">{c.oral?.subfactorRespuestaEfectiva?.toFixed(2)}</p>
	</div>
	<div class="rounded-lg bg-gray-100 p-4 shadow-md dark:bg-gray-800">
		<h3 class="text-md mb-2 font-medium print:leading-none">
			Calificación final factor eficiencia
		</h3>
		<p class="text-center text-xl font-bold text-sky-800">
			{c.factorEficienciaAudiencias?.toFixed(2)}
		</p>
	</div>
</div>

<h3 class="bold pt-8 text-2xl font-bold text-slate-800">Garantías</h3>
<div class="grid grid-cols-1 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 print:grid-cols-6">
	<div class="rounded-lg bg-gray-100 p-4 shadow-md dark:bg-gray-800">
		<h3 class="text-md mb-2 font-medium print:leading-none">Total inventario inicial</h3>
		<p class="text-center text-xl font-bold">{c.garantias?.totalInventarioInicial}</p>
	</div>
	<div class="rounded-lg bg-gray-100 p-4 shadow-md dark:bg-gray-800">
		<h3 class="text-md mb-2 font-medium print:leading-none">Carga base del despacho modificada</h3>
		<p class="text-center text-xl font-bold">{c.garantias?.cargaBaseCalificacionDespacho}</p>
	</div>
	<div class="rounded-lg bg-gray-100 p-4 shadow-md dark:bg-gray-800">
		<h3 class="text-md mb-2 font-medium print:leading-none">
			Carga base del funcionario modificada
		</h3>
		<p class="text-center text-xl font-bold">{c.garantias?.cargaBaseCalificacionFuncionario}</p>
	</div>
	<div class="rounded-lg bg-gray-100 p-4 shadow-md dark:bg-gray-800">
		<h3 class="text-md mb-2 font-medium print:leading-none">Egreso del funcionario</h3>
		<p class="text-center text-xl font-bold">{c.garantias?.egresoFuncionario}</p>
	</div>
	<div class="rounded-lg bg-gray-100 p-4 shadow-md dark:bg-gray-800">
		<h3 class="text-md mb-2 font-medium print:leading-none">Carga proporcional</h3>
		<p class="text-center text-xl font-bold">{c.garantias?.cargaProporcional?.toFixed(2)}</p>
	</div>
	<div class="rounded-lg bg-gray-100 p-4 shadow-md dark:bg-gray-800">
		<h3 class="text-md mb-2 font-medium print:leading-none">Subfactor garantías</h3>
		<p class="text-center text-xl font-bold text-sky-800">
			{c.garantias?.subfactorGarantias?.toFixed(2)}
		</p>
	</div>
</div>

<h3 class="bold pt-8 text-2xl font-bold text-slate-800">Audiencias</h3>
<div class="grid grid-cols-1 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 print:grid-cols-6">
	<div class="rounded-lg bg-gray-100 p-4 shadow-md dark:bg-gray-800">
		<h3 class="text-md mb-2 font-medium print:leading-none">Programadas</h3>
		<p class="text-center text-xl font-bold">{c.audiencias?.programadas}</p>
	</div>
	<div class="rounded-lg bg-gray-100 p-4 shadow-md dark:bg-gray-800">
		<h3 class="text-md mb-2 font-medium print:leading-none">Realizadas</h3>
		<p class="text-center text-xl font-bold">{c.audiencias?.atendidas}</p>
	</div>
	<div class="rounded-lg bg-gray-100 p-4 shadow-md dark:bg-gray-800">
		<h3 class="text-md mb-2 font-medium print:leading-none">Aplazadas por causas ajenas</h3>
		<p class="text-center text-xl font-bold">{c.audiencias?.aplazadasAjenas}</p>
	</div>
	<div class="rounded-lg bg-gray-100 p-4 shadow-md dark:bg-gray-800">
		<h3 class="text-md mb-2 font-medium print:leading-none">Aplazadas con justificación</h3>
		<p class="text-center text-xl font-bold">{c.audiencias?.aplazadasJustificadas}</p>
	</div>
	<div class="rounded-lg bg-gray-100 p-4 shadow-md dark:bg-gray-800">
		<h3 class="text-md mb-2 font-medium print:leading-none">Aplazadas sin justificación</h3>
		<p class="text-center text-xl font-bold">{c.audiencias?.aplazadasNoJustificadas}</p>
	</div>
	<div class="rounded-lg bg-gray-100 p-4 shadow-md dark:bg-gray-800">
		<h3 class="text-md mb-2 font-medium print:leading-none">Calificación audiencias</h3>
		<p class="text-center text-xl font-bold text-sky-800">{c.calificacionAudiencias}</p>
	</div>
</div>
