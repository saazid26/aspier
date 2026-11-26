import type { Request, Response, NextFunction } from 'express';
import { randomBytes } from 'node:crypto';
import mongoose from 'mongoose';
import { connectDatabase } from '../config/db.js';
import type { AuthRequest } from '../middleware/auth.js';
import { HttpError } from '../middleware/error.js';
import MembershipApplication from '../models/MembershipApplication.js';
import Supervisor from '../models/Supervisor.js';
import Scholar from '../models/Scholar.js';
import User from '../models/User.js';
import AuditLog from '../models/AuditLog.js';
import { recordAudit } from '../services/audit.service.js';
import { notifyAdmins, notifyMember } from '../services/notification.service.js';
import { sendEmail } from '../services/email.service.js';
import { hashPassword, passwordStrength } from '../services/password.service.js';
import { saveMedia } from '../services/media.service.js';
import { slugify } from '../utils/slug.js';
import { env } from '../config/env.js';
import { getFallbackApplications, demoSupervisors, demoScholars, makeDemoAvatar } from '../utils/fallbackData.js';
import { fastCache } from '../utils/fastCache.js';
import { extractToken } from '../utils/token.js';
import { sha256, encrypt } from '../utils/crypto.js';
import { verifyAccessToken } from '../services/token.service.js';

function resolveOptionalUser(req: Request): { _id?: string; email?: string; role?: string } | null {
  try {
    const authHeader = req.headers.authorization;
    const rawToken = (authHeader && authHeader.startsWith('Bearer '))
      ? authHeader.slice(7).trim()
      : (req as any).cookies?.accessToken;
    if (!rawToken) return null;
    const payload = verifyAccessToken(rawToken) as any;
    return payload ? { _id: payload.sub || payload._id, email: payload.email, role: payload.role } : null;
  } catch {
    return null;
  }
}

