import { randomBytes, randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import Research from '../models/Research.js';
import Wing from '../models/Wing.js';
import Setting from '../models/Setting.js';
import ResearchApplication from '../models/ResearchApplication.js';
import { HttpError } from '../middleware/error.js';
import type { AuthRequest } from '../middleware/auth.js';
import { notifyAdmins } from '../services/notification.service.js';
import { sendEmail } from '../services/email.service.js';
import AuditLog from '../models/AuditLog.js';
import { getFallbackResearchApplications } from '../utils/fallbackData.js';

const cvDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../private-cvs');

const DUMMY_PDF_BUFFER = Buffer.from(
  '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000052 00000 n\n0000000108 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n185\n%%EOF\n'
);

const researchMateSchema = z.object({
  role: z.string().optional().default('Research Mate'),
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().max(40).optional().default(''),
  university: z.string().trim().min(2).max(200),
  department: z.string().trim().min(2).max(200),
  occupation: z.string().trim().min(2).max(300),
  wingName: z.string().trim().min(2),
  wingSlug: z.string().trim().min(2).optional().default(''),
  researchTitle: z.string().trim().min(2),
  researchSlug: z.string().trim().optional().default(''),
  skills: z.string().trim().min(2).max(5000),
  statement: z.string().trim().max(5000).optional().default('')
});

export async function submitResearchApplication(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = researchMateSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpError(400, parsed.error.issues.map((i) => i.message).join('. '));
    }
    const data = parsed.data;

    // PDF validation
    let cvData: Buffer | undefined;
    let cvFilename = 'applicant-cv.pdf';
    let cvMimeType = 'application/pdf';
    let cvStorageKey: string | undefined;

    if (req.file) {
      const ext = path.extname(req.file.originalname).toLowerCase();
      const isPdfMime = req.file.mimetype === 'application/pdf';
      const isPdfExt = ext === '.pdf';
      const isPdfHeader = req.file.buffer.subarray(0, 5).toString() === '%PDF-';

      if (!isPdfExt || (!isPdfMime && !isPdfHeader)) {
        throw new HttpError(400, 'CV must be a valid PDF document (.pdf)');
      }

      cvFilename = path.basename(req.file.originalname).replace(/[^a-z0-9._ -]/gi, '_');
      cvData = req.file.buffer;
      cvMimeType = 'application/pdf';

      if (process.env.VERCEL !== '1') {
        try {
          cvStorageKey = `${randomUUID()}.pdf`;
          await mkdir(cvDirectory, { recursive: true });
          await writeFile(path.join(cvDirectory, cvStorageKey), req.file.buffer, { flag: 'wx', mode: 0o600 });
        } catch {
          // fallback to memory buffer
        }
      }
    }

    // Generate unique Application ID
    const randomSuffix = randomBytes(3).toString('hex').toUpperCase();
    const applicationId = `ASPIER-RM-${new Date().getFullYear()}-${randomSuffix}`;
    const initialAccessCode = `RM-SEC-${randomBytes(2).toString('hex').toUpperCase()}-${randomBytes(2).toString('hex').toUpperCase()}`;

    let application: any = null;

    if (mongoose.connection.readyState === 1) {
      try {
        application = await ResearchApplication.create({
          applicationId,
          accessCode: initialAccessCode,
          role: 'Research Mate',
          name: data.name,
          email: data.email.toLowerCase(),
          phone: data.phone,
          university: data.university,
          department: data.department,
          occupation: data.occupation,
          wingName: data.wingName,
          wingSlug: data.wingSlug,
          researchTitle: data.researchTitle,
          researchSlug: data.researchSlug,
          skills: data.skills,
          statement: data.statement,
          cvStorageKey,
          cvData,
          cvFilename,
          cvMimeType,
          status: 'pending',
          paymentAmount: 1000,
          whatsAppGroupLink: ''
        });
      } catch (dbErr) {
        console.warn('[research-application] DB create failed, fallback to memory store:', dbErr);
      }
    }

    if (!application) {
      const generatedId = new mongoose.Types.ObjectId().toString();
      application = {
        _id: generatedId,
        id: generatedId,
        applicationId,
        accessCode: initialAccessCode,
        role: 'Research Mate',
        name: data.name,
        email: data.email.toLowerCase(),
        phone: data.phone,
        university: data.university,
        department: data.department,
        occupation: data.occupation,
        wingName: data.wingName,
        wingSlug: data.wingSlug,
        researchTitle: data.researchTitle,
        researchSlug: data.researchSlug,
        skills: data.skills,
        statement: data.statement,
        cvFilename,
        cvMimeType,
        cvData,
        status: 'pending',
        paymentAmount: 1000,
        whatsAppGroupLink: '',
        createdAt: new Date().toISOString()
      };
      getFallbackResearchApplications().unshift(application);
    }

    try {
      await notifyAdmins({
        title: 'New Research Mate Application',
        body: `${application.name} applied as Research Mate for "${application.researchTitle}" (${application.wingName}).`,
        category: 'research-mate-application',
        link: '/admin/research-applications'
      });
    } catch {
      // ignore
    }

    res.status(201).json({
      success: true,
      data: {
        id: application._id || application.id,
        applicationId: application.applicationId,
        name: application.name,
        email: application.email,
        status: application.status,
        message: 'Your Stage 1 Research Mate application has been submitted successfully.'
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function lookupResearchApplication(req: Request, res: Response, next: NextFunction) {
  try {
    const rawId = String(req.body.applicationId || '').trim().toUpperCase();
    const rawCode = String(req.body.accessCode || '').trim();

    if (!rawId) {
      throw new HttpError(400, 'Application ID is required');
    }

    let application: any = null;

    if (mongoose.connection.readyState === 1) {
      try {
        application = await ResearchApplication.findOne({
          applicationId: rawId,
          ...(rawCode ? { accessCode: rawCode } : {})
        }).lean();
      } catch (err) {
        console.warn('[research-application] DB lookup error:', err);
      }
    }

    if (!application) {
      application = getFallbackResearchApplications().find((a) => {
        const matchesId = a.applicationId?.toUpperCase() === rawId || String(a._id) === rawId || a.id === rawId;
        if (!rawCode) return matchesId;
        return matchesId && (a.accessCode === rawCode || a.accessCode?.toUpperCase() === rawCode.toUpperCase());
      });
    }

    if (!application) {
      throw new HttpError(404, 'No research application found matching this Application ID and Private Access Code.');
    }

    // Load admin payment settings for bKash / Nagad
    let settings: any = null;
    if (mongoose.connection.readyState === 1) {
      try {
        settings = await Setting.findOne({ singleton: 'main' }).lean();
      } catch {
        settings = null;
      }
    }

    res.json({
      success: true,
      data: {
        id: application._id || application.id,
        applicationId: application.applicationId,
        name: application.name,
        email: application.email,
        phone: application.phone,
        role: application.role || 'Research Mate',
        university: application.university,
        department: application.department,
        occupation: application.occupation,
        wingName: application.wingName,
        wingSlug: application.wingSlug,
        researchTitle: application.researchTitle,
        skills: application.skills,
        statement: application.statement,
        status: application.status,
        paymentAmount: application.paymentAmount || 1000,
        paymentMethod: application.paymentMethod,
        paymentSenderPhone: application.paymentSenderPhone,
        trxId: application.trxId,
        bkashNumber: settings?.bkashNumber || '01603012448',
        nagadNumber: settings?.nagadNumber || '01603012448',
        paymentInstructions: settings?.paymentInstructions || 'Send BDT 1,000 using bKash or Nagad Personal Send Money, then enter your sender phone number and Transaction ID (TrxID) below.',
        whatsAppGroupLink: application.status === 'approved' ? (application.whatsAppGroupLink || '') : '',
        createdAt: application.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function submitResearchPayment(req: Request, res: Response, next: NextFunction) {
  try {
    const { applicationId, accessCode, paymentMethod, senderPhone, trxId } = req.body || {};

    if (!applicationId || !accessCode) {
      throw new HttpError(400, 'Application ID and Private Access Code are required.');
    }
    if (!paymentMethod || !['bKash', 'Nagad'].includes(paymentMethod)) {
      throw new HttpError(400, 'Please select a valid payment method (bKash or Nagad).');
    }
    if (!trxId || String(trxId).trim().length < 4) {
      throw new HttpError(400, 'A valid transaction ID (TrxID) is required.');
    }

    const normId = String(applicationId).trim().toUpperCase();
    const normCode = String(accessCode).trim();

    let application: any = null;

    if (mongoose.connection.readyState === 1) {
      try {
        application = await ResearchApplication.findOne({
          applicationId: normId,
          accessCode: normCode
        });
      } catch (err) {
        console.warn('[research-application] DB payment query error:', err);
      }
    }

    if (!application) {
      application = getFallbackResearchApplications().find((a) => {
        return (a.applicationId?.toUpperCase() === normId || String(a._id) === normId) &&
               (a.accessCode === normCode || a.accessCode?.toUpperCase() === normCode.toUpperCase());
      });
    }

    if (!application) {
      throw new HttpError(404, 'Application not found or Private Access Code does not match.');
    }

    application.paymentMethod = paymentMethod;
    application.paymentSenderPhone = senderPhone || '';
    application.trxId = String(trxId).trim();
    application.status = 'payment_submitted';
    application.paymentAmount = 1000;

    if (typeof application.save === 'function') {
      await application.save().catch(() => {});
    }

    try {
      await notifyAdmins({
        title: 'Research Mate BDT 1,000 Payment Submitted',
        body: `${application.name} submitted ${paymentMethod} TrxID: ${application.trxId} for "${application.researchTitle}".`,
        category: 'research-mate-payment',
        link: '/admin/research-applications'
      });
    } catch {
      // ignore
    }

    res.json({
      success: true,
      data: {
        applicationId: application.applicationId,
        status: application.status,
        message: 'Payment details submitted successfully. Awaiting final administrator confirmation.'
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function listResearchApplications(req: AuthRequest, res: Response) {
  try {
    const status = req.query.status;
    let list: any[] = [];

    if (mongoose.connection.readyState === 1) {
      try {
        const filter = typeof status === 'string' && status !== 'all' ? { status } : {};
        list = await ResearchApplication.find(filter).sort({ createdAt: -1 }).lean();
      } catch (err) {
        console.warn('[research-applications] DB list error:', err);
      }
    }

    const inMem = getFallbackResearchApplications();
    const filterStatus = typeof status === 'string' ? status : 'all';
    const filteredInMem = filterStatus === 'all' || !filterStatus
      ? inMem
      : inMem.filter((a: any) => a.status === filterStatus);

    const combined = [...(list || [])];
    for (const item of filteredInMem) {
      if (!combined.some((c) => String(c._id) === String(item._id) || c.applicationId === item.applicationId)) {
        combined.push(item);
      }
    }

    res.json({ success: true, data: combined });
  } catch {
    res.json({ success: true, data: getFallbackResearchApplications() });
  }
}

export async function approveStage1ResearchApplication(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = String(req.params.id || '');
    let application: any = null;

    if (mongoose.connection.readyState === 1) {
      application = await ResearchApplication.findById(id).catch(() => null);
    }
    if (!application) {
      application = getFallbackResearchApplications().find((a) => String(a._id) === id || a.id === id || a.applicationId === id);
    }
    if (!application) throw new HttpError(404, 'Research application not found');

    const generatedCode = `RM-SEC-${randomBytes(2).toString('hex').toUpperCase()}-${randomBytes(2).toString('hex').toUpperCase()}`;
    const accessCode = req.body.accessCode?.trim() || application.accessCode || generatedCode;

    application.accessCode = accessCode;
    application.status = 'stage1_approved';
    application.reviewedBy = req.user?._id;
    application.reviewedAt = new Date();

    if (typeof application.save === 'function') {
      await application.save().catch(() => {});
    }

    // Send email / notification
    try {
      await sendEmail({
        to: application.email,
        subject: `ASPIER Research Mate Application Stage 1 Approved — ${application.researchTitle}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
            <h2 style="color: #0f766e;">Congratulations ${application.name}!</h2>
            <p>Your Stage 1 application to join <strong>"${application.researchTitle}"</strong> under the <strong>${application.wingName}</strong> has been approved!</p>
            <div style="background: #f8fafc; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #0f766e;">
              <p style="margin: 0 0 8px;"><strong>Application ID:</strong> <span style="font-family: monospace; font-size: 16px;">${application.applicationId}</span></p>
              <p style="margin: 0;"><strong>Private Access Code:</strong> <span style="font-family: monospace; font-size: 16px; color: #0f766e; font-weight: bold;">${accessCode}</span></p>
            </div>
            <p>Please open the <strong>Check Application</strong> section on the ASPIER website to complete Stage 2 verification and BDT 1,000 project onboarding:</p>
            <p><a href="https://aspierglobal.vercel.app/check-application" style="background: #0f766e; color: #ffffff; padding: 10px 20px; border-radius: 6px; text-decoration: none; display: inline-block;">Check Application Portal →</a></p>
          </div>
        `
      });
    } catch {
      // ignore
    }

    try {
      await AuditLog.create({
        actorId: req.user?._id,
        action: 'approve-stage1-research-application',
        resource: 'ResearchApplication',
        resourceId: application.id || application._id,
        ip: req.ip,
        userAgent: req.headers['user-agent']
      });
    } catch {
      // ignore
    }

    res.json({
      success: true,
      data: {
        applicationId: application.applicationId,
        accessCode: application.accessCode,
        status: application.status
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function confirmResearchPayment(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = String(req.params.id || '');
    const { whatsAppGroupLink } = req.body || {};

    let application: any = null;

    if (mongoose.connection.readyState === 1) {
      application = await ResearchApplication.findById(id).catch(() => null);
    }
    if (!application) {
      application = getFallbackResearchApplications().find((a) => String(a._id) === id || a.id === id || a.applicationId === id);
    }
    if (!application) throw new HttpError(404, 'Research application not found');

    if (whatsAppGroupLink) {
      application.whatsAppGroupLink = String(whatsAppGroupLink).trim();
    }
    application.status = 'approved';
    application.reviewedBy = req.user?._id;
    application.reviewedAt = new Date();

    if (typeof application.save === 'function') {
      await application.save().catch(() => {});
    }

    // Send final congratulatory email with WhatsApp link
    try {
      await sendEmail({
        to: application.email,
        subject: `Welcome to the Research Team! WhatsApp Group Link: ${application.researchTitle}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
            <h2 style="color: #0f766e;">Payment Verified & Enrolled!</h2>
            <p>Dear ${application.name},</p>
            <p>Your BDT 1,000 onboarding payment for <strong>"${application.researchTitle}"</strong> has been confirmed by the administration.</p>
            <p>You can now join the official research coordination WhatsApp group:</p>
            <div style="text-align: center; margin: 24px 0;">
              <a href="${application.whatsAppGroupLink || 'https://chat.whatsapp.com'}" style="background: #25D366; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
                Join Project WhatsApp Group →
              </a>
            </div>
            <p>You can also access this WhatsApp link anytime by logging into the Check Application portal with your Application ID and Access Code.</p>
          </div>
        `
      });
    } catch {
      // ignore
    }

    try {
      await AuditLog.create({
        actorId: req.user?._id,
        action: 'confirm-payment-research-application',
        resource: 'ResearchApplication',
        resourceId: application.id || application._id,
        ip: req.ip,
        userAgent: req.headers['user-agent']
      });
    } catch {
      // ignore
    }

    res.json({
      success: true,
      data: {
        applicationId: application.applicationId,
        status: application.status,
        whatsAppGroupLink: application.whatsAppGroupLink
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function updateWhatsAppLink(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = String(req.params.id || '');
    const { whatsAppGroupLink } = req.body || {};

    let application: any = null;

    if (mongoose.connection.readyState === 1) {
      application = await ResearchApplication.findById(id).catch(() => null);
    }
    if (!application) {
      application = getFallbackResearchApplications().find((a) => String(a._id) === id || a.id === id || a.applicationId === id);
    }
    if (!application) throw new HttpError(404, 'Research application not found');

    application.whatsAppGroupLink = String(whatsAppGroupLink || '').trim();

    if (typeof application.save === 'function') {
      await application.save().catch(() => {});
    }

    res.json({
      success: true,
      data: {
        applicationId: application.applicationId,
        whatsAppGroupLink: application.whatsAppGroupLink
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function downloadResearchApplicationCv(req: Request, res: Response, next: NextFunction) {
  try {
    const id = String(req.params.id || '');
    let application: any = null;

    if (mongoose.connection.readyState === 1) {
      try {
        application = await ResearchApplication.findById(id).select('+cvStorageKey +cvData +cvMimeType').lean();
      } catch {
        application = null;
      }
    }
    if (!application) {
      application = getFallbackResearchApplications().find((a) => String(a._id) === id || a.id === id || a.applicationId === id);
    }

    const filename = application?.cvFilename || 'applicant_cv.pdf';

    // 1. If binary data exists in Mongo or memory
    if (application?.cvData) {
      res.type('application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${filename.replace(/["\\]/g, '_')}"`);
      return res.send(Buffer.isBuffer(application.cvData) ? application.cvData : Buffer.from(application.cvData));
    }

    // 2. If storage key on disk exists
    if (application?.cvStorageKey && process.env.VERCEL !== '1') {
      const filePath = path.resolve(cvDirectory, application.cvStorageKey);
      return res.download(filePath, filename, (error) => {
        if (error && !res.headersSent) {
          // Fall back to dummy PDF
          res.type('application/pdf');
          res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
          res.send(DUMMY_PDF_BUFFER);
        }
      });
    }

    // 3. Fallback valid PDF
    res.type('application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    return res.send(DUMMY_PDF_BUFFER);
  } catch (error) {
    next(error);
  }
}

export async function deleteResearchApplication(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = String(req.params.id || '');

    if (mongoose.connection.readyState === 1) {
      await ResearchApplication.findByIdAndDelete(id).catch(() => null);
    }

    const inMem = getFallbackResearchApplications();
    const idx = inMem.findIndex((a) => String(a._id) === id || a.id === id || a.applicationId === id);
    if (idx !== -1) inMem.splice(idx, 1);

    try {
      await AuditLog.create({
        actorId: req.user?._id,
        action: 'delete-research-application',
        resource: 'ResearchApplication',
        resourceId: id,
        ip: req.ip,
        userAgent: req.headers['user-agent']
      });
    } catch {
      // ignore
    }

    res.json({ success: true, message: 'Research application deleted' });
  } catch (error) {
    next(error);
  }
}
