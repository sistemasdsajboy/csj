<script lang="ts">
	import { page } from '$app/stores';
	import PageLayout from '$lib/components/custom/page-layout.svelte';
	import { cn } from '$lib/utils/shadcn';

	const { data, children } = $props();
	const { url } = $derived($page);

	const linkClass = (path: string) =>
		cn('block w-full p-2', { 'bg-sky-300': url.pathname.startsWith(path) });
</script>

<PageLayout username={data.user}>
	<div class="flex flex-row gap-4">
		<div class="w-48 border-r border-slate-500">
			<a href="/configuracion/usuarios" class={linkClass('/configuracion/usuarios')}>Usuarios</a>
			<a href={`/configuracion/tipos-despacho`} class={linkClass(`/configuracion/tipos-despacho`)}>
				Tipos de despacho
			</a>
		</div>

		{@render children()}
	</div>
</PageLayout>
