import { z } from 'zod';

export const issueCertificateSchema = z.object({
  credentialId: z.string().trim().min(3).max(60).transform((val) => val.toUpperCase()),
  studentName: z.string().trim().min(2).max(150),
  studentEmail: z.string().trim().email().optional().or(z.literal('')).transform((v) => (v ? v.toLowerCase() : undefined)),
  courseTitle: z.string().trim().min(2).max(200),
  issueDate: z.coerce.date().optional().default(() => new Date()),
  enrollmentId: z.string().optional(),
  certificateImage: z.string().min(1, 'Certificate image is required').optional()
});

export const verifyCertificateQuerySchema = z.object({
  credentialId: z.string().trim().min(1, 'Credential ID is required')
});
