import { describe, expect, it, vi } from 'vitest';

// El módulo importa el cliente de Prisma. Se reemplaza para que ninguna prueba
// pueda construirlo ni abrir una conexión: lo que se comprueba aquí son
// funciones puras, que reciben los datos ya consultados.
vi.mock('$lib/server/db-client', () => ({ db: {} }));

import { candidatosDeDespacho, decidirDespacho, normalizarNombreDespacho } from './carga-xlsx';

// Caso real documentado: 001 Civil Circuito Chiquinquirá cambió de código en
// 2025 y quedó partido en dos registros de despacho.
const NOMBRE = '001 Civil Circuito Chiquinquirá';
const CODIGO_ANTIGUO = '151763153001';
const CODIGO_VIGENTE = '151763103001';

const despacho = (over: Partial<Parametros> = {}): Parametros => ({
	id: 'vigente',
	codigo: CODIGO_VIGENTE,
	nombre: NOMBRE,
	ultimoRegistro: new Date('2025-12-31'),
	...over,
});
type Parametros = { id: string; codigo: string; nombre: string; ultimoRegistro: Date | null };

describe('normalizarNombreDespacho', () => {
	it('ignora tildes, signos, espacios de más y mayúsculas', () => {
		expect(normalizarNombreDespacho('001 Civil Circuito Chiquinquirá')).toBe('001 CIVIL CIRCUITO CHIQUINQUIRA');
		expect(normalizarNombreDespacho('  001   CIVIL-CIRCUITO  CHIQUINQUIRA ')).toBe('001 CIVIL CIRCUITO CHIQUINQUIRA');
	});

	it('distingue juzgados que solo se diferencian por el número o el municipio', () => {
		expect(normalizarNombreDespacho('001 Civil Circuito Tunja')).not.toBe(normalizarNombreDespacho('003 Civil Circuito Tunja'));
		expect(normalizarNombreDespacho('001 Civil Circuito Tunja')).not.toBe(normalizarNombreDespacho('001 Civil Circuito Chiquinquirá'));
	});
});

describe('candidatosDeDespacho', () => {
	it('recoge el del mismo código y los que comparten nombre, y descarta el resto', () => {
		const todos = [
			{ id: 'a', codigo: CODIGO_ANTIGUO, nombre: NOMBRE },
			{ id: 'b', codigo: CODIGO_VIGENTE, nombre: NOMBRE },
			{ id: 'c', codigo: '150013103003', nombre: '003 Civil Circuito Tunja' },
		];
		const candidatos = candidatosDeDespacho({ codigo: CODIGO_VIGENTE, nombre: NOMBRE }, todos);
		expect(candidatos.map((d) => d.id)).toEqual(['a', 'b']);
	});
});

describe('decidirDespacho', () => {
	it('usa el despacho cuyo código coincide', () => {
		const decision = decidirDespacho({ codigo: CODIGO_VIGENTE, nombre: NOMBRE, fecha: new Date('2025-12-31') }, [despacho()]);
		expect(decision).toEqual({ accion: 'usar', id: 'vigente', aviso: undefined });
	});

	it('reconoce el juzgado por nombre cuando cambió de código, y actualiza el código', () => {
		// El despacho existe solo con el código antiguo; llega el archivo de 2025.
		const existente = despacho({ id: 'antiguo', codigo: CODIGO_ANTIGUO, ultimoRegistro: new Date('2024-12-31') });
		const decision = decidirDespacho({ codigo: CODIGO_VIGENTE, nombre: NOMBRE, fecha: new Date('2025-12-31') }, [existente]);
		expect(decision).toEqual({
			accion: 'actualizarCodigo',
			id: 'antiguo',
			codigoAnterior: CODIGO_ANTIGUO,
			aviso: undefined,
		});
	});

	it('no retrocede el código cuando el archivo es anterior a lo ya registrado', () => {
		// Después de la fusión queda el código vigente con datos hasta 2025.
		// Cargar el archivo de 2023, que trae el código viejo, no debe deshacerla.
		const decision = decidirDespacho({ codigo: CODIGO_ANTIGUO, nombre: NOMBRE, fecha: new Date('2023-12-31') }, [despacho()]);
		expect(decision).toEqual({ accion: 'usar', id: 'vigente', aviso: undefined });
	});

	it('no cambia el código de un despacho que todavía no tiene registros', () => {
		const sinDatos = despacho({ ultimoRegistro: null });
		const decision = decidirDespacho({ codigo: CODIGO_ANTIGUO, nombre: NOMBRE, fecha: new Date('2023-12-31') }, [sinDatos]);
		expect(decision.accion).toBe('usar');
	});

	it('no crea un duplicado aunque el nombre venga escrito distinto', () => {
		const decision = decidirDespacho(
			{ codigo: CODIGO_VIGENTE, nombre: '001  CIVIL CIRCUITO CHIQUINQUIRA', fecha: new Date('2025-12-31') },
			[despacho({ id: 'antiguo', codigo: CODIGO_ANTIGUO, ultimoRegistro: new Date('2024-12-31') })]
		);
		expect(decision.accion).toBe('actualizarCodigo');
	});

	it('crea el despacho cuando no hay ninguno con ese código ni ese nombre', () => {
		const otro = despacho({ id: 'otro', codigo: '150013103003', nombre: '003 Civil Circuito Tunja' });
		const decision = decidirDespacho({ codigo: CODIGO_VIGENTE, nombre: NOMBRE, fecha: new Date('2025-12-31') }, [otro]);
		expect(decision).toEqual({ accion: 'crear' });
	});

	it('sin fecha en el archivo no cambia el código', () => {
		const existente = despacho({ id: 'antiguo', codigo: CODIGO_ANTIGUO, ultimoRegistro: new Date('2024-12-31') });
		const decision = decidirDespacho({ codigo: CODIGO_VIGENTE, nombre: NOMBRE, fecha: null }, [existente]);
		expect(decision.accion).toBe('usar');
	});

	describe('cuando el juzgado sigue partido en dos registros', () => {
		const partido = [
			despacho({ id: 'antiguo', codigo: CODIGO_ANTIGUO, ultimoRegistro: new Date('2024-12-31') }),
			despacho({ id: 'vigente', codigo: CODIGO_VIGENTE, ultimoRegistro: new Date('2025-12-31') }),
		];

		it('elige el del código vigente, no el primero de la lista', () => {
			const decision = decidirDespacho({ codigo: 'otrocodigo00', nombre: NOMBRE, fecha: new Date('2026-12-31') }, partido);
			expect(decision).toMatchObject({ accion: 'actualizarCodigo', id: 'vigente' });
		});

		it('avisa aunque el código del archivo coincida con uno de los dos', () => {
			const decision = decidirDespacho({ codigo: CODIGO_ANTIGUO, nombre: NOMBRE, fecha: new Date('2023-12-31') }, partido);
			expect(decision.aviso).toContain('2 registros');
			expect(decision.aviso).toContain(CODIGO_ANTIGUO);
			expect(decision.aviso).toContain(CODIGO_VIGENTE);
		});

		it('nunca crea un tercer registro', () => {
			const decision = decidirDespacho({ codigo: 'otrocodigo00', nombre: NOMBRE, fecha: new Date('2026-12-31') }, partido);
			expect(decision.accion).not.toBe('crear');
		});
	});
});
