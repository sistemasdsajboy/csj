import _ from 'lodash';
import { z } from 'zod';

export const registroCalificacionDataSchemaColumns = [
	'categoria',
	'funcionario',
	'desde',
	'hasta',
	'inventarioInicial',
	'ingresoEfectivo',
	'cargaEfectiva',
	'egresoEfectivo',
	'conciliaciones',
	'inventarioFinal',
	'restan'
];

export const registroCalificacionDataSchema = z.object({
	categoria: z.string(),
	funcionario: z.string(),
	desde: z.coerce.date(),
	hasta: z.coerce.date(),
	inventarioInicial: z.number(),
	ingresoEfectivo: z.number(),
	cargaEfectiva: z.number(),
	egresoEfectivo: z.number(),
	conciliaciones: z.number(),
	inventarioFinal: z.number(),
	restan: z.number()
});

export type RegistroCalificacionData = z.infer<typeof registroCalificacionDataSchema>;

export type RegistroCalificacionPage = {
	name: string;
	data: RegistroCalificacionData[];
};

export type NovedadRegistroCalificacion = {
	type: string;
	from: Date;
	to: Date;
	days: number;
	notes: string;
};

export type RegistroCalificacion = {
	despacho: string;
	data: RegistroCalificacionPage[];
	funcionarios: string[];
	novedades?: NovedadRegistroCalificacion[];
};
