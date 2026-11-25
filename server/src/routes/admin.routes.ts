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
import { upload, mediaLibrary, deleteMedia, cloudinarySignature, syncWingsCloudinary, purgeDummyAndDeduplicate } from '../controllers/upload.controller.js';
import { ensureCloudinaryUrl } from '../services/media.service.js';
import { migrateAllImagesToCloudinary } from '../services/migration.service.js';
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
  deleteFallbackScholar,
  reorderFallbackItems
} from '../utils/fallbackData.js';
import { recordAudit } from '../services/audit.service.js';
import { seedAcademyData } from '../utils/seed.js';
import { RESEARCH_PAPER_WRITING_CLASSES, RESEARCH_PAPER_WRITING_MODULES } from '../utils/researchCourseCurriculum.js';
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
      const list = await FoundingMember.find().sort({ order: 1, displayOrder: 1, createdAt: 1 });
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
    if (body.order === undefined && body.displayOrder === undefined) {
      if (mongoose.connection.readyState === 1) {
        const last = await FoundingMember.findOne().sort({ order: -1 }).select('order displayOrder');
        const next = last && typeof last.order === 'number' ? last.order + 1 : 0;
        body.order = next;
        body.displayOrder = next;
      } else {
        const fallbackList = getFallbackFoundingMembers();
        body.order = fallbackList.length;
        body.displayOrder = fallbackList.length;
      }
    } else {
      const ord = body.order !== undefined ? Number(body.order) : Number(body.displayOrder);
      body.order = ord;
      body.displayOrder = ord;
    }
    req.body.order = body.order;
    req.body.displayOrder = body.displayOrder;
    if (body.photo) {
      body.photo = await ensureCloudinaryUrl(body.photo, 'aspier/team');
      req.body.photo = body.photo;
    }
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
    if (body.order !== undefined || body.displayOrder !== undefined) {
      const ord = body.order !== undefined ? Number(body.order) : Number(body.displayOrder);
      body.order = ord;
      body.displayOrder = ord;
      req.body.order = ord;
      req.body.displayOrder = ord;
    }
    if (body.photo) {
      body.photo = await ensureCloudinaryUrl(body.photo, 'aspier/team');
      req.body.photo = body.photo;
    }
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
      const list = await Supervisor.find().sort({ order: 1, displayOrder: 1, createdAt: 1 });
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
    if (body.education !== undefined || body.educationalBackground !== undefined) {
      const edu = body.education !== undefined ? body.education : body.educationalBackground;
      body.education = edu;
      body.educationalBackground = edu;
      req.body.education = edu;
      req.body.educationalBackground = edu;
    }
    if (body.order === undefined && body.displayOrder === undefined) {
      if (mongoose.connection.readyState === 1) {
        const last = await Supervisor.findOne().sort({ order: -1 }).select('order displayOrder');
        const next = last && typeof last.order === 'number' ? last.order + 1 : 0;
        body.order = next;
        body.displayOrder = next;
      } else {
        const fallbackList = getFallbackSupervisors();
        body.order = fallbackList.length;
        body.displayOrder = fallbackList.length;
      }
    } else {
      const ord = body.order !== undefined ? Number(body.order) : Number(body.displayOrder);
      body.order = ord;
      body.displayOrder = ord;
    }
    req.body.order = body.order;
    req.body.displayOrder = body.displayOrder;
    if (body.photo) {
      body.photo = await ensureCloudinaryUrl(body.photo, 'aspier/team');
      req.body.photo = body.photo;
    }
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
    if (body.education !== undefined || body.educationalBackground !== undefined) {
      const edu = body.education !== undefined ? body.education : body.educationalBackground;
      body.education = edu;
      body.educationalBackground = edu;
      req.body.education = edu;
      req.body.educationalBackground = edu;
    }
    if (body.order !== undefined || body.displayOrder !== undefined) {
      const ord = body.order !== undefined ? Number(body.order) : Number(body.displayOrder);
      body.order = ord;
      body.displayOrder = ord;
      req.body.order = ord;
      req.body.displayOrder = ord;
    }
    if (body.photo) {
      body.photo = await ensureCloudinaryUrl(body.photo, 'aspier/team');
      req.body.photo = body.photo;
    }
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
      const list = await Scholar.find().sort({ order: 1, displayOrder: 1, createdAt: 1 });
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
    if (body.education !== undefined || body.educationalBackground !== undefined) {
      const edu = body.education !== undefined ? body.education : body.educationalBackground;
      body.education = edu;
      body.educationalBackground = edu;
      req.body.education = edu;
      req.body.educationalBackground = edu;
    }
    if (body.order === undefined && body.displayOrder === undefined) {
      if (mongoose.connection.readyState === 1) {
        const last = await Scholar.findOne().sort({ order: -1 }).select('order displayOrder');
        const next = last && typeof last.order === 'number' ? last.order + 1 : 0;
        body.order = next;
        body.displayOrder = next;
      } else {
        const fallbackList = getFallbackScholars();
        body.order = fallbackList.length;
        body.displayOrder = fallbackList.length;
      }
    } else {
      const ord = body.order !== undefined ? Number(body.order) : Number(body.displayOrder);
      body.order = ord;
      body.displayOrder = ord;
    }
    req.body.order = body.order;
    req.body.displayOrder = body.displayOrder;
    if (body.photo) {
      body.photo = await ensureCloudinaryUrl(body.photo, 'aspier/team');
      req.body.photo = body.photo;
    }
    if (mongoose.connection.readyState === 1) {
      item = await Scholar.create(body);
    }
    fastCache.invalidate('public:scholars');
    fastCache.clear();
    const saved = addOrUpdateFallbackScholar(item ? item.toObject() : req.body);
    return res.status(201).json({ success: true, data: item || saved });
  } catch (err: any) {
    const saved = addOrUpdateFallbackScholar(req.body);
    return res.status(201).json({ success: true, data: saved });
  }
});

