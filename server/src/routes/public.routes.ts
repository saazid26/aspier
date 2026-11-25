import { Router } from 'express';
import multer from 'multer';
import mongoose from 'mongoose';
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
import {
  fallbackWings,
  fallbackSettings,
  fallbackNews,
  fallbackCourses,
  demoResearch,
  demoSupervisors,
  demoScholars,
  demoFoundingMembers,
  getFallbackWings,
  getFallbackResearch,
  getFallbackFoundingMembers,
  getFallbackSupervisors,
  getFallbackScholars
} from '../utils/fallbackData.js';
import { fastCache } from '../utils/fastCache.js';

const router = Router();

// Live CMS Zero-stale cache headers: ensure all public GET endpoints serve instant updates
router.use((req, res, next) => {
  if (req.method === 'GET') {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
  }
  next();
});

router.get('/robots.txt', (_req, res) => {
  const baseUrl = (env.CLIENT_URL || 'https://aspierglobal.vercel.app').replace(/\/$/, '');
  const content = `User-agent: *
Allow: /
Disallow: /admin/
Disallow: /student/
Disallow: /academy/student/
Disallow: /api/

Sitemap: ${baseUrl}/sitemap.xml
`;
  res.header('Content-Type', 'text/plain');
  res.send(content);
});

router.get('/sitemap.xml', async (_req, res) => {
  try {
    const baseUrl = (env.CLIENT_URL || 'https://aspierglobal.vercel.app').replace(/\/$/, '');
    const today = new Date().toISOString().split('T')[0];
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
    const activeCourses = courses.length ? courses : (fallbackCourses as any[]);
    const activeNews = news.length ? news : fallbackNews;
    const activeSupervisors = supervisors.length ? supervisors : demoSupervisors;
    const activeScholars = scholars.length ? scholars : demoScholars;

    const staticUrls = [
      { path: '', priority: '1.0', changefreq: 'daily' },
      { path: '/wings', priority: '0.9', changefreq: 'weekly' },
      { path: '/wings/apply-research', priority: '0.85', changefreq: 'weekly' },
      { path: '/team', priority: '0.85', changefreq: 'weekly' },
      { path: '/academy', priority: '0.9', changefreq: 'weekly' },
      { path: '/academy/classes', priority: '0.8', changefreq: 'weekly' },
      { path: '/research', priority: '0.8', changefreq: 'weekly' },
      { path: '/news', priority: '0.75', changefreq: 'weekly' },
      { path: '/contact', priority: '0.7', changefreq: 'monthly' },
      { path: '/join', priority: '0.8', changefreq: 'monthly' }
    ];

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
    for (const item of staticUrls) {
      xml += `  <url>\n    <loc>${baseUrl}${item.path}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${item.changefreq}</changefreq>\n    <priority>${item.priority}</priority>\n  </url>\n`;
    }
    for (const wing of activeWings) {
      const mod = (wing as any).updatedAt ? new Date((wing as any).updatedAt).toISOString().split('T')[0] : today;
      xml += `  <url>\n    <loc>${baseUrl}/wings/${wing.slug}</loc>\n    <lastmod>${mod}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.85</priority>\n  </url>\n`;
    }
    for (const course of activeCourses) {
      const mod = (course as any).updatedAt ? new Date((course as any).updatedAt).toISOString().split('T')[0] : today;
      xml += `  <url>\n    <loc>${baseUrl}/academy/courses/${course.slug || (course as any)._id}</loc>\n    <lastmod>${mod}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.85</priority>\n  </url>\n`;
    }
    for (const r of activeResearch) {
      const mod = (r as any).updatedAt ? new Date((r as any).updatedAt).toISOString().split('T')[0] : today;
      xml += `  <url>\n    <loc>${baseUrl}/research/${r.slug}</loc>\n    <lastmod>${mod}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.75</priority>\n  </url>\n`;
    }
    for (const n of activeNews) {
      const mod = (n as any).updatedAt ? new Date((n as any).updatedAt).toISOString().split('T')[0] : today;
      xml += `  <url>\n    <loc>${baseUrl}/news/${n.slug}</loc>\n    <lastmod>${mod}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.7</priority>\n  </url>\n`;
    }
    for (const s of activeSupervisors) {
      const mod = (s as any).updatedAt ? new Date((s as any).updatedAt).toISOString().split('T')[0] : today;
      xml += `  <url>\n    <loc>${baseUrl}/supervisors/${s.slug}</loc>\n    <lastmod>${mod}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.7</priority>\n  </url>\n`;
    }
    for (const sc of activeScholars) {
      const mod = (sc as any).updatedAt ? new Date((sc as any).updatedAt).toISOString().split('T')[0] : today;
      xml += `  <url>\n    <loc>${baseUrl}/scholars/${sc.slug}</loc>\n    <lastmod>${mod}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.7</priority>\n  </url>\n`;
    }
    xml += '</urlset>';
    res.header('Content-Type', 'application/xml');
    res.send(xml);
  } catch {
    res.status(500).send('Error generating sitemap');
  }
});

