import type { Response, NextFunction } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
import mongoose from 'mongoose';
import Course from '../models/Course.js';
import Enrollment from '../models/Enrollment.js';
import ClassModel from '../models/Class.js';
import Instructor from '../models/Instructor.js';
import Payment from '../models/Payment.js';
import { HttpError } from '../middleware/error.js';
import { encrypt, decrypt } from '../utils/crypto.js';
import { fallbackCourses } from '../utils/fallbackData.js';
import { fastCache } from '../utils/fastCache.js';

const APPROVED_ENROLLMENT_STATUSES = ['active', 'approved', 'final_approved', 'completed'];

async function getApprovedCourseIdSet(user: any): Promise<Set<string>> {
  if (!user?._id || user.role !== 'student') return new Set();
  const enrollments = await Enrollment.find({
    userId: user._id,
    status: { $in: APPROVED_ENROLLMENT_STATUSES }
  }).select('courseId').lean();
  return new Set(enrollments.map((e: any) => String(e.courseId)));
}

function sanitizeCoursesForUser(courses: any[], isStudent: boolean, approvedCourseIds: Set<string>) {
  return courses.map((course) => {
    const obj = typeof course.toObject === 'function' ? course.toObject() : { ...course };
    const isApproved = isStudent && approvedCourseIds.has(String(obj._id));
    if (!isApproved) {
      delete obj.googleClassroomUrl;
      obj.googleClassroomUrl = null;
      obj.userEnrollmentStatus = null;
    } else {
      obj.userEnrollmentStatus = 'approved';
    }
    return obj;
  });
}

export async function catalog(req: AuthRequest, res: Response) {
  const isStudent = Boolean(req.user && req.user.role === 'student');
  const approvedCourseIds = isStudent ? await getApprovedCourseIdSet(req.user).catch(() => new Set<string>()) : new Set<string>();

  const cached = fastCache.get('academy:catalog') as any[] | undefined;
  if (cached) {
    return res.json({ success: true, data: sanitizeCoursesForUser(cached, isStudent, approvedCourseIds) });
  }

  try {
    if (mongoose.connection.readyState === 1) {
      const courses = await Course.find({ status: 'published' }).populate('instructorId', 'name title photo').sort({ createdAt: -1 }).lean().maxTimeMS(2000);
      if (courses && courses.length > 0) {
        fastCache.set('academy:catalog', courses, 60);
        return res.json({ success: true, data: sanitizeCoursesForUser(courses, isStudent, approvedCourseIds) });
      }
    }
  } catch (err) {
    console.warn('[academy/catalog] fallback:', err instanceof Error ? err.message : err);
  }
  return res.json({ success: true, data: sanitizeCoursesForUser(fallbackCourses, isStudent, approvedCourseIds) });
}
export async function courseDetail(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = typeof req.params.id === 'string' ? req.params.id : '';
    const query = /^[0-9a-f]{24}$/i.test(id) ? { $or: [{ _id: id }, { slug: id }] } : { slug: id };
    const course = await Course.findOne(query).populate('instructorId');
    if (!course) {
      const fallback = fallbackCourses.find((c) => c._id === id || c.slug === id);
      if (fallback) {
        const fbCopy: any = { ...fallback, googleClassroomUrl: null, userEnrollmentStatus: null };
        return res.json({ success: true, data: fbCopy });
      }
      throw new HttpError(404, 'Course not found');
    }
    const isAdmin = Boolean(req.user && ['admin', 'superadmin'].includes(req.user.role));
    const isStudent = Boolean(req.user && req.user.role === 'student');
    if (course.status !== 'published' && !isAdmin) throw new HttpError(404, 'Course not found');
    let active = false;
    let enrollmentStatus: string | null = null;
    if (isStudent && req.user?._id) {
      const enr = await Enrollment.findOne({ userId: req.user._id, courseId: course._id }).lean();
      if (enr) {
        enrollmentStatus = enr.status;
        if (APPROVED_ENROLLMENT_STATUSES.includes(enr.status)) active = true;
      } else {
        const pendingPay = await Payment.findOne({ userId: req.user._id, courseId: course._id, status: 'pending' }).lean();
        if (pendingPay) enrollmentStatus = 'pending';
      }
    }
    const safe = course.toObject() as any;
    if (course.classes && course.classes.length > 0) {
      safe.classes = course.classes;
    }
    if (!active) {
      delete safe.googleClassroomUrl;
      safe.googleClassroomUrl = null;
      if (!isAdmin) {
        safe.modules = (safe.modules || []).map((module: any) => ({
          ...module,
          lessons: (module.lessons || []).map((lesson: any) => ({
            ...lesson,
            youtubeVideoId: lesson.isFreePreview ? lesson.youtubeVideoId : undefined
          }))
        }));
      }
    }
    safe.enrollmentStatus = enrollmentStatus;
    safe.userEnrollmentStatus = active ? 'approved' : enrollmentStatus;
    res.json({ success: true, data: safe });
  } catch (error) {
    const id = typeof req.params.id === 'string' ? req.params.id : '';
    const fallback = fallbackCourses.find((c) => c._id === id || c.slug === id);
    if (fallback) {
      const fbCopy: any = { ...fallback, googleClassroomUrl: null, userEnrollmentStatus: null };
      return res.json({ success: true, data: fbCopy });
    }
    next(error);
  }
}