const handleUpdateScholar = async (req: any, res: any) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      await connectDatabase();
    }
    let item: any = null;
    const id = String(req.params.id);
    const body = { ...req.body };
    delete body._id;
    if (body.education !== undefined || body.educationalBackground !== undefined) {
      const edu = body.education !== undefined ? body.education : body.educationalBackground;
      body.education = edu;
      body.educationalBackground = edu;
      req.body.education = edu;
      req.body.educationalBackground = edu;
    }
    if (body.order !== undefined || body.displayOrder !== undefined) {
      const ord = body.order !== undefined ? Number(body.order) : Number(body.displayOrder);
      body.order = ord;
      body.displayOrder = ord;
      req.body.order = ord;
      req.body.displayOrder = ord;
    }
    if (body.photo) {
      body.photo = await ensureCloudinaryUrl(body.photo, 'aspier/team');
      req.body.photo = body.photo;
    }
    if (mongoose.connection.readyState === 1) {
      if (mongoose.Types.ObjectId.isValid(id)) {
        item = await Scholar.findByIdAndUpdate(id, body, { new: true });
      }
      if (!item && (body.slug || id)) {
        item = await Scholar.findOneAndUpdate({ $or: [{ slug: body.slug || id }, { name: body.name }] }, body, { new: true, upsert: true });
      }
    }
    fastCache.invalidate('public:scholars');
    fastCache.clear();
    const saved = addOrUpdateFallbackScholar({ ...req.body, _id: item?._id ? String(item._id) : id });
    return res.json({ success: true, data: item || saved });
  } catch (err: any) {
    const saved = addOrUpdateFallbackScholar({ ...req.body, _id: String(req.params.id) });
    return res.json({ success: true, data: saved });
  }
};

router.put('/scholars/:id', audit('update', 'Scholar'), handleUpdateScholar);
router.patch('/scholars/:id', audit('update', 'Scholar'), handleUpdateScholar);

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

// Team Drag-and-Drop Reordering Endpoints (Founding Members, Supervisors, Young Scholars)
const handleTeamReorder = async (req: any, res: any) => {
  try {
    const { category, orderedIds } = req.body;
    if (!category || !Array.isArray(orderedIds) || orderedIds.length === 0) {
      return res.status(400).json({ success: false, message: 'category and non-empty orderedIds array are required' });
    }

    if (mongoose.connection.readyState !== 1) {
      await connectDatabase();
    }

    const cat = String(category).toLowerCase();
    let Model: any = null;
    let fallbackCat = 'scholar';

    if (cat.includes('founding')) {
      Model = FoundingMember;
      fallbackCat = 'founding';
    } else if (cat.includes('sup')) {
      Model = Supervisor;
      fallbackCat = 'supervisor';
    } else {
      Model = Scholar;
      fallbackCat = 'scholar';
    }

    if (mongoose.connection.readyState === 1 && Model) {
      const bulkOps = orderedIds.map((id: string, index: number) => ({
        updateOne: {
          filter: mongoose.Types.ObjectId.isValid(id)
            ? { _id: new mongoose.Types.ObjectId(id) }
            : { $or: [{ slug: id }, { name: id }] },
          update: { $set: { order: index, displayOrder: index } }
        }
      }));
      if (bulkOps.length > 0) {
        await Model.bulkWrite(bulkOps);
      }
    }

    // Also update in-memory fallback list
    reorderFallbackItems(fallbackCat, orderedIds);

    // Invalidate caches
    fastCache.invalidate('public:founding-members');
    fastCache.invalidate('public:supervisors');
    fastCache.invalidate('public:scholars');
    fastCache.clear();

    return res.json({
      success: true,
      message: `Successfully reordered ${category} profiles`,
      orderedCount: orderedIds.length
    });
  } catch (err: any) {
    console.error('[team/reorder] error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to reorder team profiles' });
  }
};

