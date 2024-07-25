<script lang="ts">
	import { ScrollArea } from '$lib/components/ui/scroll-area';
	import '../../app.css';

	const { children } = $props();
</script>

<ScrollArea class="flex h-screen flex-col">
	{@render children()}
</ScrollArea>

<style></style>
