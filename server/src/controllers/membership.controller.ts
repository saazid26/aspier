import { randomBytes, timingSafeEqual } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';
import { connectDatabase } from '../config/db.js';
import { z } from 'zod';
import MembershipApplication from '../models/MembershipApplication.js';
import ResearchApplication from '../models/ResearchApplication.js';
import Setting from '../models/Setting.js';
import Supervisor from '../models/Supervisor.js';
import Scholar from '../models/Scholar.js';
import Wing from '../models/Wing.js';
import AuditLog from '../models/AuditLog.js';
import { recordAudit } from '../services/audit.service.js';
import { HttpError } from '../middleware/error.js';
import type { AuthRequest } from '../middleware/auth.js';
import { sha256 } from '../utils/crypto.js';
import { saveMedia } from '../services/media.service.js';
import MediaAsset from '../models/MediaAsset.js';
import { slugify } from '../utils/slug.js';
import { decrypt, encrypt } from '../utils/crypto.js';
import User from '../models/User.js';
import { hashPassword, passwordStrength } from '../services/password.service.js';
import Notification from '../models/Notification.js';
import { notifyAdmins, notifyMember } from '../services/notification.service.js';
import { sendEmail } from '../services/email.service.js';
import { createTotpQr, createTotpSecret, verifyTotp } from '../services/totp.service.js';
import { getFallbackApplications, addOrUpdateFallbackSupervisor, addOrUpdateFallbackScholar } from '../utils/fallbackData.js';
import { env } from '../config/env.js';

const initialSchema = z.preprocess((value) => {
  if (!value || typeof value !== 'object') return value;
  const body = value as Record<string, unknown>;
  return {
    ...body,
    role: body.role ?? (body.category === 'teammate' ? 'supervisor' : body.category),
    wing: body.wing ?? body.wingInterest
  };
}, z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().min(7).max(30),
  wing: z.string().trim().min(1).max(160),
  role: z.enum(['supervisor', 'youngScholar']),
  statement: z.string().trim().max(3000).optional()
}));

const profileSchema = z.object({
  accessCode: z.string().min(16).max(100),
  name: z.string().trim().min(2).max(120),
  designation: z.string().trim().min(2).max(160),
  institution: z.string().trim().min(2).max(200),
  wing: z.string().trim().max(160).optional(),
  educationalBackground: z.string().trim().min(2).max(3000),
  googleScholar: z.string().trim().max(500).optional().default(''),
  researchGate: z.string().trim().max(500).optional().default(''),
  orcid: z.string().trim().max(200).optional().default(''),
  linkedin: z.string().trim().max(500).optional().default(''),
  website: z.string().trim().max(500).optional().default(''),
  github: z.string().trim().max(500).optional().default(''),
  twitter: z.string().trim().max(500).optional().default(''),
  presentAddress: z.string().trim().max(500).optional().default(''),
  permanentAddress: z.string().trim().max(500).optional().default(''),
  bio: z.string().trim().min(20).max(5000),
  researchDomains: z.array(z.string().trim().min(1).max(100)).min(1).max(30),
  photo: z.string().trim().min(1).max(1000)
});

function parseBody<T extends z.ZodTypeAny>(schema: T, body: unknown): z.infer<T> {
  const parsed = schema.safeParse(body);
  if (!parsed.success) throw new HttpError(400, parsed.error.issues.map((issue) => issue.message).join('. '));
  return parsed.data;
}

async function findWithCode(id: string, accessCode: string) {
  const application = await MembershipApplication.findOne({
    $or: [
      ...( /^[a-f\d]{24}$/i.test(id) ? [{ _id: id }] : []),
      { publicApplicationId: id.toUpperCase() }
    ]
  }).select('+accessCodeHash +activationCodeEncrypted');
  if (!application) throw new HttpError(404, 'Application not found or access code is invalid');
  if (application.signupFlow) throw new HttpError(401, 'Sign-up applications must use application ID, access code, and authenticator verification');
  const expected = Buffer.from(application.accessCodeHash, 'hex');
  const supplied = Buffer.from(sha256(accessCode), 'hex');
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) throw new HttpError(404, 'Application not found or access code is invalid');
  return application;
}

const applicantSignupSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().min(7).max(30),
  password: z.string().min(8).max(128),
  role: z.enum(['supervisor', 'youngScholar']),
  wing: z.string().trim().min(1).max(160),
  institution: z.string().trim().min(2).max(200),
  academicStatus: z.string().trim().min(2).max(120)
});

