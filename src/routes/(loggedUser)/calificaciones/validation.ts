import { CategoriaDespacho, EspecialidadDespacho, EstadoCalificacion } from '@prisma/client';
import { z } from 'zod';

export const filtroCalificacionesSchema = z.discriminatedUnion('filter', [
	z.object({
		filter: z.literal('estado'),
		value: z.nullable(z.nativeEnum(EstadoCalificacion))
	}),
	z.object({
		filter: z.literal('despachoSeccionalId'),
		value: z.nullable(z.string())
	}),
	z.object({
		filter: z.literal('periodo'),
		value: z.nullable(z.string())
	}),
	z.object({
		filter: z.literal('especialidad'),
		value: z.nullable(z.nativeEnum(EspecialidadDespacho))
	}),
	z.object({
		filter: z.literal('categoria'),
		value: z.nullable(z.nativeEnum(CategoriaDespacho))
	}),
	z.object({
		filter: z.literal('municipio'),
		value: z.nullable(z.string())
	}),
	z.object({
		filter: z.literal('distrito'),
		value: z.nullable(z.string())
	})
]);