router.put('/team/reorder', audit('update', 'Team'), handleTeamReorder);
router.patch('/team/reorder', audit('update', 'Team'), handleTeamReorder);
router.put('/founding-members/reorder', audit('update', 'FoundingMember'), (req, res) => {
  req.body.category = 'founding';
  return handleTeamReorder(req, res);
});
router.patch('/founding-members/reorder', audit('update', 'FoundingMember'), (req, res) => {
  req.body.category = 'founding';
  return handleTeamReorder(req, res);
});
router.put('/supervisors/reorder', audit('update', 'Supervisor'), (req, res) => {
  req.body.category = 'supervisor';
  return handleTeamReorder(req, res);
});
router.patch('/supervisors/reorder', audit('update', 'Supervisor'), (req, res) => {
  req.body.category = 'supervisor';
  return handleTeamReorder(req, res);
});
router.put('/scholars/reorder', audit('update', 'Scholar'), (req, res) => {
  req.body.category = 'scholar';
  return handleTeamReorder(req, res);
});
router.patch('/scholars/reorder', audit('update', 'Scholar'), (req, res) => {
  req.body.category = 'scholar';
  return handleTeamReorder(req, res);
});

router.post('/team', audit('create', 'Team'), async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      await connectDatabase();
    }
    const cat = String(req.body.category || req.body.role || '').toLowerCase();
    const body = { ...req.body };
    delete body._id;
    if (cat.includes('founding')) {
      if (body.order === undefined && body.displayOrder === undefined) {
        if (mongoose.connection.readyState === 1) {
          const last = await FoundingMember.findOne().sort({ order: -1 }).select('order displayOrder');
          const next = last && typeof last.order === 'number' ? last.order + 1 : 0;
          body.order = next;
          body.displayOrder = next;
        } else {
          const fallbackList = getFallbackFoundingMembers();
          body.order = fallbackList.length;
          body.displayOrder = fallbackList.length;
        }
      }
      const item = mongoose.connection.readyState === 1 ? await FoundingMember.create(body) : null;
      const saved = addOrUpdateFallbackFoundingMember(item ? item.toObject() : req.body);
      return res.status(201).json({ success: true, data: item || saved });
    } else if (cat.includes('sup')) {
      if (body.education !== undefined || body.educationalBackground !== undefined) {
        const edu = body.education !== undefined ? body.education : body.educationalBackground;
        body.education = edu;
        body.educationalBackground = edu;
        req.body.education = edu;
        req.body.educationalBackground = edu;
      }
      if (body.order === undefined && body.displayOrder === undefined) {
        if (mongoose.connection.readyState === 1) {
          const last = await Supervisor.findOne().sort({ order: -1 }).select('order displayOrder');
          const next = last && typeof last.order === 'number' ? last.order + 1 : 0;
          body.order = next;
          body.displayOrder = next;
        } else {
          const fallbackList = getFallbackSupervisors();
          body.order = fallbackList.length;
          body.displayOrder = fallbackList.length;
        }
      }
      const item = mongoose.connection.readyState === 1 ? await Supervisor.create(body) : null;
      fastCache.clear();
      const saved = addOrUpdateFallbackSupervisor(item ? item.toObject() : req.body);
      return res.status(201).json({ success: true, data: item || saved });
    } else {
      if (body.education !== undefined || body.educationalBackground !== undefined) {
        const edu = body.education !== undefined ? body.education : body.educationalBackground;
        body.education = edu;
        body.educationalBackground = edu;
        req.body.education = edu;
        req.body.educationalBackground = edu;
      }
      if (body.order === undefined && body.displayOrder === undefined) {
        if (mongoose.connection.readyState === 1) {
          const last = await Scholar.findOne().sort({ order: -1 }).select('order displayOrder');
          const next = last && typeof last.order === 'number' ? last.order + 1 : 0;
          body.order = next;
          body.displayOrder = next;
        } else {
          const fallbackList = getFallbackScholars();
          body.order = fallbackList.length;
          body.displayOrder = fallbackList.length;
        }
      }
      const item = mongoose.connection.readyState === 1 ? await Scholar.create(body) : null;
      fastCache.clear();
      const saved = addOrUpdateFallbackScholar(item ? item.toObject() : req.body);
      return res.status(201).json({ success: true, data: item || saved });
    }
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err.message || 'Failed to create team member' });
  }
});