export async function submitApplicantSignup(req: Request, res: Response, next: NextFunction) {
  try {
    const data = parseBody(applicantSignupSchema, req.body);
    const passwordErrors = passwordStrength(data.password);
    if (passwordErrors.length) throw new HttpError(400, passwordErrors.join('. '));
    const email = data.email.toLowerCase();
    if (await MembershipApplication.exists({ email, signupFlow: true, status: { $ne: 'rejected' } })) {
      throw new HttpError(409, 'A sign-up request for this email is already in review or approved');
    }
    const application = await MembershipApplication.create({
      name: data.name,
      email,
      phone: data.phone,
      institution: data.institution,
      academicStatus: data.academicStatus,
      wing: data.wing,
      wingInterest: data.wing,
      category: data.role,
      role: data.role,
      signupFlow: true,
      signupPasswordHash: await hashPassword(data.password),
      accessCodeHash: sha256(randomBytes(24).toString('base64url')),
      status: 'signup_pending'
    });
    await notifyAdmins({
      title: 'New applicant sign-up',
      body: `${application.name} registered as ${application.role === 'youngScholar' ? 'Young Scholar' : 'Supervisor'} for ${application.wingInterest || application.wing}.`,
      category: 'applicant-signup',
      link: '/admin/membership-applications',
      applicantName: application.name,
      applicantEmail: application.email,
      referenceId: String(application._id)
    });
    res.status(201).json({ success: true, data: { status: application.status, createdAt: application.createdAt } });
  } catch (error) {
    next(error);
  }
}

