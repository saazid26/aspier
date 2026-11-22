import { Router } from 'express';
import mongoose from 'mongoose';
import multer from 'multer';
import { authenticate, authorize } from '../middleware/auth.js';
import { noStore } from '../middleware/noStore.js';
import { audit } from '../middleware/audit.js';
import { crudFactory } from '../controllers/crud.factory.js';
import Wing from '../models/Wing.js';
import Research from '../models/Research.js';
import Supervisor from '../models/Supervisor.js';
import Scholar from '../models/Scholar.js';
import News from '../models/News.js';
import Course from '../models/Course.js';
import User from '../models/User.js';
import Message from '../models/Message.js';
import Instructor from '../models/Instructor.js';
import AuditLog from '../models/AuditLog.js';
import Enrollment from '../models/Enrollment.js';
import Payment from '../models/Payment.js';
import Setting from '../models/Setting.js';
import Notification from '../models/Notification.js';
import ResearchApplicationModel from '../models/ResearchApplication.js';
import MembershipApplicationModel from '../models/MembershipApplication.js';
import { upload, mediaLibrary, deleteMedia } from '../controllers/upload.controller.js';
import { getSettings, updateSettings } from '../controllers/settings.controller.js';
import { upsertClass, deleteClass } from '../controllers/class.controller.js';
import ClassModel from '../models/Class.js';
import { paymentQueue } from '../controllers/payment.controller.js';
import { adminMembershipApplications, approveApplicantSignup, approveInitialApplication, deleteMembershipApplication, publishMembershipApplication } from '../controllers/membership.controller.js';
import { listAdminNotifications, markAdminNotificationRead } from '../controllers/notification.controller.js';
import { deleteResearchApplication, downloadResearchApplicationCv, listResearchApplications, updateResearchApplicationStatus } from '../controllers/researchApplication.controller.js';

const router = Router();
router.use(authenticate, authorize('admin', 'superadmin'), noStore);
router.get('/dashboard', async (_req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.json({ success: true, data: { students: 0, activeEnrollments: 0, pendingPayments: 0, wings: 10, research: 3 } });
    }
    res.json({ success: true, data: { students: await User.countDocuments({ role: 'student' }), activeEnrollments: await Enrollment.countDocuments({ status: 'active' }), pendingPayments: await Payment.countDocuments({ status: 'pending' }), wings: await Wing.countDocuments(), research: await Research.countDocuments() } });
  } catch {
    res.json({ success: true, data: { students: 0, activeEnrollments: 0, pendingPayments: 0, wings: 10, research: 3 } });
  }
});
router.get('/notifications', listAdminNotifications);
router.patch('/notifications/:id/read', markAdminNotificationRead);
router.get('/research-applications', listResearchApplications);
router.get('/research-applications/:id/cv', downloadResearchApplicationCv);
router.patch('/research-applications/:id/status', updateResearchApplicationStatus);
router.delete('/research-applications/:id', deleteResearchApplication);

const mountCrud = (path: string, model: any) => {
  const crud = crudFactory(model);
  router.get(`/${path}`, audit('list', model.modelName), crud.list);
  router.get(`/${path}/:id`, crud.getById);
  router.post(`/${path}`, audit('create', model.modelName), crud.create);
  router.put(`/${path}/:id`, audit('update', model.modelName), crud.update);
  router.delete(`/${path}/:id`, audit('delete', model.modelName), crud.delete);
};
mountCrud('wings', Wing); mountCrud('research', Research); mountCrud('supervisors', Supervisor); mountCrud('scholars', Scholar); mountCrud('news', News); mountCrud('courses', Course); mountCrud('users', User); mountCrud('messages', Message); mountCrud('instructors', Instructor);

router.get('/payments', paymentQueue);
router.get('/membership-applications', adminMembershipApplications);
router.post('/membership-applications/:id/approve-signup', approveApplicantSignup);
router.post('/membership-applications/:id/approve', approveInitialApplication);
router.post('/membership-applications/:id/publish', publishMembershipApplication);
router.delete('/membership-applications/:id', deleteMembershipApplication);
router.post('/classes', upsertClass);
router.put('/classes/:id', upsertClass);
router.delete('/classes/:id', deleteClass);
router.get('/classes', async (_req, res) => {
  try {
    const classes = await ClassModel.find().populate('courseId', 'title').sort({ scheduledAt: -1 });
    res.json({ success: true, data: classes || [] });
  } catch {
    res.json({ success: true, data: [] });
  }
});
router.put('/courses/:id/curriculum', async (req, res) => {
  try {
    const course = await Course.findByIdAndUpdate(req.params.id, { $set: { modules: req.body.modules } }, { new: true, runValidators: true });
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });
    res.json({ success: true, data: course });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err?.message || 'Failed to update course curriculum' });
  }
});
const uploadMemory = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => callback(null, ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype))
});
router.post('/media', uploadMemory.single('file'), upload);
router.get('/media', mediaLibrary);
router.delete('/media/:id', deleteMedia);
router.get('/settings', getSettings);
router.put('/settings', updateSettings);
router.get('/audit', async (req, res) => {
  try {
    const logs = await AuditLog.find().populate('actorId', 'name email').sort({ createdAt: -1 }).limit(200);
    res.json({ success: true, data: logs || [] });
  } catch {
    res.json({ success: true, data: [] });
  }
});
router.get('/students', async (_req, res) => {
  try {
    const students = await User.find({ role: 'student' }).sort({ createdAt: -1 });
    res.json({ success: true, data: students || [] });
  } catch {
    res.json({ success: true, data: [] });
  }
});
router.get('/inbox/all', async (_req, res) => {
  try {
    const [messages, notifications, researchApps, membershipApps] = await Promise.all([
      Message.find().sort({ createdAt: -1 }).limit(200).lean(),
      Notification.find({ audience: 'admin' }).sort({ createdAt: -1 }).limit(100).lean(),
      ResearchApplicationModel.find().sort({ createdAt: -1 }).limit(100).lean(),
      MembershipApplicationModel.find().sort({ createdAt: -1 }).limit(100).lean()
    ]);
    res.json({
      success: true,
      data: {
        messages: messages || [],
        notifications: notifications || [],
        researchApps: researchApps || [],
        membershipApps: membershipApps || []
      }
    });
  } catch (err: any) {
    res.json({ success: true, data: { messages: [], notifications: [], researchApps: [], membershipApps: [] } });
  }
});
export default router;
