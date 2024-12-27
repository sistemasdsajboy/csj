<script lang="ts">
	import { afterNavigate } from '$app/navigation';
	import { base } from '$app/paths';
	import { page } from '$app/state';
	import { Button } from '$lib/components/ui/button';
	import { cn } from '$lib/utils/shadcn';
	import ArrowLeft from 'lucide-svelte/icons/arrow-left';
	import type { Snippet } from 'svelte';

	let previousPage = $state<string>(base);
	afterNavigate(({ from }) => {
		previousPage = from?.url.pathname || previousPage;
	});

	type PageLayoutProps = {
		children: Snippet;
		header?: Snippet;
		sidebar?: Snippet;
		username: string;
		backHref?: string;
	};
	const { header, sidebar, children, username, backHref }: PageLayoutProps = $props();
	const { url } = page;
</script>

{#snippet userInfo()}
	<div class="flex gap-2">
		<span>{username}</span>
		<a href="/logout" class="text-sky-800 underline">Salir</a>
	</div>
{/snippet}

<div
	class="container flex flex-col items-start justify-between space-y-2 border border-b-slate-300 py-4 sm:flex-row sm:items-center sm:space-y-0 md:h-16 print:hidden"
>
	<div class="flex grow items-center gap-2 text-lg font-bold uppercase">
		{#if url.pathname !== '/' && username}
			<Button variant="link" href={backHref || previousPage}>
				<ArrowLeft class="h-6 w-6" />
			</Button>
		{/if}
		{#if header}
			{@render header()}
		{/if}
	</div>

	{#if username}
		<div class="flex grow space-x-2 sm:justify-end">
			<a href="/calificaciones" class={cn({ 'text-sky-800 underline': !url.pathname.startsWith('/calificaciones') })}> Calificaciones </a>
			<a
				href="/turnos"
				class={cn({ 'text-sky-800 underline': !url.pathname.startsWith('/turnos') })}
				target="_blank"
				rel="noreferrer noopener"
			>
				Turnos
			</a>
			<a href="/configuracion" class={cn({ 'text-sky-800 underline': !url.pathname.startsWith('/configuracion') })}> Configuración </a>
			{@render userInfo()}
		</div>
	{/if}
</div>

<div class="container h-full py-6">
	<div class="grid h-full items-stretch gap-6 md:grid-cols-[1fr_320px]">
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
