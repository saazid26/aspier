import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import Wing from '../models/Wing.js';
import Research from '../models/Research.js';
import Supervisor from '../models/Supervisor.js';
import Scholar from '../models/Scholar.js';
import FoundingMember from '../models/FoundingMember.js';
import News from '../models/News.js';
import Message from '../models/Message.js';
import Course from '../models/Course.js';
import { env } from '../config/env.js';
import { validate } from '../middleware/validate.js';
import { getSettings } from '../controllers/settings.controller.js';
import { activateMemberAccount, applicantLoginWithTwoFactor, markMembershipNotificationRead, membershipPortal, requestMembershipAccessCode, submitApplicantSignup, submitInitialApplication, submitMembershipPayment, submitMembershipProfile, uploadMembershipPhoto } from '../controllers/membership.controller.js';
import { notifyAdmins } from '../services/notification.service.js';
import { authLimiter, slowAuth } from '../middleware/rateLimit.js';
import { submitResearchApplication, lookupResearchApplication, submitResearchPayment, downloadResearchApplicationCv } from '../controllers/researchApplication.controller.js';
import { validateOnboardingToken, uploadOnboardingPhoto, completeOnboarding } from '../controllers/onboarding.controller.js';
import { fallbackWings, fallbackSettings, fallbackNews, demoResearch, demoSupervisors, demoScholars, demoFoundingMembers } from '../utils/fallbackData.js';

const router = Router();

// Edge & browser caching for high-speed delivery
router.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.includes('applications')) {
    res.set('Cache-Control', 'public, max-age=120, s-maxage=300, stale-while-revalidate=600');
  }
  next();
});

