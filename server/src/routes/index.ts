import { Router } from 'express';
import auth from './auth.routes.js';
import publicRoutes from './public.routes.js';
import academy from './academy.routes.js';
import payment from './payment.routes.js';
import me from './me.routes.js';
import admin from './admin.routes.js';
import enrollments from './enrollment.routes.js';
import { catalog } from '../controllers/academy.controller.js';

const router = Router();
router.get('/health', (_req, res) => res.json({ success: true, status: 'ok', timestamp: new Date().toISOString() }));
router.use('/auth', auth);
router.use('/public', publicRoutes);
router.use('/academy', academy);
router.use('/payments', payment);
router.use('/me', me);
router.use('/admin', admin);
router.use('/enrollments', enrollments);
router.get('/courses', catalog);

export default router;
