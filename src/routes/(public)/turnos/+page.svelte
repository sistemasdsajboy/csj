<!-- 
GENERACIÓN DE TURNOS DE HABEAS CORPUS
- Fecha inicial y final
- Listado de nombres de funcionarios (Ordenar alfabéticamente por apellido)
- Nombre del funcionario que tendrá el primer turno
- Duración del periodo asignado: Diario/Semanal
- Asignaciones manuales de días. Algunas asignaciones serían compensables y otras no (ej: semana santa para magistrados distrito de Tunja).

- Asegurar una distribución equitativa de puentes festivos (fin de semana y día festívo), días festivos (días festivos diferentes a viernes o lunes)
 -->

<script lang="ts">
	import PageLayout from '$lib/components/custom/page-layout.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { abreviacionesDias, dateIsHoliday, dateIsWeekend, festivosPorMes, nombresMeses, utcDate } from '$lib/utils/dates';
	import { cn } from '$lib/utils/shadcn';
	import { exportToSpreadsheet } from '$lib/utils/xlsx.js';
	import { FileSpreadsheetIcon, PinIcon, XIcon } from 'lucide-svelte';

	const { form, data } = $props();
	const valores = $state(form?.form || data.form);
	const funcionarios = $derived(valores.funcionarios?.split('\n').map((funcionario = '') => funcionario.trim()));
	const asignaciones = $derived(JSON.stringify(valores.asignaciones));
	const exclusiones = $derived(JSON.stringify(valores.exclusiones));
	let herramientaClick = $state<'asignacion' | 'exclusion'>('exclusion');

	function toggleAsignacionExclusion(fecha: string, funcionario: string) {
		if (herramientaClick === 'asignacion') {
			if (valores.asignaciones[fecha]?.funcionario !== funcionario) valores.asignaciones[fecha] = { funcionario, tipo: 'compensada' };
			else if (valores.asignaciones[fecha].funcionario === funcionario && valores.asignaciones[fecha].tipo === 'compensada')
				valores.asignaciones[fecha] = { funcionario, tipo: 'no-compensada' };
			else if (valores.asignaciones[fecha].funcionario === funcionario && valores.asignaciones[fecha].tipo === 'no-compensada')
				delete valores.asignaciones[fecha];

			if (valores.exclusiones[fecha]?.includes(funcionario))
				if (valores.exclusiones[fecha].length === 1) delete valores.exclusiones[fecha];
				else valores.exclusiones[fecha] = valores.exclusiones[fecha].filter((f) => f !== funcionario);
		}

		if (herramientaClick === 'exclusion') {
			if (valores.exclusiones[fecha]?.includes(funcionario))
				if (valores.exclusiones[fecha].length === 1) delete valores.exclusiones[fecha];
				else valores.exclusiones[fecha] = valores.exclusiones[fecha].filter((f) => f !== funcionario);
			else valores.exclusiones[fecha] = [...(valores.exclusiones[fecha] || []), funcionario];

			if (valores.asignaciones[fecha].funcionario === funcionario) delete valores.asignaciones[fecha];
		}
	}

	const diasPorMes = $derived(
		Object.entries(form?.turnos || {}).reduce(
			(acc, [fecha]) => {
				const [_, mes] = fecha.split('-').map(Number);
				acc[mes] = (acc[mes] || 0) + 1;
				return acc;
			},
			{} as Record<number, number>
		)
	);
</script>

