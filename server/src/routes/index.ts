import { Router } from 'express';
import mongoose from 'mongoose';
import auth from './auth.routes.js';
import publicRoutes from './public.routes.js';
import academy from './academy.routes.js';
import payment from './payment.routes.js';
import me from './me.routes.js';
import admin from './admin.routes.js';
import enrollments from './enrollment.routes.js';
import certificateRoutes from './certificate.routes.js';
import { catalog } from '../controllers/academy.controller.js';
import { getSettings } from '../controllers/settings.controller.js';
import { getMongoUri } from '../config/db.js';
import { serveMediaAsset } from '../services/media.service.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { viewMembershipApplicationCv } from '../controllers/membership.controller.js';

const router = Router();
router.get('/health', (_req, res) => {
  const hasMongoUri = Boolean(getMongoUri());
  res.json({
    ok: true,
    success: true,
    status: 'ok',
    dbState: mongoose.connection.readyState,
    hasMongoUri,
    timestamp: new Date().toISOString()
  });
});
router.get('/settings', getSettings);
router.use('/auth', auth);
router.use('/public', publicRoutes);
router.use('/academy', academy);
router.use('/payments', payment);
router.use('/me', me);
router.use('/admin', admin);
router.use('/enrollments', enrollments);
router.use('/certificates', certificateRoutes);
router.get('/media/:id', serveMediaAsset);
router.get('/public/media/:id', serveMediaAsset);
router.get('/applications/:id/cv', authenticate, authorize('admin', 'superadmin'), viewMembershipApplicationCv);
router.get('/courses', catalog);

// Direct root aliases for public datasets (Wings, Team, Research, News)
router.get('/wings', (req, res, next) => {
  req.url = '/wings';
  publicRoutes(req, res, next);
});
router.get('/wings/:slug', (req, res, next) => {
  req.url = '/wings/' + req.params.slug;
  publicRoutes(req, res, next);
});
router.get('/team', (req, res, next) => {
  req.url = '/team';
  publicRoutes(req, res, next);
});
router.post('/team', (req, res, next) => {
  req.url = '/team';
  admin(req, res, next);
});
router.put('/team/reorder', (req, res, next) => {
  req.url = '/team/reorder';
  admin(req, res, next);
});
router.patch('/team/reorder', (req, res, next) => {
  req.url = '/team/reorder';
  admin(req, res, next);
});
router.put('/team/:id', (req, res, next) => {
  req.url = '/team/' + req.params.id;
  admin(req, res, next);
});
router.patch('/team/:id', (req, res, next) => {
  req.url = '/team/' + req.params.id;
  admin(req, res, next);
});
router.get('/research', (req, res, next) => {
  req.url = '/research';
  publicRoutes(req, res, next);
});
router.get('/news', (req, res, next) => {
  req.url = '/news';
  publicRoutes(req, res, next);
});
router.get('/supervisors', (req, res, next) => {
  req.url = '/supervisors';
  publicRoutes(req, res, next);
});
router.get('/scholars', (req, res, next) => {
  req.url = '/scholars';
  publicRoutes(req, res, next);
});
router.get('/founding-members', (req, res, next) => {
  req.url = '/founding-members';
  publicRoutes(req, res, next);
});
router.get('/founding-members/:slug', (req, res, next) => {
  req.url = '/founding-members/' + req.params.slug;
  publicRoutes(req, res, next);
});

// Resilient direct aliases for public form submissions & Academy registration
router.post('/inquiries', (req, res, next) => {
  req.url = '/contact';
  publicRoutes(req, res, next);
});
router.post('/applications', (req, res, next) => {
  if (req.body?.researchTitle || req.body?.skills || req.file) {
    req.url = '/research-applications';
  } else {
    req.url = '/join';
  }
  publicRoutes(req, res, next);
});
router.post('/research-mates/apply', (req, res, next) => {
  req.url = '/research-applications';
  publicRoutes(req, res, next);
});
router.post('/academy/register', (req, res, next) => {
  req.url = '/register';
  auth(req, res, next);
});

export default router;
