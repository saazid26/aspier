import { describe, expect, it } from 'vitest';
import Course from '../src/models/Course.js';
import Instructor from '../src/models/Instructor.js';
import News from '../src/models/News.js';
import Research from '../src/models/Research.js';
import Scholar from '../src/models/Scholar.js';
import Setting from '../src/models/Setting.js';
import Supervisor from '../src/models/Supervisor.js';
import Wing from '../src/models/Wing.js';
import { seedDatabase } from '../src/utils/seed.js';

describe('initial sample content', () => {
  it('seeds complete visuals and all research categories only into empty collections', async () => {
    await seedDatabase();

    expect(await Wing.countDocuments()).toBe(10);
    expect(await Course.countDocuments()).toBeGreaterThanOrEqual(4);
    expect(await Instructor.countDocuments()).toBeGreaterThanOrEqual(3);
    expect(await Supervisor.countDocuments()).toBe(4);
    expect(await Scholar.countDocuments()).toBe(5);
    expect(await News.countDocuments()).toBe(3);
    expect(await Research.countDocuments({ category: 'ongoing' })).toBe(10);
    expect(await Research.countDocuments({ category: 'past' })).toBe(10);
    expect(await Research.countDocuments({ category: 'future' })).toBe(10);

    const [featuredResearch, founder, coverCourse, sampleSupervisor] = await Promise.all([
      Research.findOne({ slug: 'sample-monsoon-flood-mapping' }),
      Setting.findOne({ singleton: 'main' }),
      Course.findOne({ slug: 'responsible-ai-foundations' }),
      Supervisor.findOne({ slug: 'sample-amina-rahman' })
    ]);
    expect(featuredResearch?.featured).toBe(true);
    expect(featuredResearch?.coverImage).toMatch(/^data:image\/svg\+xml/);
    expect(featuredResearch?.objectives).toContain('<ul>');
    expect(founder?.founderPhotoIsPlaceholder).toBe(true);
    expect(founder?.founderResearchDomains).toHaveLength(3);
    expect(coverCourse?.thumbnail).toMatch(/^data:image\/svg\+xml/);
    expect(sampleSupervisor?.photo).toMatch(/^data:image\/svg\+xml/);
    expect(sampleSupervisor?.sampleData).toBe(true);

    await Research.updateOne({ slug: 'sample-monsoon-flood-mapping' }, { $set: { title: 'Admin-edited project', coverImage: '' } });
    await seedDatabase();
    const edited = await Research.findOne({ slug: 'sample-monsoon-flood-mapping' });
    expect(edited?.title).toBe('Admin-edited project');
    expect(edited?.coverImage).toBe('');
  });
});