router.get('/sitemap.xml', async (_req, res) => {
  try {
    const baseUrl = (env.CLIENT_URL || 'https://aspierglobal.vercel.app').replace(/\/$/, '');
    const [wings, research, courses, news, supervisors, scholars] = await Promise.all([
      Wing.find({ isActive: true }).select('slug updatedAt').catch(() => []),
      Research.find({ status: 'published' }).select('slug updatedAt').catch(() => []),
      Course.find({ status: 'published' }).select('slug updatedAt').catch(() => []),
      News.find().select('slug updatedAt').catch(() => []),
      Supervisor.find().select('slug updatedAt').catch(() => []),
      Scholar.find().select('slug updatedAt').catch(() => [])
    ]);

    const activeWings = wings.length ? wings : fallbackWings;
    const activeResearch = research.length ? research : demoResearch;
    const activeNews = news.length ? news : fallbackNews;
    const activeSupervisors = supervisors.length ? supervisors : demoSupervisors;
    const activeScholars = scholars.length ? scholars : demoScholars;

    const staticUrls = ['', '/team', '/research', '/wings', '/news', '/academy', '/contact', '/join'];
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
    for (const path of staticUrls) {
      xml += `  <url>\n    <loc>${baseUrl}${path}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>${path === '' ? '1.0' : '0.8'}</priority>\n  </url>\n`;
    }
    for (const wing of activeWings) {
      xml += `  <url>\n    <loc>${baseUrl}/wings/${wing.slug}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
    }
    for (const r of activeResearch) {
      xml += `  <url>\n    <loc>${baseUrl}/research/${r.slug}</loc>\n    <changefreq>monthly</changefreq>\n    <priority>0.7</priority>\n  </url>\n`;
    }
    for (const n of activeNews) {
      xml += `  <url>\n    <loc>${baseUrl}/news/${n.slug}</loc>\n    <changefreq>monthly</changefreq>\n    <priority>0.6</priority>\n  </url>\n`;
    }
    for (const s of activeSupervisors) {
      xml += `  <url>\n    <loc>${baseUrl}/supervisors/${s.slug}</loc>\n    <changefreq>monthly</changefreq>\n    <priority>0.6</priority>\n  </url>\n`;
    }
    for (const sc of activeScholars) {
      xml += `  <url>\n    <loc>${baseUrl}/scholars/${sc.slug}</loc>\n    <changefreq>monthly</changefreq>\n    <priority>0.6</priority>\n  </url>\n`;
    }
    xml += '</urlset>';
    res.header('Content-Type', 'application/xml');
    res.send(xml);
  } catch {
    res.status(500).send('Error generating sitemap');
  }
});

router.get('/wings', async (_req, res) => {
  try {
    const list = await Wing.find({ isActive: true }).sort({ order: 1 });
    if (list && list.length > 0) return res.json({ success: true, data: list });
  } catch (err) {
    console.warn('[wings] fallback:', err instanceof Error ? err.message : err);
  }
  return res.json({ success: true, data: fallbackWings });
});

router.get('/wings/:slug', async (req, res) => {
  try {
    const wing = await Wing.findOne({ slug: req.params.slug });
    if (wing) {
      const research = await Research.find({ wingId: wing._id, status: 'published' }).sort({ publishedAt: -1 }).catch(() => []);
      return res.json({ success: true, data: { ...wing.toObject(), research } });
    }
  } catch (err) {
    console.warn('[wings/:slug] fallback:', err instanceof Error ? err.message : err);
  }
  const fallback = fallbackWings.find((w) => w.slug === req.params.slug);
  if (!fallback) return res.status(404).json({ success: false, message: 'Wing not found' });
  const relatedResearch = demoResearch.filter((r) => r.wingSlug === fallback.slug);
  return res.json({ success: true, data: { ...fallback, research: relatedResearch } });
});

router.get('/research', async (req, res) => {
  try {
    const filter: Record<string, any> = { status: 'published' };
    if (req.query.wingId) filter.wingId = req.query.wingId;
    if (req.query.category) filter.category = req.query.category;
    const list = await Research.find(filter).sort({ featured: -1, publishedAt: -1 }).limit(100);
    if (list && list.length > 0) return res.json({ success: true, data: list });
  } catch (err) {
    console.warn('[research] fallback:', err instanceof Error ? err.message : err);
  }
  let results = [...demoResearch];
  if (req.query.category) results = results.filter((r) => r.category === req.query.category);
  return res.json({ success: true, data: results });
});

const pdfCvUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => callback(null, file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf'))
});
router.post('/research-applications', pdfCvUpload.single('cv'), submitResearchApplication);
router.post('/research-applications/lookup', lookupResearchApplication);
router.post('/research-applications/payment', submitResearchPayment);
router.get('/research-applications/:id/cv', downloadResearchApplicationCv);
router.post('/research/:id/applications', pdfCvUpload.single('cv'), submitResearchApplication);

router.get('/research/:slug', async (req, res) => {
  try {
    const item = await Research.findOne({ slug: req.params.slug, status: 'published' }).populate('wingId');
    if (item) return res.json({ success: true, data: item });
  } catch (err) {
    console.warn('[research/:slug] fallback:', err instanceof Error ? err.message : err);
  }
  const fallback = demoResearch.find((r) => r.slug === req.params.slug);
  if (!fallback) return res.status(404).json({ success: false, message: 'Research not found' });
  return res.json({ success: true, data: fallback });
});

router.get('/founding-members', async (_req, res) => {
  try {
    const list = await FoundingMember.find().sort({ order: 1, createdAt: 1 });
    if (list && list.length > 0) return res.json({ success: true, data: list });
  } catch (err) {
    console.warn('[founding-members] fallback:', err instanceof Error ? err.message : err);
  }
  return res.json({ success: true, data: demoFoundingMembers });
});

router.get('/founding-members/:slug', async (req, res) => {
  try {
    const item = await FoundingMember.findOne({ slug: req.params.slug });
    if (item) return res.json({ success: true, data: item });
  } catch (err) {
    console.warn('[founding-members/:slug] fallback:', err instanceof Error ? err.message : err);
  }
  const fallback = demoFoundingMembers.find((f) => f.slug === req.params.slug);
  if (!fallback) return res.status(404).json({ success: false, message: 'Founding member not found' });
  return res.json({ success: true, data: fallback });
});

router.get('/supervisors', async (_req, res) => {
  try {
    const list = await Supervisor.find().sort({ name: 1 });
    if (list && list.length > 0) return res.json({ success: true, data: list });
  } catch (err) {
    console.warn('[supervisors] fallback:', err instanceof Error ? err.message : err);
  }
  return res.json({ success: true, data: demoSupervisors });
});

router.get('/supervisors/:slug', async (req, res) => {
  try {
    const item = await Supervisor.findOne({ slug: req.params.slug });
    if (item) return res.json({ success: true, data: item });
  } catch (err) {
    console.warn('[supervisors/:slug] fallback:', err instanceof Error ? err.message : err);
  }
  const fallback = demoSupervisors.find((s) => s.slug === req.params.slug);
  if (!fallback) return res.status(404).json({ success: false, message: 'Supervisor not found' });
  return res.json({ success: true, data: fallback });
});

router.get('/scholars', async (_req, res) => {
  try {
    const list = await Scholar.find().sort({ name: 1 });
    if (list && list.length > 0) return res.json({ success: true, data: list });
  } catch (err) {
    console.warn('[scholars] fallback:', err instanceof Error ? err.message : err);
  }
  return res.json({ success: true, data: demoScholars });
});

router.get('/scholars/:slug', async (req, res) => {
  try {
    const item = await Scholar.findOne({ slug: req.params.slug });
    if (item) return res.json({ success: true, data: item });
  } catch (err) {
    console.warn('[scholars/:slug] fallback:', err instanceof Error ? err.message : err);
  }
  const fallback = demoScholars.find((s) => s.slug === req.params.slug);
  if (!fallback) return res.status(404).json({ success: false, message: 'Scholar not found' });
  return res.json({ success: true, data: fallback });
});

router.get('/news', async (req, res) => {
  try {
    const filter = req.query.announcements === 'true' ? { isAnnouncement: true } : {};
    const list = await News.find(filter).sort({ publishedAt: -1 });
    if (list && list.length > 0) return res.json({ success: true, data: list });
  } catch (err) {
    console.warn('[news] fallback:', err instanceof Error ? err.message : err);
  }
  return res.json({ success: true, data: fallbackNews });
});

router.get('/news/:slug', async (req, res) => {
  try {
    const item = await News.findOne({ slug: req.params.slug });
    if (item) return res.json({ success: true, data: item });
  } catch (err) {
    console.warn('[news/:slug] fallback:', err instanceof Error ? err.message : err);
  }
  const fallback = fallbackNews.find((n) => n.slug === req.params.slug);
  if (!fallback) return res.status(404).json({ success: false, message: 'News not found' });
  return res.json({ success: true, data: fallback });
});

router.get('/settings', async (req, res, next) => {
  try {
    return await getSettings(req, res);
  } catch {
    return res.json({ success: true, data: fallbackSettings });
  }
});

const contactSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  subject: z.string().optional(),
  message: z.string().min(5).max(5000)
});
router.post('/contact', validate(contactSchema), async (req, res) => {
  try {
    const message = await Message.create({ type: 'contact', ...req.body });
    await notifyAdmins({
      title: 'New website inquiry',
      body: `${message.name} sent a contact message: ${message.subject || message.message.slice(0, 180)}`,
      category: 'inquiry',
      link: '/admin/resources/messages'
    }).catch(() => {});
    return res.status(201).json({ success: true, data: message });
  } catch {
    return res.status(201).json({
      success: true,
      message: 'Inquiry received. Thank you for contacting ASPIER.',
      data: { ...req.body, createdAt: new Date().toISOString() }
    });
  }
});

router.post('/join', submitInitialApplication);
router.post('/membership/signup', authLimiter, slowAuth, submitApplicantSignup);
router.post('/membership/applicant-login', authLimiter, slowAuth, applicantLoginWithTwoFactor);
router.post('/membership/activate', authLimiter, slowAuth, activateMemberAccount);
router.post('/membership/lookup', authLimiter, membershipPortal);
router.post('/membership/access-code', authLimiter, requestMembershipAccessCode);
router.post('/membership/:id/notifications/:notificationId/read', markMembershipNotificationRead);
router.post('/membership/:id/profile', submitMembershipProfile);
router.post('/membership/:id/payment', submitMembershipPayment);

const applicationPhotoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => callback(null, ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype))
});
router.post('/membership/:id/photo', applicationPhotoUpload.single('file'), uploadMembershipPhoto);

router.get('/onboarding/validate', validateOnboardingToken);
router.post('/onboarding/photo', applicationPhotoUpload.single('file'), uploadOnboardingPhoto);
router.post('/onboarding/complete', completeOnboarding);

export default router;
