import { CategoriaDespacho, EspecialidadDespacho, EstadoCalificacion } from '@prisma/client';
import { z } from 'zod';

export const filtroCalificacionesSchema = z.discriminatedUnion('filter', [
	z.object({
		filter: z.literal('estado'),
		value: z.nullable(z.nativeEnum(EstadoCalificacion)),
	}),
	z.object({
		filter: z.literal('despachoSeccionalId'),
		value: z.nullable(z.string()),
	}),
	z.object({
		filter: z.literal('periodo'),
		// Un año, no cualquier texto: este valor se guarda en Preferencias y
		// después pasa por parseInt para consultar. Si no es un número, Prisma
		// rechaza la consulta y la lista de calificaciones queda en error.
		value: z.nullable(z.string().regex(/^\d{4}$/, 'El periodo debe ser un año de cuatro cifras')),
	}),
	z.object({
		filter: z.literal('tipoDespachoId'),
		value: z.nullable(z.string()),
	}),
	z.object({
		filter: z.literal('municipio'),
		value: z.nullable(z.string()),
	}),
	z.object({
		filter: z.literal('distrito'),
		value: z.nullable(z.string()),
	}),
]);