{#snippet header()}
	<div class="text-2xl font-bold">Asignación de turnos</div>
{/snippet}

<PageLayout {header} username={data.user || ''}>
	<div class="flex flex-col items-start gap-2">
		<form method="post" class="grid w-1/3 grid-cols-[120px_1fr] items-center gap-2">
			<Label for="fechaInicial">Fecha inicial</Label>
			<Input type="date" id="fechaInicial" name="fechaInicial" required value={valores.fechaInicial} class="w-36" />
			<Label for="fechaFinal">Fecha final</Label>
			<Input type="date" id="fechaFinal" name="fechaFinal" required value={valores.fechaFinal} class="w-36" />
			<Label for="funcionarios">Nombres</Label>
			<textarea name="funcionarios" id="funcionarios" rows={5} required value={valores.funcionarios}></textarea>
			<Label for="funcionarioPrimerTurno">Primer turno</Label>
			<Input name="funcionarioPrimerTurno" id="funcionarioPrimerTurno" value={valores.funcionarioPrimerTurno} />
			<Label for="duracionPeriodo">Periodicidad</Label>
			<select name="duracionPeriodo" id="duracionPeriodo" required value={valores.duracionPeriodo}>
				<option value="diario">Diario</option>
				<option value="diario-festivos">Solo festivos</option>
				<option value="semanal">Semanal</option>
			</select>
			<Input type="hidden" name="asignaciones" value={asignaciones} />
			<Input type="hidden" name="exclusiones" value={exclusiones} />
			<Button type="submit" class="col-span-2">Generar turnos</Button>
		</form>

		{#if form && form.success && form.turnos}
			<div class="flex w-full flex-row justify-end gap-2">
				<Button
					onclick={() => (herramientaClick = herramientaClick === 'asignacion' ? 'exclusion' : 'asignacion')}
					variant="outline"
					class="self-end"
				>
					{#if herramientaClick === 'asignacion'}
						<PinIcon class="h-6 w-6" /><span> Asignar</span>
					{:else}
						<XIcon class="h-6 w-6" /><span>Excluir</span>
					{/if}
				</Button>

				{#if form?.turnosXlsxData}
					<Button variant="outline" onclick={() => exportToSpreadsheet(form.turnosXlsxData, 'Turnos')}>
						<FileSpreadsheetIcon class="h-6 w-6" /><span> Descargar</span>
					</Button>
				{/if}
			</div>
		{/if}

		{#if form && !form.success}
			<p>{form?.message}</p>
		{/if}

		{#if funcionarios && form && form.success && form.turnos}
			<div class="w-full overflow-auto border border-slate-300 leading-tight">
				<table>
					<thead>
						<tr>
							<th colspan="3"></th>
							{#each Object.entries(diasPorMes) as [mes, dias]}
								<th class="odd:bg-slate-50 even:bg-slate-200" colspan={dias}>{nombresMeses[mes]}</th>
							{/each}
						</tr>
					</thead>
					<thead>
						<tr>
							<th colspan="3"></th>
							{#each Object.entries(form.turnos) as [fecha]}
								<th
									class={cn({
										'bg-amber-500 text-red-800': dateIsHoliday(festivosPorMes, new Date(fecha)),
										'bg-amber-300 text-amber-800 ': dateIsWeekend(new Date(fecha)),
									})}>{abreviacionesDias[utcDate(new Date(fecha)).getDay()]}</th
								>
							{/each}
						</tr>
					</thead>
					<thead class="border-b border-slate-400">
						<tr>
							<th>Funcionario / Fecha</th>
							<th>Total días</th>
							<th>Días festivos</th>
							{#each Object.entries(form.turnos) as [fecha]}
								<th
									class={cn({
										'bg-amber-500 text-red-800': dateIsHoliday(festivosPorMes, new Date(fecha)),
										'bg-amber-300 text-amber-800 ': dateIsWeekend(new Date(fecha)),
									})}>{fecha.slice(8, 10)}</th
								>
							{/each}
						</tr>
					</thead>

					<tbody>
						{#each funcionarios as funcionario}
							<tr class="transition-colors hover:bg-slate-300">
								<td class="whitespace-nowrap">{funcionario}</td>
								<td class="text-center">{form.conteoPeriodos[funcionario]}</td>
								<td class="text-center">{form.conteoFestivos[funcionario]}</td>
								{#each Object.entries(form.turnos) as [fecha, funcTurno]}
									<td
										class={cn(
											{
												'bg-amber-500 bg-opacity-50': dateIsHoliday(festivosPorMes, new Date(fecha)),
												'bg-amber-300 bg-opacity-50': dateIsWeekend(new Date(fecha)),
												'rounded-sm bg-green-500 bg-opacity-80': funcTurno === funcionario,
											},
											'text-center hover:bg-sky-500'
										)}
										onclick={() => toggleAsignacionExclusion(fecha, funcionario)}
									>
										<span>
											{valores.asignaciones[fecha]?.tipo === 'no-compensada' && valores.asignaciones[fecha]?.funcionario === funcionario
												? 'SC'
												: ''}
										</span>
										<span>
											{valores.asignaciones[fecha]?.tipo === 'compensada' && valores.asignaciones[fecha]?.funcionario === funcionario
												? 'C'
												: ''}
										</span>
										<span>
											{valores.exclusiones[fecha]?.includes(funcionario) ? 'EX' : ''}
										</span>
									</td>
								{/each}
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>
</PageLayout>
