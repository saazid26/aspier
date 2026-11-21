import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import User from '../src/models/User.js';
import Course from '../src/models/Course.js';
import ClassModel from '../src/models/Class.js';
import Enrollment from '../src/models/Enrollment.js';
import { hashPassword } from '../src/services/password.service.js';
import { encrypt } from '../src/utils/crypto.js';
import { loginAs } from './helpers/auth.js';

describe('protected classes', () => {
  it('rejects Meet and recording access without authentication', async () => {
    const meet = await request(app).get('/api/v1/academy/classes/507f1f77bcf86cd799439011/join');
    const recording = await request(app).get('/api/v1/academy/classes/507f1f77bcf86cd799439011/recording');
    expect(meet.status).toBe(401);
    expect(recording.status).toBe(401);
  });

  it('allows access for actively enrolled students and blocks non-enrolled students', async () => {
    const enrolledUser = await User.create({
      name: 'Enrolled Student',
      email: 'enrolled@test.com',
      passwordHash: await hashPassword('Password@1234'),
      role: 'student'
    });

    const nonEnrolledUser = await User.create({
      name: 'Non Enrolled Student',
      email: 'notenrolled@test.com',
      passwordHash: await hashPassword('Password@1234'),
      role: 'student'
    });

    const course = await Course.create({
      title: 'Advanced Machine Learning',
      slug: 'advanced-ml-testing',
      description: 'Comprehensive AI course',
      price: 1500,
      status: 'published'
    });

    const liveClass = await ClassModel.create({
      courseId: course._id,
      title: 'Neural Networks Live',
      scheduledAt: new Date(Date.now() - 5 * 60 * 1000), // Started 5 mins ago (within 15m window)
      durationMinutes: 60,
      meetLinkEncrypted: encrypt('https://meet.google.com/xyz-live-test'),
      recordingYoutubeId: 'dQw4w9WgXcQ'
    });

    // Create active enrollment for enrolledUser
    await Enrollment.create({
      userId: enrolledUser._id,
      courseId: course._id,
      status: 'active'
    });

    // 1. Non-enrolled user tries to join -> 403
    const { agent: nonEnrolledAgent } = await loginAs('notenrolled@test.com', 'Password@1234');
    const nonEnrolledJoin = await nonEnrolledAgent.get(`/api/v1/academy/classes/${liveClass._id}/join`);
    expect(nonEnrolledJoin.status).toBe(403);

    const nonEnrolledRec = await nonEnrolledAgent.get(`/api/v1/academy/classes/${liveClass._id}/recording`);
    expect(nonEnrolledRec.status).toBe(403);

    // 2. Enrolled user joins -> 200 with decrypted meet link & recording
    const { agent: enrolledAgent } = await loginAs('enrolled@test.com', 'Password@1234');
    const enrolledJoin = await enrolledAgent.get(`/api/v1/academy/classes/${liveClass._id}/join`);
    expect(enrolledJoin.status).toBe(200);
    expect(enrolledJoin.body.data?.meetLink).toBe('https://meet.google.com/xyz-live-test');

    const enrolledRec = await enrolledAgent.get(`/api/v1/academy/classes/${liveClass._id}/recording`);
    expect(enrolledRec.status).toBe(200);
    expect(enrolledRec.body.data?.youtubeVideoId).toBe('dQw4w9WgXcQ');
  });
});
