import { Router } from 'express';
import mongoose from 'mongoose';
import auth from './auth.routes.js';
import publicRoutes from './public.routes.js';
import academy from './academy.routes.js';
import payment from './payment.routes.js';
import me from './me.routes.js';
import admin from './admin.routes.js';
import enrollments from './enrollment.routes.js';
import { catalog } from '../controllers/academy.controller.js';
import { getSettings } from '../controllers/settings.controller.js';
import { getMongoUri } from '../config/db.js';

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
router.get('/courses', catalog);

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
