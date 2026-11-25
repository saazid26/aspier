import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import Supervisor from '../src/models/Supervisor.js';
import FoundingMember from '../src/models/FoundingMember.js';
import Scholar from '../src/models/Scholar.js';
import { loginAdminAs } from './helpers/auth.js';
import { env, FIXED_ADMIN_EMAIL } from '../src/config/env.js';

describe('Admin Team Profile Drag-and-Drop Reorder API', () => {
  let adminAgent: any;

  beforeEach(async () => {
    const authResult = await loginAdminAs(FIXED_ADMIN_EMAIL, env.ADMIN_PASSWORD);
    adminAgent = authResult.agent;
  });

  it('reorders Supervisors and reflects the new displayOrder in both admin and public endpoints', async () => {
    // Fetch current supervisors
    const listRes = await adminAgent.get('/api/v1/admin/supervisors');
    expect(listRes.status).toBe(200);
    expect(listRes.body.success).toBe(true);
    const supervisors = listRes.body.data;
    expect(supervisors.length).toBeGreaterThan(1);

    const originalFirstId = String(supervisors[0]._id || supervisors[0].slug);
    const originalSecondId = String(supervisors[1]._id || supervisors[1].slug);

    // Swap first two
    const newOrderIds = [
      originalSecondId,
      originalFirstId,
      ...supervisors.slice(2).map((s: any) => String(s._id || s.slug))
    ];

    const reorderRes = await adminAgent
      .put('/api/v1/admin/team/reorder')
      .send({ category: 'supervisor', orderedIds: newOrderIds });

    expect(reorderRes.status).toBe(200);
    expect(reorderRes.body.success).toBe(true);

    // Verify admin list returns updated order
    const updatedAdminRes = await adminAgent.get('/api/v1/admin/supervisors');
    expect(updatedAdminRes.status).toBe(200);
    const updatedAdminSupervisors = updatedAdminRes.body.data;
    expect(String(updatedAdminSupervisors[0]._id || updatedAdminSupervisors[0].slug)).toBe(originalSecondId);
    expect(String(updatedAdminSupervisors[1]._id || updatedAdminSupervisors[1].slug)).toBe(originalFirstId);

    // Verify public list returns updated order
    const publicRes = await request(app).get('/api/v1/public/supervisors');
    expect(publicRes.status).toBe(200);
    const publicSupervisors = publicRes.body.data;
    expect(String(publicSupervisors[0]._id || publicSupervisors[0].slug)).toBe(originalSecondId);
    expect(String(publicSupervisors[1]._id || publicSupervisors[1].slug)).toBe(originalFirstId);
  });

  it('reorders Founding Members and reflects the new order', async () => {
    const listRes = await adminAgent.get('/api/v1/admin/founding-members');
    expect(listRes.status).toBe(200);
    const members = listRes.body.data;
    expect(members.length).toBeGreaterThan(1);

    const id0 = String(members[0]._id || members[0].slug);
    const id1 = String(members[1]._id || members[1].slug);

    const reversedIds = [id1, id0, ...members.slice(2).map((m: any) => String(m._id || m.slug))];

    const reorderRes = await adminAgent
      .put('/api/v1/admin/team/reorder')
      .send({ category: 'founding', orderedIds: reversedIds });

    expect(reorderRes.status).toBe(200);

    const updatedRes = await adminAgent.get('/api/v1/admin/founding-members');
    expect(String(updatedRes.body.data[0]._id || updatedRes.body.data[0].slug)).toBe(id1);
    expect(String(updatedRes.body.data[1]._id || updatedRes.body.data[1].slug)).toBe(id0);
  });

  it('reorders Young Scholars and reflects the new order', async () => {
    const listRes = await adminAgent.get('/api/v1/admin/scholars');
    expect(listRes.status).toBe(200);
    const scholars = listRes.body.data;
    expect(scholars.length).toBeGreaterThan(1);

    const id0 = String(scholars[0]._id || scholars[0].slug);
    const id1 = String(scholars[1]._id || scholars[1].slug);

    const reversedIds = [id1, id0, ...scholars.slice(2).map((s: any) => String(s._id || s.slug))];

    const reorderRes = await adminAgent
      .put('/api/v1/admin/team/reorder')
      .send({ category: 'scholar', orderedIds: reversedIds });

    expect(reorderRes.status).toBe(200);

    const updatedRes = await adminAgent.get('/api/v1/admin/scholars');
    expect(String(updatedRes.body.data[0]._id || updatedRes.body.data[0].slug)).toBe(id1);
    expect(String(updatedRes.body.data[1]._id || updatedRes.body.data[1].slug)).toBe(id0);
  });

  it('automatically assigns displayOrder and order when creating a new team member', async () => {
    const createRes = await adminAgent
      .post('/api/v1/admin/scholars')
      .send({
        name: 'Auto Ordered Scholar',
        slug: `auto-scholar-${Date.now()}`,
        designation: 'Research Fellow',
        affiliation: 'ASPIER Aerospace Wing',
        cohort: '2026'
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.data.order).toBeDefined();
    expect(createRes.body.data.displayOrder).toBeDefined();
    expect(typeof createRes.body.data.order).toBe('number');
  });
});