export async function myEnrollments(req: AuthRequest, res: Response) {
  try {
    if (!req.user?._id || req.user.role !== 'student') return res.json({ success: true, data: [] });
    const [enrollments, pendingPayments] = await Promise.all([
      Enrollment.find({ userId: req.user._id })
        .populate('courseId', 'title slug thumbnail bannerUrl mode deliveryMode description modules classes instructorId level price status googleClassroomUrl')
        .sort({ enrolledAt: -1 })
        .lean(),
      Payment.find({ userId: req.user._id, status: 'pending' })
        .populate('courseId', 'title slug thumbnail bannerUrl mode deliveryMode description modules classes instructorId level price status')
        .sort({ submittedAt: -1 })
        .lean()
    ]);

    const seenCourseIds = new Set<string>();
    const sanitized = (enrollments || []).map((enr: any) => {
      const cId = String(enr.courseId?._id || enr.courseId || '');
      if (cId) seenCourseIds.add(cId);
      const isApproved = APPROVED_ENROLLMENT_STATUSES.includes(enr.status);
      if (enr.courseId && typeof enr.courseId === 'object' && !isApproved) {
        const courseCopy = { ...enr.courseId };
        delete courseCopy.googleClassroomUrl;
        return { ...enr, courseId: courseCopy };
      }
      return enr;
    });

    for (const pay of (pendingPayments || [])) {
      const cId = String((pay as any).courseId?._id || (pay as any).courseId || '');
      if (cId && !seenCourseIds.has(cId)) {
        seenCourseIds.add(cId);
        sanitized.push({
          _id: `pending-pay-${pay._id}`,
          userId: req.user._id,
          courseId: (pay as any).courseId,
          status: 'pending',
          completedLessonIds: [],
          paymentMethod: pay.method,
          trxId: pay.trxId,
          enrolledAt: pay.submittedAt
        });
      }
    }

    res.json({ success: true, data: sanitized });
  } catch {
    res.json({ success: true, data: [] });
  }
}

export async function enrollCourse(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { courseId, method = 'bKash', senderNumber, trxId, amount } = req.body || {};
    if (!courseId) throw new HttpError(400, 'Course ID is required');
    const course = /^[0-9a-f]{24}$/i.test(String(courseId))
      ? await Course.findById(courseId)
      : await Course.findOne({ slug: courseId });
    if (!course || course.status !== 'published') throw new HttpError(404, 'Course not found');

    const existingEnrollment = await Enrollment.findOne({
      userId: req.user._id,
      courseId: course._id,
      status: { $in: [...APPROVED_ENROLLMENT_STATUSES, 'pending'] }
    });
    if (existingEnrollment) {
      throw new HttpError(409, 'You have already enrolled or have a pending enrollment for this course');
    }
    const existingPendingPay = await Payment.findOne({ userId: req.user._id, courseId: course._id, status: 'pending' });
    if (existingPendingPay) {
      throw new HttpError(409, 'A pending payment already exists for this course');
    }
    if (Number(amount) !== course.price) {
      throw new HttpError(400, 'Payment amount does not match the course price');
    }
    if (!trxId || !senderNumber) {
      throw new HttpError(400, 'Sender number and transaction ID are required');
    }
    if (await Payment.exists({ trxId: String(trxId).trim() })) {
      throw new HttpError(409, 'This transaction ID has already been submitted');
    }
    const payment = await Payment.create({
      userId: req.user._id,
      courseId: course._id,
      method,
      senderNumber: String(senderNumber).trim(),
      trxId: String(trxId).trim(),
      amount: course.price
    });
    res.status(201).json({ success: true, data: payment });
  } catch (error) {
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
    if (!req.user?._id) return res.json({ success: true, data: [] });
    const isAdmin = ['admin', 'superadmin'].includes(req.user.role);
    if (isAdmin) {
      const filter: any = req.params.courseId ? { courseId: req.params.courseId } : {};
      return res.json({ success: true, data: await ClassModel.find(filter).sort({ scheduledAt: 1 }) });
    }
    const approvedIds = await getApprovedCourseIdSet(req.user);
    if (approvedIds.size === 0) return res.json({ success: true, data: [] });
    const filter: any = req.params.courseId
      ? (approvedIds.has(String(req.params.courseId)) ? { courseId: req.params.courseId } : { _id: null })
      : { courseId: { $in: Array.from(approvedIds) } };
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