const handleUpdateTeamMember = async (req: any, res: any) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      await connectDatabase();
    }
    const id = String(req.params.id);
    const cat = String(req.body.category || req.body.role || '').toLowerCase();
    const body = { ...req.body };
    delete body._id;

    if (body.education !== undefined || body.educationalBackground !== undefined) {
      const edu = body.education !== undefined ? body.education : body.educationalBackground;
      body.education = edu;
      body.educationalBackground = edu;
      req.body.education = edu;
      req.body.educationalBackground = edu;
    }
    if (body.order !== undefined || body.displayOrder !== undefined) {
      const ord = body.order !== undefined ? Number(body.order) : Number(body.displayOrder);
      body.order = ord;
      body.displayOrder = ord;
      req.body.order = ord;
      req.body.displayOrder = ord;
    }

    let item: any = null;
    if (cat.includes('founding')) {
      if (mongoose.connection.readyState === 1) {
        if (mongoose.Types.ObjectId.isValid(id)) item = await FoundingMember.findByIdAndUpdate(id, body, { new: true });
        if (!item && (body.slug || id)) item = await FoundingMember.findOneAndUpdate({ $or: [{ slug: body.slug || id }, { name: body.name }] }, body, { new: true, upsert: true });
      }
      fastCache.clear();
      const saved = addOrUpdateFallbackFoundingMember({ ...req.body, _id: item?._id ? String(item._id) : id });
      return res.json({ success: true, data: item || saved });
    } else if (cat.includes('sup')) {
      if (mongoose.connection.readyState === 1) {
        if (mongoose.Types.ObjectId.isValid(id)) item = await Supervisor.findByIdAndUpdate(id, body, { new: true });
        if (!item && (body.slug || id)) item = await Supervisor.findOneAndUpdate({ $or: [{ slug: body.slug || id }, { name: body.name }] }, body, { new: true, upsert: true });
      }
      fastCache.clear();
      const saved = addOrUpdateFallbackSupervisor({ ...req.body, _id: item?._id ? String(item._id) : id });
      return res.json({ success: true, data: item || saved });
    } else {
      if (mongoose.connection.readyState === 1) {
        if (mongoose.Types.ObjectId.isValid(id)) item = await Scholar.findByIdAndUpdate(id, body, { new: true });
        if (!item && (body.slug || id)) item = await Scholar.findOneAndUpdate({ $or: [{ slug: body.slug || id }, { name: body.name }] }, body, { new: true, upsert: true });
      }
      fastCache.clear();
      const saved = addOrUpdateFallbackScholar({ ...req.body, _id: item?._id ? String(item._id) : id });
      return res.json({ success: true, data: item || saved });
    }
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err.message || 'Failed to update team member' });
  }
};

router.put('/team/:id', audit('update', 'Team'), handleUpdateTeamMember);
router.patch('/team/:id', audit('update', 'Team'), handleUpdateTeamMember);

router.get('/team', audit('list', 'Team'), async (req, res) => {
  const cat = String(req.query.category || '').toLowerCase();
  try {
    if (mongoose.connection.readyState !== 1) {
      await connectDatabase();
    }
  } catch {}
  if (cat.includes('founding')) {
    const list = mongoose.connection.readyState === 1 ? await FoundingMember.find().sort({ order: 1, displayOrder: 1, createdAt: 1 }) : [];
    return res.json({ success: true, data: list.length > 0 ? list : getFallbackFoundingMembers() });
  } else if (cat.includes('sup')) {
    const list = mongoose.connection.readyState === 1 ? await Supervisor.find().sort({ order: 1, displayOrder: 1, createdAt: 1 }) : [];
    return res.json({ success: true, data: list.length > 0 ? list : getFallbackSupervisors() });
  } else if (cat.includes('scholar')) {
    const list = mongoose.connection.readyState === 1 ? await Scholar.find().sort({ order: 1, displayOrder: 1, createdAt: 1 }) : [];
    return res.json({ success: true, data: list.length > 0 ? list : getFallbackScholars() });
  }
  const [founding, supervisors, scholars] = await Promise.all([
    FoundingMember.find().sort({ order: 1, displayOrder: 1, createdAt: 1 }).catch(() => getFallbackFoundingMembers()),
    Supervisor.find().sort({ order: 1, displayOrder: 1, createdAt: 1 }).catch(() => getFallbackSupervisors()),
    Scholar.find().sort({ order: 1, displayOrder: 1, createdAt: 1 }).catch(() => getFallbackScholars())
  ]);
  return res.json({ success: true, data: { founding, supervisors, scholars } });
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
    const body = { ...req.body };
    delete body._id;
    if (body.coverImage) body.coverImage = await ensureCloudinaryUrl(body.coverImage, 'aspier/wings');
    req.body.coverImage = body.coverImage;
    let item: any = null;
    if (mongoose.connection.readyState === 1) {
      item = await Wing.create(body);
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
    const id = String(req.params.id);
    const body = { ...req.body };
    delete body._id;
    if (body.coverImage) body.coverImage = await ensureCloudinaryUrl(body.coverImage, 'aspier/wings');
    req.body.coverImage = body.coverImage;
    let item: any = null;
    if (mongoose.connection.readyState === 1) {
      if (mongoose.Types.ObjectId.isValid(id)) {
        item = await Wing.findByIdAndUpdate(id, body, { new: true });
      }
      if (!item && (body.slug || id)) {
        item = await Wing.findOneAndUpdate(
          { $or: [{ slug: body.slug || id }, { name: body.name }] },
          body,
          { new: true, upsert: true }
        );
      }
    }
    fastCache.invalidate('public:wings');
    fastCache.clear();
    const saved = addOrUpdateFallbackWing({ ...req.body, _id: item?._id ? String(item._id) : id });
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
    const body = { ...req.body };
    delete body._id;
    if (body.coverImage) body.coverImage = await ensureCloudinaryUrl(body.coverImage, 'aspier/research');
    req.body.coverImage = body.coverImage;
    let item: any = null;
    if (mongoose.connection.readyState === 1) {
      item = await Research.create(body);
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
    const body = { ...req.body };
    delete body._id;
    if (body.coverImage) body.coverImage = await ensureCloudinaryUrl(body.coverImage, 'aspier/research');
    req.body.coverImage = body.coverImage;
    if (mongoose.connection.readyState === 1) {
      if (mongoose.Types.ObjectId.isValid(researchId)) {
        item = await Research.findByIdAndUpdate(researchId, body, { new: true });
      }
      if (!item && (body.slug || researchId)) {
        item = await Research.findOneAndUpdate(
          { $or: [{ slug: body.slug || researchId }, { title: body.title }] },
          body,
          { new: true, upsert: true }
        );
      }
    }
    fastCache.invalidate('public:research');
    fastCache.clear();
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
    const updateData: any = {};
    if (req.body.classes) {
      updateData.classes = req.body.classes;
      if (!req.body.curriculum) updateData.curriculum = req.body.classes;
    }
    if (req.body.curriculum) {
      updateData.curriculum = req.body.curriculum;
      if (!req.body.classes) updateData.classes = req.body.curriculum;
    }
    if (req.body.modules) updateData.modules = req.body.modules;

    const course = await Course.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: false }
    );
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });
    fastCache.clear();
    await recordAudit({
      req,
      action: 'update_course_curriculum',
      description: `Updated curriculum & classes for course "${course.title}" (${(course.classes || []).length} classes)`,
      resource: 'Course',
      resourceId: String(course._id)
    }).catch(() => {});
    res.json({ success: true, data: course });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err?.message || 'Failed to update course curriculum' });
  }
});

