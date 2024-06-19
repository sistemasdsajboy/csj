import { db } from '$lib/db/client';
import { error } from '@sveltejs/kit';
import _ from 'lodash';
import xlsx from 'node-xlsx';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ request, params }) => {
	const calificacion = await db.calificacion.findUnique({
		where: { id: params.calificacionId },
		include: { funcionario: { select: { nombre: true } } }
	});
	if (!calificacion) error(400, 'Calificación no encontrada');

	const datosEstadistica = await db.registroCalificacion.findMany({
		where: {
			categoria: { not: 'Consolidado' },
			periodo: calificacion.periodo,
			despachoId: calificacion.despachoId
		},
		select: {
			funcionario: { select: { nombre: true } },
			clase: true,
			categoria: true,
			desde: true,
			hasta: true,
			inventarioInicial: true,
			ingresoEfectivo: true,
			cargaEfectiva: true,
			egresoEfectivo: true,
			conciliaciones: true,
			inventarioFinal: true,
			restan: true
		}
	});

	const encabezadoPagina = [
		null,
		null,
		null,
		null,
		'Inventario inicial',
		'Ingreso efectivo',
		'Carga efectiva',
		'Egreso efectivo',
		'Conciliaciones',
		'Inventario final',
		null,
		'Restan'
	];

	const crearFila = (consolidado: (typeof datosEstadistica)[number]) => {
		return [
			consolidado.categoria,
			consolidado.funcionario.nombre,
			consolidado.desde,
			consolidado.hasta,
			consolidado.inventarioInicial,
			consolidado.ingresoEfectivo,
			consolidado.cargaEfectiva,
			consolidado.egresoEfectivo,
			consolidado.conciliaciones,
			consolidado.inventarioFinal,
			null,
			consolidado.restan
		];
	};

	const sheetOptions = {
		'!cols': [
			{ wch: 45 },
			{ wch: 30 },
			{ wch: 10 },
			{ wch: 10 },
			{ wch: 8 },
			{ wch: 8 },
			{ wch: 8 },
			{ wch: 8 },
			{ wch: 8 },
			{ wch: 8 },
			{ wch: 8 },
			{ wch: 8 }
		]
	};

	const paginas = _(datosEstadistica)
		.sortBy('desde')
		.groupBy('clase')
		.flatMap((datosPagina, clase) => {
			const data = _(datosPagina)
				.groupBy('categoria')
				.flatMap((datosCategoria) => [...datosCategoria.map(crearFila), []])
				.value();
			return [{ name: clase, data: [encabezadoPagina, ...data], options: {} }];
		})
		.value();

	var buffer = xlsx.build(paginas, { sheetOptions });
	return new Response(buffer, {
		headers: {
			'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			'Content-Disposition': `attachment; filename="consolidado-${calificacion.funcionario.nombre}-${calificacion.periodo}.xlsx"`
		}
	});
};
