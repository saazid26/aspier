import type { Response, NextFunction } from 'express';
import type { AuthRequest } from './auth.js';
import Enrollment from '../models/Enrollment.js';
import ClassModel from '../models/Class.js';
import Course from '../models/Course.js';
import { HttpError } from './error.js';

export async function requireActiveEnrollment(req: AuthRequest, _res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new HttpError(401, 'Authentication required');
    if (['admin', 'superadmin'].includes(req.user.role)) return next();

    let courseId = req.params.courseId || req.body.courseId || req.query.courseId;

    if (!courseId && req.params.classId) {
      if (!/^[0-9a-f]{24}$/i.test(String(req.params.classId))) {
        throw new HttpError(404, 'Class not found');
      }
      const classDoc = await ClassModel.findById(req.params.classId);
      if (!classDoc) throw new HttpError(404, 'Class not found');
      courseId = classDoc.courseId;
    }

    if (courseId && !/^[0-9a-f]{24}$/i.test(String(courseId))) {
      const courseDoc = await Course.findOne({ slug: courseId });
      if (courseDoc) courseId = courseDoc._id;
    }

    if (!courseId) throw new HttpError(400, 'Course identifier required');

    if (req.user.role === 'instructor') {
      const courseDoc = await Course.findById(courseId);
      if (courseDoc) return next();
    }

    const enrollment = await Enrollment.findOne({ userId: req.user._id, courseId, status: 'active' });
    if (!enrollment) throw new HttpError(403, 'Active enrollment required');
    next();
  } catch (error) { next(error); }
}

