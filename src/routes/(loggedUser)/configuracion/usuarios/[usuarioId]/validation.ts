import { z } from 'zod';

export const updateUserFormSchema = z.object({
	id: z.string(),
	username: z.string(),
	roles: z.array(z.enum(['admin', 'editor', 'reviewer'])),
	despachosSeccionalIds: z.array(z.string())
});

export type UpdateUserFormSchema = typeof updateUserFormSchema;
