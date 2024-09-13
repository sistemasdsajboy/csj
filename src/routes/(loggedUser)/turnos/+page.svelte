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
	import { dateIsHoliday, dateIsWeekend, festivosPorMes } from '$lib/utils/dates';
	import { cn } from '$lib/utils/shadcn';
	import { exportToSpreadsheet } from '$lib/utils/xlsx.js';
	import { FileSpreadsheetIcon, PinIcon, XIcon } from 'lucide-svelte';

	const { form, data } = $props();
	const valores = $state(form?.form || data.form);
	const funcionarios = $derived(valores.funcionarios?.split('\n').map((funcionario) => funcionario.trim()));
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
</script>

{#snippet header()}
	<div class="text-2xl font-bold">Asignación de turnos</div>
{/snippet}

<PageLayout {header} username={data.user}>
	<div class="flex flex-col items-start gap-2">
		<form method="post" class="grid w-1/3 grid-cols-[120px_1fr] items-center gap-2">
			<Label for="fechaInicial">Fecha inicial</Label>
			<Input type="date" id="fechaInicial" name="fechaInicial" required value={valores.fechaInicial} class="w-36" />
			<Label for="fechaFinal">Fecha final</Label>
			<Input type="date" id="fechaFinal" name="fechaFinal" required value={valores.fechaFinal} class="w-36" />
			<Label for="funcionarios">Nombres</Label>
			<textarea name="funcionarios" id="funcionarios" rows={5} required value={valores.funcionarios}></textarea>
			<Label for="funcionarioPrimerTurno">Primer turno</Label>
			<Input name="funcionarioPrimerTurno" id="funcionarioPrimerTurno" required value={valores.funcionarioPrimerTurno} />
			<Label for="duracionPeriodo">Periodocidad</Label>
			<select name="duracionPeriodo" id="duracionPeriodo" required value={valores.duracionPeriodo}>
				<option value="diario">Diario</option>
				<option value="semanal">Semanal</option>
			</select>
			<Input type="hidden" name="asignaciones" value={asignaciones} />
			<Input type="hidden" name="exclusiones" value={exclusiones} />
			<Button type="submit" class="col-span-2">Generar turnos</Button>
		</form>

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

		{#if form && !form.success}
			<p>{form?.message}</p>
		{/if}

		{#if funcionarios && form && form.success && form.turnos}
			<div class="w-full overflow-auto border border-slate-300">
				<table>
					<thead>
						<tr>
							<th>Funcionario / Fecha</th>
							<th>Total días</th>
							<th>Días festivos</th>
							<th>Puentes</th>
							<th>No puentes</th>
							{#each Object.entries(form.turnos) as [fecha]}
								<th
									class={cn({
										'bg-amber-500 text-red-800': dateIsHoliday(festivosPorMes, new Date(fecha)),
										'bg-amber-300 text-amber-800 ': dateIsWeekend(new Date(fecha)),
									})}>{fecha.slice(5, 10)}</th
								>
							{/each}
						</tr>
					</thead>
					<tbody>
						{#each funcionarios as funcionario}
							<tr>
								<td class="whitespace-nowrap">{funcionario}</td>
								<td>{form.conteoPeriodos[funcionario]}</td>
								<td>{form.conteoFestivos[funcionario]}</td>
								<td>{form.conteoPuentes[funcionario]}</td>
								<td>{form.conteoNoPuentes[funcionario]}</td>
								{#each Object.entries(form.turnos) as [fecha, funcTurno]}
									<td
										class={cn(
											{
												'bg-amber-500': dateIsHoliday(festivosPorMes, new Date(fecha)),
												'bg-amber-300': dateIsWeekend(new Date(fecha)),
												'rounded-sm bg-green-500': funcTurno === funcionario,
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
