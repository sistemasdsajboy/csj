<script>
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
</script>

<form method="post" action="?/loadFile" enctype="multipart/form-data">
	<div class="flex flex-col gap-4">
		<h3 class="text-xl font-bold">Cargar archivo para calificar</h3>

		<div>
			<Label for="file">Archivo consolidado de calificaciones</Label>
			<Input type="file" name="file" accept=".xlsx, .xls" />
		</div>

		<Button type="submit">Cargar</Button>
	</div>
</form>