router.get('/wings', async (_req, res) => {
  const cached = fastCache.get('public:wings');
  if (cached) return res.json({ success: true, data: cached });
  try {
    if (mongoose.connection.readyState === 1) {
      const list = await Wing.find({ isActive: true }).sort({ order: 1 }).lean().maxTimeMS(2000);
      if (list && list.length > 0) {
        fastCache.set('public:wings', list, 60);
        return res.json({ success: true, data: list });
      }
    }
  } catch (err) {
    console.warn('[wings] fallback:', err instanceof Error ? err.message : err);
  }
  return res.json({ success: true, data: getFallbackWings().filter((w) => w.isActive !== false) });
});

router.get('/wings/:slug', async (req, res) => {
  try {
    let wing: any = null;
    let researchList: any[] = [];
    wing = await Wing.findOne({ slug: req.params.slug });
    if (wing) {
      researchList = await Research.find({ wingId: wing._id, status: { $in: ['published', 'ongoing'] } }).sort({ publishedAt: -1 }).catch(() => []);
      if (!researchList || researchList.length === 0) {
        researchList = getFallbackResearch().filter((r) => r.wingSlug === wing.slug || r.wingId?.toString() === wing._id?.toString());
      }
      return res.json({ success: true, data: { ...wing.toObject(), research: researchList } });
    }
  } catch (err) {
    console.warn('[wings/:slug] fallback:', err instanceof Error ? err.message : err);
  }
  const fallback = getFallbackWings().find((w) => w.slug === req.params.slug);
  if (!fallback) return res.status(404).json({ success: false, message: 'Wing not found' });
  const relatedResearch = getFallbackResearch().filter((r) => r.wingSlug === fallback.slug || r.wingId?.toString() === fallback._id?.toString());
  return res.json({ success: true, data: { ...fallback, research: relatedResearch } });
});

router.get('/research', async (req, res) => {
  try {
    const filter: Record<string, any> = { status: { $in: ['published', 'ongoing'] } };
    if (req.query.wingId) filter.wingId = req.query.wingId;
    if (req.query.category) {
      const cat = String(req.query.category);
      if (cat === 'ongoing' || cat === 'present') filter.category = { $in: ['ongoing', 'present'] };
      else filter.category = cat;
    }
    const list = await Research.find(filter).sort({ featured: -1, publishedAt: -1 }).limit(100);
    if (list && list.length > 0) return res.json({ success: true, data: list });
  } catch (err) {
    console.warn('[research] fallback:', err instanceof Error ? err.message : err);
  }
  let results = [...getFallbackResearch()];
  if (req.query.wingId) results = results.filter((r) => r.wingId?.toString() === req.query.wingId?.toString());
  if (req.query.category) {
    const cat = String(req.query.category);
    if (cat === 'ongoing' || cat === 'present') results = results.filter((r) => r.category === 'ongoing' || r.category === 'present');
    else results = results.filter((r) => r.category === cat);
  }
  return res.json({ success: true, data: results });
});

