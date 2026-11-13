<script lang="ts">
	import { enhance } from '$app/forms';
	import PageLayout from '$lib/components/custom/page-layout.svelte';
	import { Button, buttonVariants } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { calcularIntegral, MAXIMOS, notaCalidad, puntajeOrganizacion } from '$lib/core/calificaciones/integral/integral';
	import { motivacionesPredeterminadas } from '$lib/core/calificaciones/integral/motivacion';
	import { cantidad, cifra } from '$lib/core/calificaciones/integral/redaccion';
	import MotivacionEditable from './motivacion-editable.svelte';

	let { data, form } = $props();

	const i = data.integral;
	const s = data.sugerencias as Partial<Record<'ponente' | 'presidente' | 'iniciales' | 'oficioEscuela', string | null>>;
	const comoFecha = (d: Date | string | null | undefined) => (d ? new Date(d).toISOString().slice(0, 10) : '');
	const prov = (n: number) => i?.provisionalidad?.[n] ?? null;

	// Lo que mueve la nota en vivo mientras se digita.
	let formularios = $state<number | string | null>(i?.calidadFormularios ?? null);
	let suma = $state<number | string | null>(i?.calidadSuma ?? null);
	let opcion = $state<string>(i?.organizacionOpcion ?? (data.textosPredeterminados ? '' : 'otro'));
	let puntajeOtro = $state<number | string | null>(i?.organizacionPuntaje ?? null);
	let publicaciones = $state<string>(i?.publicacionesPuntaje != null ? String(i.publicacionesPuntaje) : '');
	// Lo que además cambia la redacción de los textos predeterminados.
	let genero = $state<string>(data.funcionario.genero ?? '');
	let fechaVisita = $state<string>(comoFecha(i?.organizacionFechaVisita));
	let oficio = $state<string>(i?.oficioEscuela ?? s.oficioEscuela ?? '');
	let guardando = $state(false);

	const numeroONulo = (v: unknown) => (v === '' || v == null || !Number.isFinite(Number(v)) ? null : Number(v));
	const enteroONulo = (v: unknown) => {
		const n = numeroONulo(v);
		return n != null && Number.isInteger(n) && n >= 1 ? n : null;
	};
	// Los mismos textos que arma el servidor, con lo que se está digitando.
	const predeterminadas = $derived(
		motivacionesPredeterminadas({
			genero: genero === 'femenino' || genero === 'masculino' ? genero : null,
			periodo: data.calificacion.periodo,
			calidadFormularios: enteroONulo(formularios),
			calidadSuma: numeroONulo(suma),
			organizacionFechaVisita: /^\d{4}-\d{2}-\d{2}$/.test(fechaVisita) ? new Date(`${fechaVisita}T00:00:00Z`) : null,
			organizacionOpcion: opcion || null,
			oficioEscuela: oficio.trim() || null,
			publicacionesPuntaje: publicaciones === '' ? null : Number(publicaciones),
		})
	);
	const eficienciaGuardada = data.motivacion.find((m) => m.titulo.startsWith('3.'));
	const vivo = $derived.by(() => {
		const factores = {
			calidad: notaCalidad(numeroONulo(formularios), numeroONulo(suma)),
			eficiencia: data.factores.eficiencia,
			organizacion: puntajeOrganizacion(opcion, numeroONulo(puntajeOtro)),
			publicaciones: publicaciones === '' ? null : Number(publicaciones),
		};
		return { factores, resultado: calcularIntegral(factores) };
	});

	const campo =
		'flex w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50';
	const urlFormato = `/calificacion/${data.calificacion.id}/integral/formato`;
	const enRevision = data.calificacion.estado === 'revision';
</script>

