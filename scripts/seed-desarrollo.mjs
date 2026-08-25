/**
 * Datos de desarrollo para el sistema de calificaciones.
 *
 * Reproduce el caso real detectado en producción: un juzgado que cambió de
 * código quedó partido en dos registros de Despacho, y el mismo funcionario
 * tiene registros bajo ambos en el mismo periodo.
 *
 * Consecuencia esperada al generar la calificación:
 *   generar-calificacion.ts trata los dos códigos como despachos distintos,
 *   uno de ellos queda con diasHabilesDespacho = 0, y la línea 137
 *       (cargaBaseCalificacionDespacho * diasHabilesFuncionario) / diasHabilesDespacho
 *   produce NaN. Prisma rechaza NaN y aborta con
 *       "Argument `cargaProporcional` is missing".
 *
 * Todos los datos son FICTICIOS. Los códigos de despacho son los reales
 * porque el patrón del cambio es lo que se está reproduciendo; el funcionario,
 * las cifras y las fechas son inventados.
 *
 * Uso:  node scripts/seed-desarrollo.mjs
 */

import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'node:fs';

// --- Carga de .env ---------------------------------------------------------
try {
	for (const linea of readFileSync('.env', 'utf8').split('\n')) {
		const m = linea.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
		if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
	}
} catch {
	console.error('No se encontró el archivo .env');
	process.exit(1);
}

// --- SALVAGUARDA ------------------------------------------------------------
// Este script ESCRIBE y BORRA. La comprobación es una lista de bases
// PERMITIDAS, no de prohibidas: si mañana aparece otra cadena de conexión, se
// rechaza por omisión en vez de colarse por no estar en una lista negra.
//
// Permitidas:
//   - MongoDB local (el montaje del equipo de la oficina)
//   - El clúster `csj-desarrollo` de Atlas, tanto en su forma `mongodb+srv://`
//     como en la estándar, que usa los servidores `ac-wmgm4fk-shard-*`
const url = process.env.DATABASE_URL ?? '';
const esLocal = /^mongodb:\/\/(127\.0\.0\.1|localhost)[:/]/.test(url);
const esDesarrolloAtlas = /@csj-desarrollo\.[a-z0-9]+\.mongodb\.net/.test(url) || /ac-wmgm4fk-shard-\d+-\d+\./.test(url);

if (!esLocal && !esDesarrolloAtlas) {
	console.error('\n╔═══════════════════════════════════════════════════════════╗');
	console.error('║  ABORTADO: este script escribe y borra datos de prueba.   ║');
	console.error('║  Solo puede ejecutarse contra la base LOCAL o contra el   ║');
	console.error('║  clúster de desarrollo `csj-desarrollo`.                  ║');
	console.error('╚═══════════════════════════════════════════════════════════╝\n');
	console.error('DATABASE_URL apunta a:', url.replace(/:[^:@/]+@/, ':****@') || '(vacío)');
	console.error('\nSe esperaba mongodb://127.0.0.1:27018/... o el clúster csj-desarrollo.\n');
	process.exit(1);
}

const db = new PrismaClient();

// Segunda salvaguarda, sobre los datos y no sobre la cadena: una base con
// cientos de despachos no es un entorno de pruebas, por más que la cadena
// pasara el filtro de arriba. Producción tiene cientos; desarrollo, un puñado.
const LIMITE_DESPACHOS = 50;
async function comprobarQueNoEsProduccion() {
	const n = await db.despacho.count();
	if (n <= LIMITE_DESPACHOS) return;
	console.error('\n╔═══════════════════════════════════════════════════════════╗');
	console.error('║  ABORTADO: esta base tiene demasiados datos para ser una  ║');
	console.error('║  base de pruebas. Podría ser producción.                  ║');
	console.error('╚═══════════════════════════════════════════════════════════╝\n');
	console.error(`Despachos encontrados: ${n} (el límite de seguridad es ${LIMITE_DESPACHOS}).`);
	console.error('No se modificó nada.\n');
	await db.$disconnect();
	process.exit(1);
}

// Caso real: JUZGADO 001 CIVIL MUNICIPAL DE CHIQUINQUIRA
const NOMBRE = 'JUZGADO 001 CIVIL MUNICIPAL DE CHIQUINQUIRA';
const COD_ANTIGUO = '151764053001'; // arrastra 2023-2024 y parte de 2025
const COD_VIGENTE = '151764003001'; // aparece solo en 2025 — confirmado por Hugo
const DOCUMENTO = '99999999';
const PERIODO = 2025;

async function limpiarDatosDePrueba() {
	// Se identifica por NOMBRE, no por código: el código de un despacho puede
	// cambiar —es justo lo que reproduce este escenario— y buscar por él dejaba
	// registros huérfanos que después impedían borrar al funcionario.
	const despachos = await db.despacho.findMany({
		where: { OR: [{ nombre: NOMBRE }, { codigo: { in: [COD_ANTIGUO, COD_VIGENTE] } }] },
		select: { id: true },
	});
	const ids = despachos.map((d) => d.id);
	if (ids.length) {
		await db.calificacionSubfactor.deleteMany({
			where: { calificacion: { despachoId: { in: ids } } },
		});
		await db.calificacionDespacho.deleteMany({ where: { despachoId: { in: ids } } });
		await db.registroCalificacion.deleteMany({ where: { despachoId: { in: ids } } });
		await db.registroAudiencias.deleteMany({ where: { despachoId: { in: ids } } });
		await db.despacho.deleteMany({ where: { id: { in: ids } } });
	}

	// El funcionario puede tener rastros colgando de despachos que ya no existen.
	const func = await db.funcionario.findFirst({ where: { documento: DOCUMENTO } });
	if (func) {
		await db.calificacionSubfactor.deleteMany({
			where: { calificacion: { calificacion: { funcionarioId: func.id } } },
		});
		await db.calificacionDespacho.deleteMany({ where: { calificacion: { funcionarioId: func.id } } });
		await db.calificacionPeriodo.deleteMany({ where: { funcionarioId: func.id } });
		await db.registroCalificacion.deleteMany({ where: { funcionarioId: func.id } });
		await db.registroAudiencias.deleteMany({ where: { funcionarioId: func.id } });
		await db.funcionario.delete({ where: { id: func.id } });
	}
	return ids.length;
}

