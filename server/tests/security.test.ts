import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import User from '../src/models/User.js';
import { hashPassword } from '../src/services/password.service.js';
import { loginAdminAs } from './helpers/auth.js';
import { env, FIXED_ADMIN_EMAIL } from '../src/config/env.js';
describe('security', () => {
  it('returns 403 for state changes without CSRF, and 201 with valid CSRF credentials', async () => {
    const blockedResponse = await request(app)
      .post('/api/v1/public/contact')
      .set('x-enforce-csrf', 'true')
      .send({ name: 'Test User', email: 'test@example.com', message: 'Hello there' });
    expect(blockedResponse.status).toBe(403);

    const tokenRes = await request(app).get('/api/v1/auth/csrf-token');
    const csrfCookie = tokenRes.headers['set-cookie'];
    const csrfToken = tokenRes.body.data?.csrfToken;

    const allowedResponse = await request(app)
      .post('/api/v1/public/contact')
      .set('x-enforce-csrf', 'true')
      .set('Cookie', csrfCookie)
      .set('x-csrf-token', csrfToken)
      .send({ name: 'Test User', email: 'test@example.com', message: 'Hello there' });
    expect(allowedResponse.status).toBe(201);
  });
  it('rejects protected routes without authentication', async () => {
    const response = await request(app).get('/api/v1/me');
    expect(response.status).toBe(401);
  });
  it('blocks admin role bypass', async () => {
    const response = await request(app).get('/api/v1/admin/dashboard');
    expect(response.status).toBe(401);
  });
  it('reserves administrator access for the fixed account and protects its identity', async () => {
    const admin = await User.create({ name: 'ASPIER Administrator', email: FIXED_ADMIN_EMAIL, passwordHash: await hashPassword(env.ADMIN_PASSWORD), role: 'superadmin' });
    const { agent, response: login } = await loginAdminAs(FIXED_ADMIN_EMAIL, env.ADMIN_PASSWORD);
    expect(login.status).toBe(200);

    const update = await agent.put(`/api/v1/admin/users/${admin._id}`).send({ email: 'other-admin@example.com' });
    const deletion = await agent.delete(`/api/v1/admin/users/${admin._id}`);
    const claim = await agent.post('/api/v1/admin/users').send({ name: 'Another Admin', email: 'other-admin@example.com', password: 'Strong@1234', role: 'admin' });
    expect(update.status).toBe(400);
    expect(deletion.status).toBe(403);
    expect(claim.status).toBe(400);
    expect(await User.exists({ _id: admin._id, email: FIXED_ADMIN_EMAIL })).toBeTruthy();
  });
});
