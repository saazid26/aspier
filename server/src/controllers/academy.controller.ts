import type { Response, NextFunction } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
import mongoose from 'mongoose';
import Course from '../models/Course.js';
import Enrollment from '../models/Enrollment.js';
import ClassModel from '../models/Class.js';
import Instructor from '../models/Instructor.js';
import { HttpError } from '../middleware/error.js';
import { encrypt, decrypt } from '../utils/crypto.js';
import { fallbackCourses } from '../utils/fallbackData.js';
import { fastCache } from '../utils/fastCache.js';

export async function catalog(_req: AuthRequest, res: Response) {
  const cached = fastCache.get('academy:catalog');
  if (cached) return res.json({ success: true, data: cached });

  try {
    if (mongoose.connection.readyState === 1) {
      const courses = await Course.find({ status: 'published' }).populate('instructorId', 'name title photo').sort({ createdAt: -1 }).lean().maxTimeMS(2000);
      if (courses && courses.length > 0) {
        fastCache.set('academy:catalog', courses, 60);
        return res.json({ success: true, data: courses });
      }
    }
  } catch (err) {
    console.warn('[academy/catalog] fallback:', err instanceof Error ? err.message : err);
  }
  return res.json({ success: true, data: fallbackCourses });
}
export async function courseDetail(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = typeof req.params.id === 'string' ? req.params.id : '';
    const query = /^[0-9a-f]{24}$/i.test(id) ? { $or: [{ _id: id }, { slug: id }] } : { slug: id };
    const course = await Course.findOne(query).populate('instructorId');
    if (!course) {
      const fallback = fallbackCourses.find((c) => c._id === id || c.slug === id);
      if (fallback) return res.json({ success: true, data: fallback });
      throw new HttpError(404, 'Course not found');
    }
    const isAdmin = Boolean(req.user && ['admin', 'superadmin'].includes(req.user.role));
    if (course.status !== 'published' && !isAdmin) throw new HttpError(404, 'Course not found');
    let active = isAdmin;
    if (req.user) active = Boolean(await Enrollment.findOne({ userId: req.user._id, courseId: course._id, status: 'active' }));
    if (isAdmin) active = true;
    const safe = course.toObject();
    if (!active) (safe as any).modules = (safe as any).modules.map((module: any) => ({ ...module, lessons: module.lessons.map((lesson: any) => ({ ...lesson, youtubeVideoId: lesson.isFreePreview ? lesson.youtubeVideoId : undefined })) }));
    res.json({ success: true, data: safe });
  } catch (error) {
    const id = typeof req.params.id === 'string' ? req.params.id : '';
    const fallback = fallbackCourses.find((c) => c._id === id || c.slug === id);
    if (fallback) return res.json({ success: true, data: fallback });
    next(error);
  }
}
export async function learn(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const courseId = String(req.params.courseId || '');
    if (!courseId) throw new HttpError(400, 'Course identifier required');
    const course = /^[0-9a-f]{24}$/i.test(courseId)
      ? await Course.findById(courseId)
      : await Course.findOne({ slug: courseId });
    if (!course) throw new HttpError(404, 'Course not found');
    let lesson: any;
    for (const module of course.modules) lesson = module.lessons.find((l: any) => String(l._id) === req.params.lessonId);
    if (!lesson) throw new HttpError(404, 'Lesson not found');
    res.json({ success: true, data: { lessonId: lesson._id, title: lesson.title, youtubeVideoId: lesson.youtubeVideoId, watermark: `${req.user.email}|${req.user._id}` } });
  } catch (error) { next(error); }
}
export async function classSchedule(req: AuthRequest, res: Response) {
  try {
    const filter: any = req.params.courseId ? { courseId: req.params.courseId } : {};
    res.json({ success: true, data: await ClassModel.find(filter).sort({ scheduledAt: 1 }) });
  } catch {
    res.json({ success: true, data: [] });
  }
}
export async function joinMeet(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const classItem = await ClassModel.findById(req.params.classId).select('+meetLinkEncrypted +meetLink');
    if (!classItem) throw new HttpError(404, 'Class not found');
    const now = Date.now();
    const start = new Date(classItem.scheduledAt).getTime();
    if (now < start - 15 * 60 * 1000) throw new HttpError(423, 'The Meet link opens 15 minutes before the scheduled start');
    const value = classItem.meetLinkEncrypted ? decrypt(classItem.meetLinkEncrypted) : (classItem as any).meetLink;
    if (!value) throw new HttpError(404, 'Meet link unavailable');
    res.json({ success: true, data: { meetLink: value } });
  } catch (error) { next(error); }
}
export async function recording(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const classItem = await ClassModel.findById(req.params.classId);
    if (!classItem?.recordingYoutubeId) throw new HttpError(404, 'Recording unavailable');
    res.json({ success: true, data: { youtubeVideoId: classItem.recordingYoutubeId } });
  } catch (error) { next(error); }
}
export async function instructorProfile(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = typeof req.params.id === 'string' ? req.params.id : '';
    const instructor = await Instructor.findOne({ $or: [{ slug: id }, ...(/^[0-9a-f]{24}$/i.test(id) ? [{ _id: id }] : [])] as any });
    if (!instructor) throw new HttpError(404, 'Instructor not found');
    res.json({ success: true, data: instructor });
  } catch (error) { next(error); }
}