// Registro de estadísticas con cifras plausibles.
function registro({ despachoId, funcionarioId, desde, hasta, dias, clase, categoria }) {
	return {
		periodo: PERIODO,
		despachoId,
		funcionarioId,
		clase,
		categoria,
		desde: new Date(desde),
		hasta: new Date(hasta),
		dias,
		inventarioInicial: 120,
		ingresoEfectivo: 200,
		cargaEfectiva: 320,
		egresoEfectivo: 180,
		conciliaciones: 5,
		inventarioFinal: 140,
		restan: 140,
		cargaBruta: 330,
	};
}

async function main() {
	await comprobarQueNoEsProduccion();

	console.log('Base de datos:', url.replace(/:[^:@/]+@/, ':****@'));

	const borrados = await limpiarDatosDePrueba();
	if (borrados) console.log(`Limpieza previa: ${borrados} despacho(s) de prueba eliminados.`);
	console.log('');

	const tipo = await db.tipoDespacho.upsert({
		where: { nombre: 'Juzgado Civil Municipal' },
		update: {},
		create: { nombre: 'Juzgado Civil Municipal', especialidad: 'Civil', categoria: 'Municipal' },
	});

	// La generación consulta la capacidad máxima por tipo y periodo.
	const yaHayCapacidad = await db.capacidadMaximaRespuesta.findFirst({
		where: { tipoDespachoId: tipo.id, periodo: PERIODO },
	});
	if (!yaHayCapacidad) {
		await db.capacidadMaximaRespuesta.create({
			data: { tipoDespachoId: tipo.id, periodo: PERIODO, cantidad: 593 },
		});
	}

	const datosDespacho = {
		nombre: NOMBRE,
		numero: 1,
		tipoDespachoId: tipo.id,
		municipio: 'Chiquinquirá',
		distrito: 'Chiquinquirá',
	};

	const antiguo = await db.despacho.create({ data: { ...datosDespacho, codigo: COD_ANTIGUO } });
	const vigente = await db.despacho.create({ data: { ...datosDespacho, codigo: COD_VIGENTE } });

	const funcionario = await db.funcionario.create({
		data: { documento: DOCUMENTO, nombre: 'WILSON PRUEBA ORTEGA' },
	});

	const base = { funcionarioId: funcionario.id };

	// --- Bajo el código ANTIGUO: enero a junio, datos normales --------------
	for (const clase of ['oral', 'tutelas']) {
		await db.registroCalificacion.create({
			data: registro({
				...base,
				despachoId: antiguo.id,
				desde: '2025-01-01',
				hasta: '2025-06-30',
				dias: 120,
				clase,
				categoria: clase === 'tutelas' ? 'Movimiento de Tutelas' : 'Procesos Ordinarios',
			}),
		});
	}

	// --- Bajo el código VIGENTE: rango degenerado ---------------------------
	// 2025-07-05 y 2025-07-06 son sábado y domingo: cero días hábiles.
	// Esto es lo que hace que diasHabilesDespacho quede en 0 y aparezca el NaN.
	for (const clase of ['oral', 'tutelas']) {
		await db.registroCalificacion.create({
			data: registro({
				...base,
				despachoId: vigente.id,
				desde: '2025-07-05',
				hasta: '2025-07-06',
				dias: 0,
				clase,
				categoria: clase === 'tutelas' ? 'Movimiento de Tutelas' : 'Procesos Ordinarios',
			}),
		});
	}

	// La generación exige un registro de audiencias por despacho.
	for (const d of [antiguo, vigente]) {
		await db.registroAudiencias.create({
			data: {
				periodo: PERIODO,
				despachoId: d.id,
				funcionarioId: funcionario.id,
				programadas: 90,
				atendidas: 74,
				aplazadasAjenas: 6,
				aplazadasJustificadas: 7,
				aplazadasNoJustificadas: 3,
			},
		});
	}

	console.log('Escenario creado.\n');
	console.log(`  ${NOMBRE}`);
	console.log(`    ${COD_ANTIGUO}  (antiguo)  ${antiguo.id}   ene-jun 2025`);
	console.log(`    ${COD_VIGENTE}  (VIGENTE)  ${vigente.id}   05-06 jul 2025 (fin de semana)\n`);
	console.log(`  Funcionario: WILSON PRUEBA ORTEGA  ${funcionario.id}\n`);
	console.log('Para reproducir el error, abre en el navegador:');
	console.log(`  http://localhost:5173/funcionario/${funcionario.id}?periodo=${PERIODO}`);
	console.log('y pulsa "Ver calificación".\n');
}

main()
	.catch((e) => {
		console.error('\nFalló:', e.message);
		process.exit(1);
	})
	.finally(() => db.$disconnect());
