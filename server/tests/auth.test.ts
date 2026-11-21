import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import User from '../src/models/User.js';
import { hashPassword } from '../src/services/password.service.js';
import { authenticator } from 'otplib';
import { env, FIXED_ADMIN_EMAIL } from '../src/config/env.js';
describe('auth', () => {
  it('registers a student and rejects weak passwords', async () => {
    const weak = await request(app).post('/api/v1/auth/register').send({ name: 'Student', email: 'weak@example.com', password: 'password' });
    expect(weak.status).toBe(400);
    const response = await request(app).post('/api/v1/auth/register').send({ name: 'Student', email: 'student@example.com', password: 'Strong@1234' });
    expect(response.status).toBe(201);
  });
  it('allows direct admin login until in-panel Strong 2FA is enabled, then requires TOTP and the key', async () => {
    await User.create({ name: 'Admin', email: FIXED_ADMIN_EMAIL, passwordHash: await hashPassword(env.ADMIN_PASSWORD), role: 'superadmin' });
    const admin = request.agent(app);
    const login = await admin.post('/api/v1/auth/login').send({ email: FIXED_ADMIN_EMAIL, password: env.ADMIN_PASSWORD, role: 'admin' });
    expect(login.status).toBe(200);
    expect(login.body.data.requires2FASetup).toBeUndefined();
    expect(login.body.data.role).toBe('superadmin');
    expect((await admin.get('/api/v1/auth/admin-2fa/settings')).body.data.enabled).toBe(false);
    expect((await admin.get('/api/v1/auth/me')).body.data.role).toBe('superadmin');
    expect((await admin.post('/api/v1/auth/refresh')).status).toBe(200);
    expect((await admin.get('/api/v1/auth/me')).body.data.role).toBe('superadmin');

    const strongKey = 'ASPIER-Strong-Key-2026-Only-For-Test';
    const setup = await admin.post('/api/v1/auth/admin-2fa/settings/setup').send({ strongKey, confirmStrongKey: strongKey });
    expect(setup.body.data.qrCode).toContain('data:image/png;base64,');
    const code = authenticator.generate(setup.body.data.secret);
    const verified = await admin.post('/api/v1/auth/admin-2fa/settings/verify').send({ code });
    expect(verified.status).toBe(200);
    expect((await User.findOne({ email: FIXED_ADMIN_EMAIL }))?.isAdmin2FAEnabled).toBe(true);
    expect((await admin.get('/api/v1/admin/dashboard')).status).toBe(200);

    const unauthenticated = request.agent(app);
    const challenge = await unauthenticated.post('/api/v1/auth/login').send({ email: FIXED_ADMIN_EMAIL, password: env.ADMIN_PASSWORD, role: 'admin' });
    expect(challenge.body.data.requires2FA).toBe(true);
    expect(challenge.body.data.requiresStrongKey).toBe(true);
    expect((await unauthenticated.get('/api/v1/admin/dashboard')).status).toBe(401);
    const successfulLogin = await unauthenticated.post('/api/v1/auth/login').send({
      email: FIXED_ADMIN_EMAIL,
      password: env.ADMIN_PASSWORD,
      role: 'admin',
      totpCode: authenticator.generate(setup.body.data.secret),
      strongKey
    });
    expect(successfulLogin.body.data.role).toBe('superadmin');
    expect((await unauthenticated.get('/api/v1/admin/dashboard')).status).toBe(200);

    const wrongKey = await request(app).post('/api/v1/auth/login').send({
      email: FIXED_ADMIN_EMAIL,
      password: env.ADMIN_PASSWORD,
      role: 'admin',
      totpCode: authenticator.generate(setup.body.data.secret),
      strongKey: 'incorrect-strong-key'
    });
    expect(wrongKey.body.data.requiresStrongKey).toBe(true);

    const updatedStrongKey = 'ASPIER-Updated-Strong-Key-2026-For-Test';
    const updateSetup = await admin.post('/api/v1/auth/admin-2fa/settings/setup').send({
      strongKey: updatedStrongKey,
      confirmStrongKey: updatedStrongKey,
      currentStrongKey: strongKey,
      currentTotpCode: authenticator.generate(setup.body.data.secret)
    });
    expect(updateSetup.status).toBe(200);
    const updateVerified = await admin.post('/api/v1/auth/admin-2fa/settings/verify').send({
      code: authenticator.generate(updateSetup.body.data.secret)
    });
    expect(updateVerified.status).toBe(200);
    const oldKeyLogin = await request(app).post('/api/v1/auth/login').send({
      email: FIXED_ADMIN_EMAIL,
      password: env.ADMIN_PASSWORD,
      role: 'admin',
      totpCode: authenticator.generate(updateSetup.body.data.secret),
      strongKey
    });
    expect(oldKeyLogin.body.data.requiresStrongKey).toBe(true);
    const disabled = await admin.post('/api/v1/auth/admin-2fa/settings/disable').send({
      strongKey: updatedStrongKey,
      code: authenticator.generate(updateSetup.body.data.secret)
    });
    expect(disabled.status).toBe(200);
    const directAgain = await request.agent(app).post('/api/v1/auth/login').send({
      email: FIXED_ADMIN_EMAIL,
      password: env.ADMIN_PASSWORD,
      role: 'admin'
    });
    expect(directAgain.body.data.role).toBe('superadmin');

    expect((await request(app).post('/api/v1/auth/login').send({ email: 'other@example.com', password: env.ADMIN_PASSWORD, role: 'admin' })).status).toBe(401);
    expect((await request(app).post('/api/v1/auth/login').send({ email: FIXED_ADMIN_EMAIL, password: `${env.ADMIN_PASSWORD}x`, role: 'admin' })).status).toBe(401);
    expect((await request(app).post('/api/v1/auth/register').send({ name: 'Claim Admin', email: FIXED_ADMIN_EMAIL, password: 'Strong@1234' })).status).toBe(403);
  });

  it('requires TOTP for supervisors and locks verification after five failures', async () => {
    const email = 'supervisor@gmail.com';
    const password = 'Supervisor@1234';
    await User.create({ name: 'Research Supervisor', email, passwordHash: await hashPassword(password), role: 'supervisor' });
    const supervisor = request.agent(app);
    const firstLogin = await supervisor.post('/api/v1/auth/login').send({ email, password, role: 'supervisor' });
    expect(firstLogin.body.data.requires2FASetup).toBe(true);
    const setup = await supervisor.post('/api/v1/auth/admin-2fa/setup').send({ setupToken: firstLogin.body.data.setupToken });
    const verified = await supervisor.post('/api/v1/auth/admin-2fa/verify').send({
      setupToken: firstLogin.body.data.setupToken,
      code: authenticator.generate(setup.body.data.secret)
    });
    expect(verified.body.data.backupCodes).toHaveLength(8);

    const challenge = await request(app).post('/api/v1/auth/login').send({ email, password, role: 'supervisor' });
    expect(challenge.body.data.requires2FA).toBe(true);
    let invalidCode = '000000';
    while (authenticator.check(invalidCode, setup.body.data.secret)) {
      invalidCode = String((Number(invalidCode) + 1) % 1000000).padStart(6, '0');
    }
    for (let attempt = 0; attempt < 4; attempt++) {
      const failed = await request(app).post('/api/v1/auth/login').send({ email, password, role: 'supervisor', totpCode: invalidCode });
      expect(failed.body.data.requires2FA).toBe(true);
    }
    const locked = await request(app).post('/api/v1/auth/login').send({ email, password, role: 'supervisor', totpCode: invalidCode });
    expect(locked.status).toBe(429);
  });
});
