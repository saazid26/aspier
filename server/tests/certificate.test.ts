import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import Certificate from '../src/models/Certificate.js';

describe('Certificate Verification and Serving Integration', () => {
  const dummyCredentialId = 'ASP-ACAD-2026-TEST1';
  const dummyPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

  beforeEach(async () => {
    await Certificate.deleteMany({ credentialId: dummyCredentialId });
    await Certificate.create({
      credentialId: dummyCredentialId,
      studentName: 'Ayesha Rahman',
      studentEmail: 'ayesha.rahman@example.com',
      courseTitle: 'Higher Study Oriented Basic to Advance Research Paper Writing Course',
      issueDate: new Date('2026-11-20'),
      certificateImage: `data:image/png;base64,${dummyPngBase64}`,
      status: 'issued'
    });
  });

  it('returns 404 for non-existent credential ID', async () => {
    const res = await request(app).get('/api/certificates/verify/NON-EXISTENT-ID');
    expect(res.status).toBe(404);
    expect(res.body.valid).toBe(false);
    expect(res.body.message).toContain('No active or verified certificate found');
  });

  it('successfully verifies an issued certificate and returns credential details', async () => {
    const res = await request(app).get(`/api/certificates/verify/${dummyCredentialId}`);
    expect(res.status).toBe(200);
    expect(res.body.valid).toBe(true);
    expect(res.body.certificate).toBeDefined();
    expect(res.body.certificate.credentialId).toBe(dummyCredentialId);
    expect(res.body.certificate.studentName).toBe('Ayesha Rahman');
    expect(res.body.certificate.recipientRole).toBe('Student');
    expect(res.body.certificate.courseTitle).toContain('Research Paper Writing Course');
    expect(res.body.certificate.rawImageUrl).toBe(`/api/certificates/image/${dummyCredentialId}`);
  });

  it('supports verify lookup via query parameter (?id=)', async () => {
    const res = await request(app).get(`/api/certificates/verify?id=${dummyCredentialId}`);
    expect(res.status).toBe(200);
    expect(res.body.valid).toBe(true);
    expect(res.body.certificate.credentialId).toBe(dummyCredentialId);
  });

  it('serves raw PNG buffer with 1-hour cache header (< 0.2s speed target)', async () => {
    const res = await request(app).get(`/api/certificates/image/${dummyCredentialId}`);
    expect(res.status).toBe(200);
    expect(res.header['content-type']).toContain('image/png');
    expect(res.header['cache-control']).toContain('public');
    expect(res.header['cache-control']).toContain('max-age=3600');
    expect(Buffer.isBuffer(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('rejects revoked certificates during public verification', async () => {
    const revokedId = 'ASP-ACAD-2026-REVOKED';
    await Certificate.create({
      credentialId: revokedId,
      studentName: 'Revoked User',
      courseTitle: 'Some Course',
      issueDate: new Date(),
      certificateImage: `data:image/png;base64,${dummyPngBase64}`,
      status: 'revoked'
    });

    const res = await request(app).get(`/api/certificates/verify/${revokedId}`);
    expect(res.status).toBe(404);
    expect(res.body.valid).toBe(false);
  });
});
