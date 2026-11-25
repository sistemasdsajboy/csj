<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';

	let { data, form } = $props();
	let guardando = $state(false);
</script>

<div class="w-full max-w-3xl space-y-6 p-4">
	<div>
		<h2 class="text-2xl font-bold text-slate-800 dark:text-slate-100">Firmas del formato integral</h2>
		<p class="text-slate-600 dark:text-slate-300">
			Quién firma los formatos de calificación integral. Una calificación que aún no tiene firmas las toma de aquí de inmediato; una que ya
			las tenía, cuando se vuelve a guardar.
		</p>
	</div>

	{#if form?.error}
		<div
			role="alert"
			class="rounded-md border border-rose-300 bg-rose-50 px-4 py-3 text-rose-800 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-200"
		>
			<div class="font-medium">No se guardó</div>
			<div class="text-sm">{form.error}</div>
		</div>
	{:else if form?.success}
		<div
			role="status"
			class="rounded-md border border-emerald-300 bg-emerald-50 px-4 py-3 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
		>
			{form.mensaje}
		</div>
	{/if}

	<form
		method="post"
		action="?/guardar"
		use:enhance={() => {
			guardando = true;
			return async ({ update }) => {
				await update({ reset: false });
				guardando = false;
			};
		}}
	>
		<fieldset disabled={guardando} class="space-y-6">
			<section class="space-y-4">
				<h3 class="font-semibold">Consejero ponente de cada despacho</h3>
				<p class="text-xs text-slate-500">
					Escriba la línea tal como sale en el formato, debajo de "CONSEJO SECCIONAL DE LA JUDICATURA BOYACÁ – CASANARE".
				</p>
				{#each data.despachos as despacho (despacho.id)}
					<div class="space-y-1.5">
						<Label for={`ponente_${despacho.id}`}>{despacho.nombre}</Label>
						<Input
							id={`ponente_${despacho.id}`}
							name={`ponente_${despacho.id}`}
							value={despacho.ponente ?? ''}
							maxlength={data.maximo}
							placeholder="Consejera Ponente: NOMBRE"
						/>
						{#if despacho.ultimoUsado}
							<p class="text-xs text-slate-500">Lo último que se digitó en una calificación de este despacho: {despacho.ultimoUsado}</p>
						{/if}
					</div>
				{/each}
			</section>

			<section class="space-y-1.5">
				<h3 class="font-semibold">Presidente de la sala</h3>
				<Label for="presidente">Nombre</Label>
				<Input id="presidente" name="presidente" value={data.presidente} maxlength={data.maximo} placeholder="NOMBRE" />
				<p class="text-xs text-slate-500">Sale en el formato como "Firma Presidente – NOMBRE".</p>
				{#if data.presidenteUltimoUsado}
					<p class="text-xs text-slate-500">Lo último que se digitó en una calificación: {data.presidenteUltimoUsado}</p>
				{/if}
			</section>

			<section class="space-y-4">
				<h3 class="font-semibold">Quién notifica por correo electrónico</h3>
				<p class="text-xs text-slate-500">
					Con quién notifica, la notificación del formato sale llena: "En Tunja, a los (ver correo electrónico) días...", el nombre y la
					cédula del funcionario calificado y los de quien notifica. Sin nombre, esas líneas salen en blanco para llenar a mano.
				</p>
				{#each data.despachos as despacho (despacho.id)}
					<div class="space-y-2 rounded-md border p-3">
						<div class="text-sm font-medium">{despacho.nombre}</div>
						<div class="grid gap-3 md:grid-cols-2">
							<div class="space-y-1.5">
								<Label for={`notificaNombre_${despacho.id}`}>Nombre</Label>
								<Input
									id={`notificaNombre_${despacho.id}`}
									name={`notificaNombre_${despacho.id}`}
									value={despacho.notifica?.nombre ?? ''}
									maxlength={data.maximo}
									placeholder="Vacío: notificación en blanco"
								/>
							</div>
							<div class="space-y-1.5">
								<Label for={`notificaCargo_${despacho.id}`}>Cargo</Label>
								<Input
									id={`notificaCargo_${despacho.id}`}
									name={`notificaCargo_${despacho.id}`}
									value={despacho.notifica?.cargo ?? ''}
									maxlength={data.maximo}
									placeholder="Secretaria"
								/>
							</div>
							<div class="space-y-1.5">
								<Label for={`notificaCedula_${despacho.id}`}>Cédula</Label>
								<Input
									id={`notificaCedula_${despacho.id}`}
									name={`notificaCedula_${despacho.id}`}
									value={despacho.notifica?.cedula ?? ''}
									maxlength={30}
								/>
							</div>
							<div class="space-y-1.5">
								<Label for={`notificaExpedicion_${despacho.id}`}>Lugar de expedición de la cédula</Label>
								<Input
									id={`notificaExpedicion_${despacho.id}`}
									name={`notificaExpedicion_${despacho.id}`}
									value={despacho.notifica?.expedicion ?? ''}
									maxlength={data.maximo}
									placeholder="Tunja - Boyacá"
								/>
							</div>
						</div>
					</div>
				{/each}
			</section>

			<div class="flex justify-end">
				<Button type="submit">{guardando ? 'Guardando…' : 'Guardar'}</Button>
			</div>
		</fieldset>
	</form>
</div>
