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
        title: 'Higher Study Oriented Basic to Advance Research Paper Writing Course',
        slug: 'higher-study-research-paper-writing',
        description: '<p>Designed for students and aspiring researchers preparing for higher studies abroad, this course guides learners from foundational research concepts through the preparation and publication of manuscripts in peer-reviewed journals. Participants learn to identify defensible research gaps, select suitable methods, analyze and visualize evidence, write clearly, and respond constructively to peer review.</p><ul><li>Develop focused research questions and testable hypotheses.</li><li>Conduct systematic literature searches using Scopus and Web of Science.</li><li>Select appropriate study designs and analytical methods.</li><li>Communicate findings with clear, publication-quality tables and figures.</li><li>Draft structured manuscripts (IMRaD) and prepare point-by-point peer review rebuttals.</li></ul>',
        summary: 'Comprehensive 8-week structured roadmap from topic ideation to indexed journal manuscript submission.',
        duration: '8 weeks',
        mode: 'Online and Live',
        deliveryMode: 'Online and Live',
        startDate: '2026-12-20',
        targetAudience: 'Undergraduate and graduate students, early-career researchers, and applicants preparing for higher studies abroad.',
        enrollmentContact: 'Enroll through ASPIER Academy and contact aspier.global@gmail.com for cohort information.',
        wingId: policyWing?._id,
        instructorId: instBySlug.get('tariqul-islam') || instructorsList[0]?._id,
        price: 2500,
        level: 'beginner',
        status: 'published',
        thumbnail: makeDemoCover('Research Paper Writing'),
        bannerUrl: makeDemoCover('Research Paper Writing'),
        sampleData: true,
        modules: defaultPaperWritingModules
      },
      {
        title: 'Responsible AI Foundations',
        slug: 'responsible-ai-foundations',
        description: '<p>Illustrative eight-week intensive course covering machine-learning foundations, fairness, transparency, model interpretability, and responsible deployment in real-world environments.</p><ul><li>Understand data preparation and model evaluation metrics.</li><li>Identify algorithmic bias, audit datasets, and document limitations.</li><li>Communicate trustworthy AI decisions across multidisciplinary teams.</li></ul>',
        summary: 'Machine learning foundations, algorithmic fairness, model transparency, and responsible deployment.',
        duration: '8 weeks',
        mode: 'Online and Live',
        deliveryMode: 'Online and Live',
        startDate: '2026-12-15',
        targetAudience: 'Students and early-career researchers beginning applied artificial intelligence study.',
        enrollmentContact: 'Contact ASPIER Academy to confirm cohort enrollment.',
        wingId: aiWing?._id,
        instructorId: instBySlug.get('farzana-rahman') || instructorsList[0]?._id,
        price: 2500,
        level: 'beginner',
        status: 'published',
        thumbnail: makeDemoCover('Responsible AI Foundations'),
        bannerUrl: makeDemoCover('Responsible AI Foundations'),
        sampleData: true,
        modules: [
          {
            moduleNumber: 1,
            title: 'Module 1: AI Systems and Society',
            week: 'Weeks 1–2',
            description: 'Introduction to ethical algorithmic design and societal impact of automated systems.',
            lessons: [
              { title: 'Session 1: What is Responsible AI?', duration: '45 mins', isFreePreview: true, videoId: 'dQw4w9WgXcQ' },
              { title: 'Session 2: Algorithmic Bias and Fairness Audits', duration: '60 mins', isFreePreview: false, videoId: 'dQw4w9WgXcQ' }
            ]
          },
          {
            moduleNumber: 2,
            title: 'Module 2: Interpretability & Transparency',
            week: 'Weeks 3–4',
            description: 'Feature attribution, SHAP/LIME explainability, and transparent model reporting.',
            lessons: [
              { title: 'Session 3: Explainable Machine Learning (XAI)', duration: '60 mins', isFreePreview: false, videoId: 'dQw4w9WgXcQ' },
              { title: 'Session 4: Model Cards and Data Sheets', duration: '60 mins', isFreePreview: false, videoId: 'dQw4w9WgXcQ' }
            ]
          }
        ]
      },
      {
        title: 'Climate Data Modeling',
        slug: 'climate-data-modeling',
        description: '<p>Intermediate course in climate data workflows, analysis, visualization, and uncertainty across Earth observation datasets.</p><ul><li>Read and validate Earth-observation and atmospheric datasets.</li><li>Build reproducible regional summaries and statistical climate models.</li><li>Explain model uncertainty, climate risks, and policy implications.</li></ul>',
        summary: 'Earth observation datasets, climate data workflows, and regional vulnerability modeling.',
        duration: '10 weeks',
        mode: 'Online and Recorded',
        deliveryMode: 'Online and Recorded',
        startDate: '2027-01-12',
        targetAudience: 'Learners with introductory statistics or environmental-science experience.',
        enrollmentContact: 'Contact ASPIER Academy to confirm cohort enrollment.',
        wingId: climateWing?._id,
        instructorId: instBySlug.get('nabil-hasan') || instructorsList[1]?._id,
        price: 3000,
        level: 'intermediate',
        status: 'published',
        thumbnail: makeDemoCover('Climate Data Modeling'),
        bannerUrl: makeDemoCover('Climate Data Modeling'),
        sampleData: true,
        modules: [
          {
            moduleNumber: 1,
            title: 'Module 1: Earth Observation Datasets',
            week: 'Weeks 1–3',
            description: 'NetCDF, HDF, and satellite raster handling in Python and GIS tools.',
            lessons: [
              { title: 'Session 1: Working with Satellite Climatology Rasters', duration: '60 mins', isFreePreview: true, videoId: 'dQw4w9WgXcQ' },
              { title: 'Session 2: Atmospheric Data Cleaning and Quality Control', duration: '60 mins', isFreePreview: false, videoId: 'dQw4w9WgXcQ' }
            ]
          },
          {
            moduleNumber: 2,
            title: 'Module 2: Regional Risk Modeling',
            week: 'Weeks 4–7',
            description: 'Downscaling Global Climate Models (GCMs) and flood hazard mapping.',
            lessons: [
              { title: 'Session 3: Statistical Downscaling Workflows', duration: '60 mins', isFreePreview: false, videoId: 'dQw4w9WgXcQ' },
              { title: 'Session 4: Extreme Event Risk Synthesis', duration: '60 mins', isFreePreview: false, videoId: 'dQw4w9WgXcQ' }
            ]
          }
        ]
      },
      {
        title: 'Biomedical Data Essentials',
        slug: 'biomedical-data-essentials',
        description: '<p>Hands-on course introducing clinical, epidemiological, and genomic data with an ethics-first approach to public health analytics.</p><ul><li>Describe common biomedical and epidemiological data architectures.</li><li>Practice rigorous data-quality checks, cleaning, and normalization.</li><li>Apply privacy, HIPAA/GDPR consent, and responsible data-sharing principles.</li></ul>',
        summary: 'Clinical data lifecycles, genomic records, and patient-privacy compliant statistical practice.',
        duration: '9 weeks',
        mode: 'Offline',
        deliveryMode: 'Offline',
        startDate: '2027-02-08',
        targetAudience: 'Students interested in biomedical, public health, or life-science research.',
        enrollmentContact: 'Contact ASPIER Academy to confirm cohort enrollment.',
        wingId: bioWing?._id,
        instructorId: instBySlug.get('samira-khan') || instructorsList[2]?._id,
        price: 2800,
        level: 'intermediate',
        status: 'published',
        thumbnail: makeDemoCover('Biomedical Data Essentials'),
        bannerUrl: makeDemoCover('Biomedical Data Essentials'),
        sampleData: true,
        modules: [
          {
            moduleNumber: 1,
            title: 'Module 1: Data in Modern Medicine',
            week: 'Weeks 1–3',
            description: 'Biomedical data lifecycle, electronic health records, and privacy regulations.',
            lessons: [
              { title: 'Session 1: Biomedical Data Lifecycle & Architecture', duration: '45 mins', isFreePreview: true, videoId: 'dQw4w9WgXcQ' },
              { title: 'Session 2: Health Privacy, HIPAA, and Informed Consent', duration: '60 mins', isFreePreview: false, videoId: 'dQw4w9WgXcQ' }
            ]
          }
        ]
      }
    ];

    for (const c of dummyCourses) {
      await Course.findOneAndUpdate({ slug: c.slug }, { $set: c }, { upsert: true });
    }
  }

  const allCourses = await Course.find();
  const courseBySlug = new Map(allCourses.map((c) => [c.slug, c]));
  const paperWritingCourse = courseBySlug.get('higher-study-research-paper-writing') || allCourses[0];
  const aiCourse = courseBySlug.get('responsible-ai-foundations') || allCourses[1] || allCourses[0];
  const climateCourse = courseBySlug.get('climate-data-modeling') || allCourses[2] || allCourses[0];

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
          courseId: aiCourse?._id || paperWritingCourse._id,
          title: 'Session 1: Ethics, Bias Detection & Trustworthy AI Principles',
          topic: 'Session 1: Ethics, Bias Detection & Trustworthy AI Principles',
          description: 'Evaluating algorithmic fairness and model cards using open-source auditing toolkits.',
          scheduledAt: new Date(Date.now() + 5 * 86400000),
          durationMinutes: 60,
          meetingUrl: 'https://meet.google.com/asp-ierr-ai1',
          meetLink: 'https://meet.google.com/asp-ierr-ai1',
          liveJoinUrl: 'https://meet.google.com/asp-ierr-ai1',
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
