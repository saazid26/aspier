import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import Research from '../src/models/Research.js';
import User from '../src/models/User.js';
import ResearchApplication from '../src/models/ResearchApplication.js';
import { hashPassword } from '../src/services/password.service.js';
import { loginAdminAs } from './helpers/auth.js';
import { env, FIXED_ADMIN_EMAIL } from '../src/config/env.js';

describe('research collaboration applications', () => {
  it('accepts eligible applications without an optional CV and prevents past research applications', async () => {
    const ongoing = await Research.create({ title: 'Wetland Monitoring', slug: 'wetland-monitoring', category: 'ongoing', status: 'published' });
    const past = await Research.create({ title: 'Past Study', slug: 'past-study', category: 'past', status: 'published' });
    const application = {
      name: 'Research Applicant',
      email: 'applicant@example.com',
      phone: '+8801700000000',
      institution: 'Example University',
      academicStatus: 'Masters student',
      city: 'Dhaka',
      country: 'Bangladesh',
      skills: 'GIS analysis and field sampling'
    };

    const submitted = await request(app).post(`/api/v1/public/research/${ongoing.id}/applications`).send(application);
    expect(submitted.status).toBe(201);
    const saved = await ResearchApplication.findById(submitted.body.data.id);
    expect(saved?.cvFilename).toBeUndefined();
    expect(saved?.status).toBe('pending');
    expect((await request(app).post(`/api/v1/public/research/${past.id}/applications`).send(application)).status).toBe(404);
    expect((await request(app).post(`/api/v1/public/research/${ongoing.id}/applications`).send({ ...application, skills: '' })).status).toBe(400);

    await User.create({ name: 'Research Admin', email: FIXED_ADMIN_EMAIL, passwordHash: await hashPassword(env.ADMIN_PASSWORD), role: 'superadmin' });
    const { agent } = await loginAdminAs(FIXED_ADMIN_EMAIL, env.ADMIN_PASSWORD);
    const queue = await agent.get('/api/v1/admin/research-applications?status=pending');
    expect(queue.status).toBe(200);
    expect(queue.body.data).toHaveLength(1);
    expect(queue.body.data[0].researchTitle).toBe('Wetland Monitoring');
  });

  it('stores and serves uploaded CVs from MongoDB on Vercel without using the filesystem', async () => {
    const research = await Research.create({ title: 'Vercel CV Storage', slug: 'vercel-cv-storage', category: 'ongoing', status: 'published' });
    const previousVercel = process.env.VERCEL;
    process.env.VERCEL = '1';
    try {
      const submitted = await request(app)
        .post(`/api/v1/public/research/${research.id}/applications`)
        .field('name', 'CV Applicant')
        .field('email', 'cv.applicant@example.com')
        .field('phone', '+8801700000010')
        .field('institution', 'Example University')
        .field('academicStatus', 'Masters student')
        .field('city', 'Dhaka')
        .field('country', 'Bangladesh')
        .field('skills', 'Research and data analysis')
        .attach('cv', Buffer.from('%PDF-1.4\nASPIER test CV'), { filename: 'applicant.pdf', contentType: 'application/pdf' });
      expect(submitted.status).toBe(201);
      const saved = await ResearchApplication.findById(submitted.body.data.id).select('+cvData +cvStorageKey');
      expect(saved?.cvData?.toString()).toContain('%PDF-1.4');
      expect(saved?.cvStorageKey).toBeUndefined();

      await User.create({ name: 'Research Admin', email: FIXED_ADMIN_EMAIL, passwordHash: await hashPassword(env.ADMIN_PASSWORD), role: 'superadmin' });
      const { agent } = await loginAdminAs(FIXED_ADMIN_EMAIL, env.ADMIN_PASSWORD);
      const download = await agent.get(`/api/v1/admin/research-applications/${saved?.id}/cv`);
      expect(download.status).toBe(200);
      expect(download.headers['content-type']).toContain('application/pdf');
      expect((await agent.delete(`/api/v1/admin/research-applications/${saved?.id}`)).status).toBe(200);
    } finally {
      if (previousVercel === undefined) delete process.env.VERCEL;
      else process.env.VERCEL = previousVercel;
    }
  });
});