export async function approveAndSendOnboarding(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const applicationId = String(req.params.id || '');
    let application: any = null;

    if (mongoose.connection.readyState !== 1) {
      await connectDatabase();
    }
    if (mongoose.connection.readyState === 1) {
      application = await MembershipApplication.findById(applicationId).catch(() => null);
    }
    if (!application) {
      application = getFallbackApplications().find((a) => String(a._id) === applicationId || a.id === applicationId);
    }
    if (!application) throw new HttpError(404, 'Application not found');

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    const secretAccessCode = application.secretAccessCode || `ASP-${randomBytes(4).toString('hex').toUpperCase()}`;
    const publicApplicationId = application.publicApplicationId || `ASPIER-${new Date().getFullYear()}-${randomBytes(2).toString('hex').toUpperCase()}`;

    application.onboardingToken = token;
    application.onboardingTokenExpires = expiresAt;
    application.onboardingTokenUsed = false;
    application.publicApplicationId = publicApplicationId;
    application.secretAccessCode = secretAccessCode;
    application.activationCodeHash = sha256(secretAccessCode);
    application.activationCodeEncrypted = encrypt(secretAccessCode);
    application.activationCodeUsedAt = undefined;
    application.status = 'onboarding_sent';
    application.reviewedBy = req.user?._id;
    application.reviewedAt = new Date();
    if (typeof application.save === 'function') {
      await application.save().catch(() => {});
    }
    fastCache.clear();

    const role = application.role === 'supervisor' || application.category === 'teammate' ? 'supervisor' : 'scholar';
    const loginRole = role === 'supervisor' ? 'supervisor' : 'youngScholar';
    const roleLabel = role === 'supervisor' ? 'Research Supervisor' : 'Young Scholar';

    const baseUrl = (process.env.CLIENT_URL && !process.env.CLIENT_URL.includes('localhost'))
      ? process.env.CLIENT_URL.replace(/\/$/, '')
      : (process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : (env.CLIENT_URL && !env.CLIENT_URL.includes('localhost')
          ? env.CLIENT_URL.replace(/\/$/, '')
          : 'https://aspierglobal.vercel.app'));
    const onboardingUrl = `${baseUrl}/login?mode=activate&email=${encodeURIComponent(application.email)}&code=${encodeURIComponent(secretAccessCode)}&role=${loginRole}`;
    const directTokenUrl = `${baseUrl}/onboarding?token=${token}&role=${role}`;

    // Send in-app notification to member (if they checked portal or have account)
    try {
      await notifyMember({
        applicationId: application._id,
        title: 'Congratulations! Your ASPIER Application is Approved',
        body: `Congratulations ${application.name}! Your application to join ASPIER as a ${roleLabel} has been approved. Complete your secure onboarding and publish your official profile using this link: ${onboardingUrl}`,
        category: 'onboarding-invite',
        link: `/onboarding?token=${token}&role=${role}`
      });
    } catch {
      // ignore
    }

    // Send automated email with unique onboarding link
    try {
      await sendEmail({
        to: application.email,
        subject: `Congratulations! Your ASPIER ${roleLabel} Application is Approved`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 620px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 14px; background: #ffffff;">
            <div style="text-align: center; margin-bottom: 24px;">
              <h1 style="color: #0f766e; margin: 0 0 8px; font-size: 24px;">Welcome to ASPIER</h1>
              <p style="color: #64748b; margin: 0; font-size: 14px;">Aeronautical, Spatial, Planetary Institute for Environmental Research</p>
            </div>
            <p style="font-size: 16px; color: #1e293b;">Dear <strong>${application.name}</strong>,</p>
            <p style="font-size: 15px; color: #334155; line-height: 1.6;">
              We are thrilled to inform you that your application to join the ASPIER research community as a <strong>${roleLabel}</strong> has successfully passed final review and has been officially approved!
            </p>
            <p style="font-size: 15px; color: #334155; line-height: 1.6;">
              To set up your account credentials and publish your researcher profile to our live public <strong>Team page</strong>, please click the secure link below:
            </p>
            <div style="text-align: center; margin: 28px 0;">
              <a href="${onboardingUrl}" style="background: #0f766e; color: #ffffff; padding: 14px 28px; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 15px; display: inline-block; box-shadow: 0 4px 12px rgba(15, 118, 110, 0.25);">
                Complete Onboarding & Publish Profile →
              </a>
            </div>
            <p style="font-size: 13px; color: #64748b; line-height: 1.5;">
              Or copy and paste this unique link into your browser:<br/>
              <a href="${onboardingUrl}" style="color: #0f766e; word-break: break-all;">${onboardingUrl}</a>
            </p>
            <div style="margin-top: 24px; padding: 12px 16px; background: #f8fafc; border-radius: 8px; border-left: 4px solid #0f766e;">
              <p style="margin: 0; font-size: 13px; color: #475569;">
                <strong>Note:</strong> This is a single-use, secure onboarding link assigned exclusively to your email (${application.email}). It remains valid for 7 days.
              </p>
            </div>
            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 28px 0 16px;" />
            <p style="color: #94a3b8; font-size: 12px; margin: 0; text-align: center;">
              ASPIER Global · Dhaka / Rajshahi, Bangladesh · <a href="https://aspierglobal.vercel.app" style="color: #0f766e;">aspierglobal.vercel.app</a>
            </p>
          </div>
        `
      });
    } catch {
      // ignore
    }

    await recordAudit({
      req,
      action: 'approve_onboarding_invitation',
      description: `Sent onboarding invitation to ${application.name || 'applicant'} (${application.email || ''}) as ${roleLabel}`,
      resource: 'MembershipApplication',
      resourceId: String(application.id || application._id)
    });

    res.json({
      success: true,
      data: {
        onboardingUrl,
        directTokenUrl,
        token,
        secretAccessCode,
        publicApplicationId,
        role,
        roleLabel,
        email: application.email,
        name: application.name,
        expiresAt
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function validateOnboardingToken(req: Request, res: Response, next: NextFunction) {
  try {
    const rawToken = String(req.query.token || '').trim();
    const token = extractToken(rawToken);
    const authUser = resolveOptionalUser(req);

    if (!token && !authUser) throw new HttpError(400, 'Onboarding token or member login is required');

    let application: any = null;
    if (mongoose.connection.readyState !== 1) {
      await connectDatabase();
    }
    if (mongoose.connection.readyState === 1) {
      if (token) {
        application = await MembershipApplication.findOne({ onboardingToken: token }).catch(() => null);
      }
      if (!application && authUser) {
        const orQuery: any[] = [];
        if (authUser._id) orQuery.push({ memberUserId: authUser._id });
        if (authUser.email) orQuery.push({ email: authUser.email.toLowerCase() });
        if (orQuery.length) {
          application = await MembershipApplication.findOne({ $or: orQuery }).sort({ createdAt: -1 }).catch(() => null);
        }
      }
    }
    if (!application && token) {
      application = getFallbackApplications().find((a) => a.onboardingToken === token);
    }
    if (!application) {
      throw new HttpError(404, 'Invalid or unrecognized onboarding link.');
    }

    if (token && !authUser && application.onboardingTokenUsed && !['final_pending', 'published'].includes(application.status)) {
      throw new HttpError(410, 'This onboarding link has already been used. Please log in to your account.');
    }

    if (token && !authUser && application.onboardingTokenExpires && new Date(application.onboardingTokenExpires) < new Date()) {
      throw new HttpError(410, 'This onboarding link has expired. Please contact the ASPIER administration.');
    }

    const role = application.role === 'supervisor' || application.category === 'teammate' ? 'supervisor' : 'scholar';

    res.json({
      success: true,
      data: {
        valid: true,
        status: application.status,
        name: application.name,
        email: application.email,
        phone: application.phone,
        role,
        wing: application.wing || application.wingInterest,
        designation: application.designation || (role === 'supervisor' ? 'Research Supervisor' : 'Young Scholar'),
        institution: application.institution || '',
        education: application.education || application.educationalBackground || '',
        educationalBackground: application.educationalBackground || application.education || '',
        academicStatus: application.academicStatus || '',
        bio: application.bio || '',
        photo: application.photo || '',
        researchDomain: application.researchDomain || (application.researchDomains || []).join(', '),
        researchDomains: application.researchDomains || []
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function uploadOnboardingPhoto(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.file) throw new HttpError(400, 'A photo file is required');
    try {
      const media = await saveMedia(req.file);
      return res.status(201).json({ success: true, data: { url: media.url } });
    } catch {
      const mime = req.file.mimetype || 'image/png';
      const b64 = req.file.buffer.toString('base64');
      const dataUri = `data:${mime};base64,${b64}`;
      return res.status(201).json({ success: true, data: { url: dataUri } });
    }
  } catch (error) {
    next(error);
  }
}

export async function completeOnboarding(req: Request, res: Response, next: NextFunction) {
  try {
    const { token: rawToken, password, profile } = req.body || {};
    const token = extractToken(rawToken);
    const authUser = resolveOptionalUser(req);
    if (!token && !authUser) throw new HttpError(400, 'Onboarding token or member login is required');
    if (!authUser) {
      if (!password || password.length < 8) throw new HttpError(400, 'Password must be at least 8 characters');
      if (password.length > 128) throw new HttpError(400, 'Password must not exceed 128 characters');
      const passwordErrors = passwordStrength(password);
      if (passwordErrors.length) throw new HttpError(400, passwordErrors.join('. '));
    } else if (password) {
      if (password.length < 8 || password.length > 128) throw new HttpError(400, 'Password must be between 8 and 128 characters');
      const passwordErrors = passwordStrength(password);
      if (passwordErrors.length) throw new HttpError(400, passwordErrors.join('. '));
    }
    if (!profile || !profile.name) throw new HttpError(400, 'Profile details and full name are required');

    let application: any = null;
    if (mongoose.connection.readyState !== 1) {
      await connectDatabase();
    }
    if (mongoose.connection.readyState === 1) {
      if (token) {
        application = await MembershipApplication.findOne({ onboardingToken: token }).catch(() => null);
      }
      if (!application && authUser) {
        const orQuery: any[] = [];
        if (authUser._id) orQuery.push({ memberUserId: authUser._id });
        if (authUser.email) orQuery.push({ email: authUser.email.toLowerCase() });
        if (orQuery.length) {
          application = await MembershipApplication.findOne({ $or: orQuery }).sort({ createdAt: -1 }).catch(() => null);
        }
      }
    }
    if (!application && token) {
      application = getFallbackApplications().find((a) => a.onboardingToken === token);
    }
    if (!application) throw new HttpError(404, 'Invalid onboarding token');
    if (token && !authUser && application.onboardingTokenUsed) throw new HttpError(410, 'This onboarding token has already been used');
    if (token && !authUser && application.onboardingTokenExpires && new Date(application.onboardingTokenExpires) < new Date()) {
      throw new HttpError(410, 'This onboarding token has expired');
    }

    const role = application.role === 'supervisor' || application.category === 'teammate' ? 'supervisor' : 'scholar';
    const userRole = role === 'supervisor' ? 'supervisor' : 'youngScholar';
    const baseSlug = slugify(profile.slug || profile.name);

    // 1. Create or update user account if password provided or link existing authUser
    let userId: any = authUser?._id || application.memberUserId || new mongoose.Types.ObjectId();
    if (mongoose.connection.readyState === 1) {
      try {
        let user = await User.findOne({ email: application.email.toLowerCase() });
        if (!user && password) {
          user = await User.create({
            name: profile.name,
            email: application.email.toLowerCase(),
            passwordHash: await hashPassword(password),
            role: userRole,
            isActive: true
          });
        } else if (user) {
          user.name = profile.name || user.name;
          if (password) user.passwordHash = await hashPassword(password);
          user.role = userRole;
          user.isActive = true;
          await user.save();
        }
        if (user) userId = user._id;
      } catch (uErr) {
        console.warn('[onboarding] User creation fallback:', uErr);
      }
    }

    // 2. Save Stage 2 profile onto MembershipApplication and transition to final_pending (Stage 2: Profile Review)
    const photo = profile.photo || makeDemoAvatar(profile.name);
    const rawTags = role === 'supervisor'
      ? (profile.researchInterests || profile.researchDomains)
      : (profile.researchTopics || profile.researchDomains);
    const tags = Array.isArray(rawTags) && rawTags.length > 0
      ? rawTags.map((s: string) => String(s).trim()).filter(Boolean)
      : (typeof rawTags === 'string' && rawTags.trim()
        ? rawTags.split(',').map((s: string) => s.trim()).filter(Boolean)
        : (Array.isArray(application.researchDomains) && application.researchDomains.length > 0
          ? application.researchDomains
          : (application.researchDomain ? application.researchDomain.split(',').map((s: string) => s.trim()).filter(Boolean) : [])));
    const edu = (profile.education || profile.educationalBackground || application.education || application.educationalBackground || '').trim();

    application.name = profile.name.trim();
    application.slug = baseSlug;
    application.designation = role === 'scholar' ? 'Young Scholar' : (profile.designation || 'Research Supervisor');
    application.institution = role === 'scholar' ? '' : (profile.affiliation || 'ASPIER');
    application.cohort = role === 'scholar' ? '2026' : (profile.cohort || '2026');
    application.education = edu;
    application.educationalBackground = edu;
    application.bio = profile.bio || '';
    application.photo = photo;
    application.researchDomains = tags;
    application.researchDomain = tags.join(', ');
    application.researchGate = profile.researchGate || '';
    application.googleScholar = profile.googleScholar || '';
    application.linkedin = profile.linkedin || '';
    application.orcid = profile.orcid || '';
    application.twitter = profile.twitter || '';
    application.github = profile.github || '';
    application.website = profile.website || '';
    application.onboardingTokenUsed = true;
    application.status = 'final_pending';
    application.memberUserId = userId;
    if (typeof application.save === 'function') {
      await application.save().catch(() => {});
    }
    fastCache.clear();

    // 3. Notify Administrators for Stage 2 Final Approval
    const roleLabel = role === 'supervisor' ? 'Research Supervisor' : 'Young Scholar';
    try {
      await notifyAdmins({
        title: `Stage 2 Profile Submitted: ${profile.name} (${roleLabel})`,
        body: `${profile.name} has submitted their Stage 2 Final Team Profile and is ready for review & publishing to /team.`,
        category: 'onboarding-stage2',
        link: '/admin/membership-applications',
        applicantName: profile.name,
        applicantEmail: application.email,
        referenceId: String(application.id || application._id)
      });
    } catch {
      // ignore
    }

    res.json({
      success: true,
      data: {
        status: 'final_pending',
        role,
        message: 'Stage 2 profile submitted for Admin review.'
      }
    });
  } catch (error) {
    next(error);
  }
}
