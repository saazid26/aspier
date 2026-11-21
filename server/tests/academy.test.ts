import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import Course from '../src/models/Course.js';

describe('academy course visibility', () => {
  it('does not expose unpublished courses to public visitors', async () => {
    const course = await Course.create({ title: 'Draft Course', slug: 'draft-course', price: 1000, status: 'draft' });
    const response = await request(app).get(`/api/v1/academy/courses/${course.slug}`);
    expect(response.status).toBe(404);
  });

  it('hides paid lesson video IDs from visitors while preserving free previews', async () => {
    const course = await Course.create({
      title: 'Published Course',
      slug: 'published-course',
      price: 1000,
      status: 'published',
      modules: [{
        title: 'Module 1',
        order: 1,
        lessons: [
          { title: 'Preview', order: 1, youtubeVideoId: 'preview-id', isFreePreview: true },
          { title: 'Paid lesson', order: 2, youtubeVideoId: 'paid-id', isFreePreview: false }
        ]
      }]
    });
    const response = await request(app).get(`/api/v1/academy/courses/${course.slug}`);
    expect(response.status).toBe(200);
    expect(response.body.data.modules[0].lessons[0].youtubeVideoId).toBe('preview-id');
    expect(response.body.data.modules[0].lessons[1].youtubeVideoId).toBeUndefined();
  });
});
