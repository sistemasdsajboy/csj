<script lang="ts">
	import PageLayout from '$lib/components/custom/page-layout.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select';
	import { PencilIcon, SearchIcon } from 'lucide-svelte';

	let { data, form } = $props();

	const submitDisabled = $derived(data.despachos.some((dp) => !dp.tipoDespachoId));
</script>

{#snippet header()}
	<div class="text-2xl font-bold">
		{data.funcionario.nombre}
	</div>
{/snippet}

<PageLayout {header} username={data.user}>
	<div class="container mx-auto space-y-2 px-4">
		<h3 class="text-md font-bold text-sky-800">Generar calificación</h3>

		{#if data.periodos.length > 0}
			<form class="w-96 space-y-2" data-sveltekit-reload>
				<div class="grid grid-cols-[30%_auto_10%] items-center gap-3 pb-2">
					<Label for="periodo">Periodo</Label>
					<Select.Root portal={null} selected={{ label: data.periodo.toString(), value: data.periodo.toString() }}>
						<Select.Trigger class="w-full">
							<Select.Value />
						</Select.Trigger>
						<Select.Content>
							<Select.Group>
								{#each data.periodos as p}
									<Select.Item value={p}>{p}</Select.Item>
								{/each}
							</Select.Group>
						</Select.Content>
						<Select.Input name="periodo" />
					</Select.Root>
					<Button type="submit" variant="link" class="p-0">
						<SearchIcon class="h-4 w-4" />
					</Button>
				</div>
			</form>

			<Label>Despachos en el periodo</Label>
			<div class="flex w-96 flex-col items-start gap-2">
				{#each data.despachos as dp}
					<div class="flex w-96 flex-row items-center justify-between gap-2">
						<span>{dp.codigo} - {dp.nombre}</span>
						<a href="/despacho/{dp.id}" class="print:hidden">
							<PencilIcon class="mt-1 h-4 w-4" />
						</a>
					</div>
					{#if !dp.tipoDespachoId}
						<Badge variant="destructive">No configurado</Badge>
					{/if}
				{/each}
			</div>

			<form class="w-96 space-y-2" method="post" action="?/generarCalificacion">
				<input type="hidden" name="periodo" value={data.periodo} />
				<div class="col-span-2 text-right">
					<Button type="submit" disabled={submitDisabled}>Ver calificación</Button>
				</div>
				{#if form?.error}
					<div class="text-rose-700">{form.error}</div>
				{/if}
			</form>
		{:else}
			<p class="text-muted-foreground">No hay información estadística disponible para generar una calificación de este funcionario.</p>
		{/if}
	</div>
</PageLayout>
