import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import User from '../src/models/User.js';
import MediaAsset from '../src/models/MediaAsset.js';
import MembershipApplication from '../src/models/MembershipApplication.js';
import Supervisor from '../src/models/Supervisor.js';
import Scholar from '../src/models/Scholar.js';
import Setting from '../src/models/Setting.js';
import { hashPassword } from '../src/services/password.service.js';
import { deleteMediaAsset } from '../src/services/media.service.js';
import { loginAdminAs } from './helpers/auth.js';
import { authenticator } from 'otplib';
import { env, FIXED_ADMIN_EMAIL } from '../src/config/env.js';
import { sha256 } from '../src/utils/crypto.js';

describe('membership application workflow', () => {
  it('approves applicant sign-ups, dispatches assigned credentials, and requires authenticator verification', async () => {
    const submitted = await request(app).post('/api/v1/public/membership/signup').send({
      name: 'Nadia Karim',
      email: 'nadia.signup@example.com',
      phone: '+8801700000001',
      password: 'Applicant@2026',
      role: 'youngScholar',
      wing: 'Applied Biotechnology',
      institution: 'Example University',
      academicStatus: 'Undergraduate'
    });
    expect(submitted.status).toBe(201);
    expect(submitted.body.data.status).toBe('signup_pending');
    const application = await MembershipApplication.findOne({ email: 'nadia.signup@example.com' }).select('+signupPasswordHash');
    if (!application) throw new Error('Applicant sign-up was not persisted');
    expect(application.status).toBe('signup_pending');
    expect(application.signupPasswordHash).not.toBe('Applicant@2026');

    await User.create({ name: 'Signup Reviewer', email: FIXED_ADMIN_EMAIL, passwordHash: await hashPassword(env.ADMIN_PASSWORD), role: 'superadmin' });
    const { agent: admin } = await loginAdminAs(FIXED_ADMIN_EMAIL, env.ADMIN_PASSWORD);
    const assigned = await admin.post(`/api/v1/admin/membership-applications/${application.id}/approve-signup`).send({
      applicationId: 'ASPIER-2026-ND01',
      accessCode: 'private-access-credential-2026'
    });
    expect(assigned.status).toBe(200);
    expect(assigned.body.data.email).toBe('nadia.signup@example.com');
    expect(assigned.body.data.emailDelivery).toBeUndefined();
    expect(assigned.body.data.confirmation).toContain('private-access-credential-2026');
    expect((await MembershipApplication.findById(application._id))?.status).toBe('signup_approved');

    const applicant = { applicationId: 'ASPIER-2026-ND01', accessCode: 'private-access-credential-2026' };
    const setup = await request(app).post('/api/v1/public/membership/applicant-login').send(applicant);
    expect(setup.status).toBe(200);
    expect(setup.body.data.requiresSetup).toBe(true);
    expect(setup.body.data.qrDataUrl).toContain('data:image/png;base64,');
    const verified = await request(app).post('/api/v1/public/membership/applicant-login').send({
      ...applicant,
      totpCode: authenticator.generate(setup.body.data.manualKey)
    });
    expect(verified.status).toBe(200);
    expect(verified.body.data.authenticated).toBe(true);
    expect(verified.body.data.applicationId).toBe('ASPIER-2026-ND01');

    const missingOtp = await request(app).post('/api/v1/public/membership/applicant-login').send(applicant);
    expect(missingOtp.body.data.requiresOtp).toBe(true);
    const legacyLookup = await request(app).post('/api/v1/public/membership/lookup').send(applicant);
    expect(legacyLookup.status).toBe(401);
  });

  it('publishes a Supervisor after Stage 2 without any membership fee or payment step', async () => {
    const submitted = await request(app).post('/api/v1/public/join').send({
      name: 'Amina Rahman',
      email: 'amina@example.com',
      phone: '+8801700000000',
      wingInterest: 'environmental-policy-governance',
      category: 'teammate',
      statement: 'I would like to contribute to environmental policy research.'
    });
    expect(submitted.status).toBe(201);
    const { applicationId, accessCode } = submitted.body.data;
    expect(accessCode).toHaveLength(32);
    const savedApplication = await MembershipApplication.findById(applicationId);
    expect(savedApplication?.role).toBe('supervisor');
    expect(savedApplication?.wing).toBe('environmental-policy-governance');

    await User.create({ name: 'Admin Reviewer', email: FIXED_ADMIN_EMAIL, passwordHash: await hashPassword(env.ADMIN_PASSWORD), role: 'superadmin' });
    const { agent: admin, response: adminLogin } = await loginAdminAs(FIXED_ADMIN_EMAIL, env.ADMIN_PASSWORD);
    expect(adminLogin.status).toBe(200);
    expect((await admin.post(`/api/v1/admin/membership-applications/${applicationId}/approve`)).status).toBe(200);
    const adminNotices = await admin.get('/api/v1/admin/notifications');
    expect(adminNotices.body.data.unreadCount).toBeGreaterThanOrEqual(1);
    await Setting.create({ singleton: 'main', membershipFee: 9000, bkashNumber: '01999999999', nagadNumber: '01888888888' });

    const billing = await request(app).post('/api/v1/public/membership/lookup').send({ applicationId, accessCode });
    expect(billing.status).toBe(200);
    expect(billing.body.data.status).toBe('membership_pending');
    expect(billing.body.data.membershipFee).toBeUndefined();
    expect(billing.body.data.bkashNumber).toBeUndefined();
    expect(billing.body.data.nagadNumber).toBeUndefined();
    expect(billing.body.data.activationCode).toBeUndefined();
    expect(billing.body.data.notifications).toHaveLength(1);
    expect((await request(app).post(`/api/v1/public/membership/${applicationId}/payment`).send({
      accessCode,
      paymentMethod: 'bKash',
      trxId: 'SUPERVISOR-MUST-NOT-PAY'
    })).status).toBe(403);
    const uploadedPhoto = await request(app)
      .post(`/api/v1/public/membership/${applicationId}/photo`)
      .set('X-Application-Code', accessCode)
      .attach('file', Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jY7sAAAAASUVORK5CYII=', 'base64'), { filename: 'amina-profile.png', contentType: 'image/png' });
    expect(uploadedPhoto.status).toBe(201);
    const photo = await MediaAsset.findOne({ url: uploadedPhoto.body.data.url, membershipApplicationId: applicationId });
    if (!photo) throw new Error('Membership profile photo was not persisted');
    const profile = await request(app).post(`/api/v1/public/membership/${applicationId}/profile`).send({
      accessCode,
      name: 'Amina Rahman',
      presentAddress: 'Present address',
      permanentAddress: 'Permanent address',
      designation: 'Research Associate',
      institution: 'ASPIER Institute',
      educationalBackground: 'MSc Environmental Science, University of Example',
      googleScholar: 'https://scholar.google.com/example',
      researchGate: 'https://www.researchgate.net/profile/example',
      orcid: '0000-0000-0000-0000',
      linkedin: 'https://www.linkedin.com/in/example',
      bio: 'Researcher working on inclusive environmental policy and governance.',
      researchDomains: ['Environmental Policy', 'Resource Governance'],
      photo: photo.url
    });
    expect(profile.status).toBe(201);
    expect(profile.body.data.status).toBe('final_pending');

    const published = await admin.post(`/api/v1/admin/membership-applications/${applicationId}/publish`);
    expect(published.status).toBe(200);
    expect(published.body.data.profileType).toBe('supervisor');
    const publicProfile = await Supervisor.findById(published.body.data.profileId);
    expect(publicProfile?.photo).toBe(photo.url);
    expect(publicProfile?.researchInterests).toContain('Environmental Policy');
    expect((await MembershipApplication.findById(applicationId))?.status).toBe('published');
    const publishedPortal = await request(app).post('/api/v1/public/membership/lookup').send({ applicationId, accessCode });
    expect(publishedPortal.body.data.membershipFee).toBeUndefined();
    expect(publishedPortal.body.data.bkashNumber).toBeUndefined();
    expect(publishedPortal.body.data.nagadNumber).toBeUndefined();
    expect(publishedPortal.body.data.activationCode).toBeTruthy();
    const activated = await request(app).post('/api/v1/public/membership/activate').send({
      role: 'supervisor',
      activationCode: publishedPortal.body.data.activationCode,
      email: 'member@gmail.com',
      password: 'Member@1234',
      confirmPassword: 'Member@1234'
    });
    expect(activated.status).toBe(201);
    const reusedCode = await request(app).post('/api/v1/public/membership/activate').send({
      role: 'supervisor',
      activationCode: publishedPortal.body.data.activationCode,
      email: 'secondmember@gmail.com',
      password: 'Member@1234',
      confirmPassword: 'Member@1234'
    });
    expect(reusedCode.status).toBe(400);
    const member = request.agent(app);
    const memberLogin = await member.post('/api/v1/auth/login').send({ email: 'member@gmail.com', password: 'Member@1234', role: 'supervisor' });
    expect(memberLogin.body.data.requires2FASetup).toBe(true);
    const setup = await member.post('/api/v1/auth/admin-2fa/setup').send({ setupToken: memberLogin.body.data.setupToken });
    const verification = await member.post('/api/v1/auth/admin-2fa/verify').send({ setupToken: memberLogin.body.data.setupToken, code: authenticator.generate(setup.body.data.secret) });
    expect(verification.body.data.backupCodes).toHaveLength(8);
    expect((await member.get('/api/v1/auth/notifications')).body.data.items).toHaveLength(3);
    await deleteMediaAsset(String(photo._id));
  });

  it('requires Young Scholars to submit BDT 1,000 payment with the Stage 2 profile before publication', async () => {
    const submitted = await request(app).post('/api/v1/public/join').send({
      name: 'Rafi Hasan',
      email: 'rafi.scholar@example.com',
      phone: '+8801700000020',
      role: 'youngScholar',
      wing: 'Applied Biotechnology',
      statement: 'I am applying to contribute to research in applied biotechnology.'
    });
    expect(submitted.status).toBe(201);
    const { applicationId, accessCode } = submitted.body.data;

    await User.create({ name: 'Admin Reviewer', email: FIXED_ADMIN_EMAIL, passwordHash: await hashPassword(env.ADMIN_PASSWORD), role: 'superadmin' });
    const { agent: admin } = await loginAdminAs(FIXED_ADMIN_EMAIL, env.ADMIN_PASSWORD);
    expect((await admin.post(`/api/v1/admin/membership-applications/${applicationId}/approve`)).status).toBe(200);
    const stageTwo = await request(app).post('/api/v1/public/membership/lookup').send({ applicationId, accessCode });
    expect(stageTwo.body.data.membershipFee).toBe(1000);
    expect(stageTwo.body.data.bkashNumber).toBe('01603012448');
    expect(stageTwo.body.data.nagadNumber).toBe('01603012448');

    const uploadedPhoto = await request(app)
      .post(`/api/v1/public/membership/${applicationId}/photo`)
      .set('X-Application-Code', accessCode)
      .attach('file', Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jY7sAAAAASUVORK5CYII=', 'base64'), { filename: 'rafi-profile.png', contentType: 'image/png' });
    expect(uploadedPhoto.status).toBe(201);
    const profileData = {
      accessCode,
      name: 'Rafi Hasan',
      presentAddress: 'Present address',
      permanentAddress: 'Permanent address',
      designation: 'Undergraduate Researcher',
      institution: 'Example University',
      educationalBackground: 'BSc Biotechnology, Example University',
      bio: 'A young researcher interested in applied biotechnology and public health.',
      researchDomains: ['Biotechnology', 'Public Health'],
      photo: uploadedPhoto.body.data.url
    };
    const missingPayment = await request(app).post(`/api/v1/public/membership/${applicationId}/profile`).send(profileData);
    expect(missingPayment.status).toBe(400);

    const profile = await request(app).post(`/api/v1/public/membership/${applicationId}/profile`).send({
      ...profileData,
      paymentMethod: 'Nagad',
      trxId: 'YS-STAGE2-TRX-001'
    });
    expect(profile.status).toBe(201);
    expect(profile.body.data.status).toBe('verification_pending');
    const published = await admin.post(`/api/v1/admin/membership-applications/${applicationId}/publish`);
    expect(published.status).toBe(200);
    expect(published.body.data.profileType).toBe('scholar');
    expect(await Scholar.findById(published.body.data.profileId)).toBeTruthy();
  });

  it('does not allow publishing before an admin approves the submitted profile', async () => {
    const application = await MembershipApplication.create({
      name: 'Pending Applicant',
      email: 'pending@example.com',
      phone: '01700000000',
      wingInterest: 'applied-biotechnology',
      category: 'youngScholar',
      role: 'youngScholar',
      accessCodeHash: 'not-a-real-code',
      status: 'initial_pending'
    });
    await User.create({ name: 'Admin Reviewer', email: FIXED_ADMIN_EMAIL, passwordHash: await hashPassword(env.ADMIN_PASSWORD), role: 'superadmin' });
    const { agent: admin } = await loginAdminAs(FIXED_ADMIN_EMAIL, env.ADMIN_PASSWORD);
    const response = await admin.post(`/api/v1/admin/membership-applications/${application.id}/publish`);
    expect(response.status).toBe(409);
  });

  it('stores image uploads as database data URLs on Vercel', async () => {
    const accessCode = 'vercel-media-access-code-2026';
    const application = await MembershipApplication.create({
      name: 'Vercel Media Applicant',
      email: 'vercel.media@example.com',
      phone: '01700000000',
      wingInterest: 'applied-biotechnology',
      category: 'supervisor',
      role: 'supervisor',
      accessCodeHash: sha256(accessCode),
      status: 'membership_pending'
    });
    const previousVercel = process.env.VERCEL;
    process.env.VERCEL = '1';
    try {
      const upload = await request(app)
        .post(`/api/v1/public/membership/${application.id}/photo`)
        .set('X-Application-Code', accessCode)
        .attach('file', Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jY7sAAAAASUVORK5CYII=', 'base64'), { filename: 'vercel-profile.png', contentType: 'image/png' });
      expect(upload.status).toBe(201);
      expect(upload.body.data.url).toMatch(/^data:image\/png;base64,/);
      const media = await MediaAsset.findOne({ url: upload.body.data.url, membershipApplicationId: application._id });
      expect(media).toBeTruthy();
      if (media) await deleteMediaAsset(String(media._id));
    } finally {
      if (previousVercel === undefined) delete process.env.VERCEL;
      else process.env.VERCEL = previousVercel;
    }
  });
});
