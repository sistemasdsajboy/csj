<script lang="ts">
	import { Label } from '$lib/components/ui/label';
	import { comoTexto, mismoTexto } from '$lib/core/calificaciones/integral/motivacion';

	/**
	 * Motivación de un factor: sale el texto predeterminado, que se ajusta solo a
	 * los datos mientras nadie lo toque. Al modificarlo queda fijo y se envía,
	 * junto con el texto, el predeterminado del que partió (`<name>Base`), para
	 * poder avisar si después cambian los datos.
	 */
	let {
		name,
		etiqueta,
		predeterminada,
		guardada,
		vacio,
		ayuda = '',
		filas = 4,
		clase,
	}: {
		name: string;
		etiqueta: string;
		/** Párrafos del texto predeterminado con lo digitado ahora; null si faltan datos. */
		predeterminada: string[] | null;
		guardada: { texto: string; base: string } | null | undefined;
		/** Qué hacer cuando todavía no hay texto. */
		vacio: string;
		ayuda?: string;
		filas?: number;
		clase: string;
	} = $props();

	let editada = $state(!!guardada);
	let propio = $state(guardada?.texto ?? '');
	let base = $state(guardada?.base ?? '');

	const textoPredeterminado = $derived(comoTexto(predeterminada));
	const desactualizada = $derived(editada && !mismoTexto(base, textoPredeterminado));

	function escribir(e: Event & { currentTarget: HTMLTextAreaElement }) {
		const valor = e.currentTarget.value;
		if (!editada) base = textoPredeterminado;
		propio = valor;
		// Si vuelve a quedar igual al predeterminado, otra vez se ajusta solo a los datos.
		editada = !mismoTexto(valor, textoPredeterminado);
	}

	function volver() {
		editada = false;
		propio = '';
		base = '';
	}
</script>

<div class="space-y-1.5">
	<Label for={name}>{etiqueta}</Label>
	{#if ayuda}<p class="text-xs text-slate-500">{ayuda}</p>{/if}
	<textarea
		id={name}
		{name}
		rows={filas}
		class={clase}
		value={editada ? propio : textoPredeterminado}
		oninput={escribir}
		placeholder={vacio}
	></textarea>
	{#if editada}
		<input type="hidden" name={`${name}Base`} value={base} />
	{/if}
	<div class="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
		<span>
			{#if editada}
				Modificado a mano: ya no se ajusta solo a los datos.
			{:else if predeterminada?.length}
				Texto predeterminado: se ajusta solo a los datos mientras no lo modifique. Puede modificarlo.
			{/if}
		</span>
		{#if editada && predeterminada?.length}
			<button type="button" class="underline hover:text-slate-800 dark:hover:text-slate-200" onclick={volver}>
				Volver al texto predeterminado
			</button>
		{/if}
	</div>
	{#if desactualizada}
		<p class="text-xs text-amber-700 dark:text-amber-300">
			Los datos de este factor cambiaron después de modificar el texto: revise que siga diciendo lo correcto, o vuelva al texto
			predeterminado.
		</p>
	{/if}
</div>
