import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import User from '../src/models/User.js';
import Course from '../src/models/Course.js';
import Payment from '../src/models/Payment.js';
import Notification from '../src/models/Notification.js';
import MembershipApplication from '../src/models/MembershipApplication.js';
import Supervisor from '../src/models/Supervisor.js';
import ResearchApplication from '../src/models/ResearchApplication.js';
import { hashPassword } from '../src/services/password.service.js';
import { env, FIXED_ADMIN_EMAIL } from '../src/config/env.js';
import { seedDatabase } from '../src/utils/seed.js';

describe('End-to-End Full-Stack Audit Suite', () => {
  beforeEach(async () => {
    await seedDatabase();
  });
  it('verifies admin login, live 0 metrics baseline, and notifications', async () => {
    // 1. Ensure admin exists
    await User.findOneAndUpdate(
      { email: FIXED_ADMIN_EMAIL },
      {
        $set: {
          name: 'Platform Administrator',
          email: FIXED_ADMIN_EMAIL,
          passwordHash: await hashPassword(env.ADMIN_PASSWORD),
          role: 'admin',
          isAdmin2FAEnabled: false
        }
      },
      { upsert: true, new: true }
    );

    const adminAgent = request.agent(app);
    const loginRes = await adminAgent.post('/api/v1/auth/login').send({
      email: FIXED_ADMIN_EMAIL,
      password: env.ADMIN_PASSWORD,
      role: 'admin'
    });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.success).toBe(true);

    // 2. Admin dashboard returns 0 students, 0 enrollments, 0 payments, 10 wings
    const dashRes = await adminAgent.get('/api/v1/admin/dashboard');
    expect(dashRes.status).toBe(200);
    expect(dashRes.body.data.students).toBe(0);
    expect(dashRes.body.data.activeEnrollments).toBe(0);
    expect(dashRes.body.data.pendingPayments).toBe(0);
    expect(dashRes.body.data.wings).toBe(10);
  });

  it('verifies student registration, 409 conflict, and admin notification', async () => {
    const studentData = {
      name: 'Nusrat Jahan',
      email: 'nusrat.audit@example.com',
      password: 'SecureAudit#2026',
      role: 'student'
    };

    // First registration succeeds
    const regRes = await request(app).post('/api/v1/auth/register').send(studentData);
    expect(regRes.status).toBe(201);
    expect(regRes.body.success).toBe(true);
    expect(regRes.body.user.role).toBe('student');

    // Duplicate email returns 409 with exact message
    const dupRes = await request(app).post('/api/v1/auth/register').send(studentData);
    expect(dupRes.status).toBe(409);
    expect(dupRes.body.message).toBe('An account with this email already exists. Please sign in.');

    // Admin notification was created
    const notif = await Notification.findOne({
      category: 'student-registration',
      applicantEmail: studentData.email
    });
    expect(notif).toBeTruthy();
    expect(notif?.title).toContain('New student registered');
    expect(notif?.applicantName).toBe(studentData.name);
  });

  it('verifies course payment submission and admin review notification', async () => {
    // Register and login student
    const student = await User.create({
      name: 'Tanvir Ahmed',
      email: 'tanvir.payment@example.com',
      passwordHash: await hashPassword('Student@1234'),
      role: 'student'
    });

    const course = await Course.findOne({ status: 'published' }) || await Course.create({
      title: 'Python for Research',
      slug: 'python-for-research-audit',
      price: 2500,
      status: 'published'
    });

    const studentAgent = request.agent(app);
    await studentAgent.post('/api/v1/auth/login').send({
      email: student.email,
      password: 'Student@1234'
    });

    // Submit payment
    const trxId = `TRX-AUDIT-${Date.now()}`;
    const payRes = await studentAgent.post('/api/v1/payments').send({
      courseId: course._id,
      method: 'bKash',
      senderNumber: '01700000000',
      trxId,
      amount: course.price
    });
    expect(payRes.status).toBe(201);

    // Verify admin notification
    const payNotif = await Notification.findOne({
      category: 'course-payment',
      referenceId: trxId
    });
    expect(payNotif).toBeTruthy();
    expect(payNotif?.title).toContain('New course payment submission');
  });

  it('verifies membership stage 1 & stage 2 auto-publishing pipeline', async () => {
    // Stage 1 application
    const appRes = await request(app).post('/api/v1/public/join').send({
      name: 'Dr. Rafiqul Islam',
      email: 'dr.rafiqul@example.com',
      phone: '+8801711223344',
      wing: 'Materials Science Wing',
      role: 'supervisor',
      statement: 'Interested in leading materials research projects.'
    });
    expect(appRes.status).toBe(201);
    expect(appRes.body.data.accessCode).toBeTruthy();
    const { applicationId, accessCode } = appRes.body.data;

    // Check admin notification
    const appNotif = await Notification.findOne({
      category: 'initial-application',
      applicantEmail: 'dr.rafiqul@example.com'
    });
    expect(appNotif).toBeTruthy();

    // Admin approves Stage 1
    await MembershipApplication.updateOne(
      { _id: applicationId },
      { $set: { status: 'membership_pending' } }
    );

    // Stage 2 profile submission
    const profileRes = await request(app)
      .post(`/api/v1/public/membership/${applicationId}/profile`)
      .send({
        accessCode,
        name: 'Dr. Rafiqul Islam',
        designation: 'Associate Professor',
        institution: 'University of Dhaka',
        educationalBackground: 'PhD in Nanotechnology, University of Tokyo',
        bio: 'Senior researcher specializing in 2D nanomaterials and energy storage systems.',
        researchDomains: ['Nanotechnology', 'Energy Storage'],
        photo: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
      });
    expect(profileRes.status).toBe(201);
    expect(profileRes.body.data.status).toBe('completed');

    // Verify supervisor auto-published
    const supervisor = await Supervisor.findOne({ email: 'dr.rafiqul@example.com' });
    expect(supervisor).toBeTruthy();
    expect(supervisor?.isPublished).toBe(true);
  });

  it('verifies Research Mate application submission & notifications', async () => {
    const rmRes = await request(app).post('/api/v1/public/research-applications').send({
      name: 'Sadia Sultana',
      email: 'sadia.rm@example.com',
      phone: '+8801811223344',
      university: 'Rajshahi University',
      department: 'Computer Science',
      occupation: 'Undergraduate Researcher',
      wingName: 'Artificial Intelligence Wing',
      researchTitle: 'Machine Learning for Health Diagnostics',
      skills: 'Python, PyTorch, Scikit-learn',
      statement: 'Passionate about applying AI to diagnostic challenges.'
    });
    expect(rmRes.status).toBe(201);
    expect(rmRes.body.data.applicationId).toBeTruthy();

    const rmNotif = await Notification.findOne({
      category: 'research-mate-application',
      applicantEmail: 'sadia.rm@example.com'
    });
    expect(rmNotif).toBeTruthy();
  });

  it('verifies zero-stale cache control headers on all public GET endpoints', async () => {
    const endpoints = [
      '/api/v1/public/wings',
      '/api/v1/public/settings',
      '/api/v1/public/supervisors',
      '/api/v1/public/scholars',
      '/api/v1/public/news'
    ];

    for (const ep of endpoints) {
      const res = await request(app).get(ep);
      expect(res.status).toBe(200);
      const cacheControl = res.headers['cache-control'] || '';
      expect(cacheControl).toContain('no-store');
      expect(cacheControl).toContain('no-cache');
      expect(cacheControl).toContain('must-revalidate');
      expect(res.headers['pragma']).toBe('no-cache');
    }
  });
});
