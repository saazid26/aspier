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
  rejectResearchApplication,
  confirmResearchPayment,
  updateWhatsAppLink
} from '../controllers/researchApplication.controller.js';
import {
  getFallbackWings,
  addOrUpdateFallbackWing,
  deleteFallbackWing,
  getFallbackResearch,
  addOrUpdateFallbackResearch,
  deleteFallbackResearch,
  getFallbackFoundingMembers,
  addOrUpdateFallbackFoundingMember,
  deleteFallbackFoundingMember,
  getFallbackSupervisors,
  addOrUpdateFallbackSupervisor,
  deleteFallbackSupervisor,
  getFallbackScholars,
  addOrUpdateFallbackScholar,
  deleteFallbackScholar
} from '../utils/fallbackData.js';
import { recordAudit } from '../services/audit.service.js';
import { seedAcademyData } from '../utils/seed.js';
import { fastCache } from '../utils/fastCache.js';
import { listAdminCertificates, issueAdminCertificate, updateAdminCertificate, deleteAdminCertificate } from '../controllers/certificate.controller.js';

const router = Router();
router.use(authenticate, authorize('admin', 'superadmin'), noStore);

// Instant live cache invalidation on any successful Admin CMS mutation
router.use((req, res, next) => {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    res.on('finish', () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        fastCache.clear();
      }
    });
  }
  next();
});
router.get('/dashboard', async (_req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      await connectDatabase();
    }
    if (mongoose.connection.readyState !== 1) {
      return res.json({ success: true, data: { students: 0, activeEnrollments: 0, pendingPayments: 0, wings: 10, research: 3 } });
    }
    const [students, activeEnrollments, pendingEnrollments, pendingPaymentsCount, wings, research] = await Promise.all([
      User.countDocuments({ role: 'student' }),
      Enrollment.countDocuments({ status: { $in: ['approved', 'active', 'Approved', 'Active'] } }),
      Enrollment.countDocuments({ status: { $in: ['pending', 'Pending'] } }),
      Payment.countDocuments({ status: { $in: ['pending', 'Pending'] } }),
      Wing.countDocuments(),
      Research.countDocuments()
    ]);
    res.json({
      success: true,
      data: {
        students,
        activeEnrollments,
        pendingPayments: Math.max(pendingEnrollments, pendingPaymentsCount),
        wings,
        research
      }
    });
  } catch {
    res.json({ success: true, data: { students: 0, activeEnrollments: 0, pendingPayments: 0, wings: 10, research: 3 } });
  }
});
router.get('/notifications', listAdminNotifications);
router.patch('/notifications/read-all', markAllAdminNotificationsRead);
router.patch('/notifications/:id/read', markAdminNotificationRead);
router.get('/research-applications', listResearchApplications);
router.post('/research-applications/:id/approve-stage1', approveStage1ResearchApplication);
router.post('/research-applications/:id/reject', rejectResearchApplication);
router.post('/research-applications/:id/confirm-payment', confirmResearchPayment);
router.put('/research-applications/:id/whatsapp-link', updateWhatsAppLink);
router.get('/research-applications/:id/cv', downloadResearchApplicationCv);
router.delete('/research-applications/:id', deleteResearchApplication);

// Founding Members CRUD
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
  const list = getFallbackFoundingMembers();
  return res.json({ success: true, data: list, pagination: { page: 1, limit: 100, total: list.length, pages: 1 } });
});

router.post('/founding-members', audit('create', 'FoundingMember'), async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      await connectDatabase();
    }
    let item: any = null;
    const body = { ...req.body };
    delete body._id;
    if (mongoose.connection.readyState === 1) {
      item = await FoundingMember.create(body);
    }
    const saved = addOrUpdateFallbackFoundingMember(item ? item.toObject() : req.body);
    return res.status(201).json({ success: true, data: item || saved });
  } catch (err: any) {
    const saved = addOrUpdateFallbackFoundingMember(req.body);
    return res.status(201).json({ success: true, data: saved });
  }
});

