import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import User from '../src/models/User.js';
import Course from '../src/models/Course.js';
import Enrollment from '../src/models/Enrollment.js';
import { loginAdminAs } from './helpers/auth.js';
import { env, FIXED_ADMIN_EMAIL } from '../src/config/env.js';

describe('Admin Student & Enrollment CRUD API', () => {
  let adminAgent: any;
  let testCourse: any;

  beforeEach(async () => {
    const authResult = await loginAdminAs(FIXED_ADMIN_EMAIL, env.ADMIN_PASSWORD);
    adminAgent = authResult.agent;

    testCourse = await Course.findOne({ slug: 'test-crud-course' });
    if (!testCourse) {
      testCourse = await Course.create({
        title: 'Test Space Exploration & Avionics Course',
        slug: 'test-crud-course',
        price: 2500,
        status: 'published'
      });
    }
  });

  it('auto-syncs newly registered students immediately into GET /admin/enrollments as Direct User Account', async () => {
    const uniqueEmail = `newstudent-${Date.now()}@aspier-test.org`;
    const regRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Auto Synced Student',
        email: uniqueEmail,
        password: 'AspierAcademic#2026!'
      });

    expect(regRes.status).toBe(201);
    expect(regRes.body.success).toBe(true);

    // Call GET /admin/enrollments
    const enrollmentsRes = await adminAgent.get('/api/v1/admin/enrollments');
    expect(enrollmentsRes.status).toBe(200);
    expect(enrollmentsRes.body.success).toBe(true);

    const directUserRow = enrollmentsRes.body.data.find((row: any) => row.studentEmail === uniqueEmail);
    expect(directUserRow).toBeDefined();
    expect(directUserRow.studentName).toBe('Auto Synced Student');
    expect(directUserRow.recordType).toBe('student');
    expect(directUserRow.courseTitle).toBe('Direct User Account');
    expect(directUserRow.isDirectUser).toBe(true);
  });

  it('updates a direct student user details and status', async () => {
    const student = await User.create({
      name: 'Initial Student Name',
      email: `student-${Date.now()}@test.com`,
      passwordHash: 'dummyhash123',
      role: 'student',
      isActive: true
    });

    const updateRes = await adminAgent
      .put(`/api/v1/admin/students/${student._id}`)
      .send({
        name: 'Updated Student Name',
        email: `updated-${Date.now()}@test.com`,
        status: 'Inactive',
        phone: '+8801700000000',
        university: 'Test University'
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.success).toBe(true);
    expect(updateRes.body.data.name).toBe('Updated Student Name');
    expect(updateRes.body.data.isActive).toBe(false);

    const reloaded = await User.findById(student._id);
    expect(reloaded?.name).toBe('Updated Student Name');
    expect(reloaded?.isActive).toBe(false);
  });

  it('assigns/enrolls a direct student into a course via PUT /students/:id', async () => {
    const student = await User.create({
      name: 'Enroll Me Student',
      email: `enrollme-${Date.now()}@test.com`,
      passwordHash: 'dummyhash123',
      role: 'student',
      isActive: true
    });

    const updateRes = await adminAgent
      .put(`/api/v1/admin/students/${student._id}`)
      .send({
        courseId: testCourse._id,
        enrollmentStatus: 'Active',
        progressPercent: 75,
        paymentStatus: 'Paid',
        paymentMethod: 'bKash'
      });

    expect(updateRes.status).toBe(200);

    const enrollment = await Enrollment.findOne({ userId: student._id, courseId: testCourse._id });
    expect(enrollment).toBeDefined();
    expect(enrollment?.status).toBe('active');
    expect(enrollment?.progressPercent).toBe(75);
  });

  it('updates an enrollment record via PUT /enrollments/:id', async () => {
    const student = await User.create({
      name: 'Student To Enroll',
      email: `enrolled-${Date.now()}@test.com`,
      passwordHash: 'dummyhash123',
      role: 'student',
      isActive: true
    });

    const enr = await Enrollment.create({
      userId: student._id,
      courseId: testCourse._id,
      status: 'pending',
      progressPercent: 10
    });

    const res = await adminAgent
      .put(`/api/v1/admin/enrollments/${enr._id}`)
      .send({
        studentName: 'Renamed Enrolled Student',
        status: 'Approved',
        progressPercent: 90
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const updatedEnr = await Enrollment.findById(enr._id);
    expect(updatedEnr?.status).toBe('active');
    expect(updatedEnr?.progressPercent).toBe(90);

    const updatedUser = await User.findById(student._id);
    expect(updatedUser?.name).toBe('Renamed Enrolled Student');
  });

  it('permanently deletes an enrollment record via DELETE /enrollments/:id', async () => {
    const student = await User.create({
      name: 'Student For Enr Deletion',
      email: `del-enr-${Date.now()}@test.com`,
      passwordHash: 'dummyhash123',
      role: 'student'
    });

    const enr = await Enrollment.create({
      userId: student._id,
      courseId: testCourse._id,
      status: 'pending'
    });

    const delRes = await adminAgent.delete(`/api/v1/admin/enrollments/${enr._id}`);
    expect(delRes.status).toBe(200);

    const deleted = await Enrollment.findById(enr._id);
    expect(deleted).toBeNull();
  });

  it('permanently deletes a student account and protects admin accounts from deletion', async () => {
    const student = await User.create({
      name: 'Student For Account Deletion',
      email: `del-acc-${Date.now()}@test.com`,
      passwordHash: 'dummyhash123',
      role: 'student'
    });

    await Enrollment.create({
      userId: student._id,
      courseId: testCourse._id,
      status: 'active'
    });

    const delRes = await adminAgent.delete(`/api/v1/admin/students/${student._id}`);
    expect(delRes.status).toBe(200);
    expect(delRes.body.success).toBe(true);

    const deletedUser = await User.findById(student._id);
    expect(deletedUser).toBeNull();

    const linkedEnr = await Enrollment.findOne({ userId: student._id });
    expect(linkedEnr).toBeNull();

    // Verify admin cannot be deleted
    const adminUser = await User.findOne({ email: FIXED_ADMIN_EMAIL });
    expect(adminUser).toBeDefined();

    const adminDelRes = await adminAgent.delete(`/api/v1/admin/students/${adminUser?._id}`);
    expect(adminDelRes.status).toBe(403);
    expect(adminDelRes.body.message).toContain('Cannot delete an administrator account');
  });
});