router.post('/update-research-course-curriculum', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      await connectDatabase();
    }

    // 1. Purge dummy classes (live schedules) and standalone instructors
    await ClassModel.deleteMany({});
    await Instructor.deleteMany({});

    let course = await Course.findOne({
      $or: [
        { slug: 'higher-study-research-paper-writing' },
        { title: { $regex: /Research Paper Writing/i } }
      ]
    });

    if (!course) {
      course = await Course.findOne();
    }

    if (!course) {
      course = new Course({
        title: 'Higher Study-Oriented Research Paper Writing Course',
        slug: 'higher-study-research-paper-writing',
        price: 2000,
        mode: 'Online Recorded',
        deliveryMode: 'Online Recorded',
        format: 'Online Recorded',
        isRecorded: true,
        duration: '15 Recorded Classes (Classes 0–14)',
        level: 'advanced',
        status: 'published',
        description: '<p>Master academic research methodology, literature review synthesis, questionnaire design, statistical analysis, LaTeX manuscript preparation, and remote sensing with Google Earth Engine across 15 comprehensive recorded classes.</p>'
      });
    }

    course.title = 'Higher Study-Oriented Research Paper Writing Course';
    course.slug = 'higher-study-research-paper-writing';
    course.price = 2000;
    course.mode = 'Online Recorded';
    course.deliveryMode = 'Online Recorded';
    course.format = 'Online Recorded';
    course.isRecorded = true;
    course.duration = '15 Recorded Classes (Classes 0–14)';
    course.status = 'published';
    course.level = 'advanced';
    course.sampleData = false;
    course.classes = RESEARCH_PAPER_WRITING_CLASSES as any;
    course.curriculum = RESEARCH_PAPER_WRITING_CLASSES as any;
    course.modules = RESEARCH_PAPER_WRITING_MODULES as any;

    await course.save();
    fastCache.clear();

    await recordAudit({
      req,
      action: 'update_research_course_curriculum',
      description: `Configured Higher Study-Oriented Research Paper Writing Course (2000 BDT, Online Recorded, 15 classes) & purged dummy schedules and instructors`,
      resource: 'Course',
      resourceId: String(course._id)
    }).catch(() => {});

    return res.json({
      success: true,
      message: 'Course updated successfully to Higher Study-Oriented Research Paper Writing Course (2,000 BDT, Online Recorded, Classes 0–14), and purged dummy live schedules and instructors.',
      data: course
    });
  } catch (err: any) {
    console.error('Error updating research course curriculum:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to update research course curriculum'
    });
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

router.post('/migrate-images-to-cloudinary', async (req, res) => {
  try {
    const report = await migrateAllImagesToCloudinary();
    fastCache.clear();
    await recordAudit({
      req,
      action: 'migrate_images_to_cloudinary',
      description: `Migrated ${report.totalAssetsMigrated} images/assets to Cloudinary and purged binary buffers`,
      resource: 'MediaAsset'
    }).catch(() => {});
    return res.json({
      success: true,
      message: `Successfully migrated ${report.totalAssetsMigrated} images to Cloudinary and purged binary buffers.`,
      report
    });
  } catch (err: any) {
    console.error('[admin/migrate-images-to-cloudinary] error:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Image migration to Cloudinary failed',
      error: String(err)
    });
  }
});

