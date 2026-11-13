import type { CalificacionIntegral } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import { revisarCompletitud, seccionesMotivacion, type EntradaDocumento } from './documento';
import { comoTexto, motivacionCalidad } from './motivacion';

const fecha = (s: string) => new Date(`${s}T00:00:00Z`);

const integral: CalificacionIntegral = {
	fechaSala: fecha('2026-11-13'),
	cargoCarrera: { cargo: 'Juez Civil', municipio: 'Tunja', distrito: 'Tunja' },
	provisionalidad: [],
	calidadFormularios: 13,
	calidadSuma: 512,
	organizacionFechaVisita: fecha('2026-07-24'),
	organizacionOpcion: 'completo',
	organizacionPuntaje: null,
	oficioEscuela: null,
	publicacionesPuntaje: 0,
	calidadMotivacion: null,
	organizacionMotivacion: null,
	publicacionesMotivacion: null,
	motivacionLibre: null,
	ponente: null,
	presidente: null,
	iniciales: null,
};

const entrada = (i: Partial<CalificacionIntegral> = {}): EntradaDocumento => ({
	periodo: 2025,
	funcionario: { nombres: 'Nombre', apellidos: 'Apellido', cedula: '1', genero: 'femenino' },
	eficiencia: { despachos: [], ponderada: 30 },
	integral: { ...integral, ...i },
	textosPredeterminados: true,
});

const parrafos = (e: EntradaDocumento, n: number) => seccionesMotivacion(e)[n].parrafos;
const calidadPredeterminada = comoTexto(motivacionCalidad({ genero: 'femenino', formularios: 13, suma: 512 }));

describe('motivación modificada a mano', () => {
	it('sin modificar sale el texto predeterminado', () => {
		expect(parrafos(entrada(), 0)[0]).toContain('El resultado de 39,38 puntos');
	});

	it('el texto modificado reemplaza al predeterminado, con sus párrafos', () => {
		const e = entrada({ calidadMotivacion: { texto: 'Texto propio.\n\nSegundo párrafo.', base: calidadPredeterminada } });
		expect(parrafos(e, 0)).toEqual(['Texto propio.', 'Segundo párrafo.']);
		// Los datos no cambiaron desde que se modificó: no hay aviso.
		expect(revisarCompletitud(e).join(' ')).not.toContain('se modificó a mano');
	});

	it('si los datos cambian después de modificar el texto, lo avisa', () => {
		const e = entrada({
			calidadFormularios: 14,
			calidadMotivacion: { texto: 'Texto con 39,38 puntos.', base: calidadPredeterminada },
		});
		expect(revisarCompletitud(e)).toContain(
			'El texto de calidad se modificó a mano y después cambiaron sus datos: revise que siga diciendo lo correcto.'
		);
	});

	it('cambiar el género también cambia el predeterminado y avisa', () => {
		const e = entrada({ calidadMotivacion: { texto: 'Propio.', base: calidadPredeterminada } });
		e.funcionario.genero = 'masculino';
		expect(revisarCompletitud(e).join(' ')).toContain('El texto de calidad se modificó a mano');
	});

	it('organización "otro" sin texto propio: párrafo general y pendiente la motivación del puntaje', () => {
		const e = entrada({ organizacionOpcion: 'otro', organizacionPuntaje: 10 });
		const t = parrafos(e, 1);
		expect(t).toHaveLength(2);
		expect(t[1]).toMatch(/^\[Pendiente: escribir la motivación del puntaje/);
		expect(revisarCompletitud(e).join(' ')).toContain('Eligió "Otro"');
	});

	it('organización "otro" con texto propio: sale lo escrito, sin pendiente', () => {
		const e = entrada({
			organizacionOpcion: 'otro',
			organizacionPuntaje: 10,
			organizacionMotivacion: { texto: 'Párrafo general.\n\nMotivación del descuento.', base: 'Párrafo general.' },
		});
		expect(parrafos(e, 1)).toEqual(['Párrafo general.', 'Motivación del descuento.']);
		expect(revisarCompletitud(e).join(' ')).not.toContain('Eligió "Otro"');
	});

	it('publicaciones con 1 punto: sin texto queda pendiente; con texto sale lo escrito', () => {
		expect(parrafos(entrada({ publicacionesPuntaje: 1 }), 3)).toEqual(['[Pendiente: digitar el texto de la publicación.]']);
		expect(revisarCompletitud(entrada({ publicacionesPuntaje: 1 }))).toContain(
			'Puntaje 1 en publicaciones: falta el texto de la publicación.'
		);
		const e = entrada({ publicacionesPuntaje: 1, publicacionesMotivacion: { texto: 'Libro X.', base: '' } });
		expect(parrafos(e, 3)).toEqual(['Libro X.']);
		expect(revisarCompletitud(e).join(' ')).not.toContain('publicaciones');
	});

	it('la eficiencia no se puede reemplazar: siempre la arma el sistema', () => {
		expect(seccionesMotivacion(entrada())[2].titulo).toBe('3. FACTOR EFICIENCIA O RENDIMIENTO');
	});
});
