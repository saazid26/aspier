import mongoose from 'mongoose';
import { connectDatabase } from '../config/db.js';
import { env, FIXED_ADMIN_EMAIL } from '../config/env.js';
import { hashPassword } from '../services/password.service.js';
import User from '../models/User.js';
import Wing from '../models/Wing.js';
import Setting from '../models/Setting.js';
import Instructor from '../models/Instructor.js';
import Course from '../models/Course.js';
import ClassModel from '../models/Class.js';
import Research from '../models/Research.js';
import Supervisor from '../models/Supervisor.js';
import Scholar from '../models/Scholar.js';
import FoundingMember from '../models/FoundingMember.js';
import News from '../models/News.js';
import { demoResearch, demoScholars, demoSupervisors, demoFoundingMembers, makeDemoAvatar, makeDemoCover } from './seedData/demoContent.js';
import { fallbackWings, fallbackResearchList } from './fallbackData.js';

export async function seedDatabase(): Promise<void> {
  const admin = await User.findOne({ email: FIXED_ADMIN_EMAIL });
  if (!admin) {
    await User.create({
      name: 'ASPIER Administrator',
      email: FIXED_ADMIN_EMAIL,
      passwordHash: await hashPassword(env.ADMIN_PASSWORD || 'admin123'),
      role: 'superadmin',
      isActive: true
    });
  } else if (env.ADMIN_PASSWORD) {
    admin.passwordHash = await hashPassword(env.ADMIN_PASSWORD);
    await admin.save();
  }
  if (!await User.exists({ email: 'student@aspier.org' })) {
    await User.create({ name: 'Demo Student', email: 'student@aspier.org', passwordHash: await hashPassword('Student@1234'), role: 'student', isActive: true });
  }
  for (const wing of fallbackWings) {
    const seedWing = {
      name: wing.name,
      slug: wing.slug,
      shortDescription: wing.shortDescription,
      description: wing.description,
      disciplines: wing.disciplines,
      objectives: wing.objectives,
      order: wing.order,
      isActive: wing.isActive !== false,
      coverImage: wing.coverImage || makeDemoCover(wing.name)
    };
    await Wing.findOneAndUpdate({ slug: wing.slug }, { $set: seedWing }, { upsert: true, new: true });
  }
  const wingIdsBySlug = new Map((await Wing.find().select('_id slug')).map((wing) => [wing.slug, wing._id]));
  const defaultSettings = {
    singleton: 'main',
    siteName: 'ASPIER: Aeronautical, Spatial, Planetary Institute for Environmental Research',
    heroTitle: 'Research for our planet and beyond',
    heroSubtitle: 'The Aeronautical, Spatial, Planetary Institute for Environmental Research advances discovery across Earth and space.',
    heroImage: makeDemoCover('Research for our planet and beyond'),
    missionText: 'The Aeronautical, Spatial, Planetary Institute for Environmental Research advances rigorous research and inclusive education for a resilient planet.',
    contactEmail: 'aspier.global@gmail.com', contactPhone: '+880 1700 000000', address: 'Rajshahi University, Bangladesh',
    bkashNumber: '01603012448', nagadNumber: '01603012448', membershipFee: 0,
    founderName: 'Md Saazid Bin Saif',
    founderTitle: 'Founder, ASPIER',
    founderDescription: 'Founder, ASPIER',
    founderPhoto: makeDemoAvatar('MS'),
    founderPhotoIsPlaceholder: true,
    founderGoogleScholarId: '',
    founderGoogleScholarUrl: '',
    founderResearchDomains: ['Aeronautical & Spatial Systems', 'Environmental Research', 'Remote Sensing & Geospatial Intelligence'],
    founderBio: '<p>Md Saazid Bin Saif founded ASPIER with a vision for an interdisciplinary research community connecting aeronautical, spatial, planetary, and environmental inquiry.</p><p>The institute aims to support careful investigation, collaborative learning, and responsible research that can contribute to a resilient planet. This sample biography should be reviewed and completed with verified details before publication.</p>',
    paymentInstructions: 'Send the course fee by bKash or Nagad, then submit the exact transaction ID for verification.',
    seoTitle: 'ASPIER - Aeronautical, Spatial, Planetary Institute for Environmental Research',
    seoDescription: 'Explore ASPIER academic wings, environmental research, scholars, and academy courses.'
  };
  await Setting.findOneAndUpdate({ singleton: 'main' }, { $setOnInsert: defaultSettings }, { upsert: true, setDefaultsOnInsert: true });
  await Setting.updateOne({ singleton: 'main', $or: [{ founderName: { $exists: false } }, { founderName: '' }] }, { $set: { founderName: defaultSettings.founderName, founderTitle: defaultSettings.founderTitle, founderDescription: defaultSettings.founderDescription, founderResearchDomains: defaultSettings.founderResearchDomains, founderBio: defaultSettings.founderBio } });
  await Setting.updateOne({ singleton: 'main', $or: [{ founderTitle: { $exists: false } }, { founderTitle: '' }] }, { $set: { founderTitle: defaultSettings.founderTitle } });
  await Setting.updateOne({ singleton: 'main', $or: [{ founderResearchDomains: { $exists: false } }, { founderResearchDomains: { $size: 0 } }] }, { $set: { founderResearchDomains: defaultSettings.founderResearchDomains } });
  await Setting.updateOne({ singleton: 'main', $or: [{ founderBio: { $exists: false } }, { founderBio: '' }] }, { $set: { founderBio: defaultSettings.founderBio } });
  await Setting.updateOne({ singleton: 'main', siteName: 'ASPIER' }, { $set: { siteName: defaultSettings.siteName } });
  await Setting.updateOne({ singleton: 'main', heroTitle: 'Knowledge that connects disciplines' }, { $set: { heroTitle: defaultSettings.heroTitle } });
  await Setting.updateOne({ singleton: 'main', heroSubtitle: 'A modern platform for research, academic wings, and future-ready learning.' }, { $set: { heroSubtitle: defaultSettings.heroSubtitle } });
  await Setting.updateOne({ singleton: 'main', missionText: 'ASPIER advances rigorous research and inclusive education across science, technology, and society.' }, { $set: { missionText: defaultSettings.missionText } });
  await Setting.updateOne({ singleton: 'main', seoTitle: 'ASPIER - Research & Academy' }, { $set: { seoTitle: defaultSettings.seoTitle } });
  await Setting.updateOne({ singleton: 'main', seoDescription: 'Explore ASPIER research wings, scholars, and academy courses.' }, { $set: { seoDescription: defaultSettings.seoDescription } });
  await Setting.updateOne({ singleton: 'main', bkashNumber: '01700000000' }, { $set: { bkashNumber: '01603012448' } });
  await Setting.updateOne({ singleton: 'main', nagadNumber: '01800000000' }, { $set: { nagadNumber: '01603012448' } });
  await Setting.updateOne({ singleton: 'main', membershipFee: { $exists: false } }, { $set: { membershipFee: 0 } });
  if (await Instructor.countDocuments() === 0) await Instructor.create([
    { name: 'Dr. Farzana Rahman', slug: 'farzana-rahman', title: 'Sample AI Research Lead', bio: 'Illustrative instructor profile covering trustworthy machine learning and applied language technologies. Replace with verified details before publication.', expertise: ['Machine Learning', 'Natural Language Processing'], photo: makeDemoAvatar('FR'), sampleData: true },
    { name: 'Prof. Nabil Hasan', slug: 'nabil-hasan', title: 'Sample Earth Systems Instructor', bio: 'Illustrative instructor profile focused on climate observations, geospatial evidence, and regional adaptation. Replace with verified details before publication.', expertise: ['Climate Data', 'Remote Sensing'], photo: makeDemoAvatar('NH'), sampleData: true },
    { name: 'Dr. Samira Khan', slug: 'samira-khan', title: 'Sample Biomedical Data Scientist', bio: 'Illustrative instructor profile exploring genomics, diagnostics, and responsible health-data practice. Replace with verified details before publication.', expertise: ['Genomics', 'Health Data'], photo: makeDemoAvatar('SK'), sampleData: true }
  ]);
  if (await Course.countDocuments() === 0) {
    const [ai, climate, health] = await Promise.all([Wing.findOne({ slug: 'geospatial-intelligence-remote-sensing' }), Wing.findOne({ slug: 'hydrology-atmospheric-physics' }), Wing.findOne({ slug: 'applied-biotechnology' })]);
    const instructors = await Instructor.find().sort({ name: 1 }).limit(3);
    await Course.create([
      { title: 'Responsible AI Foundations', slug: 'responsible-ai-foundations', description: '<p>Illustrative eight-week course covering machine-learning foundations, fairness, transparency, and responsible deployment.</p><ul><li>Understand data preparation and model evaluation.</li><li>Identify bias and document limitations.</li><li>Communicate trustworthy AI decisions.</li></ul><p>Sample syllabus: AI and society; data quality; model evaluation; fairness; interpretability; privacy; governance; capstone review.</p>', duration: '8 weeks', mode: 'Online and Live', startDate: '2026-12-15', targetAudience: 'Sample course for students and early-career researchers beginning applied AI study.', enrollmentContact: 'Contact ASPIER Academy to confirm the next cohort.', wingId: ai?._id, instructorId: instructors[0]?._id, price: 2500, level: 'beginner', status: 'published', thumbnail: makeDemoCover('Responsible AI Foundations'), sampleData: true, modules: [{ title: 'AI Systems and Society', order: 1, lessons: [{ title: 'What is Responsible AI?', order: 1, isFreePreview: true, resources: ['Sample course overview'], duration: 18 }, { title: 'Bias and Fairness', order: 2, isFreePreview: false, duration: 24 }] }] },
      { title: 'Climate Data Modeling', slug: 'climate-data-modeling', description: '<p>Illustrative intermediate course in climate data workflows, analysis, visualization, and uncertainty.</p><ul><li>Read and validate Earth-observation datasets.</li><li>Build reproducible regional summaries.</li><li>Explain model uncertainty and limitations.</li></ul><p>Sample syllabus: climate data sources; quality control; time series; spatial analysis; model evaluation; visualization; uncertainty; applied project.</p>', duration: '10 weeks', mode: 'Online and Recorded', startDate: '2027-01-12', targetAudience: 'Sample course for learners with introductory statistics or environmental-science experience.', enrollmentContact: 'Contact ASPIER Academy to confirm the next cohort.', wingId: climate?._id, instructorId: instructors[1]?._id, price: 3000, level: 'intermediate', status: 'published', thumbnail: makeDemoCover('Climate Data Modeling'), sampleData: true, modules: [{ title: 'Climate Data Foundations', order: 1, lessons: [{ title: 'Reading Earth Observations', order: 1, isFreePreview: true, duration: 20 }, { title: 'Building a Regional Model', order: 2, duration: 35 }] }] },
      { title: 'Biomedical Data Essentials', slug: 'biomedical-data-essentials', description: '<p>Illustrative course introducing clinical and genomic data with an ethics-first approach.</p><ul><li>Describe common biomedical data types.</li><li>Practice careful data-quality checks.</li><li>Apply privacy, consent, and responsible-sharing principles.</li></ul><p>Sample syllabus: biomedical data lifecycle; clinical records; genomics; reproducibility; privacy; consent; bias; communication.</p>', duration: '9 weeks', mode: 'Offline', startDate: '2027-02-08', targetAudience: 'Sample course for students interested in biomedical, public-health, or life-science data.', enrollmentContact: 'Contact ASPIER Academy to confirm the next cohort.', wingId: health?._id, instructorId: instructors[2]?._id, price: 2800, level: 'intermediate', status: 'published', thumbnail: makeDemoCover('Biomedical Data Essentials'), sampleData: true, modules: [{ title: 'Data in Modern Medicine', order: 1, lessons: [{ title: 'Biomedical Data Lifecycle', order: 1, isFreePreview: true, duration: 22 }, { title: 'Privacy and Consent', order: 2, duration: 27 }] }] }
    ]);
  }
  const courseWing = await Wing.findOne({ slug: 'environmental-policy-governance' });
  const courseInstructor = await Instructor.findOne().sort({ name: 1 });
  await Course.updateOne({ slug: 'higher-study-research-paper-writing' }, {
    $setOnInsert: {
      title: 'Higher Study Oriented Basic to Advance Research Paper Writing Course',
      slug: 'higher-study-research-paper-writing',
      description: 'Course Overview: Designed for students and aspiring researchers preparing for higher studies abroad, this course guides learners from foundational research concepts through the preparation and publication of manuscripts in peer-reviewed journals. Participants learn to identify defensible research gaps, select suitable methods, analyze and visualize evidence, write clearly, and respond constructively to peer review.\n\nKey learning outcomes: Develop a focused research question; assess literature critically; choose appropriate study designs; communicate findings with clear tables and figures; prepare ethical, reproducible manuscripts; and plan a responsible publication strategy.\n\nEnrollment: Review the syllabus and contact ASPIER to confirm the next cohort.',
      duration: '8 weeks',
      mode: 'Online and Live',
      startDate: '2026-12-20',
      targetAudience: 'Undergraduate and graduate students, early-career researchers, and applicants preparing for higher studies abroad',
      enrollmentContact: 'Enroll through ASPIER Academy and contact aspier.global@gmail.com for cohort information.',
      wingId: courseWing?._id,
      instructorId: courseInstructor?._id,
      price: 2500,
      level: 'beginner',
      status: 'published',
      thumbnail: makeDemoCover('Research Paper Writing'),
      sampleData: true,
      modules: [
        { title: 'Research Topic Selection & Gap Identification', order: 1, lessons: [{ title: 'From broad interests to researchable questions', order: 1, isFreePreview: true }, { title: 'Finding and validating a research gap', order: 2 }] },
        { title: 'Systematic Literature Review', order: 2, lessons: [{ title: 'Search strategies and evidence screening', order: 1 }, { title: 'Synthesis, critical appraisal, and review matrices', order: 2 }] },
        { title: 'Research Methodology & Study Design', order: 3, lessons: [{ title: 'Matching methods to research questions', order: 1 }, { title: 'Ethics, sampling, and reproducibility', order: 2 }] },
        { title: 'Data Analysis & Visualization', order: 4, lessons: [{ title: 'Preparing and checking research data', order: 1 }, { title: 'Clear, honest tables and figures', order: 2 }] },
        { title: 'Academic Writing & Referencing', order: 5, lessons: [{ title: 'Structuring a research paper', order: 1 }, { title: 'LaTeX, Mendeley, and Zotero workflows', order: 2 }] },
        { title: 'Journal Selection', order: 6, lessons: [{ title: 'Scope, indexing, fees, and journal quality', order: 1 }] },
        { title: 'Peer-Review Response', order: 7, lessons: [{ title: 'Interpreting reviewer feedback', order: 1 }, { title: 'Preparing a point-by-point response', order: 2 }] },
        { title: 'Publication Strategy', order: 8, lessons: [{ title: 'Submission planning and research visibility', order: 1 }] }
      ]
    }
  }, { upsert: true });
  await Course.updateMany({ mode: 'Online / Live' }, { $set: { mode: 'Online and Live' } });
  if (await ClassModel.countDocuments() === 0) {
    const courses = await Course.find().limit(2);
    if (courses[0]) await ClassModel.create({ courseId: courses[0]._id, title: 'Sample Responsible AI Office Hours', description: 'Illustrative sample session, shown as completed without an external meeting link or recording.', scheduledAt: new Date('2025-06-15T10:00:00Z'), durationMinutes: 60, status: 'completed' });
    if (courses[1]) await ClassModel.create({ courseId: courses[1]._id, title: 'Sample Climate Data Lab', description: 'Illustrative sample session, shown as completed without an external meeting link or recording.', scheduledAt: new Date('2025-07-20T10:00:00Z'), durationMinutes: 90, status: 'completed' });
  }
  for (const r of demoResearch) {
    const wingId = wingIdsBySlug.get(r.wingSlug) || wingIdsBySlug.get('geospatial-intelligence-remote-sensing');
    const fallbackMatch = fallbackResearchList.find((f) => f.slug === r.slug);
    const researchDoc = {
      ...((fallbackMatch && fallbackMatch._id) ? { _id: fallbackMatch._id } : {}),
      title: r.title,
      slug: r.slug,
      wingId,
      category: r.category,
      abstract: r.abstract,
      content: r.content,
      objectives: r.objectives,
      publicationUrl: r.publicationUrl || '',
      doiUrl: r.doiUrl || '',
      showReadPaperButton: r.showReadPaperButton !== false,
      status: r.status || 'published',
      authors: r.authors || ['ASPIER Research Wing Group'],
      supervisors: r.supervisors || ['ASPIER Senior Research Supervisors'],
      publishedAt: r.publishedAt || new Date(),
      featured: r.featured || false,
      sampleData: true,
      coverImage: r.coverImage || makeDemoCover(r.title)
    };
    await Research.updateOne({ slug: r.slug }, { $setOnInsert: researchDoc }, { upsert: true });
  }
  if (await FoundingMember.countDocuments() === 0) await FoundingMember.create(demoFoundingMembers);
  if (await Supervisor.countDocuments() === 0) await Supervisor.create(demoSupervisors.map(({ wingSlug, ...supervisor }) => ({
    ...supervisor,
    wingIds: wingIdsBySlug.has(wingSlug) ? [wingIdsBySlug.get(wingSlug)] : []
  })));
  if (await Scholar.countDocuments() === 0) await Scholar.create(demoScholars.map(({ wingSlug, ...scholar }) => ({
    ...scholar,
    wingId: wingIdsBySlug.get(wingSlug)
  })));
  if (await News.countDocuments() === 0) await News.create([
    { title: 'Sample: ASPIER Research Scholar Applications', slug: 'sample-research-scholar-applications', excerpt: '<p>Illustrative announcement for an editable scholar application campaign across the academic wings.</p>', content: '<p>This sample announcement demonstrates the news layout. Replace dates, eligibility, and application links with verified current information before publishing.</p>', coverImage: makeDemoCover('Research Scholar Applications'), category: 'Announcements', isAnnouncement: true, sampleData: true, publishedAt: new Date() },
    { title: 'Sample: Academy Cohort Registration', slug: 'sample-academy-registration', excerpt: '<p>Explore sample learning tracks in responsible AI, climate data, and biomedical data practice.</p>', content: '<p>This sample announcement demonstrates the academy news layout. Confirm course availability, fees, dates, and registration instructions before publishing.</p>', coverImage: makeDemoCover('Academy Cohort Registration'), category: 'Academy', isAnnouncement: true, sampleData: true, publishedAt: new Date() },
    { title: 'Sample: Open Research Methods Showcase', slug: 'sample-open-research-showcase', excerpt: '<p>A sample news item highlighting reproducibility, open methods, and collaborative inquiry.</p>', content: '<p>This illustrative article is editable from the Admin panel. Replace it with verified publication details and links before publishing.</p>', coverImage: makeDemoCover('Open Research Methods'), category: 'News', isAnnouncement: false, sampleData: true, publishedAt: new Date() }
  ]);
  console.log('[seed] ASPIER seed data is ready');
}

if (process.argv[1] && process.argv[1].endsWith('seed.ts')) {
  await connectDatabase();
  await seedDatabase();
  await mongoose.disconnect();
}