router.get('/enrollments', async (_req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      await connectDatabase();
    }
    const [enrollments, allStudents] = await Promise.all([
      Enrollment.find()
        .populate('userId', 'name email phone university department isActive createdAt')
        .populate('courseId', 'title slug price thumbnail bannerUrl modules')
        .sort({ createdAt: -1 }),
      User.find({ role: 'student' }).sort({ createdAt: -1 })
    ]);

    const enrolledUserIds = new Set(
      enrollments.map((e: any) => String(e.userId?._id || e.userId || '')).filter(Boolean)
    );

    const userIds = enrollments.map((e: any) => e.userId?._id).filter(Boolean);
    const payments = await Payment.find({ userId: { $in: userIds } });
    const paymentMap = new Map();
    payments.forEach((p) => {
      paymentMap.set(`${p.userId}_${p.courseId}`, p);
      if (p.trxId) paymentMap.set(p.trxId, p);
    });

    const enrollmentRows = enrollments.map((enr: any) => {
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
        paymentId: payment?._id,
        recordType: 'enrollment'
      };
    });

    // Auto-sync all registered student users who have not yet enrolled
    const directStudentRows = allStudents
      .filter((st: any) => !enrolledUserIds.has(String(st._id)))
      .map((st: any) => ({
        _id: st._id,
        enrollmentId: null,
        userId: st._id,
        studentName: st.name || 'Student',
        studentEmail: st.email || 'N/A',
        studentPhone: st.phone || '',
        university: st.university || '',
        courseId: null,
        courseTitle: 'Direct User Account',
        paymentMethod: '—',
        trxId: '—',
        feePaid: 0,
        status: st.isActive !== false ? 'Active' : 'Suspended',
        rawStatus: st.isActive !== false ? 'active' : 'inactive',
        progressPercent: 0,
        enrolledAt: st.createdAt,
        recordType: 'student',
        isDirectUser: true
      }));

    const data = [...enrollmentRows, ...directStudentRows];
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err?.message || 'Failed to list enrollments' });
  }
});

const handleUpdateEnrollment = async (req: any, res: any) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      await connectDatabase();
    }
    const {
      status,
      progressPercent,
      progress,
      courseId,
      studentName,
      studentEmail,
      studentPhone,
      university,
      paymentMethod,
      trxId,
      feePaid,
      paymentStatus
    } = req.body;

    const enr = await Enrollment.findById(req.params.id);
    if (!enr) return res.status(404).json({ success: false, message: 'Enrollment not found' });

    // Target status normalization
    let targetStatus: 'pending' | 'stage1_verified' | 'final_approved' | 'active' | 'rejected' | 'expired' = enr.status;
    if (status !== undefined) {
      const s = String(status).trim().toLowerCase();
      if (['final_approved', 'final approved', 'final-approved'].includes(s)) {
        targetStatus = 'final_approved';
      } else if (['stage1_verified', 'stage 1 verified', 'stage-1-verified', 'stage1'].includes(s)) {
        targetStatus = 'stage1_verified';
      } else if (['approved', 'active', 'completed'].includes(s)) {
        targetStatus = 'active';
      } else if (['pending', 'pending payment verification'].includes(s)) {
        targetStatus = 'pending';
      } else if (['rejected', 'suspended', 'inactive'].includes(s)) {
        targetStatus = 'rejected';
      } else if (s === 'expired') {
        targetStatus = 'expired';
      } else {
        targetStatus = 'pending';
      }
      enr.status = targetStatus;
    }

    const progVal = progressPercent !== undefined ? progressPercent : progress;
    if (progVal !== undefined && !isNaN(Number(progVal))) {
      enr.progressPercent = Math.min(100, Math.max(0, Number(progVal)));
    }

    if (courseId && mongoose.isValidObjectId(courseId)) {
      enr.courseId = courseId;
    }

    await enr.save();

    // Update student user details if provided
    if (enr.userId && (studentName || studentEmail || studentPhone !== undefined || university !== undefined || status !== undefined)) {
      const studentUser = await User.findById(enr.userId);
      if (studentUser) {
        if (studentName && typeof studentName === 'string') {
          studentUser.name = studentName.trim();
        }
        if (studentEmail && typeof studentEmail === 'string') {
          const newEmail = studentEmail.toLowerCase().trim();
          if (newEmail !== studentUser.email.toLowerCase().trim()) {
            const existing = await User.findOne({ email: newEmail, _id: { $ne: studentUser._id } });
            if (existing) {
              return res.status(400).json({ success: false, message: 'Email address is already in use by another account' });
            }
            studentUser.email = newEmail;
          }
        }
        if (studentPhone !== undefined) studentUser.phone = String(studentPhone).trim();
        if (university !== undefined) studentUser.university = String(university).trim();
        if (status !== undefined) {
          studentUser.isActive = targetStatus === 'active';
        }
        await studentUser.save();
      }
    }

    // Synchronize linked payment record
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

    if (paymentMethod || trxId || feePaid !== undefined || paymentStatus) {
      let payment = await Payment.findOne({ userId: enr.userId, courseId: enr.courseId });
      const rawPStatus = paymentStatus ? String(paymentStatus).toLowerCase() : targetStatus === 'active' ? 'approved' : 'pending';
      const resolvedPaymentStatus: 'approved' | 'pending' | 'rejected' = ['paid', 'approved', 'active', 'completed'].includes(rawPStatus)
        ? 'approved'
        : ['rejected', 'refunded', 'failed'].includes(rawPStatus)
        ? 'rejected'
        : 'pending';
      const method = ['bKash', 'Nagad'].includes(paymentMethod) ? paymentMethod : 'bKash';
      const senderNum = studentPhone || (enr.userId as any)?.phone || '01700000000';

      if (!payment) {
        payment = new Payment({
          userId: enr.userId,
          courseId: enr.courseId,
          enrollmentId: enr._id,
          amount: Number(feePaid) || 0,
          method,
          senderNumber: senderNum,
          trxId: trxId || `ADM-${Date.now().toString().slice(-6)}`,
          status: resolvedPaymentStatus
        });
      } else {
        payment.method = method;
        if (trxId) payment.trxId = trxId;
        if (feePaid !== undefined) payment.amount = Number(feePaid);
        if (paymentStatus) {
          payment.status = resolvedPaymentStatus;
        }
      }
      await payment.save();
    }

    await recordAudit({
      req,
      action: 'update_enrollment',
      description: `Updated enrollment ${enr._id} for student ${enr.userId}`,
      resource: 'Enrollment',
      resourceId: String(enr._id)
    });

    fastCache.clear();
    res.json({ success: true, message: 'Enrollment updated successfully', data: enr });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err?.message || 'Failed to update enrollment' });
  }
};

