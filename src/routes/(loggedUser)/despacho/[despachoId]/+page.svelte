<script lang="ts">
	import PageLayout from '$lib/components/custom/page-layout.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select';
	import type { PageData } from './$types';

	export let data: PageData;
	const despacho = data.despacho;

	const especialidades = ['Promiscuo', 'Penal', 'Civil', 'Familia', 'Laboral', 'Administrativo'];
	const categorias = ['Municipal', 'Circuito', 'Tribunal'];
</script>

<PageLayout username={data.user}>
	<h1 class="text-2xl font-bold">{despacho.nombre} - {despacho.codigo}</h1>

	<form method="post" class="max-w-xs">
		<div class="grid items-center gap-2 sm:grid-cols-[1fr_2fr]">
			<Label for="numero">Número</Label>
			<Input type="number" name="numero" value={despacho.numero} required />

			<Label for="especialidad">Especialidad</Label>
			<Select.Root
				portal={null}
				selected={despacho.especialidad
					? { label: despacho.especialidad, value: despacho.especialidad }
					: undefined}
			>
				<Select.Trigger class="w-full">
					<Select.Value />
				</Select.Trigger>
				<Select.Content>
					<Select.Group>
						{#each especialidades as e}
							<Select.Item value={e} label={e}>{e}</Select.Item>
						{/each}
					</Select.Group>
				</Select.Content>
				<Select.Input name="especialidad" required />
			</Select.Root>

			<Label for="categoria">Categoría</Label>
			<Select.Root
				portal={null}
				selected={despacho.categoria
					? { label: despacho.categoria, value: despacho.categoria }
					: undefined}
			>
				<Select.Trigger class="w-full">
					<Select.Value />
				</Select.Trigger>
				<Select.Content>
					<Select.Group>
						{#each categorias as c}
							<Select.Item value={c} label={c}>{c}</Select.Item>
						{/each}
					</Select.Group>
				</Select.Content>
				<Select.Input name="categoria" required />
			</Select.Root>

			<Label for="municipio">Municipio</Label>
			<Input type="text" name="municipio" value={despacho.municipio} required />

			<Label for="distrito">Distrito</Label>
			<Input type="text" name="distrito" value={despacho.distrito} />

			<Button type="submit">Guardar</Button>
		</div>
	</form>
</PageLayout>