router.put('/founding-members/:id', audit('update', 'FoundingMember'), async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      await connectDatabase();
    }
    let item: any = null;
    const id = String(req.params.id);
    const body = { ...req.body };
    delete body._id;
    if (mongoose.connection.readyState === 1) {
      if (mongoose.Types.ObjectId.isValid(id)) {
        item = await FoundingMember.findByIdAndUpdate(id, body, { new: true });
      }
      if (!item && (body.slug || id)) {
        item = await FoundingMember.findOneAndUpdate({ $or: [{ slug: body.slug || id }, { name: body.name }] }, body, { new: true, upsert: true });
      }
    }
    const saved = addOrUpdateFallbackFoundingMember({ ...req.body, _id: item?._id ? String(item._id) : id });
    return res.json({ success: true, data: item || saved });
  } catch (err: any) {
    const saved = addOrUpdateFallbackFoundingMember({ ...req.body, _id: String(req.params.id) });
    return res.json({ success: true, data: saved });
  }
});

router.delete('/founding-members/:id', audit('delete', 'FoundingMember'), async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      await connectDatabase();
    }
    const id = String(req.params.id);
    if (mongoose.connection.readyState === 1) {
      if (mongoose.Types.ObjectId.isValid(id)) {
        await FoundingMember.findByIdAndDelete(id);
      } else {
        await FoundingMember.findOneAndDelete({ $or: [{ slug: id }, { name: id }] });
      }
    }
  } catch {}
  deleteFallbackFoundingMember(String(req.params.id));
  return res.json({ success: true, message: 'Founding member deleted' });
});

// Research Supervisors CRUD
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
  const list = getFallbackSupervisors();
  return res.json({ success: true, data: list, pagination: { page: 1, limit: 100, total: list.length, pages: 1 } });
});

router.post('/supervisors', audit('create', 'Supervisor'), async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      await connectDatabase();
    }
    let item: any = null;
    const body = { ...req.body };
    delete body._id;
    if (mongoose.connection.readyState === 1) {
      item = await Supervisor.create(body);
    }
    const saved = addOrUpdateFallbackSupervisor(item ? item.toObject() : req.body);
    return res.status(201).json({ success: true, data: item || saved });
  } catch (err: any) {
    const saved = addOrUpdateFallbackSupervisor(req.body);
    return res.status(201).json({ success: true, data: saved });
  }
});

router.put('/supervisors/:id', audit('update', 'Supervisor'), async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      await connectDatabase();
    }
    let item: any = null;
    const id = String(req.params.id);
    const body = { ...req.body };
    delete body._id;
    if (mongoose.connection.readyState === 1) {
      if (mongoose.Types.ObjectId.isValid(id)) {
        item = await Supervisor.findByIdAndUpdate(id, body, { new: true });
      }
      if (!item && (body.slug || id)) {
        item = await Supervisor.findOneAndUpdate({ $or: [{ slug: body.slug || id }, { name: body.name }] }, body, { new: true, upsert: true });
      }
    }
    const saved = addOrUpdateFallbackSupervisor({ ...req.body, _id: item?._id ? String(item._id) : id });
    return res.json({ success: true, data: item || saved });
  } catch (err: any) {
    const saved = addOrUpdateFallbackSupervisor({ ...req.body, _id: String(req.params.id) });
    return res.json({ success: true, data: saved });
  }
});

router.delete('/supervisors/:id', audit('delete', 'Supervisor'), async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      await connectDatabase();
    }
    const id = String(req.params.id);
    if (mongoose.connection.readyState === 1) {
      if (mongoose.Types.ObjectId.isValid(id)) {
        await Supervisor.findByIdAndDelete(id);
      } else {
        await Supervisor.findOneAndDelete({ $or: [{ slug: id }, { name: id }] });
      }
    }
  } catch {}
  deleteFallbackSupervisor(String(req.params.id));
  return res.json({ success: true, message: 'Supervisor deleted' });
});

// Young Scholars CRUD
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
  const list = getFallbackScholars();
  return res.json({ success: true, data: list, pagination: { page: 1, limit: 100, total: list.length, pages: 1 } });
});

router.post('/scholars', audit('create', 'Scholar'), async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      await connectDatabase();
    }
    let item: any = null;
    const body = { ...req.body };
    delete body._id;
    if (mongoose.connection.readyState === 1) {
      item = await Scholar.create(body);
    }
    const saved = addOrUpdateFallbackScholar(item ? item.toObject() : req.body);
    return res.status(201).json({ success: true, data: item || saved });
  } catch (err: any) {
    const saved = addOrUpdateFallbackScholar(req.body);
    return res.status(201).json({ success: true, data: saved });
  }
});

