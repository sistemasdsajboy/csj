import { db } from '$lib/server/db-client';
import { describe, expect, it } from 'vitest';
import { fusionarJuzgado, planesDeFusion } from './fusionar-despachos';

// PRUEBA DE INTEGRACIÓN sobre la copia de producción recién restaurada.
//
// Comprueba lo que hace la pantalla de "Juzgados duplicados": que el plan que
// se le muestra al usuario corresponda a la base, y que al aplicarlo no se
// pierda ni se duplique estadística.
//
// Fusiona UN juzgado, no los nueve: el resto queda para probar la pantalla a
// mano. Después de correrla, la copia ya no está limpia.
const url = process.env.DATABASE_URL ?? '';
const esDesarrollo =
	/^mongodb:\/\/(127\.0\.0\.1|localhost)[:/]/.test(url) ||
	/@csj-desarrollo\.[a-z0-9]+\.mongodb\.net/.test(url) ||
	/ac-wmgm4fk-shard-\d+-\d+\./.test(url);
const activa = process.env.PRUEBA_INTEGRACION === '1' && esDesarrollo;

describe.skipIf(!activa)('la pantalla de juzgados duplicados', () => {
	it('describe el plan y lo aplica sin perder estadística', { timeout: 300000 }, async () => {
		const planes = await planesDeFusion();
		expect(planes.length, 'la copia debe traer juzgados partidos por cambio de código').toBeGreaterThan(0);

		for (const p of planes)
			console.log(
				`${p.nombre}: se conserva ${p.vigente.codigo}, absorbe ${p.absorbidos.map((a) => a.codigo).join(', ')}` +
					` · ${p.filasRepetidas} filas repetidas · ${p.calificacionesARegenerar} calificaciones a regenerar` +
					(p.conflictos.length ? ` · ${p.conflictos.length} CONFLICTOS` : '')
			);

		const plan = planes.find((p) => !p.conflictos.length);
		expect(plan, 'debe haber al menos un juzgado sin conflictos').toBeTruthy();

		// El plan que se le muestra al usuario tiene que corresponder a la base.
		const antes = await db.despacho.findMany({ where: { nombre: plan!.nombre } });
		expect(antes.length).toBe(1 + plan!.absorbidos.length);
		const idsAntes = antes.map((d) => d.id);
		const registrosAntes = await db.registroCalificacion.count({ where: { despachoId: { in: idsAntes } } });
		const novedadesAntes = await db.novedadFuncionario.count({ where: { despachoId: { in: idsAntes } } });
		const consolidadosAntes = await db.registroCalificacion.count({
			where: { despachoId: { in: idsAntes }, categoria: 'Consolidado' },
		});

		const { absorbidos, filasDescartadas } = await fusionarJuzgado(plan!.nombre);
		expect(absorbidos).toBe(plan!.absorbidos.length);

		// Queda un solo despacho, y el que queda es el que anunció la pantalla.
		const despues = await db.despacho.findMany({ where: { nombre: plan!.nombre } });
		expect(despues.length).toBe(1);
		expect(despues[0].id).toBe(plan!.vigente.id);

		// El código que desapareció queda anotado. Es solo información: sirve para
		// saber con qué código se reportó la estadística de los años anteriores.
		for (const a of plan!.absorbidos) expect(despues[0].codigosAnteriores).toContain(a.codigo);
		expect(despues[0].codigosAnteriores).not.toContain(despues[0].codigo);

		// Nada se perdió por el camino: lo que había, menos las filas repetidas
		// que se descartaron y los consolidados que se borran para recalcular.
		const registrosDespues = await db.registroCalificacion.count({ where: { despachoId: despues[0].id } });
		expect(registrosDespues).toBe(registrosAntes - filasDescartadas - consolidadosAntes);
		expect(await db.novedadFuncionario.count({ where: { despachoId: despues[0].id } })).toBe(novedadesAntes);

		// No quedan huérfanos apuntando al despacho que desapareció.
		const absorbidosIds = plan!.absorbidos.map((a) => a.id);
		expect(await db.registroCalificacion.count({ where: { despachoId: { in: absorbidosIds } } })).toBe(0);
		expect(await db.registroAudiencias.count({ where: { despachoId: { in: absorbidosIds } } })).toBe(0);
		expect(await db.novedadFuncionario.count({ where: { despachoId: { in: absorbidosIds } } })).toBe(0);
		expect(await db.calificacionDespacho.count({ where: { despachoId: { in: absorbidosIds } } })).toBe(0);

		// Y la pantalla ya no lo ofrece.
		expect((await planesDeFusion()).some((p) => p.nombre === plan!.nombre)).toBe(false);
	});
});
