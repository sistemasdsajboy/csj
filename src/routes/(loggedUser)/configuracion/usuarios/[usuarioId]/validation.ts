import { UserRoles } from '@prisma/client';
import { z } from 'zod';

export const updateUserFormSchema = z.object({
	id: z.string(),
	username: z.string(),
	roles: z.array(z.nativeEnum(UserRoles)),
	despachosSeccionalIds: z.array(z.string())
});

export type UpdateUserFormSchema = typeof updateUserFormSchema;