router.put('/enrollments/:id', handleUpdateEnrollment);
router.patch('/enrollments/:id', handleUpdateEnrollment);

router.delete('/enrollments/:id', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      await connectDatabase();
    }
    const enr = await Enrollment.findByIdAndDelete(req.params.id);
    if (!enr) {
      return res.status(404).json({ success: false, message: 'Enrollment not found' });
    }
    await recordAudit({
      req,
      action: 'delete_enrollment',
      description: `Deleted enrollment ${req.params.id}`,
      resource: 'Enrollment',
      resourceId: req.params.id
    });
    fastCache.clear();
    res.json({ success: true, message: 'Enrollment deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err?.message || 'Failed to delete enrollment' });
  }
});
const uploadMemory = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    if (!file.mimetype || file.mimetype.startsWith('image/')) {
      callback(null, true);
    } else {
      callback(null, ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'].includes(file.mimetype));
    }
  }
});
router.post('/media', uploadMemory.single('file'), upload);
router.post('/upload', uploadMemory.single('file'), upload);
router.post('/cloudinary-signature', cloudinarySignature);
router.post('/sync-wings-cloudinary', syncWingsCloudinary);
router.post('/purge-dummy-and-deduplicate', purgeDummyAndDeduplicate);
router.post('/purge-dummy-content', async (req, res, next) => {
  try {
    await connectDatabase();
    const { runFullProductionPurge } = await import('../scripts/fullProductionPurge.js');
    const auditReport = await runFullProductionPurge();
    return res.json({
      success: true,
      message: 'Full production purge completed successfully while strictly preserving Team, 10 Wings, Course, and Admin accounts.',
      ...auditReport
    });
  } catch (error) {
    next(error);
  }
});
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
    if (mongoose.connection.readyState !== 1) {
      await connectDatabase();
    }
    const students = await User.find({ role: 'student' }).sort({ createdAt: -1 });
    res.json({ success: true, data: students || [] });
  } catch {
    res.json({ success: true, data: [] });
  }
});

router.get('/students/:id', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      await connectDatabase();
    }
    const student = await User.findById(req.params.id);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });
    res.json({ success: true, data: student });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err?.message || 'Failed to get student' });
  }
});

