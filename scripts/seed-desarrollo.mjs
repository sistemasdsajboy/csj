/**
 * Datos de desarrollo para el sistema de calificaciones.
 *
 * Genera datos FICTICIOS que reproducen a propósito los dos problemas
 * reportados en producción, para poder desarrollar y probar las reparaciones
 * sin tocar datos reales:
 *
 *   1. Usuarios duplicados — el modelo User no tiene @unique en `username`,
 *      así que la base permite dos registros con el mismo nombre.
 *
 *   2. Juzgados que cambiaron de código — al cargar un archivo de estadísticas
 *      con el código nuevo, carga-xlsx.ts no reconoce el despacho existente y
 *      crea uno nuevo. El historial queda partido entre los dos registros.
 *
 * Uso:  node scripts/seed-desarrollo.mjs
 */

import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'node:fs';

// --- Carga de .env (Prisma Client no lo hace por sí solo en scripts) --------
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
// Este script ESCRIBE en la base de datos. Solo puede correr contra una base
// local. Si DATABASE_URL apunta a cualquier otro sitio, aborta sin conectarse.
const url = process.env.DATABASE_URL ?? '';
const esLocal = /^mongodb:\/\/(127\.0\.0\.1|localhost)[:/]/.test(url);

if (!esLocal) {
	console.error('\n╔═══════════════════════════════════════════════════════════╗');
	console.error('║  ABORTADO: este script escribe datos de prueba.           ║');
	console.error('║  Solo puede ejecutarse contra una base LOCAL.             ║');
	console.error('╚═══════════════════════════════════════════════════════════╝\n');
	console.error('DATABASE_URL apunta a:', url.replace(/:[^:@/]+@/, ':****@') || '(vacío)');
	console.error('\nSe esperaba algo como: mongodb://127.0.0.1:27018/...\n');
	process.exit(1);
}

const db = new PrismaClient();

const CODIGO_ANTIGUO = '150014003001';
const CODIGO_NUEVO = '150014189001';

async function main() {
	console.log('Base de datos:', url.replace(/:[^:@/]+@/, ':****@'));
	console.log('');

	// --- Tipo de despacho ---------------------------------------------------
	const tipo = await db.tipoDespacho.upsert({
		where: { nombre: 'Juzgado Civil Municipal' },
		update: {},
		create: {
			nombre: 'Juzgado Civil Municipal',
			especialidad: 'Civil',
			categoria: 'Municipal'
		}
	});

	// --- PROBLEMA 2: el mismo juzgado, partido en dos registros -------------
	// El despacho "antiguo" tiene el historial de 2022-2023.
	const despachoAntiguo = await db.despacho.create({
		data: {
			codigo: CODIGO_ANTIGUO,
			nombre: 'Juzgado Primero Civil Municipal De Tunja',
			numero: 1,
			tipoDespachoId: tipo.id,
			municipio: 'Tunja',
			distrito: 'Tunja'
		}
	});

	// Tras el cambio de código, carga-xlsx.ts creó este otro registro.
	// Nombre casi idéntico, sin tipo ni municipio: se creó automáticamente.
	const despachoNuevo = await db.despacho.create({
		data: {
			codigo: CODIGO_NUEVO,
			nombre: 'Juzgado Primero Civil Municipal De Tunja',
			numero: null,
			tipoDespachoId: null,
			municipio: null,
			distrito: null
		}
	});

	// --- Funcionario --------------------------------------------------------
	const funcionario = await db.funcionario.create({
		data: { documento: '1053999001', nombre: 'MARIA FERNANDA PRUEBA GOMEZ' }
	});

	// --- Historial partido entre los dos despachos --------------------------
	const registroBase = {
		clase: 'oral',
		categoria: 'Consolidado',
		inventarioInicial: 120,
		ingresoEfectivo: 340,
		cargaEfectiva: 460,
		egresoEfectivo: 310,
		conciliaciones: 12,
		inventarioFinal: 150,
		restan: 150,
		cargaBruta: 470
	};

	for (const [periodo, despachoId] of [
		[2022, despachoAntiguo.id],
		[2023, despachoAntiguo.id],
		[2024, despachoNuevo.id] // ← aquí se partió el historial
	]) {
		await db.registroCalificacion.create({
			data: {
				...registroBase,
				periodo,
				despachoId,
				funcionarioId: funcionario.id,
				desde: new Date(`${periodo}-01-01`),
				hasta: new Date(`${periodo}-12-31`),
				dias: 365
			}
		});
		await db.registroAudiencias.create({
			data: {
				periodo,
				despachoId,
				funcionarioId: funcionario.id,
				programadas: 90,
				atendidas: 74,
				aplazadasAjenas: 6,
				aplazadasJustificadas: 7,
				aplazadasNoJustificadas: 3
			}
		});
	}

	// --- PROBLEMA 1: usuarios duplicados ------------------------------------
	// Sin @unique en `username`, la base acepta ambos sin protestar.
	const expira = new Date(Date.now() + 10 * 60 * 1000);
	const duplicado = await Promise.all([
		db.user.create({
			data: { username: 'jperez', password: 'hash-ficticio-1', passwordExpiresAt: expira, roles: ['admin'] }
		}),
		db.user.create({
			data: { username: 'jperez', password: 'hash-ficticio-2', passwordExpiresAt: expira, roles: ['editor'] }
		})
	]);
	await db.user.create({
		data: { username: 'mrodriguez', password: 'hash-ficticio-3', passwordExpiresAt: expira, roles: ['reviewer'] }
	});

	// --- Resumen ------------------------------------------------------------
	console.log('Datos de prueba creados.\n');
	console.log('PROBLEMA 1 — usuarios duplicados');
	console.log(`  "jperez" existe ${duplicado.length} veces:`);
	for (const u of duplicado) console.log(`    ${u.id}  roles: ${u.roles.join(', ')}`);
	console.log('  findFirst() devolverá uno de los dos de forma arbitraria.\n');

	console.log('PROBLEMA 2 — juzgado partido por cambio de código');
	console.log(`  ${CODIGO_ANTIGUO}  ${despachoAntiguo.id}  (2022, 2023)`);
	console.log(`  ${CODIGO_NUEVO}  ${despachoNuevo.id}  (2024, creado automáticamente)`);
	console.log('  Es el mismo juzgado, con el historial repartido en dos registros.\n');

	const totales = {
		despachos: await db.despacho.count(),
		funcionarios: await db.funcionario.count(),
		registros: await db.registroCalificacion.count(),
		usuarios: await db.user.count()
	};
	console.log('Totales en la base:', totales);
}

main()
	.catch((e) => {
		console.error('\nFalló:', e.message);
		process.exit(1);
	})
	.finally(() => db.$disconnect());
