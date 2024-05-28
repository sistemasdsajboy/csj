<script lang="ts">
	import { Separator } from '$lib/components/ui/separator';
	import { cn } from '$lib/utils/shadcn';
	import type { Snippet } from 'svelte';

	type PageLayoutProps = {
		children: Snippet;
		header?: Snippet;
		sidebar?: Snippet;
		username: string;
	};

	const { header, sidebar, children, username }: PageLayoutProps = $props();
</script>

{#snippet userInfo()}
	<div class="flex gap-2">
		<span>{username}</span>
		<a href="/logout" class="text-sky-800 underline">Salir</a>
	</div>
{/snippet}

<div
	class="container flex flex-col items-start justify-between space-y-2 py-4 sm:flex-row sm:items-center sm:space-y-0 md:h-16"
>
	{#if header}
		<h1 class="flex grow items-center gap-2 text-lg font-bold uppercase">
			{@render header()}
		</h1>
	{/if}
	<div class="flex grow space-x-2 sm:justify-end">
		{@render userInfo()}
	</div>
</div>

<Separator />

<div class="container h-full py-6">
	<div class={`grid h-full items-stretch gap-6  md:grid-cols-[1fr_320px]`}>
		{#if sidebar}
			<div class="hidden flex-col space-y-4 sm:flex md:order-2">
				{@render sidebar()}
			</div>
		{/if}

		<div class={cn('md:order-1', { 'md:col-span-2': !sidebar })}>
			{@render children()}
		</div>
	</div>
</div>
