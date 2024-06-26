<script lang="ts">
	import PageLayout from '$lib/components/custom/page-layout.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { formatDate } from '$lib/utils/dates';
	import { Edit2Icon } from 'lucide-svelte';
	import EditorEstadoCalificacion from './editor-estado-calificacion.svelte';
	import EstadoCalificacion from './estado-calificacion.svelte';
	import NovedadForm from './novedad-form.svelte';
	import NovedadesList from './novedades-list.svelte';
	import RegistroAudienciasForm from './registro-audiencias-form.svelte';
	import { cn } from '$lib/utils/shadcn';
	import FileSaver from 'file-saver';
	import * as XLSX from 'xlsx';

	let { data } = $props();
	const {
		calificacion,
		calificacionesAdicionales,
		despacho,
		diasNoHabiles,
		funcionario,
		novedades,
		funcionariosPeriodo,
		consolidadoOrdinario,
		consolidadoTutelas,
		consolidadoGarantias,
		consolidadoEscrito,
		oral,
		garantias,
		escrito,
		registroAudiencias,
		consolidadoXlsxData
	} = $derived(data);

	const calificacionTotal = $derived(calificacion.calificacionTotalFactorEficiencia.toFixed(2));
	const calificacionPonderada = $derived(calificacion.calificacionPonderada?.toFixed(2) || 0);

	const exportToSpreadsheet = (xlsxData, fileName) => {
		const FILE_TYPE =
			'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8';
		const FILE_EXTENSION = '.xlsx';

		const workSheets = xlsxData.reduce(
			(ws, d) => ({
				...ws,
				[d.name]: XLSX.utils.aoa_to_sheet(d.data)
			}),
			{}
		);
		const workBook = { Sheets: workSheets, SheetNames: xlsxData.map((d) => d.name) };
		const excelBuffer = XLSX.write(workBook, { bookType: 'xlsx', type: 'array' });
		const fileData = new Blob([excelBuffer], { type: FILE_TYPE });
		FileSaver.saveAs(fileData, fileName + FILE_EXTENSION);
	};
</script>

