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
import Enrollment from '../models/Enrollment.js';
import Payment from '../models/Payment.js';
import Research from '../models/Research.js';
import Supervisor from '../models/Supervisor.js';
import Scholar from '../models/Scholar.js';
import FoundingMember from '../models/FoundingMember.js';
import News from '../models/News.js';
import { demoResearch, demoScholars, demoSupervisors, demoFoundingMembers, makeDemoAvatar, makeDemoCover } from './seedData/demoContent.js';
import { fallbackWings, fallbackResearchList } from './fallbackData.js';
import { RESEARCH_PAPER_WRITING_CLASSES, RESEARCH_PAPER_WRITING_MODULES } from './researchCourseCurriculum.js';

export async function seedAcademyData(force = false): Promise<{
  courses: number;
  instructors: number;
  classes: number;
  enrollments: number;
  payments: number;
}> {
  if (force) {
    await Promise.all([
      Course.deleteMany({ $or: [{ sampleData: true }, { slug: { $in: ['higher-study-research-paper-writing', 'responsible-ai-foundations', 'climate-data-modeling', 'biomedical-data-essentials'] } }] }),
      Instructor.deleteMany({ $or: [{ sampleData: true }, { slug: { $in: ['farzana-rahman', 'nabil-hasan', 'samira-khan', 'tariqul-islam'] } }] }),
      ClassModel.deleteMany({}),
      Enrollment.deleteMany({}),
      Payment.deleteMany({})
    ]);
  }

  // 1. Instructors
  const existingInstructorsCount = await Instructor.countDocuments();
  let instructorsList = await Instructor.find();
  if (force || existingInstructorsCount === 0) {
    const dummyInstructors = [
      {
        name: 'Dr. Farzana Rahman',
        slug: 'farzana-rahman',
        title: 'Lead AI Research Fellow & Instructor',
        designation: 'Lead AI Research Fellow & Instructor',
        affiliation: 'ASPIER Academy & University of Dhaka',
        bio: 'Ph.D. in Computer Science with 8+ years specializing in trustworthy machine learning, natural language processing, and responsible AI deployment across multidisciplinary research teams.',
        expertise: ['Machine Learning', 'Natural Language Processing', 'Research Methodology'],
        photo: makeDemoAvatar('FR'),
        avatar: makeDemoAvatar('FR'),
        avatarUrl: makeDemoAvatar('FR'),
        sampleData: true
      },
      {
        name: 'Prof. Nabil Hasan',
        slug: 'nabil-hasan',
        title: 'Professor of Earth Systems & Geospatial Science',
        designation: 'Professor of Earth Systems & Geospatial Science',
        affiliation: 'ASPIER Research Wing Group & BUET',
        bio: 'Senior researcher and educator with over 45 peer-reviewed publications in hydrology, Earth observation data pipelines, and regional climate vulnerability models.',
        expertise: ['Climate Data', 'Remote Sensing', 'Hydrological Modeling'],
        photo: makeDemoAvatar('NH'),
        avatar: makeDemoAvatar('NH'),
        avatarUrl: makeDemoAvatar('NH'),
        sampleData: true
      },
      {
        name: 'Dr. Samira Khan',
        slug: 'samira-khan',
        title: 'Biomedical Data Scientist & Senior Lecturer',
        designation: 'Biomedical Data Scientist & Senior Lecturer',
        affiliation: 'ASPIER Academy & Rajshahi Medical College',
        bio: 'Specialist in clinical genomics, high-dimensional biological data architectures, reproducible biostatistics, and ethical research protocols.',
        expertise: ['Genomics', 'Biostatistics', 'Research Ethics'],
        photo: makeDemoAvatar('SK'),
        avatar: makeDemoAvatar('SK'),
        avatarUrl: makeDemoAvatar('SK'),
        sampleData: true
      },
      {
        name: 'Dr. Tariqul Islam',
        slug: 'tariqul-islam',
        title: 'Associate Professor of Academic Writing & Scientific Publication',
        designation: 'Associate Professor of Academic Writing & Scientific Publication',
        affiliation: 'ASPIER Global Academy',
        bio: 'Experienced journal reviewer and author with 12+ years mentoring graduate scholars in manuscript structuring, Scopus indexing, and peer-review rebuttal strategies.',
        expertise: ['Academic Writing', 'Scopus & Web of Science', 'Manuscript Publication'],
        photo: makeDemoAvatar('TI'),
        avatar: makeDemoAvatar('TI'),
        avatarUrl: makeDemoAvatar('TI'),
        sampleData: true
      }
    ];

    for (const inst of dummyInstructors) {
      await Instructor.findOneAndUpdate({ slug: inst.slug }, { $set: inst }, { upsert: true });
    }
    instructorsList = await Instructor.find();
  }

  const instBySlug = new Map(instructorsList.map((i) => [i.slug, i._id]));

  // 2. Wings references
  const [aiWing, climateWing, bioWing, policyWing] = await Promise.all([
    Wing.findOne({ slug: 'geospatial-intelligence-remote-sensing' }),
    Wing.findOne({ slug: 'hydrology-atmospheric-physics' }),
    Wing.findOne({ slug: 'applied-biotechnology' }),
    Wing.findOne({ slug: 'environmental-policy-governance' })
  ]);

  // 3. Courses
  const existingCoursesCount = await Course.countDocuments();
  if (force || existingCoursesCount === 0) {
    const defaultPaperWritingModules = [
      {
        moduleNumber: 1,
        title: 'Module 1: Foundations & Research Framing',
        week: 'Weeks 1–2',
        description: 'Formulating high-impact research questions, hypothesis framing, and academic standards.',
        lessons: [
          { title: 'Session 1: Identifying Research Gaps & Problem Formulation', duration: '45 mins', isFreePreview: true, videoId: 'dQw4w9WgXcQ', youtubeVideoId: 'dQw4w9WgXcQ' },
          { title: 'Session 2: Formulating Hypotheses and Research Objectives', duration: '60 mins', isFreePreview: false, videoId: 'dQw4w9WgXcQ', youtubeVideoId: 'dQw4w9WgXcQ' },
          { title: 'Session 3: Ethical Considerations & Academic Integrity in Scientific Inquiry', duration: '45 mins', isFreePreview: false, videoId: 'dQw4w9WgXcQ', youtubeVideoId: 'dQw4w9WgXcQ' }
        ]
      },
      {
        moduleNumber: 2,
        title: 'Module 2: Literature Review & Methodology',
        week: 'Weeks 3–4',
        description: 'Systematic literature search, synthesis matrices, and robust experimental/analytical design.',
        lessons: [
          { title: 'Session 4: Advanced Scopus & Web of Science Literature Search Strategies', duration: '60 mins', isFreePreview: false, videoId: 'dQw4w9WgXcQ', youtubeVideoId: 'dQw4w9WgXcQ' },
          { title: 'Session 5: Building a Critical Literature Synthesis Matrix', duration: '60 mins', isFreePreview: false, videoId: 'dQw4w9WgXcQ', youtubeVideoId: 'dQw4w9WgXcQ' },
          { title: 'Session 6: Quantitative & Qualitative Methodology Design', duration: '60 mins', isFreePreview: false, videoId: 'dQw4w9WgXcQ', youtubeVideoId: 'dQw4w9WgXcQ' }
        ]
      },
      {
        moduleNumber: 3,
        title: 'Module 3: Data Analysis & Tools',
        week: 'Weeks 5–6',
        description: 'Statistical modeling, reproducible analysis workflows, and effective visualization.',
        lessons: [
          { title: 'Session 7: Data Preparation, Cleaning & Exploratory Analysis', duration: '60 mins', isFreePreview: false, videoId: 'dQw4w9WgXcQ', youtubeVideoId: 'dQw4w9WgXcQ' },
          { title: 'Session 8: Statistical Hypothesis Testing & Result Interpretation', duration: '60 mins', isFreePreview: false, videoId: 'dQw4w9WgXcQ', youtubeVideoId: 'dQw4w9WgXcQ' },
          { title: 'Session 9: Creating Publication-Quality Plots, Figures, and Tables', duration: '60 mins', isFreePreview: false, videoId: 'dQw4w9WgXcQ', youtubeVideoId: 'dQw4w9WgXcQ' }
        ]
      },
      {
        moduleNumber: 4,
        title: 'Module 4: Academic Writing & Publication',
        week: 'Weeks 7–8',
        description: 'Manuscript drafting (IMRaD), target journal selection, peer review response, and publication ethics.',
        lessons: [
          { title: 'Session 10: Drafting Title, Abstract, and High-Impact Introduction', duration: '60 mins', isFreePreview: false, videoId: 'dQw4w9WgXcQ', youtubeVideoId: 'dQw4w9WgXcQ' },
          { title: 'Session 11: Results, Discussion, and Conclusion Mastery', duration: '60 mins', isFreePreview: false, videoId: 'dQw4w9WgXcQ', youtubeVideoId: 'dQw4w9WgXcQ' },
          { title: 'Session 12: Journal Selection, Cover Letters, and Peer Review Rebuttal', duration: '60 mins', isFreePreview: false, videoId: 'dQw4w9WgXcQ', youtubeVideoId: 'dQw4w9WgXcQ' }
        ]
      }
    ];

    const dummyCourses = [
      {
        title: 'Higher Study-Oriented Research Paper Writing Course',
        slug: 'higher-study-research-paper-writing',
        description: '<p>Designed for students and aspiring researchers preparing for higher studies abroad, this course guides learners from foundational research concepts through the preparation and publication of manuscripts in peer-reviewed journals. Participants learn to identify defensible research gaps, select suitable methods, analyze and visualize evidence, write clearly, and respond constructively to peer review.</p><ul><li>Develop focused research questions and testable hypotheses.</li><li>Conduct systematic literature searches using Scopus and Web of Science.</li><li>Select appropriate study designs and analytical methods.</li><li>Communicate findings with clear, publication-quality tables and figures.</li><li>Draft structured manuscripts (IMRaD) and prepare point-by-point peer review rebuttals.</li></ul>',
        summary: 'Comprehensive 15-class structured roadmap from topic ideation to indexed journal manuscript submission.',
        duration: '15 Recorded Classes (Classes 0–14)',
        mode: 'Online and Recorded',
        deliveryMode: 'Online and Recorded',
        format: 'Online and Recorded',
        isRecorded: true,
        startDate: 'Open Enrollment',
        targetAudience: 'Undergraduate and graduate students, early-career researchers, and applicants preparing for higher studies abroad.',
        enrollmentContact: 'Enroll through ASPIER Academy and contact aspier.global@gmail.com for cohort information.',
        wingId: policyWing?._id,
        instructorId: instBySlug.get('tariqul-islam') || instructorsList[0]?._id,
        price: 2000,
        level: 'beginner',
        status: 'published',
        thumbnail: makeDemoCover('Research Paper Writing'),
        bannerUrl: makeDemoCover('Research Paper Writing'),
        sampleData: true,
        classes: RESEARCH_PAPER_WRITING_CLASSES,
        curriculum: RESEARCH_PAPER_WRITING_CLASSES,
        modules: RESEARCH_PAPER_WRITING_MODULES
      }
    ];

    for (const c of dummyCourses) {
      await Course.findOneAndUpdate({ slug: c.slug }, { $set: c }, { upsert: true });
    }
  }

  const allCourses = await Course.find();
  const courseBySlug = new Map(allCourses.map((c) => [c.slug, c]));
  const paperWritingCourse = courseBySlug.get('higher-study-research-paper-writing') || allCourses[0];

  // 4. Live Class Schedule
  const existingClassesCount = await ClassModel.countDocuments();
  if (force || existingClassesCount === 0) {
    if (paperWritingCourse) {
      await ClassModel.create([
        {
          courseId: paperWritingCourse._id,
          title: 'Session 1: Identifying Research Gaps & Problem Formulation',
          topic: 'Session 1: Identifying Research Gaps & Problem Formulation',
          description: 'Live interactive lecture and breakout workshop on systematic gap finding in peer-reviewed literature.',
          scheduledAt: new Date(Date.now() + 3 * 86400000),
          durationMinutes: 60,
          meetingUrl: 'https://meet.google.com/asp-ierr-es1',
          meetLink: 'https://meet.google.com/asp-ierr-es1',
          liveJoinUrl: 'https://meet.google.com/asp-ierr-es1',
          mode: 'Online and Live',
          status: 'scheduled'
        },
        {
          courseId: paperWritingCourse._id,
          title: 'Session 2: Scopus & Web of Science Literature Search Lab',
          topic: 'Session 2: Scopus & Web of Science Literature Search Lab',
          description: 'Hands-on boolean search strategies, synthesis matrices, and screening protocols.',
          scheduledAt: new Date(Date.now() + 10 * 86400000),
          durationMinutes: 60,
          meetingUrl: 'https://meet.google.com/asp-ierr-es2',
          meetLink: 'https://meet.google.com/asp-ierr-es2',
          liveJoinUrl: 'https://meet.google.com/asp-ierr-es2',
          mode: 'Online and Live',
          status: 'scheduled'
        },
        {
          courseId: paperWritingCourse._id,
          title: 'Orientation & Academic Career Roadmap Kickoff',
          topic: 'Orientation & Academic Career Roadmap Kickoff',
          description: 'Welcome session, program syllabus walkthrough, and research toolkit setup.',
          scheduledAt: new Date(Date.now() - 5 * 86400000),
          durationMinutes: 90,
          meetingUrl: 'https://meet.google.com/asp-ierr-ori',
          meetLink: 'https://meet.google.com/asp-ierr-ori',
          liveJoinUrl: 'https://meet.google.com/asp-ierr-ori',
          recordingUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          recordingYoutubeId: 'dQw4w9WgXcQ',
          mode: 'Online and Live',
          status: 'completed'
        }
      ]);
    }
  }

  // 5. Clean up any dummy students, enrollments, and payments so fresh databases start with 0
  const dummyStudentEmails = [
    'nusrat.jahan@gmail.com',
    'tanvir.ahmed@gmail.com',
    'sumaiya.akter@gmail.com',
    'rakib.hassan@gmail.com',
    'student@aspier.org'
  ];
  const dummyStudents = await User.find({ email: { $in: dummyStudentEmails } });
  const dummyStudentIds = dummyStudents.map((s) => s._id);
  if (dummyStudentIds.length > 0) {
    await Enrollment.deleteMany({ userId: { $in: dummyStudentIds } });
    await Payment.deleteMany({ userId: { $in: dummyStudentIds } });
    await User.deleteMany({ _id: { $in: dummyStudentIds } });
  }
  await Payment.deleteMany({
    trxId: { $in: ['BK78912301', 'NG54321098', 'BK11223344', 'NG99887766', 'BK10020030'] }
  });

  return {
    courses: await Course.countDocuments(),
    instructors: await Instructor.countDocuments(),
    classes: await ClassModel.countDocuments(),
    enrollments: await Enrollment.countDocuments(),
    payments: await Payment.countDocuments()
  };
}

