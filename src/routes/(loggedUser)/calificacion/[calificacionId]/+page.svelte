<script lang="ts">
	import PageLayout from '$lib/components/custom/page-layout.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { formatDate } from '$lib/utils/dates';
	import { cn } from '$lib/utils/shadcn';
	import { exportToSpreadsheet } from '$lib/utils/xlsx';
	import EditorEstadoCalificacion from './editor-estado-calificacion.svelte';
	import EstadoCalificacion from './estado-calificacion.svelte';
	import NovedadForm from './novedad-form.svelte';
	import NovedadesList from './novedades-list.svelte';
	import Observaciones from './observaciones.svelte';
	import RegistroAudienciasForm from './registro-audiencias-form.svelte';

	let { data } = $props();
	const {
		calificacion,
		calificacionesAdicionales,
		despacho,
		diasNoHabiles,
		funcionario,
		novedades,
		consolidadoOrdinario,
		consolidadoTutelas,
		consolidadoGarantias,
		consolidadoEscrito,
		oral,
		garantias,
		escrito,
		registroAudiencias,
		consolidadoXlsxData,
		despachos,
		capacidadMaxima,
	} = $derived(data);

	const calificacionTotal = $derived(calificacion.calificacionTotalFactorEficiencia.toFixed(2));
	const calificacionPonderada = $derived(calificacion.calificacion.calificacionPonderada.toFixed(2) || 0);

	const mostrarTablaTutelas = $derived(consolidadoTutelas.length > 0 && consolidadoTutelas.some((c) => c.cargaEfectiva > 0));
	const mostrarTablaOral = $derived(consolidadoOrdinario.length > 0 && consolidadoOrdinario.some((c) => c.cargaEfectiva > 0));
	const mostrarTablaEscrito = $derived(consolidadoEscrito.length > 0 && consolidadoEscrito.some((c) => c.cargaEfectiva > 0));
</script>