router.put('/scholars/:id', audit('update', 'Scholar'), async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      await connectDatabase();
    }
    let item: any = null;
    const id = String(req.params.id);
    const body = { ...req.body };
    delete body._id;
    if (mongoose.connection.readyState === 1) {
      if (mongoose.Types.ObjectId.isValid(id)) {
        item = await Scholar.findByIdAndUpdate(id, body, { new: true });
      }
      if (!item && (body.slug || id)) {
        item = await Scholar.findOneAndUpdate({ $or: [{ slug: body.slug || id }, { name: body.name }] }, body, { new: true, upsert: true });
      }
    }
    const saved = addOrUpdateFallbackScholar({ ...req.body, _id: item?._id ? String(item._id) : id });
    return res.json({ success: true, data: item || saved });
  } catch (err: any) {
    const saved = addOrUpdateFallbackScholar({ ...req.body, _id: String(req.params.id) });
    return res.json({ success: true, data: saved });
  }
});

router.delete('/scholars/:id', audit('delete', 'Scholar'), async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      await connectDatabase();
    }
    const id = String(req.params.id);
    if (mongoose.connection.readyState === 1) {
      if (mongoose.Types.ObjectId.isValid(id)) {
        await Scholar.findByIdAndDelete(id);
      } else {
        await Scholar.findOneAndDelete({ $or: [{ slug: id }, { name: id }] });
      }
    }
  } catch {}
  deleteFallbackScholar(String(req.params.id));
  return res.json({ success: true, message: 'Scholar deleted' });
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
  router.patch(`/${path}/:id`, audit('update', model.modelName), crud.update);
  router.delete(`/${path}/:id`, audit('delete', model.modelName), crud.delete);
};
mountCrud('news', News); mountCrud('courses', Course); mountCrud('users', User); mountCrud('messages', Message); mountCrud('inquiries', Message); mountCrud('instructors', Instructor);

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
    await recordAudit({
      req,
      action: 'update_course_curriculum',
      description: `Updated curriculum & modules for course "${course.title}" (${(req.body.modules || []).length} modules)`,
      resource: 'Course',
      resourceId: String(course._id)
    });
    res.json({ success: true, data: course });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err?.message || 'Failed to update course curriculum' });
  }
});

router.post('/academy/seed-sample', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      await connectDatabase();
    }
    const result = await seedAcademyData(true);
    await recordAudit({
      req,
      action: 'seed_academy_sample_data',
      description: `Loaded sample Academy dummy content across all 5 tabs (${result.courses} courses, ${result.instructors} instructors, ${result.classes} scheduled sessions, ${result.enrollments} enrollments)`,
      resource: 'Course'
    });
    res.json({
      success: true,
      message: 'Sample Academy dummy data seeded successfully across all 5 tabs.',
      data: result
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err?.message || 'Failed to seed sample Academy data' });
  }
});

router.get('/enrollments', async (_req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      await connectDatabase();
    }
    const enrollments = await Enrollment.find()
      .populate('userId', 'name email phone university department')
      .populate('courseId', 'title slug price thumbnail bannerUrl modules')
      .sort({ createdAt: -1 });

    const userIds = enrollments.map((e: any) => e.userId?._id).filter(Boolean);
    const payments = await Payment.find({ userId: { $in: userIds } });
    const paymentMap = new Map();
    payments.forEach((p) => {
      paymentMap.set(`${p.userId}_${p.courseId}`, p);
      if (p.trxId) paymentMap.set(p.trxId, p);
    });

    const data = enrollments.map((enr: any) => {
      const user = enr.userId || {};
      const course = enr.courseId || {};
      const payment = paymentMap.get(`${user._id}_${course._id}`);

      let progress = enr.progressPercent || 0;
      if (!progress && course.modules && course.modules.length > 0) {
        let totalLessons = 0;
        course.modules.forEach((m: any) => {
          totalLessons += (m.lessons || []).length;
        });
        if (totalLessons > 0) {
          progress = Math.min(100, Math.round(((enr.completedLessonIds || []).length / totalLessons) * 100));
        }
      }

      return {
        _id: enr._id,
        enrollmentId: enr._id,
        userId: user._id,
        studentName: user.name || 'Student',
        studentEmail: user.email || 'N/A',
        studentPhone: user.phone || '',
        university: user.university || '',
        courseId: course._id,
        courseTitle: course.title || 'Course',
        paymentMethod: payment?.method || 'bKash',
        trxId: payment?.trxId || 'N/A',
        feePaid: payment?.amount || course.price || 0,
        status: enr.status === 'active' ? 'Approved' : enr.status === 'pending' ? 'Pending' : enr.status === 'rejected' ? 'Rejected' : 'Expired',
        rawStatus: enr.status,
        progressPercent: progress,
        enrolledAt: enr.enrolledAt || enr.createdAt,
        paymentId: payment?._id
      };
    });

    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err?.message || 'Failed to list enrollments' });
  }
});

