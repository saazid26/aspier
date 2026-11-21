import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import { noStore } from '../middleware/noStore.js';
import { validate } from '../middleware/validate.js';
import User from '../models/User.js';
import Enrollment from '../models/Enrollment.js';
import Course from '../models/Course.js';
import { paymentHistory } from '../controllers/payment.controller.js';
const router = Router();
router.use(authenticate, noStore);
router.get('/', async (req: any, res) => res.json({ success: true, data: req.user }));
router.patch('/profile', validate(z.object({ name: z.string().min(2).optional(), avatar: z.string().optional() }).partial()), async (req: any, res) => res.json({ success: true, data: await User.findByIdAndUpdate(req.user._id, req.body, { new: true }) }));
router.get('/enrollments', async (req: any, res) => res.json({ success: true, data: await Enrollment.find({ userId: req.user._id }).populate('courseId', 'title slug thumbnail modules') }));
router.post('/progress', validate(z.object({ courseId: z.string().min(1), lessonId: z.string().min(1), completed: z.boolean().optional() })), async (req: any, res) => {
  const course = /^[0-9a-f]{24}$/i.test(req.body.courseId)
    ? await Course.findById(req.body.courseId)
    : await Course.findOne({ slug: req.body.courseId });
  const resolvedCourseId = course ? course._id : req.body.courseId;
  const updateOp = req.body.completed === false
    ? { $pull: { completedLessonIds: req.body.lessonId } }
    : { $addToSet: { completedLessonIds: req.body.lessonId } };
  const result = await Enrollment.findOneAndUpdate(
    { userId: req.user._id, courseId: resolvedCourseId, status: 'active' },
    updateOp,
    { new: true }
  );
  res.json({ success: true, message: 'Progress saved', data: { completedLessonIds: result?.completedLessonIds || [] } });
});
router.get('/payments', paymentHistory);
export default router;
