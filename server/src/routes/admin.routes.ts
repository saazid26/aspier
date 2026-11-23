import { Router } from 'express';
import mongoose from 'mongoose';
import multer from 'multer';
import { connectDatabase } from '../config/db.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { noStore } from '../middleware/noStore.js';
import { audit } from '../middleware/audit.js';
import { crudFactory } from '../controllers/crud.factory.js';
import Wing from '../models/Wing.js';
import Research from '../models/Research.js';
import Supervisor from '../models/Supervisor.js';
import Scholar from '../models/Scholar.js';
import FoundingMember from '../models/FoundingMember.js';
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
import { approveAndSendOnboarding } from '../controllers/onboarding.controller.js';
import { listAdminNotifications, markAdminNotificationRead, markAllAdminNotificationsRead } from '../controllers/notification.controller.js';
import {
  deleteResearchApplication,
  downloadResearchApplicationCv,
  listResearchApplications,
  approveStage1ResearchApplication,
  confirmResearchPayment,
  updateWhatsAppLink
} from '../controllers/researchApplication.controller.js';
import {
  demoFoundingMembers,
  demoSupervisors,
  demoScholars,
  getFallbackWings,
  addOrUpdateFallbackWing,
  deleteFallbackWing,
  getFallbackResearch,
  addOrUpdateFallbackResearch,
  deleteFallbackResearch
} from '../utils/fallbackData.js';

const router = Router();
router.use(authenticate, authorize('admin', 'superadmin'), noStore);
router.get('/dashboard', async (_req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      await connectDatabase();
    }
    if (mongoose.connection.readyState !== 1) {
      return res.json({ success: true, data: { students: 0, activeEnrollments: 0, pendingPayments: 0, wings: 10, research: 3 } });
    }
    res.json({ success: true, data: { students: await User.countDocuments({ role: 'student' }), activeEnrollments: await Enrollment.countDocuments({ status: 'active' }), pendingPayments: await Payment.countDocuments({ status: 'pending' }), wings: await Wing.countDocuments(), research: await Research.countDocuments() } });
  } catch {
    res.json({ success: true, data: { students: 0, activeEnrollments: 0, pendingPayments: 0, wings: 10, research: 3 } });
  }
});
router.get('/notifications', listAdminNotifications);
router.patch('/notifications/read-all', markAllAdminNotificationsRead);
router.patch('/notifications/:id/read', markAdminNotificationRead);
router.get('/research-applications', listResearchApplications);
router.post('/research-applications/:id/approve-stage1', approveStage1ResearchApplication);
router.post('/research-applications/:id/confirm-payment', confirmResearchPayment);
router.put('/research-applications/:id/whatsapp-link', updateWhatsAppLink);
router.get('/research-applications/:id/cv', downloadResearchApplicationCv);
router.delete('/research-applications/:id', deleteResearchApplication);

router.get('/founding-members', audit('list', 'FoundingMember'), async (_req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      await connectDatabase();
    }
    if (mongoose.connection.readyState === 1) {
      const list = await FoundingMember.find().sort({ order: 1, createdAt: 1 });
      if (list && list.length > 0) return res.json({ success: true, data: list, pagination: { page: 1, limit: 100, total: list.length, pages: 1 } });
    }
  } catch {}
  return res.json({ success: true, data: demoFoundingMembers, pagination: { page: 1, limit: 100, total: demoFoundingMembers.length, pages: 1 } });
});

router.get('/supervisors', audit('list', 'Supervisor'), async (_req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      await connectDatabase();
    }
    if (mongoose.connection.readyState === 1) {
      const list = await Supervisor.find().sort({ order: 1, createdAt: 1 });
      if (list && list.length > 0) return res.json({ success: true, data: list, pagination: { page: 1, limit: 100, total: list.length, pages: 1 } });
    }
  } catch {}
  return res.json({ success: true, data: demoSupervisors, pagination: { page: 1, limit: 100, total: demoSupervisors.length, pages: 1 } });
});

router.get('/scholars', audit('list', 'Scholar'), async (_req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      await connectDatabase();
    }
    if (mongoose.connection.readyState === 1) {
      const list = await Scholar.find().sort({ order: 1, createdAt: 1 });
      if (list && list.length > 0) return res.json({ success: true, data: list, pagination: { page: 1, limit: 100, total: list.length, pages: 1 } });
    }
  } catch {}
  return res.json({ success: true, data: demoScholars, pagination: { page: 1, limit: 100, total: demoScholars.length, pages: 1 } });
});

router.get('/wings', audit('list', 'Wing'), async (_req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      await connectDatabase();
    }
    if (mongoose.connection.readyState === 1) {
      const list = await Wing.find().sort({ order: 1, createdAt: 1 });
      if (list && list.length > 0) return res.json({ success: true, data: list, pagination: { page: 1, limit: 100, total: list.length, pages: 1 } });
    }
  } catch {}
  const list = getFallbackWings();
  return res.json({ success: true, data: list, pagination: { page: 1, limit: 100, total: list.length, pages: 1 } });
});

