<script lang="ts">
	import '../../app.css';

	const { children } = $props();
</script>

<div class="flex h-full flex-col">
	{@render children()}
</div>

<style></style>