export async function seedDatabase(): Promise<void> {
  const adminEmail = (process.env.ADMIN_EMAIL || FIXED_ADMIN_EMAIL || 'admin@gmail.com').trim().toLowerCase();
  const adminPassword = env.ADMIN_PASSWORD || 'admin123';
  let admin = await User.findOne({ email: { $in: [adminEmail, 'admin@gmail.com', 'admin@aspier.org'] } });
  if (!admin) {
    await User.create({
      name: 'ASPIER Administrator',
      email: adminEmail,
      passwordHash: await hashPassword(adminPassword),
      role: 'admin',
      isActive: true
    });
  } else {
    let changed = false;
    if (!['admin', 'superadmin'].includes(admin.role)) {
      admin.role = 'admin';
      changed = true;
    }
    if (adminPassword) {
      admin.passwordHash = await hashPassword(adminPassword);
      changed = true;
    }
    if (changed) {
      await admin.save();
    }
  }
  // Safely clean up any dummy student records
  await User.deleteMany({ email: { $in: ['student@aspier.org', 'nusrat.jahan@gmail.com', 'tanvir.ahmed@gmail.com', 'sumaiya.akter@gmail.com', 'rakib.hassan@gmail.com'] } });
  for (const wing of fallbackWings) {
    const existing = await Wing.findOne({ slug: wing.slug });
    const coverImage = (existing?.coverImage && existing.coverImage.startsWith('https://res.cloudinary.com/'))
      ? existing.coverImage
      : (wing.coverImage || '');

    const seedWing = {
      name: wing.name,
      slug: wing.slug,
      shortDescription: wing.shortDescription,
      description: wing.description,
      disciplines: wing.disciplines,
      objectives: wing.objectives,
      order: wing.order,
      isActive: wing.isActive !== false,
      coverImage
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

  // Seed Academy Collections
  await seedAcademyData(false);

  // Research projects and News seeding disabled: Clean state preserved.
  if (await FoundingMember.countDocuments() === 0) await FoundingMember.create(demoFoundingMembers);
  if (await Supervisor.countDocuments() === 0) await Supervisor.create(demoSupervisors.map(({ wingSlug, ...supervisor }) => ({
    ...supervisor,
    wingIds: wingIdsBySlug.has(wingSlug) ? [wingIdsBySlug.get(wingSlug)] : []
  })));
  if (await Scholar.countDocuments() === 0) await Scholar.create(demoScholars.map(({ wingSlug, ...scholar }) => ({
    ...scholar,
    wingId: wingIdsBySlug.get(wingSlug)
  })));
  console.log('[seed] ASPIER seed data is ready');
}

declare global {
  var _seedPromise: Promise<void> | undefined;
}

export async function ensureSeeded(): Promise<void> {
  if (global._seedPromise) {
    return global._seedPromise;
  }
  global._seedPromise = (async () => {
    try {
      if (mongoose.connection.readyState !== 1) {
        await connectDatabase();
      }
      if (mongoose.connection.readyState !== 1) {
        return;
      }
      await seedDatabase();
      // Safely ensure no legacy dummy students, enrollments, or payments remain
      const dummyEmails = ['student@aspier.org', 'nusrat.jahan@gmail.com', 'tanvir.ahmed@gmail.com', 'sumaiya.akter@gmail.com', 'rakib.hassan@gmail.com'];
      const dummyUsers = await User.find({ email: { $in: dummyEmails } });
      const dummyIds = dummyUsers.map(u => u._id);
      if (dummyIds.length > 0) {
        await Enrollment.deleteMany({ userId: { $in: dummyIds } });
        await Payment.deleteMany({ userId: { $in: dummyIds } });
        await User.deleteMany({ _id: { $in: dummyIds } });
      }
      await Payment.deleteMany({
        trxId: { $in: ['BK78912301', 'NG54321098', 'BK11223344', 'NG99887766', 'BK10020030'] }
      });
    } catch (err) {
      console.warn('[seed] ensureSeeded error:', err instanceof Error ? err.message : err);
      global._seedPromise = undefined;
    }
  })();
  return global._seedPromise;
}

if (process.argv[1] && process.argv[1].endsWith('seed.ts')) {
  await connectDatabase();
  await seedDatabase();
  await mongoose.disconnect();
}

if (process.argv[1] && process.argv[1].endsWith('seed.ts')) {
  await connectDatabase();
  await seedDatabase();
  await mongoose.disconnect();
}
