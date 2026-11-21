import request from 'supertest';
import { app } from '../../src/app.js';
import { authenticator } from 'otplib';
import User from '../../src/models/User.js';
import { env, FIXED_ADMIN_EMAIL } from '../../src/config/env.js';
import { decrypt } from '../../src/utils/crypto.js';
export async function loginAs(email: string, password: string) {
  const agent = request.agent(app);
  const response = await agent.post('/api/v1/auth/login').send({ email, password });
  return { agent, response };
}
export async function loginAdminAs(_email: string, _password: string) {
  const agent = request.agent(app);
  const login = await agent.post('/api/v1/auth/login').send({ email: FIXED_ADMIN_EMAIL, password: env.ADMIN_PASSWORD, role: 'admin' });
  if (login.body.data?.requires2FASetup) {
    const setup = await agent.post('/api/v1/auth/admin-2fa/setup').send({ setupToken: login.body.data.setupToken });
    const user = await User.findOne({ email: FIXED_ADMIN_EMAIL }).select('+twoFactorSecretEncrypted');
    if (!user?.twoFactorSecretEncrypted) throw new Error('Admin TOTP setup secret was not persisted');
    const secret = decrypt(user.twoFactorSecretEncrypted);
    const code = authenticator.generate(secret);
    const response = await agent.post('/api/v1/auth/admin-2fa/verify').send({ setupToken: login.body.data.setupToken, code });
    return { agent, response, secret };
  }
  return { agent, response: login };
}
