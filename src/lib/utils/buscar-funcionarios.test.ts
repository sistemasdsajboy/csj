import { describe, expect, it } from 'vitest';
import { filtrarFuncionarios } from './buscar-funcionarios';

// El buscador anterior delegaba el filtrado en un componente de terceros y
// llegó a producción sin encontrar coincidencias. Estas pruebas fijan lo que
// tiene que hacer.

const lista = [
	{ label: 'WILSON URIEL ORTEGA PEÑA', value: '1' },
	{ label: 'ANA ELIZABETH QUINTERO CASTELLANOS', value: '2' },
	{ label: 'JAZMIN CONSUELO NIÑO GAMEZ', value: '3' },
	{ label: 'MÓNICA ROCÍO SÁNCHEZ HUERTAS', value: '4' },
	{ label: 'ANA MARIA ORTEGA RUIZ', value: '5' },
];

const etiquetas = (r: { label: string }[]) => r.map((f) => f.label);

describe('filtrarFuncionarios', () => {
	it('sin texto devuelve la lista completa', () => {
		expect(filtrarFuncionarios(lista, '')).toHaveLength(5);
		expect(filtrarFuncionarios(lista, '   ')).toHaveLength(5);
	});

	it('encuentra por un trozo del nombre, sin importar mayúsculas', () => {
		expect(etiquetas(filtrarFuncionarios(lista, 'wilson'))).toEqual(['WILSON URIEL ORTEGA PEÑA']);
	});

	it('encuentra por el apellido, que es como se busca en la oficina', () => {
		expect(etiquetas(filtrarFuncionarios(lista, 'ortega'))).toEqual(['WILSON URIEL ORTEGA PEÑA', 'ANA MARIA ORTEGA RUIZ']);
	});

	it('acepta las palabras en cualquier orden', () => {
		expect(etiquetas(filtrarFuncionarios(lista, 'ortega wilson'))).toEqual(['WILSON URIEL ORTEGA PEÑA']);
	});

	it('encuentra aunque no se escriban las tildes ni la Ñ', () => {
		expect(etiquetas(filtrarFuncionarios(lista, 'pena'))).toEqual(['WILSON URIEL ORTEGA PEÑA']);
		expect(etiquetas(filtrarFuncionarios(lista, 'monica'))).toEqual(['MÓNICA ROCÍO SÁNCHEZ HUERTAS']);
		expect(etiquetas(filtrarFuncionarios(lista, 'nino'))).toEqual(['JAZMIN CONSUELO NIÑO GAMEZ']);
	});

	it('también encuentra si se escriben las tildes', () => {
		expect(etiquetas(filtrarFuncionarios(lista, 'MÓNICA'))).toEqual(['MÓNICA ROCÍO SÁNCHEZ HUERTAS']);
		expect(etiquetas(filtrarFuncionarios(lista, 'PEÑA'))).toEqual(['WILSON URIEL ORTEGA PEÑA']);
	});

	it('devuelve vacío cuando no hay coincidencia', () => {
		expect(filtrarFuncionarios(lista, 'zzz')).toHaveLength(0);
	});

	it('ignora los espacios de sobra', () => {
		expect(etiquetas(filtrarFuncionarios(lista, '  ana   ortega  '))).toEqual(['ANA MARIA ORTEGA RUIZ']);
	});
});
