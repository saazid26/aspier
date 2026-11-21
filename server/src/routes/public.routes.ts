import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import Wing from '../models/Wing.js';
import Research from '../models/Research.js';
import Supervisor from '../models/Supervisor.js';
import Scholar from '../models/Scholar.js';
import News from '../models/News.js';
import Message from '../models/Message.js';
import Course from '../models/Course.js';
import { env } from '../config/env.js';
import { validate } from '../middleware/validate.js';
import { getSettings } from '../controllers/settings.controller.js';
import { activateMemberAccount, applicantLoginWithTwoFactor, markMembershipNotificationRead, membershipPortal, requestMembershipAccessCode, submitApplicantSignup, submitInitialApplication, submitMembershipPayment, submitMembershipProfile, uploadMembershipPhoto } from '../controllers/membership.controller.js';
import { notifyAdmins } from '../services/notification.service.js';
import { authLimiter, slowAuth } from '../middleware/rateLimit.js';
import { submitResearchApplication } from '../controllers/researchApplication.controller.js';
const router = Router();
router.get('/sitemap.xml', async (_req, res) => {
  try {
    const baseUrl = (env.CLIENT_URL || 'https://aspier.org').replace(/\/$/, '');
    const [wings, research, courses, news, supervisors, scholars] = await Promise.all([
      Wing.find({ isActive: true }).select('slug updatedAt'),
      Research.find({ status: 'published' }).select('slug updatedAt'),
      Course.find({ status: 'published' }).select('slug updatedAt'),
      News.find().select('slug updatedAt'),
      Supervisor.find().select('slug updatedAt'),
      Scholar.find().select('slug updatedAt')
    ]);

    const staticUrls = [
      '',
      '/about',
      '/team',
      '/research',
      '/wings',
      '/news',
      '/academy',
      '/contact'
    ];

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    for (const path of staticUrls) {
      xml += `  <url>\n    <loc>${baseUrl}${path}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>${path === '' ? '1.0' : '0.8'}</priority>\n  </url>\n`;
    }

    for (const wing of wings) {
      xml += `  <url>\n    <loc>${baseUrl}/wings/${wing.slug}</loc>\n    <lastmod>${new Date((wing as any).updatedAt || Date.now()).toISOString().split('T')[0]}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
    }

    for (const r of research) {
      xml += `  <url>\n    <loc>${baseUrl}/research/${r.slug}</loc>\n    <lastmod>${new Date((r as any).updatedAt || Date.now()).toISOString().split('T')[0]}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.7</priority>\n  </url>\n`;
    }

    for (const c of courses) {
      xml += `  <url>\n    <loc>${baseUrl}/academy/courses/${c.slug}</loc>\n    <lastmod>${new Date((c as any).updatedAt || Date.now()).toISOString().split('T')[0]}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
    }

    for (const n of news) {
      xml += `  <url>\n    <loc>${baseUrl}/news/${n.slug}</loc>\n    <lastmod>${new Date((n as any).updatedAt || Date.now()).toISOString().split('T')[0]}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.6</priority>\n  </url>\n`;
    }

    for (const s of supervisors) {
      xml += `  <url>\n    <loc>${baseUrl}/supervisors/${s.slug}</loc>\n    <lastmod>${new Date((s as any).updatedAt || Date.now()).toISOString().split('T')[0]}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.6</priority>\n  </url>\n`;
    }

    for (const sc of scholars) {
      xml += `  <url>\n    <loc>${baseUrl}/scholars/${sc.slug}</loc>\n    <lastmod>${new Date((sc as any).updatedAt || Date.now()).toISOString().split('T')[0]}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.6</priority>\n  </url>\n`;
    }

    xml += '</urlset>';
    res.header('Content-Type', 'application/xml');
    res.send(xml);
  } catch (error) {
    res.status(500).send('Error generating sitemap');
  }
});
router.get('/wings', async (_req, res) => res.json({ success: true, data: await Wing.find({ isActive: true }).sort({ order: 1 }) }));
router.get('/wings/:slug', async (req, res) => {
  const wing = await Wing.findOne({ slug: req.params.slug });
  if (!wing) return res.status(404).json({ success: false, message: 'Wing not found' });
  res.json({ success: true, data: { ...wing.toObject(), research: await Research.find({ wingId: wing._id, status: 'published' }).sort({ publishedAt: -1 }) } });
});
router.get('/research', async (req, res) => res.json({ success: true, data: await Research.find({ status: 'published', ...(req.query.wingId ? { wingId: req.query.wingId } : {}), ...(req.query.category ? { category: req.query.category } : {}) }).sort({ featured: -1, publishedAt: -1 }).limit(100) }));
const cvUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 4 * 1024 * 1024 }, fileFilter: (_req, file, callback) => callback(null, ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(file.mimetype)) });
router.post('/research/:id/applications', authLimiter, cvUpload.single('cv'), submitResearchApplication);
router.get('/research/:slug', async (req, res) => { const item = await Research.findOne({ slug: req.params.slug, status: 'published' }).populate('wingId'); if (!item) return res.status(404).json({ success: false, message: 'Research not found' }); res.json({ success: true, data: item }); });
router.get('/supervisors', async (_req, res) => res.json({ success: true, data: await Supervisor.find().sort({ name: 1 }) }));
router.get('/supervisors/:slug', async (req, res) => { const item = await Supervisor.findOne({ slug: req.params.slug }); if (!item) return res.status(404).json({ success: false, message: 'Supervisor not found' }); res.json({ success: true, data: item }); });
router.get('/scholars', async (_req, res) => res.json({ success: true, data: await Scholar.find().sort({ name: 1 }) }));
router.get('/scholars/:slug', async (req, res) => { const item = await Scholar.findOne({ slug: req.params.slug }); if (!item) return res.status(404).json({ success: false, message: 'Scholar not found' }); res.json({ success: true, data: item }); });
router.get('/news', async (req, res) => res.json({ success: true, data: await News.find(req.query.announcements === 'true' ? { isAnnouncement: true } : {}).sort({ publishedAt: -1 }) }));
router.get('/news/:slug', async (req, res) => { const item = await News.findOne({ slug: req.params.slug }); if (!item) return res.status(404).json({ success: false, message: 'News not found' }); res.json({ success: true, data: item }); });
router.get('/settings', getSettings);
const contactSchema = z.object({ name: z.string().min(2), email: z.string().email(), phone: z.string().optional(), subject: z.string().optional(), message: z.string().min(5).max(5000) });
router.post('/contact', validate(contactSchema), async (req, res) => {
  const message = await Message.create({ type: 'contact', ...req.body });
  await notifyAdmins({ title: 'New website inquiry', body: `${message.name} sent a contact message: ${message.subject || message.message.slice(0, 180)}`, category: 'inquiry', link: '/admin/resources/messages' });
  res.status(201).json({ success: true, data: message });
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
export default router;