{#snippet header()}
	<div>Calificación</div>
{/snippet}

{#snippet tarjetaValor(title, value)}
	<div class="flex flex-col justify-between rounded-lg bg-gray-100 p-4 shadow-md dark:bg-gray-800">
		<h3 class="text-md mb-2 font-medium print:leading-none">{title}</h3>
		<p class="text-center text-xl font-bold">{value}</p>
	</div>
{/snippet}

{#snippet tarjetaValorResaltado(title, value)}
	<div class="flex flex-col justify-between rounded-lg bg-gray-100 p-4 shadow-md dark:bg-gray-800">
		<h3 class="text-md mb-2 font-medium print:leading-none">{title}</h3>
		<p class="text-center text-3xl font-bold text-sky-800">{value}</p>
	</div>
{/snippet}

{#snippet tablaConsolidado(titulo, filas)}
	<h3 class="bold pt-8 text-2xl font-bold text-slate-800">{titulo}</h3>
	<div class="overflow-x-auto">
		<table class="w-full table-auto border-collapse">
			<thead>
				<tr class="bg-gray-100 dark:bg-gray-800">
					<th class="px-2 py-2 text-center font-medium text-gray-700 dark:text-gray-300"> Funcionario </th>
					<th class="px-2 py-2 text-center font-medium text-gray-700 dark:text-gray-300"> Periodo </th>
					<th class="px-2 py-2 text-center font-medium text-gray-700 dark:text-gray-300"> Días hábiles </th>
					<th class="px-2 py-2 text-center font-medium text-gray-700 dark:text-gray-300"> Inventario Inicial </th>
					<th class="px-2 py-2 text-center font-medium text-gray-700 dark:text-gray-300"> Ingresos Efectivos </th>
					<th class="px-2 py-2 text-center font-medium text-gray-700 dark:text-gray-300"> Carga Efectiva </th>
					<th class="px-2 py-2 text-center font-medium text-gray-700 dark:text-gray-300"> Egresos Efectivos </th>
					<th class="px-2 py-2 text-center font-medium text-gray-700 dark:text-gray-300"> Conciliaciones </th>
					<th class="px-2 py-2 text-center font-medium text-gray-700 dark:text-gray-300"> Inventario Final </th>
				</tr>
			</thead>
			<tbody>
				{#each filas as fila}
					<tr class="border-b border-gray-200">
						<td
							class={cn('text-nowrap px-2 text-gray-900 ', {
								'font-light': fila.funcionario.id !== calificacion.calificacion.funcionarioId,
							})}
						>
							{fila.funcionario.nombre}
						</td>
						<td class="px-2 text-center text-gray-900">
							<Badge variant="secondary" class="whitespace-nowrap">{formatDate(fila.desde)} - {formatDate(fila.hasta)}</Badge>
						</td>
						<td class="px-2 text-center text-sky-800">{fila.dias}</td>
						<td class="px-2 text-center text-gray-900">{fila.inventarioInicial}</td>
						<td class="px-2 text-center text-gray-900">{fila.ingresoEfectivo}</td>
						<td class="px-2 text-center text-gray-900">{fila.cargaEfectiva}</td>
						<td class="px-2 text-center text-gray-900">{fila.egresoEfectivo}</td>
						<td class="px-2 text-center text-gray-900">{fila.conciliaciones}</td>
						<td class="px-2 text-center text-gray-900">{fila.inventarioFinal}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/snippet}

<PageLayout {header} username={data.user}>
	<div class="container mx-auto space-y-4 px-4">
		<div class="flex flex-row items-center justify-between gap-2 print:hidden">
			<EditorEstadoCalificacion
				estado={calificacion.calificacion.estado}
				{despachos}
				calificadorId={calificacion.calificacion.despachoSeccionalId}
			/>
			<Observaciones observaciones={calificacion.calificacion.observaciones} />
			<Button variant="outline" onclick={() => exportToSpreadsheet(consolidadoXlsxData, 'Consolidado')}>Descargar consolidado</Button>
			<div class="grow"></div>
			<EstadoCalificacion estado={calificacion.calificacion.estado} />
		</div>

		<div>
			<div class="flex justify-between text-2xl font-bold">
				<div>
					<a href="/funcionario/{funcionario.id}" class="text-3xl">
						{funcionario.nombre}
					</a>
					<div class="text-2xl">{funcionario.documento}</div>
				</div>
				<div>
					<span>Periodo: </span>
					<span class="text-sky-800">{calificacion.calificacion.periodo}</span>
				</div>
			</div>

			<h3 class="bold pt-8 text-2xl font-bold text-slate-800">
				{#if calificacionesAdicionales.length > 0}
					Despachos
				{:else}
					Despacho
				{/if}
			</h3>
			<div class="font-bold">
				<div>{despacho.codigo} - {despacho.nombre}</div>
				{#each calificacionesAdicionales as adicional}
					<div>
						<a href="?despacho={adicional.despacho.id}" class="text-sky-800 underline">
							{adicional.despacho.codigo} - {adicional.despacho.nombre}
						</a>
					</div>
				{/each}
			</div>
		</div>

		<h3 class="bold text-2xl font-bold text-slate-800">Totales</h3>
		<div class="flex flex-row gap-2">
			{@render tarjetaValorResaltado('Calificación factor eficiencia', calificacionTotal)}
			{#if calificacionTotal !== calificacionPonderada && calificacionPonderada !== 0}
				{@render tarjetaValorResaltado('Calificación ponderada', calificacionPonderada)}
			{/if}
		</div>

		<div class="grid grid-cols-1 gap-4 pt-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 print:grid-cols-6">
			{@render tarjetaValor('Carga efectiva total', calificacion.cargaEfectivaTotal)}
			{@render tarjetaValor('Egreso efectivo total', calificacion.egresoEfectivoTotal)}
			{#if capacidadMaxima?.cantidad}
				{@render tarjetaValor('Capacidad máxima de respuesta', capacidadMaxima?.cantidad)}
			{/if}
		</div>

		<div class="flex flex-row items-end justify-between">
			<h3 class="bold pt-8 text-2xl font-bold text-slate-800">Novedades</h3>
			{#if calificacion.calificacion.estado !== 'aprobada'}
				<NovedadForm {diasNoHabiles} despachoId={calificacion.despachoId} />
			{/if}
		</div>

		<div>
			<NovedadesList {novedades} />
		</div>

		<div class="grid grid-cols-1 gap-4 pt-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 print:grid-cols-6">
			{@render tarjetaValor('Días habiles del despacho', calificacion.diasHabilesDespacho)}
			{#if calificacion.diasLaborables && calificacion.diasHabilesDespacho !== calificacion.diasLaborables && calificacion.diasLaborados !== calificacion.diasLaborables}
				{@render tarjetaValor('Días laborables', calificacion.diasLaborables)}
			{/if}
			{@render tarjetaValor('Días descontados', calificacion.diasDescontados)}
			{@render tarjetaValor('Días laborados', calificacion.diasLaborados)}
		</div>

		{#if mostrarTablaTutelas}
			{@render tablaConsolidado('Tutelas e incidentes', consolidadoTutelas)}
		{/if}

		{#if mostrarTablaOral}
			{@render tablaConsolidado('Oral', consolidadoOrdinario)}
		{/if}

		{#if mostrarTablaOral || (mostrarTablaTutelas && !mostrarTablaEscrito)}
			<div class="grid grid-cols-1 gap-4 pt-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 print:grid-cols-7">
				{@render tarjetaValor('Total inventario inicial', oral?.totalInventarioInicial)}
				{@render tarjetaValor('Carga base del despacho modificada', oral?.cargaBaseCalificacionDespacho)}
				{@render tarjetaValor('Carga base del funcionario modificada', oral?.cargaBaseCalificacionFuncionario)}
				{@render tarjetaValor('Egreso del funcionario', oral?.egresoFuncionario)}
				{@render tarjetaValor('Carga proporcional', oral?.cargaProporcional.toFixed(2))}
				{@render tarjetaValor('Subfactor respuesta efectiva', oral?.totalSubfactor.toFixed(2))}
				{@render tarjetaValorResaltado('Calificación eficiencia + audiencias', calificacion.factorOralMasAudiencias.toFixed(2))}
			</div>
		{/if}

		{#if consolidadoGarantias.length > 0 && consolidadoGarantias.some((c) => c.cargaEfectiva > 0)}
			{@render tablaConsolidado('Garantías', consolidadoGarantias)}

			<div class="grid grid-cols-1 gap-4 pt-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 print:grid-cols-6">
				{@render tarjetaValor('Total inventario inicial', garantias?.totalInventarioInicial)}
				{@render tarjetaValor('Carga base del despacho modificada', garantias?.cargaBaseCalificacionDespacho)}
				{@render tarjetaValor('Carga base del funcionario modificada', garantias?.cargaBaseCalificacionFuncionario)}
				{@render tarjetaValor('Egreso del funcionario', garantias?.egresoFuncionario)}
				{@render tarjetaValor('Carga proporcional', garantias?.cargaProporcional.toFixed(2))}
				{@render tarjetaValorResaltado('Subfactor garantias', garantias?.totalSubfactor.toFixed(2))}
			</div>
		{/if}

		{#if mostrarTablaEscrito}
			{@render tablaConsolidado('Escrito', consolidadoEscrito)}

			<div class="grid grid-cols-1 gap-4 pt-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 print:grid-cols-6">
				{@render tarjetaValor('Total inventario inicial', escrito?.totalInventarioInicial)}
				{@render tarjetaValor('Carga base del despacho modificada', escrito?.cargaBaseCalificacionDespacho)}
				{@render tarjetaValor('Carga base del funcionario modificada', escrito?.cargaBaseCalificacionFuncionario)}
				{@render tarjetaValor('Egreso del funcionario', escrito?.egresoFuncionario)}
				{@render tarjetaValor('Carga proporcional', escrito?.cargaProporcional.toFixed(2))}
				{@render tarjetaValorResaltado('Subfactor escrito', escrito?.totalSubfactor.toFixed(2))}
			</div>
		{/if}

		<div class="flex flex-row items-end justify-between">
			<h3 class="bold pt-8 text-2xl font-bold text-slate-800">Audiencias</h3>
			{#if calificacion.calificacion.estado !== 'aprobada'}
				<RegistroAudienciasForm {registroAudiencias} />
			{/if}
		</div>
		<div class="grid grid-cols-1 gap-4 pt-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 print:grid-cols-6">
			{@render tarjetaValor('Programadas', registroAudiencias.programadas)}
			{@render tarjetaValor('Realizadas', registroAudiencias.atendidas)}
			{@render tarjetaValor('Aplazadas por causas ajenas', registroAudiencias.aplazadasAjenas)}
			{@render tarjetaValor('Aplazadas con justificación', registroAudiencias.aplazadasJustificadas)}
			{@render tarjetaValor('Aplazadas sin justificación', registroAudiencias.aplazadasNoJustificadas)}
			{@render tarjetaValorResaltado('Calificación de audiencias', calificacion.calificacionAudiencias.toFixed(2))}
		</div>
	</div>
</PageLayout>