{#snippet header()}
	<div>Calificación integral</div>
{/snippet}

{#snippet factor(titulo: string, valor: number | null, maximo: number, decimales = true)}
	<div class="flex flex-col justify-between rounded-lg bg-gray-100 p-3 shadow-sm dark:bg-gray-800">
		<div class="text-sm text-slate-600 dark:text-slate-300">{titulo} <span class="text-xs">(hasta {maximo})</span></div>
		<div class="text-center text-2xl font-bold">{valor == null ? '—' : decimales ? cifra(valor) : cantidad(valor)}</div>
	</div>
{/snippet}

<PageLayout {header} username={data.user} backHref={`/calificacion/${data.calificacion.id}`}>
	<div class="container mx-auto max-w-5xl space-y-6 px-4">
		<div class="flex flex-wrap items-center gap-3">
			<div class="grow">
				<div class="text-xl font-bold">{data.funcionario.nombre}</div>
				<div class="text-sm text-slate-600 dark:text-slate-300">
					Periodo {data.calificacion.periodo} · C.C. {data.funcionario.cedula} ·
					{data.despachoSeccional ? data.despachoSeccional.nombre : 'Sin despacho que califica'}
				</div>
			</div>
			<a href={`/calificacion/${data.calificacion.id}`} class={buttonVariants({ variant: 'outline' })}>Calificación de rendimiento</a>
			{#if data.puedeDescargar}
				<a href={urlFormato} download class={buttonVariants({ variant: enRevision ? 'outline' : 'default' })}>
					{enRevision ? 'Descargar borrador (Word)' : 'Descargar formato (Word)'}
				</a>
			{/if}
		</div>

		{#if form?.error}
			<div
				role="alert"
				class="rounded-md border border-rose-300 bg-rose-50 px-4 py-3 text-rose-800 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-200"
			>
				<div class="font-medium">No se guardó</div>
				<div class="text-sm">{form.error}</div>
			</div>
		{:else if form?.success}
			<div
				role="status"
				class="rounded-md border border-emerald-300 bg-emerald-50 px-4 py-3 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
			>
				{form.mensaje}
			</div>
		{/if}

		<section class="space-y-3">
			<div class="grid grid-cols-2 gap-3 md:grid-cols-6">
				{@render factor('Calidad', vivo.factores.calidad, MAXIMOS.calidad)}
				{@render factor('Eficiencia', vivo.factores.eficiencia, MAXIMOS.eficiencia)}
				{@render factor('Organización', vivo.factores.organizacion, MAXIMOS.organizacion, false)}
				{@render factor('Publicaciones', vivo.factores.publicaciones, MAXIMOS.publicaciones, false)}
				<div class="col-span-2 flex flex-col justify-between rounded-lg bg-sky-50 p-3 shadow-sm dark:bg-sky-950">
					<div class="text-sm text-slate-600 dark:text-slate-300">Calificación integral (sobre 100)</div>
					{#if vivo.resultado.completa}
						<div class="text-center text-3xl font-bold text-sky-800 dark:text-sky-300">
							{vivo.resultado.entero} · {vivo.resultado.categoria}
						</div>
						<div class="text-center text-xs text-slate-500">Suma sin redondear: {cifra(vivo.resultado.suma)}</div>
					{:else}
						<div class="text-center text-lg font-medium text-slate-500">Faltan factores por digitar</div>
					{/if}
				</div>
			</div>
			<p class="text-xs text-slate-500">
				La nota se recalcula mientras digita. El documento sale con lo último que se guardó. Art. 22 y 23 del Acuerdo PSAA16-10618: se
				redondea solo el total; excelente de 85 a 100, buena de 60 a 84, insatisfactoria de 0 a 59.
			</p>
		</section>

		{#if data.avisos.length}
			<div
				class="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200"
			>
				<div class="font-medium">Para que el formato quede completo (según lo guardado):</div>
				<ul class="list-disc pl-5 text-sm">
					{#each data.avisos as aviso}
						<li>{aviso}</li>
					{/each}
				</ul>
			</div>
		{/if}

		{#if !data.puedeEditar}
			<div
				class="rounded-md border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
			>
				{enRevision
					? 'Solo revisores y administradores digitan estos datos.'
					: 'Los datos de la calificación integral solo se digitan mientras la calificación está en revisión.'}
			</div>
		{/if}

		<form
			method="post"
			action="?/guardar"
			use:enhance={() => {
				guardando = true;
				return async ({ update }) => {
					await update({ reset: false });
					guardando = false;
				};
			}}
		>
			<fieldset disabled={!data.puedeEditar || guardando} class="space-y-8">
				<!-- 1. Información del evaluado -->
				<section class="space-y-4">
					<h2 class="text-lg font-bold">1. Información del evaluado</h2>
					<p class="text-xs text-slate-500">
						Nombre, cédula, periodo y factor eficiencia salen del sistema y no se editan aquí. Si alguno está mal, se corrige en el sistema
						y se vuelve a generar la calificación.
					</p>
					<div class="grid gap-4 md:grid-cols-3">
						<div class="space-y-1.5 md:col-span-2">
							<Label for="palabrasApellidos">Nombre registrado: {data.funcionario.nombre}</Label>
							{#if data.opcionesNombre.length > 1}
								<select
									id="palabrasApellidos"
									name="palabrasApellidos"
									class={`${campo} h-9`}
									value={String(data.funcionario.palabrasApellidos)}
								>
									{#each data.opcionesNombre as o}
										<option value={String(o.palabrasApellidos)} selected={o.palabrasApellidos === data.funcionario.palabrasApellidos}
											>Nombres: {o.nombres} — Apellidos: {o.apellidos}</option
										>
									{/each}
								</select>
								{#if !data.funcionario.nombresGuardados}
									<p class="text-xs text-amber-700 dark:text-amber-300">
										Propuesta: las dos últimas palabras como apellidos. Con apellidos compuestos (p. ej. "de la Hoz") elija la forma
										correcta.
									</p>
								{/if}
							{:else}
								<div class="h-9 py-2 text-sm">Apellidos: {data.funcionario.apellidos} · Nombres: {data.funcionario.nombres}</div>
							{/if}
						</div>
						<div class="space-y-1.5">
							<Label for="genero">Género (para la redacción)</Label>
							<select id="genero" name="genero" class={`${campo} h-9`} bind:value={genero}>
								<option value="" selected={!data.funcionario.genero}>Sin definir: el texto sale con "(a)"</option>
								<option value="femenino" selected={data.funcionario.genero === 'femenino'}>Femenino: la doctora, identificada</option>
								<option value="masculino" selected={data.funcionario.genero === 'masculino'}>Masculino: el doctor, identificado</option>
							</select>
						</div>
					</div>

					<div class="grid gap-4 md:grid-cols-3">
						<div class="space-y-1.5">
							<Label for="cargo">Cargo en carrera</Label>
							<Input id="cargo" name="cargo" value={i?.cargoCarrera?.cargo ?? ''} placeholder="Juez Administrativo" />
						</div>
						<div class="space-y-1.5">
							<Label for="municipio">Municipio</Label>
							<Input id="municipio" name="municipio" value={i?.cargoCarrera?.municipio ?? ''} />
						</div>
						<div class="space-y-1.5">
							<Label for="distrito">Distrito</Label>
							<Input id="distrito" name="distrito" value={i?.cargoCarrera?.distrito ?? ''} />
						</div>
					</div>

					<details class="rounded-md border p-3" open={!!i?.provisionalidad?.length}>
						<summary class="cursor-pointer text-sm font-medium">Cargos en provisionalidad (si los hay)</summary>
						<p class="mt-2 text-xs text-slate-500">Sin cargo, la fila no aparece en el formato.</p>
						{#each [1, 2] as n}
							<div class="mt-3 grid gap-4 md:grid-cols-3">
								<div class="space-y-1.5">
									<Label for={`provCargo${n}`}>Cargo {n}</Label>
									<Input id={`provCargo${n}`} name={`provCargo${n}`} value={prov(n - 1)?.cargo ?? ''} />
								</div>
								<div class="space-y-1.5">
									<Label for={`provMunicipio${n}`}>Municipio</Label>
									<Input id={`provMunicipio${n}`} name={`provMunicipio${n}`} value={prov(n - 1)?.municipio ?? ''} />
								</div>
								<div class="space-y-1.5">
									<Label for={`provDistrito${n}`}>Distrito</Label>
									<Input id={`provDistrito${n}`} name={`provDistrito${n}`} value={prov(n - 1)?.distrito ?? ''} />
								</div>
							</div>
						{/each}
					</details>
				</section>

				<!-- 2. Periodo y fecha -->
				<section class="space-y-4">
					<h2 class="text-lg font-bold">2. Periodo y fecha de la calificación</h2>
					<div class="grid gap-4 md:grid-cols-3">
						<div class="space-y-1.5">
							<Label>Periodo calificado</Label>
							<div class="h-9 py-2 text-sm">1 de enero a 31 de diciembre de {data.calificacion.periodo}</div>
						</div>
						<div class="space-y-1.5">
							<Label for="fechaSala">Fecha de la sala (fecha de la calificación)</Label>
							<Input id="fechaSala" name="fechaSala" type="date" value={comoFecha(i?.fechaSala)} />
							<p class="text-xs text-slate-500">
								Se repite sola en la notificación (fecha en que se profirió el acto) y al final ("Aprobada en Sesión del ...").
							</p>
						</div>
						{#if !data.calificacion.despachoSeccionalId}
							<div class="space-y-1.5">
								<Label for="despachoSeccionalId">Despacho que califica</Label>
								<select id="despachoSeccionalId" name="despachoSeccionalId" class={`${campo} h-9`}>
									<option value="">Elegir…</option>
									{#each data.despachosSeccionales as d}
										<option value={d.id}>{d.nombre}</option>
									{/each}
								</select>
								<p class="text-xs text-slate-500">El despacho 2 usa los textos predeterminados; el despacho 1 digita la motivación.</p>
							</div>
						{/if}
					</div>
				</section>

				<!-- 3. Factores -->
				<section class="space-y-6">
					<h2 class="text-lg font-bold">3. Factores</h2>

					<div class="space-y-3">
						<h3 class="font-semibold">Calidad (hasta 42) — art. 31: suma de los puntajes ÷ número de formularios</h3>
						<div class="grid gap-4 md:grid-cols-3">
							<div class="space-y-1.5">
								<Label for="calidadFormularios">Número de formularios</Label>
								<Input id="calidadFormularios" name="calidadFormularios" type="number" min="1" step="1" bind:value={formularios} />
							</div>
							<div class="space-y-1.5">
								<Label for="calidadSuma">Suma de los puntajes</Label>
								<Input id="calidadSuma" name="calidadSuma" type="number" min="0" step="any" bind:value={suma} />
							</div>
							<div class="space-y-1.5">
								<Label>Factor calidad</Label>
								<div class="h-9 py-2 text-sm font-semibold">
									{vivo.factores.calidad == null ? '—' : cifra(vivo.factores.calidad)}
									{#if vivo.factores.calidad != null && vivo.factores.calidad > MAXIMOS.calidad}
										<span class="text-rose-700"> (pasa de 42: revise los datos)</span>
									{/if}
								</div>
							</div>
						</div>
					</div>

					<div class="space-y-3">
						<h3 class="font-semibold">Eficiencia o rendimiento (hasta 45) — sale del sistema</h3>
						<div class="text-sm">
							Factor eficiencia: <span class="font-semibold">{cifra(data.factores.eficiencia)}</span>. La motivación de este factor la arma
							el sistema con los datos de la calificación.
						</div>
						{#if data.textosPredeterminados && data.unSoloDespacho}
							<p class="text-sm">
								Días descontados (salen de las novedades registradas):
								<span class="italic">{data.descuentos ?? 'sin días descontados.'}</span>
							</p>
						{/if}
					</div>

					<div class="space-y-3">
						<h3 class="font-semibold">Organización del trabajo (hasta 12) — art. 47</h3>
						{#if data.textosPredeterminados}
							<div class="grid gap-4 md:grid-cols-3">
								<div class="space-y-1.5">
									<Label for="organizacionFechaVisita">Fecha de la visita</Label>
									<Input id="organizacionFechaVisita" name="organizacionFechaVisita" type="date" bind:value={fechaVisita} />
								</div>
								<div class="space-y-1.5 md:col-span-2">
									<Label for="organizacionOpcion">Texto de la motivación (fija el puntaje)</Label>
									<select id="organizacionOpcion" name="organizacionOpcion" class={`${campo} h-9`} bind:value={opcion}>
										<option value="">Elegir…</option>
										{#each data.opcionesOrganizacion as o}
											<option value={o.valor} selected={o.valor === opcion}>{o.etiqueta}</option>
										{/each}
									</select>
									<p class="text-xs text-slate-500">El texto elegido aparece en la sección 4, donde se puede modificar.</p>
								</div>
							</div>
							{#if opcion === 'sinEscuela' || opcion === 'sinAmbos'}
								<div class="space-y-1.5">
									<Label for="oficioEscuela">Oficio de la Escuela Judicial que citan los textos 3 y 4</Label>
									<Input id="oficioEscuela" name="oficioEscuela" bind:value={oficio} placeholder="EJO26-73 del 21 de enero de 2026" />
								</div>
							{:else}
								<input type="hidden" name="oficioEscuela" value={oficio} />
							{/if}
						{:else}
							<input type="hidden" name="organizacionOpcion" value="otro" />
						{/if}
						{#if opcion === 'otro'}
							<div class="grid gap-4 md:grid-cols-3">
								<div class="space-y-1.5">
									<Label for="organizacionPuntaje">Puntaje de organización (0 a 12)</Label>
									<Input
										id="organizacionPuntaje"
										name="organizacionPuntaje"
										type="number"
										min="0"
										max="12"
										step="any"
										bind:value={puntajeOtro}
									/>
								</div>
								{#if data.textosPredeterminados}
									<p class="self-end text-xs text-slate-500 md:col-span-2">
										La motivación de este puntaje se escribe en la sección 4, después del párrafo general de organización.
									</p>
								{/if}
							</div>
						{/if}
					</div>

					<div class="space-y-3">
						<h3 class="font-semibold">Publicaciones (hasta 1)</h3>
						<div class="grid gap-4 md:grid-cols-3">
							<div class="space-y-1.5">
								<Label for="publicacionesPuntaje">Puntaje</Label>
								<select id="publicacionesPuntaje" name="publicacionesPuntaje" class={`${campo} h-9`} bind:value={publicaciones}>
									<option value="">Elegir…</option>
									<option value="0" selected={publicaciones === '0'}>0 – no presentó publicaciones</option>
									<option value="1" selected={publicaciones === '1'}>1 – presentó publicación (se escribe el texto)</option>
								</select>
							</div>
						</div>
					</div>
				</section>

				<!-- 4. Motivación -->
				<section class="space-y-5">
					<h2 class="text-lg font-bold">4. Motivación de la evaluación</h2>
					{#if data.textosPredeterminados}
						<p class="text-sm text-slate-600 dark:text-slate-300">
							Calidad, organización y publicaciones salen con los textos predeterminados del despacho 2 y los datos de arriba, y se pueden
							modificar. Eficiencia la arma el sistema y no se modifica. Párrafos separados por una línea en blanco.
						</p>
						<MotivacionEditable
							name="calidadMotivacion"
							etiqueta="1. Factor calidad"
							predeterminada={predeterminadas.calidad}
							guardada={i?.calidadMotivacion}
							vacio="El texto aparece al digitar el número de formularios y la suma de los puntajes."
							filas={5}
							clase={`${campo} py-2 font-serif leading-relaxed`}
						/>
						<MotivacionEditable
							name="organizacionMotivacion"
							etiqueta="2. Factor organización del trabajo"
							ayuda={opcion === 'otro'
								? 'Con "Otro", escriba después del párrafo general la motivación del puntaje, separada por una línea en blanco.'
								: ''}
							predeterminada={predeterminadas.organizacion}
							guardada={i?.organizacionMotivacion}
							vacio="El texto aparece al digitar la fecha de la visita y elegir el texto de organización del trabajo."
							filas={12}
							clase={`${campo} py-2 font-serif leading-relaxed`}
						/>
						<div class="space-y-1.5">
							<div class="text-sm font-medium">
								3. Factor eficiencia o rendimiento <span class="font-normal text-slate-500">(sale del sistema, no se modifica)</span>
							</div>
							<div
								class="max-h-64 space-y-2 overflow-y-auto rounded-md border bg-slate-50 px-3 py-2 font-serif text-sm leading-relaxed text-slate-700 dark:bg-slate-900 dark:text-slate-300"
							>
								{#each eficienciaGuardada?.parrafos ?? [] as parrafo}
									<p>{parrafo}</p>
								{/each}
							</div>
						</div>
						<MotivacionEditable
							name="publicacionesMotivacion"
							etiqueta="4. Factor publicaciones"
							predeterminada={predeterminadas.publicaciones}
							guardada={i?.publicacionesMotivacion}
							vacio={publicaciones === '' ? 'Elija arriba el puntaje de publicaciones.' : 'Escriba el texto de la publicación presentada.'}
							filas={3}
							clase={`${campo} py-2 font-serif leading-relaxed`}
						/>
					{:else}
						<div class="space-y-1.5">
							<Label for="motivacionLibre">Motivación completa</Label>
							<textarea
								id="motivacionLibre"
								name="motivacionLibre"
								rows="18"
								class={`${campo} py-2 font-serif`}
								value={i?.motivacionLibre ?? ''}
							></textarea>
							<p class="text-xs text-slate-500">Un párrafo por bloque: separe los párrafos con una línea en blanco.</p>
						</div>
					{/if}
					<details class="rounded-md border p-3">
						<summary class="cursor-pointer text-sm font-medium">Vista previa de la motivación como sale en el Word (lo guardado)</summary>
						<div class="mt-3 space-y-4 font-serif text-sm leading-relaxed">
							{#each data.motivacion as seccion}
								<div class="space-y-2">
									{#if seccion.titulo}<div class="font-bold">{seccion.titulo}</div>{/if}
									{#each seccion.parrafos as parrafo}
										<p class={`text-justify ${parrafo.startsWith('[Pendiente') ? 'text-amber-700 dark:text-amber-300' : ''}`}>{parrafo}</p>
									{/each}
								</div>
							{/each}
						</div>
					</details>
				</section>

				<!-- 5. Calificador -->
				<section class="space-y-4">
					<h2 class="text-lg font-bold">5. Calificador y firma</h2>
					<div class="grid gap-4 md:grid-cols-3">
						<div class="space-y-1.5">
							<Label for="ponente">Ponente</Label>
							<Input id="ponente" name="ponente" value={i?.ponente ?? s.ponente ?? ''} placeholder="Consejera Ponente: NOMBRE" />
						</div>
						<div class="space-y-1.5">
							<Label for="presidente">Presidente</Label>
							<Input id="presidente" name="presidente" value={i?.presidente ?? s.presidente ?? ''} />
						</div>
						<div class="space-y-1.5">
							<Label for="iniciales">Iniciales de quienes proyectaron y revisaron</Label>
							<Input id="iniciales" name="iniciales" value={i?.iniciales ?? s.iniciales ?? ''} placeholder="CLRA/HEHR/IKBA/" />
						</div>
					</div>
					<p class="text-xs text-slate-500">
						Las iniciales van al final del documento, después de la notificación, junto con la fecha de la sala: "CLRA/HEHR/IKBA/ Aprobada
						en Sesión del 13 de noviembre de 2026."
					</p>
					{#if !i && (s.ponente || s.presidente || s.iniciales)}
						<p class="text-xs text-slate-500">Ponente, presidente e iniciales vienen de la última calificación del mismo despacho.</p>
					{/if}
				</section>

				{#if data.puedeEditar}
					<div class="flex justify-end gap-2 pb-8">
						<Button type="submit">{guardando ? 'Guardando…' : 'Guardar'}</Button>
					</div>
				{/if}
			</fieldset>
		</form>
	</div>
</PageLayout>
