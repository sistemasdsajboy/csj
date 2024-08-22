<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Command from '$lib/components/ui/command';
	import * as Popover from '$lib/components/ui/popover';
	import { cn } from '$lib/utils/shadcn';
	import { tick } from 'svelte';
	import CaretSort from 'svelte-radix/CaretSort.svelte';
	import Check from 'svelte-radix/Check.svelte';

	type SelectOption = {
		label: string;
		value: string;
	};

	export let options: SelectOption[];
	export let placeholder = 'Seleccione una opción';

	let open = false;
	let label = '';
	export let value: string | null = null;

	$: selectedLabel = options.find((f) => f.label === label)?.label ?? placeholder;
	$: value = options.find((f) => f.label === label)?.value ?? null;

	// We want to refocus the trigger button when the user selects
	// an item from the list so users can continue navigating the
	// rest of the form with the keyboard.
	function closeAndFocusTrigger(triggerId: string) {
		open = false;
		tick().then(() => {
			document.getElementById(triggerId)?.focus();
		});
	}
</script>

<Popover.Root bind:open let:ids>
	<Popover.Trigger asChild let:builder>
		<Button builders={[builder]} variant="outline" role="combobox" aria-expanded={open} class="w-full flex-1 justify-between">
			<div class="flex w-full justify-between">
				<span class={cn('truncate font-normal', selectedLabel === placeholder ? 'text-muted-foreground' : '')}>{selectedLabel}</span>
				<CaretSort class="ml-2 h-4 w-4 shrink-0 opacity-50" />
			</div>
		</Button>
	</Popover.Trigger>
	<Popover.Content class="w-full p-0 md:w-[300px] lg:w-[400px]">
		<Command.Root>
			<Command.Input placeholder="Buscar..." />
			<Command.List>
				<Command.Empty>Sin resultados</Command.Empty>
				<Command.Group>
					{#each options as option (option.value)}
						<Command.Item
							value={option.label}
							aria-label={option.label}
							class="aria-selected:bg-primary aria-selected:text-primary-foreground"
							onSelect={(selectedLabel) => {
								label = selectedLabel;
								closeAndFocusTrigger(ids.trigger);
							}}
						>
							{option.label}
							<Check class={cn('ml-auto h-4 w-4 shrink-0', label === option.label ? 'opacity-100' : 'opacity-0')} />
						</Command.Item>
					{/each}
				</Command.Group>
			</Command.List>
		</Command.Root>
	</Popover.Content>
</Popover.Root>
