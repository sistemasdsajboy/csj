<script>
	import { countLaborDaysBetweenDates } from '$lib/utils/dates';

    let { registroId } = $props();

	let from = $state('');
	let to = $state('');
	let days = $state(0);

	$effect(() => {
		if (from && to) {
			days = countLaborDaysBetweenDates(new Date(from), new Date(to));
		}
	});
</script>

<h3>Agregar novedad</h3>
<form method="post" action="?/addNovedad">
    <input type="hidden" name="registroId" value={registroId}>
	<div>
		<select required name="type">
			<option value="calamidad">Calamidad doméstica</option>
			<option value="cierre-extraordinario">Cierre extraordinario de despacho</option>
			<option value="comision">Comisión</option>
			<option value="escrutinios">Escrutinios</option>
			<option value="incapacidad">Incapacidad</option>
			<option value="licencia">Licencia</option>
			<option value="permiso-ejrlb">Permiso EJRLB</option>
			<option value="permiso-sindical">Permiso sindical</option>
			<option value="vacaciones">Vacaciones</option>
			<option value="vacancia">Vacancia judicial</option>
			<option value="vacancia">Otras novedades</option>
		</select>
	</div>
	<div><input type="date" name="from" required bind:value={from} /></div>
	<div><input type="date" name="to" required bind:value={to} /></div>
	<div><input type="number" name="days" disabled bind:value={days} /></div>
	<div><input type="text" name="notes" /></div>

	<button type="submit">Cargar</button>
</form>
