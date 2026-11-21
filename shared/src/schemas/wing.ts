import { z } from 'zod';
export const wingSchema = z.object({ name: z.string().trim().min(2).max(150), shortDescription: z.string().trim().max(300).optional(), description: z.string().trim().max(5000).optional(), disciplines: z.array(z.string()).default([]), objectives: z.array(z.string()).default([]), coverImage: z.string().url().optional().or(z.literal('')), order: z.number().int().nonnegative().default(0), isActive: z.boolean().default(true) });

