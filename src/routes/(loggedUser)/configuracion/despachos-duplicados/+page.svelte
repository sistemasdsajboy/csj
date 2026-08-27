<script lang="ts">
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { formatDate } from '$lib/utils/dates';

	let { data, form } = $props();
	const { planes } = $derived(data);
</script>

<div class="w-full space-y-4 p-4">
	<div>
		<h2 class="text-2xl font-bold text-slate-800">Juzgados duplicados</h2>
		<p class="text-slate-600">
			Cuando un juzgado cambia de código, su historial puede quedar partido en dos registros. El cálculo los trata como despachos distintos
			y cree que el funcionario se trasladó.
		</p>
	</div>

	{#if form?.error}
		<div
			role="alert"
			class="rounded-md border border-rose-300 bg-rose-50 px-4 py-3 text-rose-800 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-200"
		>
			<div class="font-medium">No se pudo unificar</div>
			<div class="text-sm">{form.error}</div>
		</div>
	{/if}

	{#if form?.success}
		<div
			role="status"
			class="rounded-md border border-emerald-300 bg-emerald-50 px-4 py-3 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
		>
			{form.message}
		</div>
	{/if}

	{#if planes.length === 0}
		<div class="rounded-md border border-slate-200 px-4 py-6 text-center text-slate-600">
			No hay juzgados con más de un registro. Nada que unificar.
		</div>
	{:else}
		<p class="text-slate-700">
			<span class="font-bold">{planes.length}</span>
			{planes.length === 1 ? 'juzgado tiene' : 'juzgados tienen'} más de un registro.
		</p>

		{#each planes as plan}
			<div class="space-y-3 rounded-lg border border-slate-300 p-4">
				<h3 class="font-bold text-slate-800">{plan.nombre}</h3>

				<table class="table-auto border-collapse text-sm">
					<tbody>
						<tr class="border-b border-slate-200">
							<td class="py-1 pr-4"><Badge>Se conserva</Badge></td>
							<td class="py-1 pr-4 font-mono">{plan.vigente.codigo}</td>
							<td class="py-1 text-slate-600">
								último registro: {plan.vigente.ultimoRegistro ? formatDate(plan.vigente.ultimoRegistro) : 'ninguno'}
							</td>
						</tr>
						{#each plan.absorbidos as viejo}
							<tr class="border-b border-slate-200">
								<td class="py-1 pr-4"><Badge variant="secondary">Se absorbe</Badge></td>
								<td class="py-1 pr-4 font-mono">{viejo.codigo}</td>
								<td class="py-1 text-slate-600">
									{viejo.registros} registros · {viejo.audiencias} audiencias · {viejo.novedades} novedades
									{#if viejo.ultimoRegistro}
										· último: {formatDate(viejo.ultimoRegistro)}
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>

				<div class="text-sm text-slate-700">
					{#if plan.filasRepetidas}
						Se descartarán <span class="font-bold">{plan.filasRepetidas}</span> filas repetidas: la misma estadística quedó cargada bajo los
						dos códigos.
					{/if}
					{#if plan.calificacionesARegenerar}
						<div>
							Habrá que volver a generar <span class="font-bold">{plan.calificacionesARegenerar}</span>
							calificación(es).
						</div>
					{/if}
				</div>

				{#if plan.audienciasARedigitar.length}
					<div class="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
						<div class="font-medium">Audiencias que habrá que volver a digitar</div>
						<p>Los dos despachos tenían registro para el mismo funcionario y periodo.</p>
						{#each plan.audienciasARedigitar as a}
							<div class="pt-1">
								{a.funcionario} · {a.periodo} — se conserva {a.seConserva}, se descarta {a.seDescarta}
							</div>
						{/each}
					</div>
				{/if}

				{#if plan.conflictos.length}
					<div class="rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-800">
						<div class="font-medium">No se puede unificar todavía</div>
						<p>
							Hay {plan.conflictos.length} filas que existen en los dos despachos con cifras distintas. Cuál de las dos vale no lo decide el
							sistema: hay que corregirlo en el origen.
						</p>
						{#each plan.conflictos.slice(0, 3) as c}
							<div class="pt-1">{c}</div>
						{/each}
					</div>
				{:else}
					<AlertDialog.Root>
						<AlertDialog.Trigger asChild let:builder>
							<Button builders={[builder]}>Unificar este juzgado</Button>
						</AlertDialog.Trigger>
						<AlertDialog.Content>
							<AlertDialog.Header>
								<AlertDialog.Title>Unificar {plan.nombre}</AlertDialog.Title>
								<AlertDialog.Description>
									Se conservará el código {plan.vigente.codigo} y se trasladará a él todo el historial de
									{plan.absorbidos.map((a) => a.codigo).join(', ')}. Las calificaciones de este juzgado quedarán sin detalle hasta que se
									vuelvan a generar. Esta acción no se puede deshacer.
									{plan.absorbidos.length === 1 ? 'El código que desaparece queda' : 'Los códigos que desaparecen quedan'}
									anotado{plan.absorbidos.length === 1 ? '' : 's'} en la ficha del despacho.
								</AlertDialog.Description>
							</AlertDialog.Header>
							<form action="?/fusionar" method="post">
								<input type="hidden" name="nombre" value={plan.nombre} />
								<AlertDialog.Footer>
									<AlertDialog.Cancel>Cancelar</AlertDialog.Cancel>
									<Button type="submit">Unificar</Button>
								</AlertDialog.Footer>
							</form>
						</AlertDialog.Content>
					</AlertDialog.Root>
				{/if}
			</div>
		{/each}
	{/if}
</div>
