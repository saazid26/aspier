import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import Research from '../models/Research.js';
import ResearchApplication from '../models/ResearchApplication.js';
import { HttpError } from '../middleware/error.js';
import type { AuthRequest } from '../middleware/auth.js';
import { notifyAdmins } from '../services/notification.service.js';
import AuditLog from '../models/AuditLog.js';

const cvDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../private-cvs');
const applicationSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().min(7).max(30),
  institution: z.string().trim().min(2).max(200),
  academicStatus: z.string().trim().min(2).max(120),
  city: z.string().trim().min(2).max(120),
  country: z.string().trim().min(2).max(120),
  skills: z.string().trim().min(2).max(5000),
  statement: z.string().trim().max(5000).optional().default(''),
  googleScholar: z.string().trim().max(500).optional().default(''),
  researchGate: z.string().trim().max(500).optional().default('')
});

export async function submitResearchApplication(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = applicationSchema.safeParse(req.body);
    if (!parsed.success) throw new HttpError(400, parsed.error.issues.map((issue) => issue.message).join('. '));
    const data = parsed.data;
    const research = await Research.findOne({ _id: req.params.id, status: 'published', category: { $in: ['ongoing', 'future'] } });
    if (!research) throw new HttpError(404, 'This research project is not accepting applications');
    let cvStorageKey: string | undefined;
    let cvFilename: string | undefined;
    let cvData: Buffer | undefined;
    let cvMimeType: string | undefined;
    if (req.file) {
      const extension = path.extname(req.file.originalname).toLowerCase();
      const acceptedTypes: Record<string, { mime: string; signature: (buffer: Buffer) => boolean }> = {
        '.pdf': { mime: 'application/pdf', signature: (buffer) => buffer.subarray(0, 5).toString() === '%PDF-' },
        '.doc': { mime: 'application/msword', signature: (buffer) => buffer.subarray(0, 8).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])) },
        '.docx': { mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', signature: (buffer) => buffer.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04])) }
      };
      const type = acceptedTypes[extension];
      if (!type || req.file.mimetype !== type.mime || !type.signature(req.file.buffer)) {
        throw new HttpError(400, 'CV must be a valid PDF, DOC, or DOCX file');
      }
      cvFilename = path.basename(req.file.originalname).replace(/[^a-z0-9._ -]/gi, '_');
      cvMimeType = type.mime;
      if (process.env.VERCEL === '1') {
        cvData = req.file.buffer;
      } else {
        cvStorageKey = `${randomUUID()}${extension}`;
        await mkdir(cvDirectory, { recursive: true });
        await writeFile(path.join(cvDirectory, cvStorageKey), req.file.buffer, { flag: 'wx', mode: 0o600 });
      }
    }
    const application = await ResearchApplication.create({
      researchId: research._id,
      researchTitle: research.title,
      ...data,
      email: data.email.toLowerCase(),
      ...(cvStorageKey ? { cvStorageKey } : {}),
      ...(cvData ? { cvData, cvFilename, cvMimeType } : {}),
      ...(cvFilename && !cvData ? { cvFilename, cvMimeType } : {})
    }).catch(async (error: unknown) => {
      if (cvStorageKey) await unlink(path.join(cvDirectory, cvStorageKey));
      throw error;
    });
    await notifyAdmins({
      title: 'New research collaboration application',
      body: `${application.name} applied to join “${research.title}”.`,
      category: 'research-application',
      link: '/admin/research-applications'
    });
    res.status(201).json({ success: true, data: { id: application.id, status: application.status } });
  } catch (error) {
    next(error);
  }
}

export async function listResearchApplications(req: AuthRequest, res: Response) {
  try {
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const data = await ResearchApplication.find(status ? { status } : {}).sort({ createdAt: -1 }).lean();
    res.json({ success: true, data: data || [] });
  } catch {
    res.json({ success: true, data: [] });
  }
}

export async function updateResearchApplicationStatus(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const status = z.enum(['shortlisted', 'approved']).parse(req.body.status);
    const application = await ResearchApplication.findByIdAndUpdate(req.params.id, {
      $set: { status, reviewedBy: req.user._id, reviewedAt: new Date() }
    }, { new: true, runValidators: true });
    if (!application) throw new HttpError(404, 'Research application not found');
    await AuditLog.create({ actorId: req.user._id, action: `${status}-research-application`, resource: 'ResearchApplication', resourceId: application.id, ip: req.ip, userAgent: req.headers['user-agent'] });
    res.json({ success: true, data: application });
  } catch (error) {
    next(error);
  }
}

export async function deleteResearchApplication(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const application = await ResearchApplication.findById(req.params.id).select('+cvStorageKey +cvData');
    if (!application) throw new HttpError(404, 'Research application not found');
    if (application.cvStorageKey && process.env.VERCEL !== '1') {
      const filePath = path.resolve(cvDirectory, application.cvStorageKey);
      if (path.dirname(filePath) !== cvDirectory) throw new HttpError(400, 'Invalid CV storage key');
      await unlink(filePath).catch((error: NodeJS.ErrnoException) => {
        if (error.code !== 'ENOENT') throw error;
      });
    }
    await application.deleteOne();
    await AuditLog.create({ actorId: req.user._id, action: 'delete-research-application', resource: 'ResearchApplication', resourceId: application.id, ip: req.ip, userAgent: req.headers['user-agent'] });
    res.json({ success: true, message: 'Research application deleted' });
  } catch (error) {
    next(error);
  }
}

export async function downloadResearchApplicationCv(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const application = await ResearchApplication.findById(req.params.id).select('+cvStorageKey +cvData +cvMimeType');
    if (!application?.cvStorageKey && !application?.cvData) throw new HttpError(404, 'CV not found');
    const filename = application.cvFilename || 'applicant-cv';
    if (application.cvData) {
      res.type(application.cvMimeType || 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${filename.replace(/["\\]/g, '_')}"`);
      res.send(application.cvData);
      return;
    }
    if (!application.cvStorageKey) throw new HttpError(404, 'CV not found');
    const filePath = path.resolve(cvDirectory, application.cvStorageKey);
    if (path.dirname(filePath) !== cvDirectory) throw new HttpError(400, 'Invalid CV storage key');
    res.download(filePath, filename, (error) => {
      if (error && !res.headersSent) next(error);
    });
  } catch (error) {
    next(error);
  }
}
