<script lang="ts">
	import { Button, buttonVariants } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select';
	import type { TipoDespacho } from '@prisma/client';
	import type { Snippet } from 'svelte';
	import type { ActionData } from './$types';

	const {
		tipoDespacho,
		especialidades,
		categorias,
		form,
		children
	}: {
		tipoDespacho: TipoDespacho | null;
		especialidades: { label: string; value: string }[];
		categorias: { label: string; value: string }[];
		form: ActionData;
		children: Snippet;
	} = $props();
</script>

<Dialog.Root>
	<Dialog.Trigger class={buttonVariants({ variant: 'outline' })}>
		{@render children()}
	</Dialog.Trigger>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>
				{tipoDespacho ? 'Editar tipo de despacho' : 'Nuevo tipo de despacho'}
			</Dialog.Title>
		</Dialog.Header>
		<form
			action="?/guardarTipoDespacho"
			method="post"
			class="grid w-full max-w-sm items-center gap-2 pb-2 sm:grid-cols-[1fr_2fr]"
		>
			{#if tipoDespacho}
				<Input type="hidden" name="id" value={tipoDespacho.id} />
			{/if}

			<Label for="nombre">Nombre del tipo de despacho</Label>
			<Input type="text" name="nombre" value={tipoDespacho?.nombre} required />

			<Label for="especialidad">Especialidad</Label>
			<Select.Root
				portal={null}
				selected={especialidades.find(({ value }) => value === tipoDespacho?.especialidad)}
			>
				<Select.Trigger class="w-full">
					<Select.Value />
				</Select.Trigger>
				<Select.Content>
					<Select.Group>
						{#each especialidades as e}
							<Select.Item value={e.value}>{e.label}</Select.Item>
						{/each}
					</Select.Group>
				</Select.Content>
				<Select.Input name="especialidad" required />
			</Select.Root>

			<Label for="categoria">Categoría</Label>
			<Select.Root
				portal={null}
				selected={categorias.find(({ value }) => value === tipoDespacho?.categoria)}
			>
				<Select.Trigger class="w-full">
					<Select.Value />
				</Select.Trigger>
				<Select.Content>
					<Select.Group>
						{#each categorias as c}
							<Select.Item value={c.value}>{c.label}</Select.Item>
						{/each}
					</Select.Group>
				</Select.Content>
				<Select.Input name="categoria" required />
			</Select.Root>

			<Dialog.Footer class="col-span-2">
				<Button type="submit">Guardar</Button>
			</Dialog.Footer>
		</form>

		<div>
			{#if form?.error}
				<div class="text-rose-700">{form.error}</div>
			{/if}
		</div>
	</Dialog.Content>
</Dialog.Root>