const handleUpdateStudent = async (req: any, res: any) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      await connectDatabase();
    }
    const student = await User.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student user not found' });
    }

    const {
      name,
      email,
      status,
      phone,
      university,
      department,
      studentId,
      academicLevel,
      city,
      courseId,
      enrolledCourseId,
      enrollmentStatus,
      progressPercent,
      progress,
      paymentMethod,
      trxId,
      feePaid,
      paymentStatus
    } = req.body;

    // Update Full Name
    if (name && typeof name === 'string' && name.trim()) {
      student.name = name.trim();
    }

    // Update Email with uniqueness validation excluding current student
    if (email && typeof email === 'string' && email.trim()) {
      const newEmail = email.toLowerCase().trim();
      if (newEmail !== student.email.toLowerCase().trim()) {
        const existing = await User.findOne({ email: newEmail, _id: { $ne: student._id } });
        if (existing) {
          return res.status(400).json({ success: false, message: 'Email address is already in use by another account' });
        }
        student.email = newEmail;
      }
    }

    // Update Active / Inactive / Suspended status
    if (status !== undefined) {
      const s = String(status).trim().toLowerCase();
      student.isActive = s === 'active' || s === 'approved' || status === true;
    }

    // Optional profile fields
    if (phone !== undefined) student.phone = String(phone).trim();
    if (university !== undefined) student.university = String(university).trim();
    if (department !== undefined) student.department = String(department).trim();
    if (studentId !== undefined) student.studentId = String(studentId).trim();
    if (academicLevel !== undefined) student.academicLevel = String(academicLevel).trim();
    if (city !== undefined) student.city = String(city).trim();

    await student.save();

    // Optionally assign or enroll into an Academy course
    const targetCourseId = courseId || enrolledCourseId;
    if (targetCourseId && targetCourseId !== 'none' && mongoose.isValidObjectId(targetCourseId)) {
      const course = await Course.findById(targetCourseId);
      if (course) {
        let enr = await Enrollment.findOne({ userId: student._id, courseId: course._id });
        const rawStatus = (enrollmentStatus || status || 'active').toString().toLowerCase();
        const normalizedStatus = ['approved', 'active', 'completed'].includes(rawStatus)
          ? 'active'
          : rawStatus === 'pending'
          ? 'pending'
          : rawStatus === 'expired'
          ? 'expired'
          : 'rejected';

        const progVal = progressPercent !== undefined ? progressPercent : progress;
        const normalizedProgress = progVal !== undefined && !isNaN(Number(progVal))
          ? Math.min(100, Math.max(0, Number(progVal)))
          : 0;

        if (!enr) {
          enr = new Enrollment({
            userId: student._id,
            courseId: course._id,
            status: normalizedStatus,
            progressPercent: normalizedProgress,
            enrolledAt: new Date()
          });
        } else {
          enr.status = normalizedStatus;
          if (progVal !== undefined) enr.progressPercent = normalizedProgress;
        }
        await enr.save();

        // Handle linked payment if payment info provided
        if (paymentMethod || trxId || feePaid !== undefined || paymentStatus) {
          let payment = await Payment.findOne({ userId: student._id, courseId: course._id });
          const method = ['bKash', 'Nagad'].includes(paymentMethod) ? paymentMethod : 'bKash';
          const rawPStatus = paymentStatus ? String(paymentStatus).toLowerCase() : normalizedStatus === 'active' ? 'approved' : 'pending';
          const pStatus: 'approved' | 'pending' | 'rejected' = ['paid', 'approved', 'active', 'completed'].includes(rawPStatus)
            ? 'approved'
            : ['rejected', 'refunded', 'failed'].includes(rawPStatus)
            ? 'rejected'
            : 'pending';
          const fee = feePaid !== undefined ? Number(feePaid) : course.price || 0;
          const transactionId = trxId || `ADM-${Date.now().toString().slice(-6)}`;
          const senderNum = student.phone || '01700000000';

          if (!payment) {
            payment = new Payment({
              userId: student._id,
              courseId: course._id,
              enrollmentId: enr._id,
              amount: fee,
              method,
              senderNumber: senderNum,
              trxId: transactionId,
              status: pStatus
            });
          } else {
            payment.amount = fee;
            payment.method = method;
            if (trxId) payment.trxId = transactionId;
            payment.status = pStatus;
          }
          await payment.save();
        }
      }
    }

    await recordAudit({
      req,
      action: 'update_student_user',
      description: `Updated student user ${student.name} (${student.email})`,
      resource: 'User',
      resourceId: String(student._id)
    });

    fastCache.clear();
    res.json({ success: true, message: 'Student user updated successfully', data: student });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err?.message || 'Failed to update student user' });
  }
};

router.put('/students/:id', handleUpdateStudent);
router.patch('/students/:id', handleUpdateStudent);

router.delete('/students/:id', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      await connectDatabase();
    }
    const student = await User.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student user not found' });
    }

    // Safety guardrail: strictly block deletion of admin/superadmin accounts
    if (['admin', 'superadmin'].includes(student.role)) {
      return res.status(403).json({ success: false, message: 'Security restriction: Cannot delete an administrator account' });
    }

    // Delete linked enrollments and payments
    await Enrollment.deleteMany({ userId: student._id });
    await Payment.deleteMany({ userId: student._id });
    await User.findByIdAndDelete(student._id);

    await recordAudit({
      req,
      action: 'delete_student_user',
      description: `Permanently deleted student user ${student.name} (${student.email}) and all linked records`,
      resource: 'User',
      resourceId: String(student._id)
    });

    fastCache.clear();
    res.json({ success: true, message: `Student "${student.name}" and linked records deleted permanently` });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err?.message || 'Failed to delete student user' });
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
