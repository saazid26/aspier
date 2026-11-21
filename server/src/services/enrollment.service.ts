import Enrollment from '../models/Enrollment.js';
export async function activateEnrollment(userId: string, courseId: string, expiresAt?: Date) {
  return Enrollment.findOneAndUpdate({ userId, courseId }, { $set: { status: 'active', enrolledAt: new Date(), ...(expiresAt ? { expiresAt } : {}) } }, { upsert: true, new: true, setDefaultsOnInsert: true });
}