export async function applicantLoginWithTwoFactor(req: Request, res: Response, next: NextFunction) {
  try {
    const data = parseBody(z.object({
      applicationId: z.string().trim().min(1).max(80),
      accessCode: z.string().trim().min(8).max(160),
      totpCode: z.string().trim().regex(/^\d{6}$/).optional()
    }), req.body);
    const application = await MembershipApplication.findOne({ publicApplicationId: data.applicationId.toUpperCase(), signupFlow: true })
      .select('+accessCodeHash +twoFactorSecretEncrypted');
    if (!application || application.status !== 'signup_approved') throw new HttpError(401, 'Application ID or private access code is invalid');
    const expected = Buffer.from(application.accessCodeHash, 'hex');
    const supplied = Buffer.from(sha256(data.accessCode), 'hex');
    if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) throw new HttpError(401, 'Application ID or private access code is invalid');
    if (application.twoFactorLockedUntil && application.twoFactorLockedUntil > new Date()) {
      throw new HttpError(429, 'Too many authenticator attempts. Try again later.');
    }

    if (!application.twoFactorEnabled) {
      if (!application.twoFactorSecretEncrypted) {
        const setup = await createTotpSecret(application.email);
        application.twoFactorSecretEncrypted = setup.secretEncrypted;
        await application.save();
        return res.json({ success: true, data: { requiresSetup: true, qrDataUrl: setup.qrDataUrl, manualKey: setup.secret } });
      }
      if (!data.totpCode) {
        const manualKey = decrypt(application.twoFactorSecretEncrypted);
        const qrDataUrl = await createTotpQr(application.email, manualKey);
        return res.json({ success: true, data: { requiresSetup: true, qrDataUrl, manualKey } });
      }
      if (!verifyTotp(data.totpCode, application.twoFactorSecretEncrypted)) {
        application.twoFactorFailedAttempts += 1;
        const locked = application.twoFactorFailedAttempts >= 5;
        if (locked) {
          application.twoFactorFailedAttempts = 0;
          application.twoFactorLockedUntil = new Date(Date.now() + 15 * 60 * 1000);
        } else application.twoFactorLockedUntil = undefined;
        await application.save();
        throw new HttpError(locked ? 429 : 401, locked ? 'Too many authenticator attempts. Try again later.' : 'Invalid authenticator code');
      }
      application.twoFactorEnabled = true;
      application.twoFactorFailedAttempts = 0;
      application.twoFactorLockedUntil = undefined;
      await application.save();
    } else {
      if (!data.totpCode) return res.json({ success: true, data: { requiresOtp: true } });
      if (!verifyTotp(data.totpCode, application.twoFactorSecretEncrypted || '')) {
        application.twoFactorFailedAttempts += 1;
        const locked = application.twoFactorFailedAttempts >= 5;
        if (locked) {
          application.twoFactorFailedAttempts = 0;
          application.twoFactorLockedUntil = new Date(Date.now() + 15 * 60 * 1000);
        } else application.twoFactorLockedUntil = undefined;
        await application.save();
        throw new HttpError(locked ? 429 : 401, locked ? 'Too many authenticator attempts. Try again later.' : 'Invalid authenticator code');
      }
      application.twoFactorFailedAttempts = 0;
      application.twoFactorLockedUntil = undefined;
      await application.save();
    }

    const notifications = await Notification.find({ applicationId: application._id, audience: 'member' })
      .sort({ createdAt: -1 }).lean();
    res.json({
      success: true,
      data: {
        authenticated: true,
        applicationId: application.publicApplicationId,
        name: application.name,
        email: application.email,
        role: application.role,
        wing: application.wingInterest,
        status: application.status,
        notifications
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function submitInitialApplication(req: Request, res: Response, next: NextFunction) {
  try {
    const data = parseBody(initialSchema, req.body);
    const accessCode = randomBytes(24).toString('base64url');
    let application: any = null;

    if (mongoose.connection.readyState !== 1) {
      await connectDatabase();
    }
    if (mongoose.connection.readyState === 1) {
      try {
        application = await MembershipApplication.create({
          ...data,
          email: data.email.toLowerCase(),
          category: data.role,
          role: data.role,
          wing: data.wing,
          wingInterest: data.wing,
          accessCodeHash: sha256(accessCode)
        });
      } catch (dbErr) {
        console.warn('[membership] DB create failed, saving to resilient fallback store:', dbErr);
      }
    }

    if (!application) {
      const generatedId = new mongoose.Types.ObjectId().toString();
      application = {
        _id: generatedId,
        id: generatedId,
        name: data.name,
        email: data.email.toLowerCase(),
        phone: data.phone,
        wing: data.wing,
        wingInterest: data.wing,
        category: data.role,
        role: data.role,
        statement: data.statement,
        accessCodeHash: sha256(accessCode),
        status: 'initial_pending',
        createdAt: new Date().toISOString()
      };
      getFallbackApplications().unshift(application);
    }

    try {
      await notifyAdmins({
        title: 'New membership application',
        body: `${application.name} applied as ${application.role === 'youngScholar' ? 'Young Scholar' : 'Supervisor'} for ${application.wingInterest || application.wing}.`,
        category: 'initial-application',
        link: '/admin/membership-applications',
        applicantName: application.name,
        applicantEmail: application.email,
        referenceId: String(application.id || application._id)
      });
    } catch {
      // ignore
    }

    res.status(201).json({
      success: true,
      data: { applicationId: application.id || application._id, accessCode, name: application.name, status: application.status }
    });
  } catch (error) {
    next(error);
  }
}

export async function membershipPortal(req: Request, res: Response, next: NextFunction) {
  try {
    const { applicationId, accessCode } = parseBody(z.object({
      applicationId: z.string().min(1),
      accessCode: z.string().min(16).max(100)
    }), req.body);
    const application = await findWithCode(applicationId, accessCode);
    const notifications = (await Notification.find({ applicationId: application._id, audience: 'member' }).select('+secretPayloadEncrypted').sort({ createdAt: -1 }).lean()).map(({ secretPayloadEncrypted, ...notice }) => ({
      ...notice,
      ...(secretPayloadEncrypted && !application.activationCodeUsedAt ? { activationCode: decrypt(secretPayloadEncrypted) } : {})
    }));
    const activationCode = application.activationCodeEncrypted && !application.activationCodeUsedAt
      ? decrypt(application.activationCodeEncrypted)
      : undefined;
    res.json({
      success: true,
      data: {
        applicationId: application.publicApplicationId || application.id,
        name: application.name,
        email: application.email,
        category: application.category,
        role: application.role || (application.category === 'teammate' ? 'supervisor' : application.category),
        wing: application.wing || application.wingInterest,
        wingInterest: application.wingInterest,
        status: application.status,
        designation: application.designation,
        institution: application.institution,
        educationalBackground: application.educationalBackground,
        bio: application.bio,
        researchDomains: application.researchDomains || [],
        photo: application.photo,
        googleScholar: application.googleScholar,
        researchGate: application.researchGate,
        orcid: application.orcid,
        linkedin: application.linkedin,
        website: (application as any).website,
        github: (application as any).github,
        twitter: (application as any).twitter,
        publishedProfileId: application.publishedProfileId,
        publishedProfileType: application.publishedProfileType,
        activationCode,
        notifications
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function requestMembershipAccessCode(req: Request, res: Response, next: NextFunction) {
  try {
    const { applicationId, email } = parseBody(z.object({
      applicationId: z.string().trim().optional().or(z.literal('')),
      email: z.string().trim().email().max(254)
    }), req.body);

    const memQuery: any = { email: email.toLowerCase() };
    if (applicationId) {
      memQuery.$or = [
        ...( /^[a-f\d]{24}$/i.test(applicationId) ? [{ _id: applicationId }] : []),
        { publicApplicationId: applicationId.toUpperCase() }
      ];
    }
    const application = await MembershipApplication.findOne(memQuery);
    if (application) {
      const accessCode = randomBytes(24).toString('base64url');
      await MembershipApplication.updateOne({ _id: application._id }, { $set: { accessCodeHash: sha256(accessCode) } });
      await notifyAdmins({
        title: 'Applicant access code reset',
        body: `Applicant ${application.name} (${application.email}) requested access recovery. New private access code: ${accessCode}`,
        category: 'applicant-access-code',
        link: '/admin/membership-applications'
      });
    } else {
      const researchQuery: any = { email: email.toLowerCase() };
      if (applicationId) {
        researchQuery.$or = [
          ...( /^[a-f\d]{24}$/i.test(applicationId) ? [{ _id: applicationId }] : []),
          { applicationId: applicationId.toUpperCase() }
        ];
      }
      const researchApp = await ResearchApplication.findOne(researchQuery);
      if (researchApp) {
        const accessCode = randomBytes(24).toString('base64url');
        await ResearchApplication.updateOne({ _id: researchApp._id }, { $set: { accessCodeHash: sha256(accessCode) } });
        await notifyAdmins({
          title: 'Research Mate access code reset',
          body: `Research Mate ${researchApp.name} (${researchApp.email}) requested access recovery. New private access code: ${accessCode}`,
          category: 'applicant-access-code',
          link: '/admin/research-applications'
        });
      }
    }
    res.json({ success: true, message: 'If the application details match, the access recovery request is available to an administrator.' });
  } catch (error) {
    next(error);
  }
}

export async function uploadMembershipPhoto(req: Request, res: Response, next: NextFunction) {
  try {
    const accessCode = req.header('x-application-code') || '';
    const application = await findWithCode(String(req.params.id || ''), accessCode);
    if (application.status !== 'membership_pending') throw new HttpError(409, 'Profile photo upload is available after initial approval');
    if (!req.file) throw new HttpError(400, 'A profile image is required');
    const media = await saveMedia(req.file, undefined, application.id);
    res.status(201).json({ success: true, data: { url: media.url } });
  } catch (error) {
    next(error);
  }
}

export async function submitMembershipProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const data = parseBody(profileSchema, req.body);
    const application = await findWithCode(String(req.params.id || ''), data.accessCode);
    if (!['membership_pending', 'final_pending'].includes(application.status)) {
      throw new HttpError(409, 'This application is not accepting a membership profile');
    }
    const isSupervisor = application.role === 'supervisor' || application.category === 'teammate' || application.category === 'supervisor';
    const roleTitle = isSupervisor ? 'Research Supervisor' : 'Young Scholar';

    const isDataUrl = data.photo.startsWith('data:image/');
    if (!isDataUrl && !(await MediaAsset.exists({ url: data.photo, membershipApplicationId: application._id }))) {
      throw new HttpError(400, 'Upload your profile picture using the application photo field');
    }

    const assignedWing = data.wing || application.wing || application.wingInterest;
    let wingDoc: any = null;
    try {
      wingDoc = await Wing.findOne({ $or: [{ slug: assignedWing }, { name: assignedWing }] });
    } catch {
      // ignore
    }

    const appIdStr = String(application.id || application._id);
    const slug = `${slugify(data.name) || 'aspier-member'}-${appIdStr.slice(-6)}`;

    let profileId: any = application.publishedProfileId;

    if (isSupervisor) {
      let supervisor: any = null;
      if (profileId) {
        supervisor = await Supervisor.findById(profileId);
      }
      if (!supervisor && application.email) {
        supervisor = await Supervisor.findOne({ email: application.email.toLowerCase() });
      }
      if (!supervisor) {
        supervisor = await Supervisor.findOne({ slug });
      }

      const supervisorPayload = {
        name: data.name,
        slug: supervisor ? supervisor.slug : slug,
        designation: data.designation,
        affiliation: data.institution,
        wingIds: wingDoc ? [wingDoc._id] : [],
        bio: data.bio,
        photo: data.photo,
        email: application.email.toLowerCase(),
        presentAddress: data.presentAddress || '',
        permanentAddress: data.permanentAddress || '',
        educationalBackground: data.educationalBackground,
        googleScholar: data.googleScholar || '',
        researchGate: data.researchGate || '',
        orcid: data.orcid || '',
        linkedin: data.linkedin || '',
        twitter: data.twitter || '',
        github: data.github || '',
        website: data.website || '',
        researchInterests: data.researchDomains,
        socialLinks: {
          googleScholar: data.googleScholar || '',
          researchGate: data.researchGate || '',
          orcid: data.orcid || '',
          linkedin: data.linkedin || '',
          twitter: data.twitter || '',
          github: data.github || '',
          website: data.website || ''
        },
        isPublished: true,
        order: 0,
        sampleData: false
      };

      if (supervisor) {
        supervisor.set(supervisorPayload);
        await supervisor.save();
        profileId = supervisor._id;
      } else {
        const created = await Supervisor.create(supervisorPayload);
        profileId = created._id;
      }
      addOrUpdateFallbackSupervisor({ ...supervisorPayload, _id: String(profileId), id: String(profileId) });
    } else {
      let scholar: any = null;
      if (profileId) {
        scholar = await Scholar.findById(profileId);
      }
      if (!scholar) {
        scholar = await Scholar.findOne({ slug });
      }

      const scholarPayload = {
        name: data.name,
        slug: scholar ? scholar.slug : slug,
        cohort: String(new Date().getFullYear()),
        wingId: wingDoc?._id,
        bio: data.bio,
        photo: data.photo,
        presentAddress: data.presentAddress || '',
        permanentAddress: data.permanentAddress || '',
        designation: data.designation,
        affiliation: data.institution,
        educationalBackground: data.educationalBackground,
        googleScholar: data.googleScholar || '',
        researchGate: data.researchGate || '',
        orcid: data.orcid || '',
        linkedin: data.linkedin || '',
        twitter: data.twitter || '',
        github: data.github || '',
        website: data.website || '',
        researchTopics: data.researchDomains,
        socialLinks: {
          googleScholar: data.googleScholar || '',
          researchGate: data.researchGate || '',
          orcid: data.orcid || '',
          linkedin: data.linkedin || '',
          twitter: data.twitter || '',
          github: data.github || '',
          website: data.website || ''
        },
        isPublished: true,
        order: 0,
        sampleData: false
      };

      if (scholar) {
        scholar.set(scholarPayload);
        await scholar.save();
        profileId = scholar._id;
      } else {
        const created = await Scholar.create(scholarPayload);
        profileId = created._id;
      }
      addOrUpdateFallbackScholar({ ...scholarPayload, _id: String(profileId), id: String(profileId) });
    }

    const activationCode = randomBytes(18).toString('base64url');
    application.set({
      name: data.name,
      presentAddress: data.presentAddress || '',
      permanentAddress: data.permanentAddress || '',
      designation: data.designation,
      institution: data.institution,
      wing: assignedWing,
      wingInterest: assignedWing,
      educationalBackground: data.educationalBackground,
      googleScholar: data.googleScholar || '',
      researchGate: data.researchGate || '',
      orcid: data.orcid || '',
      linkedin: data.linkedin || '',
      website: data.website || '',
      github: data.github || '',
      twitter: data.twitter || '',
      bio: data.bio,
      researchDomains: data.researchDomains,
      photo: data.photo,
      membershipFee: 0,
      status: 'completed',
      publishedProfileId: profileId,
      publishedProfileType: isSupervisor ? 'supervisor' : 'scholar',
      activationCodeHash: sha256(activationCode),
      activationCodeEncrypted: encrypt(activationCode)
    });
    await application.save();

    await notifyAdmins({
      title: `${roleTitle} profile auto-published to Team`,
      body: `${application.name} submitted their Stage 2 official profile and is now live on the public Team page.`,
      category: 'final-application',
      link: '/admin/membership-applications',
      applicantName: application.name,
      applicantEmail: application.email,
      referenceId: String(application._id)
    });
    await notifyMember({
      applicationId: application._id,
      title: 'Welcome to the ASPIER Team!',
      body: `Your official ${roleTitle} profile has been published to the ASPIER Team page. Joining ASPIER is completely fee-free across all stages.`,
      category: 'membership-published',
      link: '/team',
      secretPayload: activationCode
    });

    res.status(201).json({
      success: true,
      data: {
        applicationId: application.id || application._id,
        status: application.status,
        profileId,
        profileType: application.publishedProfileType,
        profileSlug: slug
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function submitMembershipPayment(_req: Request, _res: Response, next: NextFunction) {
  return next(new HttpError(403, 'ASPIER membership (Supervisor & Young Scholar) is completely fee-free across all stages. No payment is accepted.'));
}

export async function adminMembershipApplications(req: AuthRequest, res: Response) {
  try {
    const status = req.query.status;
    let applications: any[] = [];
    if (mongoose.connection.readyState !== 1) {
      await connectDatabase();
    }
    if (mongoose.connection.readyState === 1) {
      try {
        const filter = typeof status === 'string' && status !== 'all' ? { status } : {};
        applications = await MembershipApplication.find(filter).sort({ createdAt: -1 }).lean();
      } catch (err) {
        console.warn('[membership] admin find error:', err);
      }
    }
    const inMem = getFallbackApplications();
    const filterStatus = typeof status === 'string' ? status : 'all';
    const filteredInMem = filterStatus === 'all' || !filterStatus
      ? inMem
      : inMem.filter((a: any) => a.status === filterStatus);

    const combined = [...(applications || [])];
    for (const item of filteredInMem) {
      if (!combined.some(c => String(c._id) === String(item._id) || c.email === item.email)) {
        combined.push(item);
      }
    }
    res.json({ success: true, data: combined });
  } catch {
    res.json({ success: true, data: getFallbackApplications() });
  }
}

export async function approveApplicantSignup(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { applicationId, accessCode } = parseBody(z.object({
      applicationId: z.string().trim().regex(/^ASPIER-\d{4}-[A-Z0-9]{4,10}$/i),
      accessCode: z.string().trim().min(16).max(160)
    }), req.body);
    const application = await MembershipApplication.findOne({ _id: req.params.id, signupFlow: true, status: 'signup_pending' });
    if (!application) throw new HttpError(404, 'Pending applicant sign-up not found');
    const assignedId = applicationId.toUpperCase();
    if (await MembershipApplication.exists({ publicApplicationId: assignedId, _id: { $ne: application._id } })) {
      throw new HttpError(409, 'That Application ID is already assigned');
    }
    application.publicApplicationId = assignedId;
    application.accessCodeHash = sha256(accessCode);
    application.status = 'signup_approved';
    application.reviewedBy = req.user._id;
    application.reviewedAt = new Date();
    await application.save();

    const loginUrl = new URL('/join/portal', env.CLIENT_URL).toString();
    await notifyAdmins({
      title: 'Applicant credentials ready to share',
      body: `${application.name} (${application.email}) was approved. Application ID: ${assignedId}; Private Access Code: ${accessCode}; Applicant portal: ${loginUrl}`,
      category: 'applicant-credentials',
      link: '/admin/membership-applications'
    });
    await notifyMember({
      applicationId: application._id,
      title: 'Applicant registration approved',
      body: `Your registration has been approved. Your Application ID and private access code are available in the Admin UI; contact ASPIER to receive them securely.`,
      category: 'applicant-signup-approved',
      link: '/join/portal'
    });
    await sendEmail({
      to: application.email,
      subject: 'ASPIER Applicant Registration Approved',
      html: `<p>Hello ${application.name},</p><p>Your ASPIER fellowship/membership applicant registration has been approved.</p><p><strong>Application ID:</strong> ${assignedId}<br/><strong>Private Access Code:</strong> ${accessCode}</p><p>You can access your portal here: <a href="${loginUrl}">${loginUrl}</a></p>`
    });
    await recordAudit({
      req,
      action: 'approve_applicant_signup',
      description: `Approved applicant signup for ${application.name} (${application.email})`,
      resource: 'MembershipApplication',
      resourceId: String(application.id || application._id)
    });
    res.json({
      success: true,
      data: {
        applicationId: assignedId,
        accessCode,
        email: application.email,
        loginUrl,
        confirmation: `Applicant approved. Application ID: ${assignedId}; Private Access Code: ${accessCode}; Applicant portal: ${loginUrl}`
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function approveInitialApplication(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const application = await MembershipApplication.findById(req.params.id);
    if (!application) throw new HttpError(404, 'Application not found');
    if (application.status !== 'initial_pending') throw new HttpError(409, 'Application is not awaiting initial review');
    application.status = 'membership_pending';
    application.membershipFee = 0;
    application.paymentBkashNumber = undefined;
    application.paymentNagadNumber = undefined;
    application.paymentInstructions = undefined;
    application.reviewedBy = req.user._id;
    application.reviewedAt = new Date();
    await application.save();
    const roleTitle = application.role === 'youngScholar' ? 'Young Scholar' : 'Supervisor';
    const body = `Congratulations ${application.name}, your ${roleTitle} application for ${application.wingInterest} is approved. Joining ASPIER is completely free across all stages; complete Stage 2 by submitting your academic profile and photo in the applicant portal.`;
    await notifyMember({
      applicationId: application._id,
      title: 'Your ASPIER application is approved',
      body,
      category: 'initial-approval',
      link: '/join/portal'
    });
    await sendEmail({
      to: application.email,
      subject: 'Your ASPIER Application Has Been Approved',
      html: `<p>Hello ${application.name},</p><p>${body}</p><p>Log in to your applicant portal using your Application ID and Access Code to proceed.</p>`
    });
    await recordAudit({
      req,
      action: 'approve_membership_application',
      description: `Approved Stage 1 ${roleTitle} application for ${application.name} (${application.email})`,
      resource: 'MembershipApplication',
      resourceId: String(application.id || application._id)
    });
    res.json({ success: true, data: { applicationId: application.id, status: application.status } });
  } catch (error) {
    next(error);
  }
}

export async function publishMembershipApplication(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const applicationId = String(req.params.id || '');
    const candidate = await MembershipApplication.findById(applicationId);
    if (!candidate) throw new HttpError(404, 'Application not found');
    const isSupervisor = candidate.role === 'supervisor' || candidate.category === 'teammate';
    if (['completed', 'active_member', 'published'].includes(candidate.status) && candidate.publishedProfileId) {
      const activationCode = candidate.activationCodeEncrypted
        ? decrypt(candidate.activationCodeEncrypted)
        : randomBytes(18).toString('base64url');
      const publishMsg = `Your ${isSupervisor ? 'Supervisor' : 'Young Scholar'} profile is published. Joining ASPIER is completely fee-free. Use this one-time Secret Activation Code to register your account: ${activationCode}`;
      await notifyMember({
        applicationId: candidate._id,
        ...(candidate.memberUserId ? { userId: candidate.memberUserId } : {}),
        title: 'Your ASPIER membership is active',
        body: publishMsg,
        category: 'membership-published',
        link: '/login',
        secretPayload: activationCode
      });
      return res.json({
        success: true,
        data: {
          applicationId: candidate.id,
          status: candidate.status,
          profileId: candidate.publishedProfileId,
          profileType: candidate.publishedProfileType
        }
      });
    }
    if (!['final_pending', 'verification_pending'].includes(candidate.status)) {
      throw new HttpError(409, 'Application is not awaiting profile review');
    }
    const previousStatus = candidate.status;
    const application = await MembershipApplication.findOneAndUpdate(
      { _id: applicationId, status: { $in: ['final_pending', 'verification_pending'] } },
      { $set: { status: 'publishing', reviewedBy: req.user._id, reviewedAt: new Date() } },
      { new: true }
    );
    if (!application) {
      throw new HttpError(409, 'Application is not awaiting profile review');
    }
    const activationCode = randomBytes(18).toString('base64url');
    application.activationCodeHash = sha256(activationCode);
    application.activationCodeEncrypted = encrypt(activationCode);
    const slug = `${slugify(application.name) || 'aspier-member'}-${application.id.slice(-6)}`;
    const wing = await Wing.findOne({ $or: [{ slug: application.wingInterest }, { name: application.wingInterest }] });
    let profileId: typeof application._id | undefined;
    try {
      if (isSupervisor) {
        const profile = await Supervisor.create({
          name: application.name,
          slug,
          designation: application.designation,
          affiliation: application.institution,
          wingIds: wing ? [wing._id] : [],
          bio: application.bio,
          photo: application.photo,
          email: application.email,
          presentAddress: application.presentAddress,
          permanentAddress: application.permanentAddress,
          educationalBackground: application.educationalBackground,
          googleScholar: application.googleScholar,
          researchGate: application.researchGate,
          orcid: application.orcid,
          linkedin: application.linkedin,
          researchInterests: application.researchDomains,
          socialLinks: { linkedin: application.linkedin }
        });
        profileId = profile._id;
        application.publishedProfileType = 'supervisor';
      } else {
        const profile = await Scholar.create({
          name: application.name,
          slug,
          cohort: String(new Date().getFullYear()),
          wingId: wing?._id,
          bio: application.bio,
          photo: application.photo,
          presentAddress: application.presentAddress,
          permanentAddress: application.permanentAddress,
          designation: application.designation,
          affiliation: application.institution,
          educationalBackground: application.educationalBackground,
          googleScholar: application.googleScholar,
          researchGate: application.researchGate,
          orcid: application.orcid,
          linkedin: application.linkedin,
          researchTopics: application.researchDomains,
          socialLinks: { linkedin: application.linkedin }
        });
        profileId = profile._id;
        application.publishedProfileType = 'scholar';
      }

      application.status = 'published';
      application.publishedProfileId = profileId;
      application.reviewedBy = req.user._id;
      application.reviewedAt = new Date();
      await application.save();
    } catch (error) {
      if (profileId) {
        if (isSupervisor) await Supervisor.deleteOne({ _id: profileId });
        else await Scholar.deleteOne({ _id: profileId });
      }
      await MembershipApplication.updateOne(
        { _id: application._id, status: 'publishing' },
        { $set: { status: previousStatus }, $unset: { reviewedBy: 1, reviewedAt: 1 } }
      );
      throw error;
    }
    await recordAudit({
      req,
      action: 'publish_membership_application',
      description: `Published Stage 2 ${isSupervisor ? 'Supervisor' : 'Young Scholar'} profile for ${candidate.name || application.name}`,
      resource: 'MembershipApplication',
      resourceId: String(application.id || application._id)
    });
    if (application.memberUserId) await User.updateOne({ _id: application.memberUserId }, { $set: { isActive: true } });
    const publishMsg = `Your ${isSupervisor ? 'Supervisor' : 'Young Scholar'} profile is published. Joining ASPIER is completely fee-free. Use this one-time Secret Activation Code to register your account: ${activationCode}`;
    await notifyMember({
      applicationId: application._id,
      ...(application.memberUserId ? { userId: application.memberUserId } : {}),
      title: 'Your ASPIER membership is active',
      body: publishMsg,
      category: 'membership-published',
      link: '/login',
      secretPayload: activationCode
    });
    await sendEmail({
      to: application.email,
      subject: 'Your ASPIER Membership is Now Active!',
      html: `<p>Hello ${application.name},</p><p>${publishMsg}</p><p><strong>Secret Activation Code:</strong></p><p style="font-family: monospace; font-size: 18px; font-weight: bold; background: #f3f4f6; padding: 12px; border-radius: 6px;">${activationCode}</p><p>Visit <a href="${env.CLIENT_URL}/login">${env.CLIENT_URL}/login</a> and use your activation code to finish setting up your account.</p>`
    });
    res.json({ success: true, data: { applicationId: application.id, status: application.status, profileId, profileType: application.publishedProfileType } });
  } catch (error) {
    next(error);
  }
}

export async function activateMemberAccount(req: Request, res: Response, next: NextFunction) {
    try {
      const data = parseBody(z.object({
        role: z.enum(['supervisor', 'youngScholar']),
        activationCode: z.string().min(12).max(100),
        email: z.string().trim().email().max(254).refine((email) => email.toLowerCase().endsWith('@gmail.com'), 'Use a Gmail address ending in @gmail.com'),
        password: z.string().min(8).max(128),
        confirmPassword: z.string().min(8).max(128)
      }).refine((body) => body.password === body.confirmPassword, { message: 'Passwords do not match' }), req.body);
      const passwordErrors = passwordStrength(data.password);
      if (passwordErrors.length) throw new HttpError(400, passwordErrors.join('. '));
      const application = await MembershipApplication.findOne({
        activationCodeHash: sha256(data.activationCode),
        activationCodeUsedAt: { $exists: false },
        status: { $in: ['published', 'completed', 'active_member'] },
        role: data.role
      });
      if (!application) throw new HttpError(400, 'Secret activation code is invalid, already used, or does not match the selected role');
      const email = data.email.toLowerCase();
      if (await User.exists({ email })) throw new HttpError(409, 'This Gmail address already has an account');
      const claim = await MembershipApplication.findOneAndUpdate(
        { _id: application._id, activationCodeHash: sha256(data.activationCode), activationCodeUsedAt: { $exists: false } },
        { $set: { activationCodeUsedAt: new Date() } },
        { new: true }
      );
      if (!claim) throw new HttpError(409, 'Secret activation code has already been used');
      let createdUserId: string | undefined;
      try {
        const user = await User.create({
          name: application.name,
          email,
          passwordHash: await hashPassword(data.password),
          role: data.role,
          isActive: true
        });
        createdUserId = String(user._id);
        application.memberUserId = user._id;
        await application.save();
        await Notification.updateMany({ applicationId: application._id, audience: 'member' }, { $set: { userId: user._id } });
        res.status(201).json({ success: true, data: { id: user.id, name: user.name, email: user.email, role: user.role } });
      } catch (error) {
        if (createdUserId) await User.deleteOne({ _id: createdUserId });
        await MembershipApplication.updateOne({ _id: application._id, activationCodeUsedAt: claim.activationCodeUsedAt }, { $unset: { activationCodeUsedAt: 1 } });
        throw error;
      }
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 11000) next(new HttpError(409, 'This Gmail address already has an account'));
      else next(error);
    }
  }

export async function markMembershipNotificationRead(req: Request, res: Response, next: NextFunction) {
    try {
      const accessCode = String(req.body.accessCode || '');
      const application = await findWithCode(String(req.params.id || ''), accessCode);
      await Notification.updateOne({ _id: req.params.notificationId, applicationId: application._id, audience: 'member' }, { $set: { readAt: new Date() } });
      res.json({ success: true });
    } catch (error) {
      next(error);
  }
}

export async function deleteMembershipApplication(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = String(req.params.id || '');
    if (mongoose.connection.readyState !== 1) {
      await connectDatabase();
    }
    if (mongoose.connection.readyState === 1) {
      await MembershipApplication.findByIdAndDelete(id).catch(() => null);
    }
    const inMem = getFallbackApplications();
    const idx = inMem.findIndex(a => String(a._id) === id || a.id === id);
    if (idx !== -1) inMem.splice(idx, 1);
    await recordAudit({
      req,
      action: 'delete_membership_application',
      description: `Deleted membership application ${id}`,
      resource: 'MembershipApplication',
      resourceId: id
    });
    res.json({ success: true, message: 'Application deleted' });
  } catch (error) {
    next(error);
  }
}
