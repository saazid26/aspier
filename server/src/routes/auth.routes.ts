import { Router } from 'express';
import { z } from 'zod';
import { register, login, logout, refresh, forgotPassword, resetPassword, changePassword, setup2FA, verify2FA, disable2FA, activeSessions, revokeSession, revokeAllOtherSessions, updateAdminCredentials, me, admin2FASetup, completeAdmin2FALogin, admin2FAStatus, setupAdminPanel2FA, verifyAdminPanel2FA, disableAdminPanel2FA } from '../controllers/auth.controller.js';
import { listMemberNotifications, markMemberNotificationRead, markAllMemberNotificationsRead } from '../controllers/notification.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { authLimiter, forgotLimiter, slowAuth } from '../middleware/rateLimit.js';
import { csrfToken } from '../middleware/csrf.js';
import { noStore } from '../middleware/noStore.js';
import { verifyWebAuthnLogin, verifyWebAuthnRegistration, webAuthnRegistrationOptions, listWebAuthnCredentials, revokeWebAuthnCredential } from '../controllers/webauthn.controller.js';
const router = Router();
const strongPassword = z.string().min(8).max(128)
  .regex(/[a-z]/, 'Use at least one lowercase letter')
  .regex(/[A-Z]/, 'Use at least one uppercase letter')
  .regex(/\d/, 'Use at least one number')
  .refine((value) => !value.toLowerCase().includes('password') && !value.includes('123456'), 'Password is too common');
const registerSchema = z.object({ name: z.string().trim().min(2).max(100), email: z.string().email().transform((value) => value.trim().toLowerCase()), password: strongPassword });
const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1).max(128), role: z.string().optional(), totpCode: z.string().max(100).optional(), strongKey: z.string().max(128).optional() });
router.get('/csrf-token', csrfToken);
router.post('/register', authLimiter, slowAuth, validate(registerSchema), register);
router.post('/login', authLimiter, slowAuth, validate(loginSchema), login);
router.post('/admin-2fa/setup', authLimiter, validate(z.object({ setupToken: z.string().min(32).max(100) })), admin2FASetup);
router.post('/admin-2fa/verify', authLimiter, validate(z.object({ setupToken: z.string().min(32).max(100), code: z.string().length(6) })), completeAdmin2FALogin);
router.get('/admin-2fa/settings', authenticate, noStore, admin2FAStatus);
router.post('/admin-2fa/settings/setup', authenticate, noStore, authLimiter, validate(z.object({
  strongKey: z.string().min(16).max(128),
  confirmStrongKey: z.string().min(16).max(128),
  currentStrongKey: z.string().max(128).optional(),
  currentTotpCode: z.string().length(6).optional()
})), setupAdminPanel2FA);
router.post('/admin-2fa/settings/verify', authenticate, noStore, authLimiter, validate(z.object({ code: z.string().length(6) })), verifyAdminPanel2FA);
router.post('/admin-2fa/settings/disable', authenticate, noStore, authLimiter, validate(z.object({ code: z.string().length(6), strongKey: z.string().min(1).max(128) })), disableAdminPanel2FA);
router.post('/webauthn/login/verify', authLimiter, noStore, validate(z.object({ challengeToken: z.string().min(32).max(100), response: z.record(z.string(), z.unknown()) })), verifyWebAuthnLogin);
router.post('/webauthn/register/options', authenticate, noStore, webAuthnRegistrationOptions);
router.post('/webauthn/register/verify', authenticate, noStore, validate(z.object({ response: z.record(z.string(), z.unknown()), deviceName: z.string().optional() })), verifyWebAuthnRegistration);
router.get('/webauthn/credentials', authenticate, noStore, listWebAuthnCredentials);
router.delete('/webauthn/credentials/:id', authenticate, noStore, revokeWebAuthnCredential);
router.post('/admin/update-credentials', authenticate, authorize('admin', 'superadmin'), noStore, updateAdminCredentials);
router.get('/notifications', authenticate, noStore, listMemberNotifications);
router.patch('/notifications/read-all', authenticate, noStore, markAllMemberNotificationsRead);
router.patch('/notifications/:id/read', authenticate, noStore, markMemberNotificationRead);
router.post('/logout', authenticate, noStore, logout);
router.post('/refresh', refresh);
router.post('/forgot-password', forgotLimiter, validate(z.object({ email: z.string().email() })), forgotPassword);
router.post('/reset-password', authLimiter, validate(z.object({ token: z.string().min(16), password: z.string().min(8).max(128), confirmPassword: z.string().min(8).max(128) })), resetPassword);
router.post('/change-password', authenticate, noStore, validate(z.object({ currentPassword: z.string().min(1), password: z.string().min(8).max(128), confirmPassword: z.string().min(8).max(128) })), changePassword);
router.post('/2fa/setup', authenticate, authorize('admin', 'superadmin', 'supervisor', 'youngScholar'), noStore, setup2FA);
router.post('/2fa/verify', authenticate, authorize('admin', 'superadmin', 'supervisor', 'youngScholar'), noStore, validate(z.object({ code: z.string().length(6) })), verify2FA);
router.post('/2fa/disable', authenticate, authorize('admin', 'superadmin'), noStore, validate(z.object({ password: z.string().min(1) })), disable2FA);
router.get('/sessions', authenticate, noStore, activeSessions);
router.post('/sessions/revoke-all', authenticate, noStore, revokeAllOtherSessions);
router.delete('/sessions/:hash', authenticate, noStore, revokeSession);
router.get('/me', authenticate, noStore, me);
export default router;
