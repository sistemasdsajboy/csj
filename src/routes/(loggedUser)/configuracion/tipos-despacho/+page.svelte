<script lang="ts">
	import TipoDespachoForm from './tipo-despacho-form.svelte';
	import * as Select from '$lib/components/ui/select';
	import type { TipoDespacho } from '@prisma/client';

	const { data, form } = $props();
	let tipoDespachoId = $state('');
	let tipoDespacho = $state<TipoDespacho | null>(null);

	$effect(() => {
		tipoDespacho = data.tiposDespacho.find((td) => td.id === tipoDespachoId) || null;
	});

	const { tiposDespacho, especialidades, categorias } = data;
</script>

<div class="flex flex-col gap-4">
	<Select.Root
		portal={null}
		onSelectedChange={(selected) => (tipoDespachoId = selected?.value?.toString() || '')}
	>
		<Select.Trigger class="w-full">
			<Select.Value placeholder="Seleccione el tipo de despacho" />
		</Select.Trigger>
		<Select.Content>
			<Select.Group>
				<Select.Item value="">Nuevo tipo de despacho</Select.Item>
				{#each tiposDespacho as td}
					<Select.Item value={td.id}>{td.nombre}</Select.Item>
				{/each}
			</Select.Group>
		</Select.Content>
	</Select.Root>

	<TipoDespachoForm {tipoDespacho} {especialidades} {categorias} {form} />
</div>
