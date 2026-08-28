<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { filtrarFuncionarios, type OpcionFuncionario } from '$lib/utils/buscar-funcionarios';

	/**
	 * Buscador de funcionarios.
	 *
	 * Empezó siendo un `<input list>` con `<datalist>`: esa lista la dibuja y la
	 * ubica el navegador, no admite estilos ni corrección de posición, y salía
	 * flotando fuera de la tarjeta.
	 *
	 * El siguiente intento delegó el filtrado en `Command` y llegó a producción
	 * sin encontrar coincidencias. Ahora el filtrado es `filtrarFuncionarios`,
	 * que está cubierto por pruebas: lo que se prueba es lo que corre.
	 */

	let { funcionarios = [], funcionarioId = $bindable(null) }: { funcionarios: OpcionFuncionario[]; funcionarioId: string | null } =
		$props();

	const MAXIMO_VISIBLE = 50;

	let texto = $state('');
	let abierto = $state(false);

	const coincidencias = $derived(filtrarFuncionarios(funcionarios, texto));

	const seleccionado = $derived(funcionarios.find((f) => f.value === funcionarioId));

	const elegir = (f: OpcionFuncionario) => {
		funcionarioId = f.value;
		texto = f.label;
		abierto = false;
	};

	const alTeclado = (evento: KeyboardEvent) => {
		if (evento.key === 'Escape') return (abierto = false);
		// Enter con una sola coincidencia la elige: evita bajar con el ratón.
		if (evento.key === 'Enter' && coincidencias.length === 1) {
			evento.preventDefault();
			elegir(coincidencias[0]);
		}
	};
</script>

<Card.Root>
	<Card.Header>
		<Card.Title>Información de funcionarios</Card.Title>
	</Card.Header>
	<Card.Content>
		<Label for="funcionario">Funcionario</Label>

		<div class="relative">
			<Input
				id="funcionario"
				autocomplete="off"
				role="combobox"
				aria-expanded={abierto}
				aria-controls="lista-funcionarios"
				placeholder="Buscar funcionario por nombre..."
				bind:value={texto}
				onfocus={() => (abierto = true)}
				oninput={() => {
					abierto = true;
					funcionarioId = null;
				}}
				onkeydown={alTeclado}
			/>

			{#if abierto}
				<!-- El clic en un resultado tiene que llegar antes que el cierre por
				     perder el foco, así que se cierra con onblur del contenedor. -->
				<div
					id="lista-funcionarios"
					role="listbox"
					tabindex="-1"
					class="absolute z-50 mt-1 max-h-72 w-full overflow-y-auto rounded-md border border-slate-300 bg-white shadow-md"
					onfocusout={(e) => {
						if (!e.currentTarget.contains(e.relatedTarget as Node)) abierto = false;
					}}
				>
					{#if coincidencias.length === 0}
						<div class="px-3 py-2 text-sm text-slate-600">Ningún funcionario con ese nombre.</div>
					{:else}
						{#each coincidencias.slice(0, MAXIMO_VISIBLE) as funcionario}
							<button
								type="button"
								role="option"
								aria-selected={funcionario.value === funcionarioId}
								class="block w-full px-3 py-1.5 text-left text-sm hover:bg-sky-100 focus:bg-sky-100 focus:outline-none"
								onclick={() => elegir(funcionario)}
							>
								{funcionario.label}
								{#if funcionario.detalle}
									<span class="block text-xs text-slate-500">{funcionario.detalle}</span>
								{/if}
							</button>
						{/each}

						{#if coincidencias.length > MAXIMO_VISIBLE}
							<div class="px-3 py-2 text-sm text-slate-600">
								y {coincidencias.length - MAXIMO_VISIBLE} más. Escribe un poco más para acotar.
							</div>
						{/if}
					{/if}
				</div>
			{/if}
		</div>

		{#if seleccionado}
			<p class="pt-2 text-sm text-slate-600">
				Seleccionado: {seleccionado.label}{seleccionado.detalle ? ` — ${seleccionado.detalle}` : ''}
			</p>
		{/if}
	</Card.Content>
	<Card.Footer class="flex justify-between">
		{#if funcionarioId}
			<a href="/funcionario/{funcionarioId}">
				<Button type="submit" variant="secondary">Ver información de funcionario</Button>
			</a>
		{:else}
			<Button type="submit" variant="secondary" disabled>Ver información de funcionario</Button>
		{/if}
	</Card.Footer>
</Card.Root>
