import { db } from '$lib/server/db-client';
import { datosDelFuncionario, datosEficiencia } from '$lib/core/calificaciones/integral/datos';
import { datosDocumento } from '$lib/core/calificaciones/integral/documento';
import { writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { generarFormatoIntegral } from './generar';

// PRUEBA sobre una copia LOCAL: genera el formato de una calificación real con
// datos digitados de ejemplo y lo deja en SALIDA_DOCX para revisarlo a ojo.
// Solo lee la base.
const url = process.env.DATABASE_URL ?? '';
// Se indica la cédula del funcionario en DOCUMENTO_FUNCIONARIO.
const activa =
	process.env.PRUEBA_INTEGRACION === '1' &&
	/^mongodb:\/\/(127\.0\.0\.1|localhost)[:/]/.test(url) &&
	!!process.env.SALIDA_DOCX &&
	!!process.env.DOCUMENTO_FUNCIONARIO;
const fecha = (s: string) => new Date(`${s}T00:00:00Z`);

describe.skipIf(!activa)('formato de calificación integral con datos reales', () => {
	it('genera el .docx de una calificación', { timeout: 120000 }, async () => {
		const documento = process.env.DOCUMENTO_FUNCIONARIO!;
		const periodo = Number(process.env.PERIODO_FORMATO ?? 2025);
		const f = await db.funcionario.findFirstOrThrow({ where: { documento } });
		const cp = await db.calificacionPeriodo.findFirstOrThrow({ where: { funcionarioId: f.id, periodo } });
		const funcionario = await datosDelFuncionario(f.id);
		const eficiencia = await datosEficiencia(cp.id);
		const datos = datosDocumento({
			periodo,
			funcionario: { ...funcionario, genero: funcionario.genero ?? 'femenino' },
			eficiencia,
			textosPredeterminados: true,
			integral: {
				fechaSala: fecha('2026-11-13'),
				cargoCarrera: { cargo: 'Juez Administrativo', municipio: 'Municipio de Prueba', distrito: 'Distrito de Prueba' },
				provisionalidad: [],
				calidadFormularios: 13,
				calidadSuma: 512,
				organizacionFechaVisita: fecha('2026-07-24'),
				organizacionOpcion: 'sinArl',
				organizacionPuntaje: null,
				oficioEscuela: 'EJO26-73 del 21 de enero de 2026',
				publicacionesPuntaje: 0,
				calidadMotivacion: null,
				organizacionMotivacion: null,
				publicacionesMotivacion: null,
				descuentosEditados: [],
				motivacionLibre: null,
				ponente: 'Consejera Ponente: [NOMBRE DE PRUEBA]',
				presidente: '[NOMBRE DE PRUEBA]',
				iniciales: '[INICIALES]/',
			},
		});
		writeFileSync(process.env.SALIDA_DOCX!, generarFormatoIntegral(datos));
		expect(datos.integral).not.toBe('');
	});
});
