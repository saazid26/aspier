import { z } from 'zod';
const strongPassword = z.string().min(8).max(128)
  .regex(/[a-z]/, 'Use at least one lowercase letter')
  .regex(/[A-Z]/, 'Use at least one uppercase letter')
  .regex(/\d/, 'Use at least one number')
  .refine((value) => !value.toLowerCase().includes('password') && !value.includes('123456'), 'Password is too common');
export const registerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254).transform((v) => v.toLowerCase()),
  password: strongPassword,
  role: z.literal('student').optional()
});
export const loginSchema = z.object({
  email: z.string().trim().email().transform((v) => v.toLowerCase()),
  password: z.string().min(1).max(128),
  totpCode: z.string().optional()
});
export const passwordSchema = z.object({ password: strongPassword, confirmPassword: strongPassword }).refine((v) => v.password === v.confirmPassword, { message: 'Passwords do not match', path: ['confirmPassword'] });

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  fullName: z.string().trim().min(2).max(100).optional(),
  email: z.string().trim().email().max(254).transform((v) => v.toLowerCase()).optional(),
  avatarUrl: z.string().trim().max(10000000).optional(),
  avatar: z.string().trim().max(10000000).optional(),
  phone: z.string().trim().max(50).optional().default(''),
  university: z.string().trim().max(150).optional().default(''),
  institution: z.string().trim().max(150).optional().default(''),
  department: z.string().trim().max(150).optional().default(''),
  academicLevel: z.string().trim().max(100).optional().default(''),
  session: z.string().trim().max(100).optional().default(''),
  studentId: z.string().trim().max(50).optional().default(''),
  rollNumber: z.string().trim().max(50).optional().default(''),
  city: z.string().trim().max(100).optional().default(''),
  bio: z.string().trim().max(1000).optional().default('')
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