{#snippet header()}
	<div class="text-2xl font-bold">
		<a href="/funcionario/{funcionario.id}">
			{funcionario.nombre}
		</a>
	</div>
{/snippet}

{#snippet tarjetaValor(title, value, isBig = false)}
	<div class="flex flex-col justify-between rounded-lg bg-gray-100 p-4 shadow-md dark:bg-gray-800">
		<h3 class="text-md mb-2 font-medium print:leading-none">{title}</h3>
		<p class={cn('text-center text-xl font-bold', { 'text-3xl text-sky-800': isBig })}>{value}</p>
	</div>
{/snippet}

{#snippet tablaConsolidado(filas)}
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
				{#each filas as fila}
					{@const func = funcionariosPeriodo.find((f) => f.id === fila.funcionarioId)}
					<tr class="border-b border-gray-200 dark:border-gray-700">
						<td
							class={cn('text-nowrap px-2  text-gray-900 dark:text-gray-100', {
								'font-light': calificacion.funcionarioId !== func.id
							})}
						>
							{func?.nombre}
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
						<td class="px-2 text-center text-gray-900 dark:text-gray-100">{fila.inventarioFinal}</td
						>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/snippet}

<PageLayout {header} username={data.user}>
	<div class="container mx-auto px-4">
		<div class="flex flex-row items-center justify-between gap-2 print:hidden">
			<EstadoCalificacion
				estado={calificacion.estado}
				observaciones={calificacion.observacionesDevolucion}
			/>
			<EditorEstadoCalificacion estado={calificacion.estado} />
			<div class="grow"></div>
			{#if calificacion.estado !== 'aprobada'}
				<RegistroAudienciasForm {registroAudiencias} />
				<NovedadForm {diasNoHabiles} />
			{/if}
			<Button
				variant="outline"
				onclick={() => exportToSpreadsheet(consolidadoXlsxData, 'Consolidado')}
			>
				Descargar consolidado
			</Button>
		</div>

		<div class="my-8 space-y-4">
			<div class="flex justify-between font-bold">
				<div class="flex gap-2">
					{despacho.nombre}
				</div>
				<span>Periodo: {calificacion.periodo}</span>
			</div>
			{#if calificacionesAdicionales.length > 0}
				<div>Calificaciones de otros despachos en el periodo.</div>
				{#each calificacionesAdicionales as adicional}
					<a href="/calificacion/{adicional.id}" class="text-sky-800 underline">
						{adicional.despacho.nombre}
					</a>
				{/each}
			{/if}
		</div>

		<h1 class="hidden text-3xl font-bold print:block">{funcionario.nombre}</h1>
		<div class="flex flex-row gap-2">
			{@render tarjetaValor('Calificación factor eficiencia', calificacionTotal, true)}
			{#if calificacionTotal !== calificacionPonderada && calificacionPonderada !== 0}
				{@render tarjetaValor('Calificación ponderada', calificacionPonderada, true)}
			{/if}
		</div>

		<div
			class="grid grid-cols-1 gap-4 pt-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 print:grid-cols-6"
		>
			{@render tarjetaValor('Carga efectiva total', calificacion.cargaEfectivaTotal)}
			{@render tarjetaValor('Egreso efectivo total', calificacion.egresoEfectivoTotal)}
		</div>

		<h3 class="bold pt-8 text-2xl font-bold text-slate-800">Novedades</h3>
		<div
			class="grid grid-cols-1 gap-4 pt-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 print:grid-cols-6"
		>
			{@render tarjetaValor('Días habiles del despacho', calificacion.diasHabilesDespacho)}
			{@render tarjetaValor('Días descontados', calificacion.diasDescontados)}
			{@render tarjetaValor('Días laborados', calificacion.diasLaborados)}
		</div>

		<div class="pt-4">
			<NovedadesList {novedades} />
		</div>

		<h3 class="bold pt-8 text-2xl font-bold text-slate-800">Oral</h3>

		<h3 class="bold break-before-all pt-8 text-xl font-bold text-slate-800">Procesos</h3>
		{@render tablaConsolidado(consolidadoOrdinario)}

		<h3 class="bold pt-8 text-xl font-bold text-slate-800">Tutelas e incidentes</h3>
		{@render tablaConsolidado(consolidadoTutelas)}

		<div
			class="grid grid-cols-1 gap-4 pt-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 print:grid-cols-7"
		>
			{@render tarjetaValor('Total inventario inicial', oral?.totalInventarioInicial)}
			{@render tarjetaValor(
				'Carga base del despacho modificada',
				oral?.cargaBaseCalificacionDespacho
			)}
			{@render tarjetaValor(
				'Carga base del funcionario modificada',
				oral?.cargaBaseCalificacionFuncionario
			)}
			{@render tarjetaValor('Egreso del funcionario', oral?.egresoFuncionario)}
			{@render tarjetaValor('Carga proporcional', oral?.cargaProporcional.toFixed(2))}
			{@render tarjetaValor('Subfactor respuesta efectiva', oral?.totalSubfactor.toFixed(2))}
			{@render tarjetaValor(
				'Calificación eficiencia + audiencias',
				calificacion.factorOralMasAudiencias.toFixed(2),
				true
			)}
		</div>

		{#if consolidadoGarantias.length > 0}
			<h3 class="bold pt-8 text-2xl font-bold text-slate-800">Garantías</h3>
			{@render tablaConsolidado(consolidadoGarantias)}

			<div
				class="grid grid-cols-1 gap-4 pt-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 print:grid-cols-6"
			>
				{@render tarjetaValor('Total inventario inicial', garantias?.totalInventarioInicial)}
				{@render tarjetaValor(
					'Carga base del despacho modificada',
					garantias?.cargaBaseCalificacionDespacho
				)}
				{@render tarjetaValor(
					'Carga base del funcionario modificada',
					garantias?.cargaBaseCalificacionFuncionario
				)}
				{@render tarjetaValor('Egreso del funcionario', garantias?.egresoFuncionario)}
				{@render tarjetaValor('Carga proporcional', garantias?.cargaProporcional.toFixed(2))}
				{@render tarjetaValor('Subfactor garantias', garantias?.totalSubfactor.toFixed(2), true)}
			</div>
		{/if}

		{#if consolidadoEscrito.length > 0}
			<h3 class="bold pt-8 text-2xl font-bold text-slate-800">Escritural</h3>

			{@render tablaConsolidado(consolidadoEscrito)}

			<div
				class="grid grid-cols-1 gap-4 pt-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 print:grid-cols-6"
			>
				{@render tarjetaValor('Total inventario inicial', escrito?.totalInventarioInicial)}
				{@render tarjetaValor(
					'Carga base del despacho modificada',
					escrito?.cargaBaseCalificacionDespacho
				)}
				{@render tarjetaValor(
					'Carga base del funcionario modificada',
					escrito?.cargaBaseCalificacionFuncionario
				)}
				{@render tarjetaValor('Egreso del funcionario', escrito?.egresoFuncionario)}
				{@render tarjetaValor('Carga proporcional', escrito?.cargaProporcional.toFixed(2))}
				{@render tarjetaValor('Subfactor escritural', escrito?.totalSubfactor.toFixed(2), true)}
			</div>
		{/if}

		<h3 class="bold pt-8 text-2xl font-bold text-slate-800">Audiencias</h3>
		<div
			class="grid grid-cols-1 gap-4 pt-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 print:grid-cols-6"
		>
			{@render tarjetaValor('Programadas', registroAudiencias.programadas)}
			{@render tarjetaValor('Realizadas', registroAudiencias.atendidas)}
			{@render tarjetaValor('Aplazadas por causas ajenas', registroAudiencias.aplazadasAjenas)}
			{@render tarjetaValor(
				'Aplazadas con justificación',
				registroAudiencias.aplazadasJustificadas
			)}
			{@render tarjetaValor(
				'Aplazadas sin justificación',
				registroAudiencias.aplazadasNoJustificadas
			)}
			{@render tarjetaValor(
				'Calificación de audiencias',
				calificacion.calificacionAudiencias.toFixed(2),
				true
			)}
		</div>
	</div>
</PageLayout>
