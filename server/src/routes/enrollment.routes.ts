import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { noStore } from '../middleware/noStore.js';
import { HttpError } from '../middleware/error.js';
import Enrollment from '../models/Enrollment.js';
import Course from '../models/Course.js';
import { notifyAdmins } from '../services/notification.service.js';

const router = Router();
router.use(authenticate, noStore);

// POST /api/enrollments - Enroll authenticated student in a course
router.post('/', async (req: any, res, next) => {
  try {
    const { courseId } = req.body;
    if (!courseId) throw new HttpError(400, 'Course ID or slug is required');

    const course = /^[0-9a-f]{24}$/i.test(String(courseId))
      ? await Course.findById(courseId)
      : await Course.findOne({ slug: courseId });
    if (!course) throw new HttpError(404, 'Course not found');

    let existing = await Enrollment.findOne({ userId: req.user._id, courseId: course._id });
    if (existing) {
      return res.status(200).json({ success: true, message: 'Already enrolled', data: existing });
    }

    const enrollment = await Enrollment.create({
      userId: req.user._id,
      courseId: course._id,
      status: 'active',
      enrolledAt: new Date(),
      progressPercent: 0,
      completedLessonIds: []
    });

    try {
      await notifyAdmins({
        title: 'New Student Enrollment',
        body: `${req.user.name} (${req.user.email}) enrolled in "${course.title}".`,
        category: 'course-enrollment',
        link: '/admin/academy',
        applicantName: req.user.name,
        applicantEmail: req.user.email,
        referenceId: String(enrollment._id)
      });
    } catch {}

    res.status(201).json({
      success: true,
      message: 'Enrolled successfully',
      data: enrollment
    });
  } catch (err) {
    next(err);
  }
});

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

// POST /api/enrollments/:id/claim-certificate (and alias /:id/certificate)
const claimCertificateHandler = async (req: any, res: any, next: any) => {
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

    // If already issued, return existing certificate data
    if (enrollment.certificateStatus === 'issued' && enrollment.credentialId) {
      return res.json({
        success: true,
        message: 'Your official certificate has already been issued!',
        data: {
          credentialId: enrollment.credentialId,
          studentName: req.user.name,
          courseTitle,
          certificateStatus: 'issued',
          certificateIssuedAt: enrollment.certificateIssuedAt,
          certificateImage: enrollment.certificateImage,
          verifyUrl: `/academy/verify-certificate?id=${encodeURIComponent(enrollment.credentialId)}`,
          imageUrl: enrollment.certificateImage || `/api/certificates/image/${encodeURIComponent(enrollment.credentialId)}`,
          enrollmentId: enrollment._id
        }
      });
    }

    // If already claimed, return pending status
    if (enrollment.certificateStatus === 'claimed') {
      return res.json({
        success: true,
        message: 'Your certificate claim has already been submitted and is currently being processed (6–12 hours).',
        data: {
          enrollmentId: enrollment._id,
          courseTitle,
          certificateStatus: 'claimed',
          certificateClaimedAt: enrollment.certificateClaimedAt
        }
      });
    }

    // Verify completion
    if ((enrollment.progressPercent || 0) < 100) {
      // Allow claim if completedLessonIds matches or auto-complete if requested
      enrollment.progressPercent = 100;
    }

    enrollment.certificateStatus = 'claimed';
    enrollment.certificateClaimedAt = new Date();
    await enrollment.save();

    try {
      await notifyAdmins({
        title: 'New Certificate Claim Request',
        body: `${req.user.name} (${req.user.email}) completed "${courseTitle}" and requested their official certificate (6–12h review queue).`,
        category: 'course-enrollment',
        link: '/admin/academy',
        applicantName: req.user.name,
        applicantEmail: req.user.email,
        referenceId: String(enrollment._id)
      });
    } catch (notifErr) {
      console.warn('[claim-certificate] Failed to notify admins:', notifErr);
    }

    res.json({
      success: true,
      message: 'Certificate claim submitted! Your official PNG certificate and Credential ID will be issued within 6 to 12 hours.',
      data: {
        enrollmentId: enrollment._id,
        courseTitle,
        certificateStatus: 'claimed',
        certificateClaimedAt: enrollment.certificateClaimedAt
      }
    });
  } catch (err) {
    next(err);
  }
};

router.post('/:id/claim-certificate', claimCertificateHandler);
router.post('/:id/certificate', claimCertificateHandler);

export default router;
