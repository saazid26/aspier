import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import Wing from '../models/Wing.js';
import Research from '../models/Research.js';
import Supervisor from '../models/Supervisor.js';
import Scholar from '../models/Scholar.js';
import FoundingMember from '../models/FoundingMember.js';
import News from '../models/News.js';
import Course from '../models/Course.js';
import User from '../models/User.js';
import Message from '../models/Message.js';
import Enrollment from '../models/Enrollment.js';
import Payment from '../models/Payment.js';
import Notification from '../models/Notification.js';
import Certificate from '../models/Certificate.js';
import ResearchApplicationModel from '../models/ResearchApplication.js';
import MembershipApplicationModel from '../models/MembershipApplication.js';

export async function runFullProductionPurge(): Promise<any> {
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!mongoUri && mongoose.connection.readyState === 0) {
    throw new Error('Neither MONGODB_URI nor MONGO_URI is defined.');
  }

  if (mongoose.connection.readyState === 0 && mongoUri) {
    console.log('[Purge] Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('[Purge] Connected successfully.');
  }

  console.log('[Purge] Executing full production purge strictly obeying allowlist...');

  // 1. Purge all News documents (dummy news/announcements)
  const newsResult = await News.deleteMany({});

  // 2. Purge all Research documents across all categories
  const researchResult = await Research.deleteMany({});

  // 3. Clear embedded research/projects/publications arrays on all 10 Academic Wings
  const wingUpdateResult = await Wing.updateMany(
    {},
    {
      $set: {
        research: [],
        presentResearch: [],
        pastResearch: [],
        futureResearch: [],
        projects: [],
        publications: [],
        researchItems: []
      }
    }
  );

  // 4. Inquiries & Contact Messages
  const messageResult = await Message.deleteMany({});

  // 5. Research Applications / Proposals (test entries like Tariqul Islam, Nusrat Jahan, etc.)
  const researchAppResult = await ResearchApplicationModel.deleteMany({});

  // 6. Membership Applications / Join Inquiries
  const memberAppResult = await MembershipApplicationModel.deleteMany({});

  // 7. Course: Keep ONLY "Higher Study Oriented Research Paper Writing Course"
  const courseResult = await Course.deleteMany({
    title: { $not: /Higher Study Oriented.*Research Paper Writing Course/i }
  });

  // 8. Enrollments & Payments & Certificates
  const enrollmentResult = await Enrollment.deleteMany({});
  const paymentResult = await Payment.deleteMany({});
  const certResult = await Certificate.deleteMany({});

  // 9. Notifications
  const notifResult = await Notification.deleteMany({});

  // 10. Non-Admin Student / Test User Accounts (keep admin & superadmin)
  const userResult = await User.deleteMany({
    role: { $nin: ['admin', 'superadmin'] },
    email: { $nin: ['admin@gmail.com', 'admin@aspier.org'] }
  });

  // Verification Audit
  const preservedSupervisors = await Supervisor.countDocuments();
  const preservedScholars = await Scholar.countDocuments();
  const preservedFoundingMembers = await FoundingMember.countDocuments();
  const preservedWings = await Wing.countDocuments();
  const preservedCourses = await Course.find().select('title slug price');
  const preservedAdmins = await User.find({ role: { $in: ['admin', 'superadmin'] } }).select('email role');

  const auditReport = {
    deletedCounts: {
      news: newsResult.deletedCount,
      researchProjects: researchResult.deletedCount,
      wingsUpdated: wingUpdateResult.modifiedCount,
      messagesAndInquiries: messageResult.deletedCount,
      researchApplications: researchAppResult.deletedCount,
      membershipApplications: memberAppResult.deletedCount,
      dummyCourses: courseResult.deletedCount,
      enrollments: enrollmentResult.deletedCount,
      payments: paymentResult.deletedCount,
      certificates: certResult.deletedCount,
      notifications: notifResult.deletedCount,
      dummyStudentsAndUsers: userResult.deletedCount
    },
    preservedAudit: {
      supervisorsCount: preservedSupervisors,
      scholarsCount: preservedScholars,
      foundingMembersCount: preservedFoundingMembers,
      academicWingsCount: preservedWings,
      courses: preservedCourses,
      admins: preservedAdmins
    }
  };

  console.log('\n=================== PURGE AUDIT REPORT ===================');
  console.table(auditReport.deletedCounts);
  console.log('Preserved Supervisors:', preservedSupervisors);
  console.log('Preserved Young Scholars:', preservedScholars);
  console.log('Preserved Founding Members:', preservedFoundingMembers);
  console.log('Preserved Academic Wings:', preservedWings);
  console.log('Preserved Courses:', preservedCourses.map(c => c.title));
  console.log('Preserved Admins:', preservedAdmins.map(a => `${a.email} (${a.role})`));
  console.log('==========================================================\n');

  return auditReport;
}

if (process.argv[1] && process.argv[1].endsWith('fullProductionPurge.ts')) {
  runFullProductionPurge()
    .then(() => {
      console.log('[Purge] Completed.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('[Purge] Failed:', err);
      process.exit(1);
    });
}