router.post('/wings', audit('create', 'Wing'), async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      await connectDatabase();
    }
    let item: any = null;
    if (mongoose.connection.readyState === 1) {
      item = await Wing.create(req.body);
    }
    const saved = addOrUpdateFallbackWing(item ? item.toObject() : req.body);
    return res.status(201).json({ success: true, data: item || saved });
  } catch (err: any) {
    const saved = addOrUpdateFallbackWing(req.body);
    return res.status(201).json({ success: true, data: saved });
  }
});

router.put('/wings/:id', audit('update', 'Wing'), async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      await connectDatabase();
    }
    let item: any = null;
    if (mongoose.connection.readyState === 1) {
      item = await Wing.findByIdAndUpdate(req.params.id, req.body, { new: true });
    }
    const saved = addOrUpdateFallbackWing({ ...req.body, _id: req.params.id });
    return res.json({ success: true, data: item || saved });
  } catch (err: any) {
    const saved = addOrUpdateFallbackWing({ ...req.body, _id: req.params.id });
    return res.json({ success: true, data: saved });
  }
});

router.delete('/wings/:id', audit('delete', 'Wing'), async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      await connectDatabase();
    }
    if (mongoose.connection.readyState === 1) {
      await Wing.findByIdAndDelete(req.params.id);
    }
  } catch {}
  deleteFallbackWing(String(req.params.id));
  return res.json({ success: true, message: 'Wing deleted' });
});

router.get('/research', audit('list', 'Research'), async (_req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      await connectDatabase();
    }
    if (mongoose.connection.readyState === 1) {
      const list = await Research.find().populate('wingId', 'name slug').sort({ createdAt: -1 });
      if (list && list.length > 0) return res.json({ success: true, data: list, pagination: { page: 1, limit: 100, total: list.length, pages: 1 } });
    }
  } catch {}
  const list = getFallbackResearch();
  return res.json({ success: true, data: list, pagination: { page: 1, limit: 100, total: list.length, pages: 1 } });
});

router.post('/research', audit('create', 'Research'), async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      await connectDatabase();
    }
    let item: any = null;
    if (mongoose.connection.readyState === 1) {
      item = await Research.create(req.body);
    }
    const saved = addOrUpdateFallbackResearch(item ? item.toObject() : req.body);
    return res.status(201).json({ success: true, data: item || saved });
  } catch (err: any) {
    const saved = addOrUpdateFallbackResearch(req.body);
    return res.status(201).json({ success: true, data: saved });
  }
});

router.put('/research/:id', audit('update', 'Research'), async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      await connectDatabase();
    }
    let item: any = null;
    const researchId = String(req.params.id);
    if (mongoose.connection.readyState === 1) {
      if (mongoose.Types.ObjectId.isValid(researchId)) {
        item = await Research.findByIdAndUpdate(researchId, req.body, { new: true });
      }
      if (!item && req.body.slug) {
        item = await Research.findOneAndUpdate({ slug: req.body.slug }, req.body, { new: true });
      }
    }
    const saved = addOrUpdateFallbackResearch({ ...req.body, _id: item?._id ? String(item._id) : researchId });
    return res.json({ success: true, data: item || saved });
  } catch (err: any) {
    const saved = addOrUpdateFallbackResearch({ ...req.body, _id: String(req.params.id) });
    return res.json({ success: true, data: saved });
  }
});

router.delete('/research/:id', audit('delete', 'Research'), async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      await connectDatabase();
    }
    const researchId = String(req.params.id);
    if (mongoose.connection.readyState === 1) {
      if (mongoose.Types.ObjectId.isValid(researchId)) {
        await Research.findByIdAndDelete(researchId);
      } else {
        await Research.findOneAndDelete({ slug: researchId });
      }
    }
  } catch {}
  deleteFallbackResearch(String(req.params.id));
  return res.json({ success: true, message: 'Research project deleted' });
});

const mountCrud = (path: string, model: any) => {
  const crud = crudFactory(model);
  router.get(`/${path}`, audit('list', model.modelName), crud.list);
  router.get(`/${path}/:id`, crud.getById);
  router.post(`/${path}`, audit('create', model.modelName), crud.create);
  router.put(`/${path}/:id`, audit('update', model.modelName), crud.update);
  router.delete(`/${path}/:id`, audit('delete', model.modelName), crud.delete);
};
mountCrud('founding-members', FoundingMember); mountCrud('supervisors', Supervisor); mountCrud('scholars', Scholar); mountCrud('news', News); mountCrud('courses', Course); mountCrud('users', User); mountCrud('messages', Message); mountCrud('instructors', Instructor);

router.get('/payments', paymentQueue);
router.get('/membership-applications', adminMembershipApplications);
router.post('/membership-applications/:id/approve-onboarding', approveAndSendOnboarding);
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
