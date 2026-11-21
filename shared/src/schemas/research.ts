import { z } from 'zod';
export const researchSchema = z.object({ title: z.string().trim().min(2).max(250), abstract: z.string().trim().max(10000), content: z.string().optional(), wingId: z.string().min(1), status: z.enum(['draft', 'under_review', 'published']).default('draft'), authors: z.array(z.string()).default([]), supervisors: z.array(z.string()).default([]), pdfUrl: z.string().url().optional().or(z.literal('')), coverImage: z.string().url().optional().or(z.literal('')), featured: z.boolean().default(false) });

