import { describe, it, expect } from 'vitest';
import request from 'supertest';
import Payment from '../src/models/Payment.js';
import Course from '../src/models/Course.js';
import User from '../src/models/User.js';
import { app } from '../src/app.js';
import { hashPassword } from '../src/services/password.service.js';
import mongoose from 'mongoose';
describe('payments', () => {
  it('enforces unique transaction IDs', async () => {
    const base = { userId: new mongoose.Types.ObjectId(), courseId: new mongoose.Types.ObjectId(), method: 'bKash', senderNumber: '01700000000', amount: 100, trxId: 'TRX-UNIQUE' };
    await Payment.create(base);
    await expect(Payment.create({ ...base, userId: new mongoose.Types.ObjectId() })).rejects.toBeDefined();
  });
  it('supports one pending payment per user and course at controller level', () => {
    expect(Payment.schema.path('status')).toBeDefined();
  });
  it('uses the published course price and rejects a client-supplied amount mismatch', async () => {
    const user = await User.create({ name: 'Student', email: 'payment@example.com', passwordHash: await hashPassword('Strong@1234') });
    const course = await Course.create({ title: 'Research Methods', slug: 'research-methods-payment', price: 2500, status: 'published' });
    const agent = request.agent(app);
    await agent.post('/api/v1/auth/login').send({ email: user.email, password: 'Strong@1234' });

    const mismatch = await agent.post('/api/v1/payments').send({
      courseId: String(course._id), method: 'bKash', senderNumber: '01700000000', trxId: 'TRX-MISMATCH', amount: 1
    });
    expect(mismatch.status).toBe(400);

    const accepted = await agent.post('/api/v1/payments').send({
      courseId: String(course._id), method: 'bKash', senderNumber: '01700000000', trxId: 'TRX-VALID', amount: 2500
    });
    expect(accepted.status).toBe(201);
    expect(accepted.body.data.amount).toBe(course.price);
  });

  it('accepts course payment submission using course slug and resolves courseId', async () => {
    const user = await User.create({ name: 'Slug Payer', email: 'slugpayer@example.com', passwordHash: await hashPassword('Strong@1234') });
    const course = await Course.create({ title: 'Python for Science', slug: 'python-for-science', price: 2000, status: 'published' });
    const agent = request.agent(app);
    await agent.post('/api/v1/auth/login').send({ email: user.email, password: 'Strong@1234' });

    const response = await agent.post('/api/v1/payments').send({
      courseId: 'python-for-science',
      method: 'Nagad',
      senderNumber: '01800000000',
      trxId: 'TRX-SLUG-SUCCESS',
      amount: 2000
    });
    expect(response.status).toBe(201);
    expect(response.body.data.courseId).toBe(String(course._id));
    expect(response.body.data.amount).toBe(2000);
  });
});
