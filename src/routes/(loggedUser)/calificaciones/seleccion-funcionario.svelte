<script lang="ts">
	import { goto } from '$app/navigation';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { filtrarFuncionarios, type OpcionFuncionario } from '$lib/utils/buscar-funcionarios';

	/**
	 * Buscador de funcionarios.
	 *
	 * Historia corta de tres errores, porque explican el diseño:
	 *
	 * 1. Era un `<input list>` con `<datalist>`. Esa lista la dibuja y la ubica
	 *    el navegador: salía flotando fuera de la tarjeta.
	 * 2. Se cambió a `Command` y el filtrado, delegado en ese componente, dejó
	 *    de encontrar coincidencias. Llegó así a producción.
	 * 3. La lista mide hasta 288 px y se abría **encima** del botón "Ver
	 *    información de funcionario". El cierre por pérdida de foco estaba solo
	 *    en la lista, no en el campo, así que al escribir se quedaba abierta
	 *    tapando el botón: se elegía a alguien y no había forma de continuar.
	 *
	 * De ahí las reglas de ahora: el filtrado es nuestro y está probado
	 * (`filtrarFuncionarios`); el cierre por pérdida de foco envuelve al campo
	 * **y** a la lista; y **cada resultado es un enlace**, así que se llega con
	 * un solo clic y sin depender de que ningún manejador de eventos se comporte
	 * como se espera.
	 */

	let { funcionarios = [], funcionarioId = $bindable(null) }: { funcionarios: OpcionFuncionario[]; funcionarioId: string | null } =
		$props();

	const MAXIMO_VISIBLE = 50;

	let texto = $state('');
	let abierto = $state(false);

	const coincidencias = $derived(filtrarFuncionarios(funcionarios, texto));

	const alTeclado = (evento: KeyboardEvent) => {
		if (evento.key === 'Escape') return (abierto = false);
		// Con una sola coincidencia, Enter entra directo.
		if (evento.key === 'Enter' && coincidencias.length === 1) {
			evento.preventDefault();
			funcionarioId = coincidencias[0].value;
			goto(`/funcionario/${coincidencias[0].value}`);
		}
	};
</script>

<Card.Root>
	<Card.Header>
		<Card.Title>Información de funcionarios</Card.Title>
	</Card.Header>
	<Card.Content class="pb-6">
		<Label for="funcionario">Funcionario</Label>

		<div
			class="relative"
			onfocusout={(e) => {
				if (!e.currentTarget.contains(e.relatedTarget as Node)) abierto = false;
			}}
		>
			<Input
				id="funcionario"
				autocomplete="off"
				role="combobox"
				aria-expanded={abierto}
				aria-controls="lista-funcionarios"
				placeholder="Buscar por nombre o documento..."
				bind:value={texto}
				onfocus={() => (abierto = true)}
				oninput={() => (abierto = true)}
				onkeydown={alTeclado}
			/>

			{#if abierto && texto.trim()}
				<div
					id="lista-funcionarios"
					role="listbox"
					class="absolute z-50 mt-1 max-h-72 w-full overflow-y-auto rounded-md border border-slate-300 bg-white shadow-md"
				>
					{#if coincidencias.length === 0}
						<div class="px-3 py-2 text-sm text-slate-600">Ningún funcionario con ese nombre.</div>
					{:else}
						{#each coincidencias.slice(0, MAXIMO_VISIBLE) as funcionario (funcionario.value)}
							<a
								href="/funcionario/{funcionario.value}"
								role="option"
								aria-selected="false"
								class="block px-3 py-2 text-sm hover:bg-sky-100 focus:bg-sky-100 focus:outline-none"
							>
								{funcionario.label}
								{#if funcionario.detalle}
									<span class="block text-xs text-slate-500">{funcionario.detalle}</span>
								{/if}
							</a>
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

		<p class="pt-2 text-sm text-slate-600">Escribe y elige un funcionario de la lista para ver su información.</p>
	</Card.Content>
</Card.Root>