router.patch('/enrollments/:id', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      await connectDatabase();
    }
    const { status, progressPercent } = req.body;
    const targetStatus = status === 'Approved' ? 'active' : status === 'Pending' ? 'pending' : status === 'Rejected' ? 'rejected' : status;

    const enr = await Enrollment.findById(req.params.id);
    if (!enr) return res.status(404).json({ success: false, message: 'Enrollment not found' });

    if (targetStatus) enr.status = targetStatus;
    if (typeof progressPercent === 'number') enr.progressPercent = Math.min(100, Math.max(0, progressPercent));
    await enr.save();

    if (targetStatus === 'active') {
      await Payment.updateMany(
        { userId: enr.userId, courseId: enr.courseId, status: 'pending' },
        { $set: { status: 'approved', reviewedAt: new Date(), reviewedBy: (req as any).user?._id } }
      );
    } else if (targetStatus === 'rejected') {
      await Payment.updateMany(
        { userId: enr.userId, courseId: enr.courseId, status: 'pending' },
        { $set: { status: 'rejected', reviewedAt: new Date(), reviewedBy: (req as any).user?._id } }
      );
    }

    await recordAudit({
      req,
      action: 'update_enrollment_status',
      description: `Updated enrollment status to ${targetStatus} for enrollment ${enr._id}`,
      resource: 'Enrollment',
      resourceId: String(enr._id)
    });

    res.json({ success: true, data: enr });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err?.message || 'Failed to update enrollment' });
  }
});

router.delete('/enrollments/:id', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      await connectDatabase();
    }
    const enr = await Enrollment.findByIdAndDelete(req.params.id);
    if (enr) {
      await recordAudit({
        req,
        action: 'delete_enrollment',
        description: `Deleted enrollment ${req.params.id}`,
        resource: 'Enrollment',
        resourceId: req.params.id
      });
    }
    res.json({ success: true, message: 'Enrollment deleted' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err?.message || 'Failed to delete enrollment' });
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
    const { search, role, status, resource, limit = 200 } = req.query as any;
    const filter: any = {};
    if (role && role !== 'all') filter.actorRole = role;
    if (status && status !== 'all') filter.status = status;
    if (resource && resource !== 'all') filter.resource = resource;
    if (search) {
      const s = String(search).trim();
      filter.$or = [
        { actorName: { $regex: s, $options: 'i' } },
        { actorEmail: { $regex: s, $options: 'i' } },
        { action: { $regex: s, $options: 'i' } },
        { description: { $regex: s, $options: 'i' } },
        { ipAddress: { $regex: s, $options: 'i' } },
        { ip: { $regex: s, $options: 'i' } },
        { browser: { $regex: s, $options: 'i' } },
        { os: { $regex: s, $options: 'i' } }
      ];
    }
    const logs = await AuditLog.find(filter)
      .populate('actorId', 'name email role')
      .sort({ createdAt: -1 })
      .limit(Math.min(500, Math.max(10, Number(limit) || 200)));
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
// Certificates & Verification Admin Management
const uploadCertMemory = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});
router.get('/certificates', listAdminCertificates);
router.post('/certificates', uploadCertMemory.single('certificateImage'), issueAdminCertificate);
router.put('/certificates/:id', uploadCertMemory.single('certificateImage'), updateAdminCertificate);
router.patch('/certificates/:id', uploadCertMemory.single('certificateImage'), updateAdminCertificate);
router.delete('/certificates/:id', deleteAdminCertificate);

export default router;
