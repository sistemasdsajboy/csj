import { describe, expect, it } from 'vitest';
import { db } from '$lib/server/db-client';
import { generarCalificacionFuncionario } from './generar-calificacion';

// PRUEBA DE INTEGRACIÓN — lee y escribe en la base de datos.
//
// Exige el escenario sembrado y recién creado:
//   node scripts/seed-desarrollo.mjs
//   PRUEBA_INTEGRACION=1 DATABASE_URL="<desarrollo>" vitest run generar-calificacion.integracion
const url = process.env.DATABASE_URL ?? '';
const esDesarrollo =
	/^mongodb:\/\/(127\.0\.0\.1|localhost)[:/]/.test(url) ||
	/@csj-desarrollo\.[a-z0-9]+\.mongodb\.net/.test(url) ||
	/ac-wmgm4fk-shard-\d+-\d+\./.test(url);

const activa = process.env.PRUEBA_INTEGRACION === '1' && esDesarrollo;

describe.skipIf(!activa)('generar la calificación de un juzgado partido en dos', () => {
	it('falla con un mensaje que se entiende, no con el de Prisma', async () => {
		const funcionario = await db.funcionario.findFirst({ where: { documento: '99999999' } });
		expect(funcionario, 'hay que sembrar primero: node scripts/seed-desarrollo.mjs').toBeTruthy();

		let mensaje = '';
		try {
			await generarCalificacionFuncionario(funcionario!.id, 2025);
			mensaje = '(no falló)';
		} catch (e) {
			mensaje = e instanceof Error ? e.message : String(e);
		}

		// Antes: "Argument `cargaProporcional` is missing", que no dice nada.
		expect(mensaje).not.toContain('cargaProporcional');
		expect(mensaje).not.toContain('Invalid `prisma');

		// Ahora: explica qué pasó y qué revisar.
		expect(mensaje).toContain('días hábiles');
		expect(mensaje).toContain('partido');

		console.log('\n  Mensaje que ve el usuario:\n  ' + mensaje + '\n');
	});
});
