import { z } from 'zod';
export const researchSchema = z.object({
  title: z.string().trim().min(2).max(250),
  slug: z.string().optional(),
  abstract: z.string().trim().max(10000).optional().or(z.literal('')),
  content: z.string().optional(),
  objectives: z.string().optional(),
  wingId: z.string().min(1),
  category: z.enum(['ongoing', 'present', 'past', 'future']).default('ongoing'),
  status: z.enum(['draft', 'under_review', 'published', 'ongoing', 'archived']).default('published'),
  publicationUrl: z.string().optional().or(z.literal('')),
  doiUrl: z.string().optional().or(z.literal('')),
  showReadPaperButton: z.boolean().default(true),
  authors: z.array(z.string()).default([]),
  supervisors: z.array(z.string()).default([]),
  linkedTeamMembers: z.array(z.any()).default([]),
  pdfUrl: z.string().url().optional().or(z.literal('')),
  coverImage: z.string().optional().or(z.literal('')),
  featured: z.boolean().default(false)
});


