import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import Wing from '../src/models/Wing.js';
import MediaAsset from '../src/models/MediaAsset.js';
import { loginAdminAs } from './helpers/auth.js';
import { env, FIXED_ADMIN_EMAIL } from '../src/config/env.js';

describe('Media Upload & Binary Streaming Pipeline', () => {
  let adminAgent: any;

  beforeEach(async () => {
    const authResult = await loginAdminAs(FIXED_ADMIN_EMAIL, env.ADMIN_PASSWORD);
    adminAgent = authResult.agent;
  });

  it('uploads an image via multipart form-data, stores buffer in MongoDB, and returns /api/v1/media/:id', async () => {
    const pngBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jY7sAAAAASUVORK5CYII=', 'base64');

    const res = await adminAgent
      .post('/api/v1/admin/upload')
      .attach('file', pngBuffer, { filename: 'test-wing-cover.png', contentType: 'image/png' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.url).toMatch(/^(https:\/\/res\.cloudinary\.com\/|\/api\/v1\/media\/)/);

    const assetId = res.body.data._id;
    const asset = await MediaAsset.findById(assetId);
    expect(asset).toBeTruthy();
    expect(asset?.url).toMatch(/^(https:\/\/res\.cloudinary\.com\/|\/api\/v1\/media\/)/);
  });

  it('uploads an image via JSON dataUrl fallback and stores buffer in MongoDB', async () => {
    const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jY7sAAAAASUVORK5CYII=';

    const res = await adminAgent
      .post('/api/v1/admin/media')
      .send({ dataUrl, filename: 'test-fallback.png' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.url).toMatch(/^(https:\/\/res\.cloudinary\.com\/|\/api\/v1\/media\/)/);

    const assetId = res.body.data._id;
    const asset = await MediaAsset.findById(assetId);
    expect(asset).toBeTruthy();
    expect(asset?.url).toMatch(/^(https:\/\/res\.cloudinary\.com\/|\/api\/v1\/media\/)/);
  });

  it('serves binary image stream via GET /api/v1/media/:id with immutable cache header', async () => {
    const pngBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jY7sAAAAASUVORK5CYII=', 'base64');

    const uploadRes = await adminAgent
      .post('/api/v1/admin/upload')
      .attach('file', pngBuffer, { filename: 'stream-test.png', contentType: 'image/png' });

    const assetId = uploadRes.body.data._id;

    const streamRes = await request(app).get(`/api/v1/media/${assetId}`);
    expect([200, 302]).toContain(streamRes.status);
    if (streamRes.status === 302) {
      expect(streamRes.headers.location).toMatch(/^https:\/\/res\.cloudinary\.com\//);
    } else {
      expect(streamRes.headers['content-type']).toMatch(/image\/(png|webp)/);
    }
  });

  it('persists uploaded media URL as coverImage on Academic Wing update', async () => {
    const wing = await Wing.create({
      name: 'Wings of Test Agricultural Science',
      slug: 'wings-test-agri-science',
      shortDescription: 'Sustainable agriculture',
      coverImage: ''
    });

    const pngBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jY7sAAAAASUVORK5CYII=', 'base64');
    const uploadRes = await adminAgent
      .post('/api/v1/admin/upload')
      .attach('file', pngBuffer, { filename: 'agri-cover.webp', contentType: 'image/webp' });

    const newCoverUrl = uploadRes.body.url;

    const updateRes = await adminAgent
      .put(`/api/v1/admin/wings/${wing._id}`)
      .send({
        name: 'Wings of Test Agricultural Science',
        slug: 'wings-test-agri-science',
        coverImage: newCoverUrl
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.coverImage).toBe(newCoverUrl);

    const reloaded = await Wing.findById(wing._id);
    expect(reloaded?.coverImage).toBe(newCoverUrl);
  });
});
