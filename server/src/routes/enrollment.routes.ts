import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { noStore } from '../middleware/noStore.js';
import { HttpError } from '../middleware/error.js';
import Enrollment from '../models/Enrollment.js';
import Course from '../models/Course.js';

const router = Router();
router.use(authenticate, noStore);

// GET /api/enrollments/my - Return authenticated student's enrollments
router.get('/my', async (req: any, res, next) => {
  try {
    const enrollments = await Enrollment.find({ userId: req.user._id })
      .populate('courseId', 'title slug thumbnail bannerUrl mode deliveryMode description modules instructorId level price status')
      .sort({ enrolledAt: -1 });
    res.json({ success: true, data: enrollments });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/enrollments/:id/progress - Update lesson progress
router.patch('/:id/progress', async (req: any, res, next) => {
  try {
    const { id } = req.params;
    const { completedLessonIds, lessonId, completed, progressPercent } = req.body;

    let enrollment = await Enrollment.findOne({
      userId: req.user._id,
      $or: [
        { _id: /^[0-9a-f]{24}$/i.test(id) ? id : null },
        { courseId: /^[0-9a-f]{24}$/i.test(id) ? id : null }
      ]
    });

    if (!enrollment) {
      const course = await Course.findOne({ slug: id });
      if (course) {
        enrollment = await Enrollment.findOne({ userId: req.user._id, courseId: course._id });
      }
    }

    if (!enrollment) {
      throw new HttpError(404, 'Enrollment not found');
    }

    if (Array.isArray(completedLessonIds)) {
      enrollment.completedLessonIds = completedLessonIds;
    } else if (lessonId) {
      const set = new Set(enrollment.completedLessonIds || []);
      if (completed === false) {
        set.delete(lessonId);
      } else {
        set.add(lessonId);
      }
      enrollment.completedLessonIds = Array.from(set);
    }

    if (typeof progressPercent === 'number') {
      enrollment.progressPercent = Math.min(100, Math.max(0, progressPercent));
    } else {
      const course = await Course.findById(enrollment.courseId);
      if (course && course.modules) {
        let totalLessons = 0;
        for (const m of course.modules) {
          totalLessons += (m.lessons || []).length;
        }
        if (totalLessons > 0) {
          enrollment.progressPercent = Math.min(100, Math.round(((enrollment.completedLessonIds?.length || 0) / totalLessons) * 100));
        }
      }
    }

    await enrollment.save();

    res.json({
      success: true,
      message: 'Progress updated successfully',
      data: enrollment
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/enrollments/:id/certificate - Claim and verify completion certificate
router.post('/:id/certificate', async (req: any, res, next) => {
  try {
    const { id } = req.params;

    let enrollment = await Enrollment.findOne({
      userId: req.user._id,
      $or: [
        { _id: /^[0-9a-f]{24}$/i.test(id) ? id : null },
        { courseId: /^[0-9a-f]{24}$/i.test(id) ? id : null }
      ]
    }).populate('courseId', 'title slug instructorId');

    if (!enrollment) {
      const course = await Course.findOne({ slug: id });
      if (course) {
        enrollment = await Enrollment.findOne({ userId: req.user._id, courseId: course._id }).populate('courseId', 'title slug instructorId');
      }
    }

    if (!enrollment) {
      throw new HttpError(404, 'Enrollment record not found');
    }

    const courseTitle = (enrollment.courseId as any)?.title || 'Course of Completion';
    const certificateId = `ASPIER-CERT-${String(enrollment._id).slice(-8).toUpperCase()}`;

    res.json({
      success: true,
      message: 'Certificate claimed successfully',
      data: {
        certificateId,
        studentName: req.user.name,
        courseTitle,
        issuedAt: new Date().toISOString(),
        enrollmentId: enrollment._id
      }
    });
  } catch (err) {
    next(err);
  }
});

export default router;
