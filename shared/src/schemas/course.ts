import { z } from 'zod';
export const lessonSchema = z.object({ title: z.string().min(1).max(200), order: z.number().int().nonnegative(), youtubeVideoId: z.string().max(100).optional(), duration: z.number().nonnegative().default(0), resources: z.array(z.string()).default([]), isFreePreview: z.boolean().default(false) });
export const courseDeliveryModes = ['Online and Recorded', 'Online and Live', 'In-Person Workshop'] as const;
export type CourseDeliveryMode = (typeof courseDeliveryModes)[number];
export function normalizeCourseDeliveryMode(value?: string): CourseDeliveryMode {
  if (value === 'Online and Live' || value === 'Online / Live') return 'Online and Live';
  if (value === 'In-Person Workshop' || value === 'Offline' || value === 'Offline (Physical)') return 'In-Person Workshop';
  return 'Online and Recorded';
}
export const courseInstructorSchema = z.object({
  name: z.string().min(1),
  designationOrDetails: z.string().optional(),
  photoUrl: z.string().optional(),
  bio: z.string().optional(),
  researchGateUrl: z.string().trim().optional().or(z.literal('')),
  googleScholarUrl: z.string().trim().optional().or(z.literal('')),
  linkedInUrl: z.string().trim().optional().or(z.literal('')),
  orcidUrl: z.string().trim().optional().or(z.literal('')),
  websiteUrl: z.string().trim().optional().or(z.literal(''))
});
export type CourseInstructor = z.infer<typeof courseInstructorSchema>;

export const courseSchema = z.object({
  title: z.string().trim().min(2).max(200),
  description: z.string().trim().max(10000),
  wingId: z.string().optional(),
  instructorId: z.string().optional(),
  instructors: z.array(courseInstructorSchema).optional(),
  price: z.number().nonnegative(),
  thumbnail: z.string().optional(),
  googleClassroomUrl: z.string().trim().optional().or(z.literal('')),
  duration: z.string().trim().optional(),
  mode: z.preprocess((v) => (typeof v === 'string' ? normalizeCourseDeliveryMode(v) : v), z.enum(courseDeliveryModes)).optional(),
  deliveryMode: z.preprocess((v) => (typeof v === 'string' ? normalizeCourseDeliveryMode(v) : v), z.enum(courseDeliveryModes)).optional(),
  startDate: z.string().trim().optional(),
  level: z.enum(['beginner', 'intermediate', 'advanced']).default('beginner'),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
  modules: z.array(z.object({ title: z.string().min(1), order: z.number().int(), lessons: z.array(lessonSchema).default([]) })).default([])
});