router.get('/research/:slug', async (req, res) => {
  try {
    const item = await Research.findOne({ slug: req.params.slug });
    if (item) return res.json({ success: true, data: item });
  } catch (err) {
    console.warn('[research/:slug] fallback:', err instanceof Error ? err.message : err);
  }
  const item = getFallbackResearch().find((r) => r.slug === req.params.slug);
  if (!item) return res.status(404).json({ success: false, message: 'Research project not found' });
  return res.json({ success: true, data: item });
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

router.get('/team', async (_req, res) => {
  try {
    const [founding, supervisors, scholars] = await Promise.all([
      FoundingMember.find().sort({ order: 1, displayOrder: 1, createdAt: 1 }).catch(() => getFallbackFoundingMembers()),
      Supervisor.find().sort({ order: 1, displayOrder: 1, createdAt: 1 }).catch(() => getFallbackSupervisors()),
      Scholar.find().sort({ order: 1, displayOrder: 1, createdAt: 1 }).catch(() => getFallbackScholars())
    ]);
    return res.json({ success: true, data: { founding, supervisors, scholars } });
  } catch {
    return res.json({
      success: true,
      data: {
        founding: getFallbackFoundingMembers(),
        supervisors: getFallbackSupervisors(),
        scholars: getFallbackScholars()
      }
    });
  }
});

router.get('/founding-members', async (_req, res) => {
  try {
    const list = await FoundingMember.find().sort({ order: 1, displayOrder: 1, createdAt: 1 });
    if (list && list.length > 0) return res.json({ success: true, data: list });
  } catch (err) {
    console.warn('[founding-members] fallback:', err instanceof Error ? err.message : err);
  }
  return res.json({ success: true, data: getFallbackFoundingMembers() });
});

router.get('/founding-members/:slug', async (req, res) => {
  try {
    const item = await FoundingMember.findOne({ slug: req.params.slug });
    if (item) return res.json({ success: true, data: item });
  } catch (err) {
    console.warn('[founding-members/:slug] fallback:', err instanceof Error ? err.message : err);
  }
  const fallback = getFallbackFoundingMembers().find((f) => f.slug === req.params.slug);
  if (!fallback) return res.status(404).json({ success: false, message: 'Founding member not found' });
  return res.json({ success: true, data: fallback });
});

router.get('/supervisors', async (_req, res) => {
  const cached = fastCache.get('public:supervisors');
  if (cached) return res.json({ success: true, data: cached });
  try {
    if (mongoose.connection.readyState === 1) {
      const list = await Supervisor.find().sort({ order: 1, displayOrder: 1, createdAt: 1 }).lean().maxTimeMS(2000);
      if (list && list.length > 0) {
        fastCache.set('public:supervisors', list, 60);
        return res.json({ success: true, data: list });
      }
    }
  } catch (err) {
    console.warn('[supervisors] fallback:', err instanceof Error ? err.message : err);
  }
  return res.json({ success: true, data: getFallbackSupervisors() });
});

router.get('/supervisors/:slug', async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const item = await Supervisor.findOne({ slug: req.params.slug }).lean().maxTimeMS(2000);
      if (item) return res.json({ success: true, data: item });
    }
  } catch (err) {
    console.warn('[supervisors/:slug] fallback:', err instanceof Error ? err.message : err);
  }
  const fallback = getFallbackSupervisors().find((s) => s.slug === req.params.slug);
  if (!fallback) return res.status(404).json({ success: false, message: 'Supervisor not found' });
  return res.json({ success: true, data: fallback });
});

router.get('/scholars', async (_req, res) => {
  const cached = fastCache.get('public:scholars');
  if (cached) return res.json({ success: true, data: cached });
  try {
    if (mongoose.connection.readyState === 1) {
      const list = await Scholar.find().sort({ order: 1, displayOrder: 1, createdAt: 1 }).lean().maxTimeMS(2000);
      if (list && list.length > 0) {
        fastCache.set('public:scholars', list, 60);
        return res.json({ success: true, data: list });
      }
    }
  } catch (err) {
    console.warn('[scholars] fallback:', err instanceof Error ? err.message : err);
  }
  return res.json({ success: true, data: getFallbackScholars() });
});

router.get('/scholars/:slug', async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const item = await Scholar.findOne({ slug: req.params.slug }).lean().maxTimeMS(2000);
      if (item) return res.json({ success: true, data: item });
    }
  } catch (err) {
    console.warn('[scholars/:slug] fallback:', err instanceof Error ? err.message : err);
  }
  const fallback = getFallbackScholars().find((s) => s.slug === req.params.slug);
  if (!fallback) return res.status(404).json({ success: false, message: 'Scholar not found' });
  return res.json({ success: true, data: fallback });
});

router.get('/news', async (req, res) => {
  const cacheKey = req.query.announcements === 'true' ? 'public:announcements' : 'public:news';
  const cached = fastCache.get(cacheKey);
  if (cached) return res.json({ success: true, data: cached });
  try {
    if (mongoose.connection.readyState === 1) {
      const filter = req.query.announcements === 'true' ? { isAnnouncement: true } : {};
      const list = await News.find(filter).sort({ publishedAt: -1 }).lean().maxTimeMS(2000);
      if (list && list.length > 0) {
        fastCache.set(cacheKey, list, 60);
        return res.json({ success: true, data: list });
      }
    }
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
      link: '/admin/resources/messages',
      applicantName: message.name,
      applicantEmail: message.email,
      referenceId: String(message._id)
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
