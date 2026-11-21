import { z } from 'zod';
export const paymentSchema = z.object({ courseId: z.string().min(1), method: z.enum(['bKash', 'Nagad']), senderNumber: z.string().regex(/^(?:\+?880|0)?1[3-9]\d{8}$/), trxId: z.string().trim().min(3).max(80), amount: z.number().positive() });

