import type { Request, Response, NextFunction } from 'express';
import Certificate from '../models/Certificate.js';
import Enrollment from '../models/Enrollment.js';
import User from '../models/User.js';
import { recordAudit } from '../services/audit.service.js';
import { HttpError } from '../middleware/error.js';
import { fastCache } from '../utils/fastCache.js';

// Cache for high-performance sub-0.2s raw image delivery
const imageCache = new Map<string, { buffer: Buffer; contentType: string; cachedAt: number }>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Public Verification Endpoint: GET /api/certificates/verify/:credentialId & /verify/*
 */
export async function verifyCertificate(req: Request, res: Response, next: NextFunction) {
  try {
    const paramMatch = req.params[0] || (req.params as any).credentialId || (req.params as any).id;
    const queryMatch = (req.query.credentialId as string) || (req.query.id as string);
    let rawId = paramMatch || queryMatch || '';

    if (!rawId && req.url) {
      const match = req.url.match(/\/(?:verify|image)\/([^?]+)/);
      if (match && match[1]) {
        rawId = match[1];
      }
    }

    if (rawId) {
      try {
        rawId = decodeURIComponent(rawId);
      } catch {
        // preserve rawId
      }
    }

    const credentialId = String(rawId).trim().toUpperCase();

    if (!credentialId) {
      return res.status(400).json({
        valid: false,
        message: 'Credential ID is required for certificate verification.'
      });
    }

    const escaped = credentialId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const cert = await Certificate.findOne({
      $or: [
        { credentialId: credentialId },
        { credentialId: { $regex: new RegExp(`^${escaped}$`, 'i') } }
      ],
      status: { $regex: /^issued$/i }
    });

    if (!cert) {
      return res.status(404).json({
        valid: false,
        message: `No active or verified certificate found with Credential ID "${credentialId}".`
      });
    }

    const origin = req.protocol + '://' + req.get('host');
    const rawImageUrl = `/api/certificates/image/${encodeURIComponent(cert.credentialId)}`;
    const imageUrl = cert.certificateImage?.startsWith('data:') || cert.certificateImage?.startsWith('http')
      ? cert.certificateImage
      : rawImageUrl;

    return res.status(200).json({
      valid: true,
      message: 'Certificate successfully verified.',
      certificate: {
        credentialId: cert.credentialId,
        studentName: cert.studentName,
        studentEmail: cert.studentEmail,
        courseTitle: cert.courseTitle,
        issueDate: cert.issueDate instanceof Date ? cert.issueDate.toISOString() : String(cert.issueDate),
        certificateImage: cert.certificateImage,
        imageUrl,
        rawImageUrl,
        absoluteImageUrl: cert.certificateImage?.startsWith('http') ? cert.certificateImage : `${origin}${rawImageUrl}`,
        verifyUrl: `/academy/verify-certificate?id=${encodeURIComponent(cert.credentialId)}`,
        status: cert.status,
        verifiedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Fast Raw PNG Image Serving: GET /api/certificates/image/:credentialId & /image/*
 * Serves raw PNG buffer with 1-hour cache header for < 200ms load times.
 */
export async function serveCertificateImage(req: Request, res: Response, next: NextFunction) {
  try {
    const paramMatch = req.params[0] || (req.params as any).credentialId || (req.params as any).id;
    const queryMatch = (req.query.credentialId as string) || (req.query.id as string);
    let rawId = paramMatch || queryMatch || '';

    if (!rawId && req.url) {
      const match = req.url.match(/\/image\/([^?]+)/);
      if (match && match[1]) {
        rawId = match[1];
      }
    }

    if (rawId) {
      try {
        rawId = decodeURIComponent(rawId);
      } catch {
        // preserve rawId
      }
    }

    const credentialId = String(rawId).trim().toUpperCase();

    if (!credentialId) {
      return res.status(400).send('Credential ID is required');
    }

    // Check in-memory buffer cache
    const cached = imageCache.get(credentialId);
    if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
      res.setHeader('Content-Type', cached.contentType);
      res.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
      res.setHeader('Content-Length', cached.buffer.length);
      return res.end(cached.buffer);
    }

    const escaped = credentialId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const cert = await Certificate.findOne({
      $or: [
        { credentialId: credentialId },
        { credentialId: { $regex: new RegExp(`^${escaped}$`, 'i') } }
      ],
      status: { $regex: /^issued$/i }
    });

    if (!cert || !cert.certificateImage) {
      return res.status(404).send('Certificate image not found or credential unissued');
    }

    // Handle Data URI (Base64)
    if (cert.certificateImage.startsWith('data:image/')) {
      const match = cert.certificateImage.match(/^data:([a-zA-Z0-9/+.-]+);base64,(.+)$/);
      const contentType = match && match[1] ? match[1] : 'image/png';
      const b64Data = match && match[2] ? match[2] : cert.certificateImage;
      const buffer = Buffer.from(b64Data, 'base64');

      // Update in-memory cache
      imageCache.set(credentialId, { buffer, contentType, cachedAt: Date.now() });

      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
      res.setHeader('Content-Length', buffer.length);
      return res.end(buffer);
    }

    // If external URL (e.g. Cloudinary), redirect
    if (cert.certificateImage.startsWith('http://') || cert.certificateImage.startsWith('https://')) {
      return res.redirect(cert.certificateImage);
    }

    return res.status(404).send('Unsupported image format');
  } catch (error) {
    next(error);
  }
}

/**
 * Student: GET /api/certificates/my & /api/v1/certificates/my - List student's own issued certificates
 */
export async function getMyCertificates(req: any, res: Response, next: NextFunction) {
  try {
    const userId = req.user?._id;
    const userEmail = req.user?.email ? String(req.user.email).toLowerCase().trim() : '';

    if (!userId && !userEmail) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const certificates = await Certificate.find({
      $or: [
        { studentId: userId },
        ...(userEmail ? [{ studentEmail: userEmail }] : [])
      ],
      status: { $regex: /^issued$/i }
    })
      .sort({ issueDate: -1, createdAt: -1 })
      .lean();

    const origin = req.protocol + '://' + req.get('host');

    const formatted = certificates.map((cert) => {
      const rawImageUrl = `/api/certificates/image/${encodeURIComponent(cert.credentialId)}`;
      const imageUrl = cert.certificateImage?.startsWith('data:') || cert.certificateImage?.startsWith('http')
        ? cert.certificateImage
        : rawImageUrl;

      return {
        _id: cert._id,
        credentialId: cert.credentialId,
        studentName: cert.studentName,
        studentEmail: cert.studentEmail,
        courseTitle: cert.courseTitle,
        issueDate: cert.issueDate instanceof Date ? cert.issueDate.toISOString() : String(cert.issueDate),
        certificateImage: cert.certificateImage,
        imageUrl,
        rawImageUrl,
        absoluteImageUrl: cert.certificateImage?.startsWith('http') ? cert.certificateImage : `${origin}${rawImageUrl}`,
        verifyUrl: `/academy/verify-certificate?id=${encodeURIComponent(cert.credentialId)}`,
        status: cert.status
      };
    });

    return res.status(200).json({
      success: true,
      certificates: formatted
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Admin: GET /api/admin/certificates - List all issued certificates & pending claims
 */
export async function listAdminCertificates(_req: Request, res: Response, next: NextFunction) {
  try {
    const [certificates, pendingClaims] = await Promise.all([
      Certificate.find().sort({ createdAt: -1 }).lean(),
      Enrollment.find({ certificateStatus: 'claimed' })
        .populate('userId', 'name email avatar')
        .populate('courseId', 'title slug instructorId')
        .sort({ certificateClaimedAt: -1 })
        .lean()
    ]);

    return res.status(200).json({
      success: true,
      certificates: certificates || [],
      pendingClaims: pendingClaims || []
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Admin: POST /api/admin/certificates - Issue a new certificate
 */
export async function issueAdminCertificate(req: any, res: Response, next: NextFunction) {
  try {
    const {
      credentialId: inputId,
      studentName,
      studentEmail,
      studentId,
      enrollmentId,
      courseTitle,
      issueDate,
      status
    } = req.body;

    if (!studentName || !courseTitle) {
      throw new HttpError(400, 'Student name and course title are required.');
    }

    let certificateImage = req.body.certificateImage;
    if (req.file) {
      certificateImage = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    }

    if (!certificateImage) {
      throw new HttpError(400, 'Certificate image (PNG file upload or base64 data URI) is required.');
    }

    // Generate Credential ID if not supplied (format: ASP-ACAD-2026-XXXXX)
    const year = new Date().getFullYear();
    const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
    const finalCredentialId = (inputId ? String(inputId).trim() : `ASP-ACAD-${year}-${randomSuffix}`).toUpperCase();

    const cert = await Certificate.findOneAndUpdate(
      { credentialId: finalCredentialId },
      {
        credentialId: finalCredentialId,
        studentName: String(studentName).trim(),
        studentEmail: studentEmail ? String(studentEmail).trim().toLowerCase() : undefined,
        studentId: studentId || undefined,
        enrollmentId: enrollmentId || undefined,
        courseTitle: String(courseTitle).trim(),
        issueDate: issueDate ? new Date(issueDate) : new Date(),
        certificateImage,
        status: status === 'revoked' ? 'revoked' : 'issued'
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Invalidate cached image
    imageCache.delete(finalCredentialId);

    // Update linked Enrollment if present
    let linkedEnrollment = enrollmentId ? await Enrollment.findById(enrollmentId) : null;
    if (!linkedEnrollment && studentId) {
      linkedEnrollment = await Enrollment.findOne({ userId: studentId, certificateStatus: 'claimed' });
    }
    if (!linkedEnrollment && studentEmail) {
      const user = await User.findOne({ email: String(studentEmail).trim().toLowerCase() });
      if (user) {
        linkedEnrollment = await Enrollment.findOne({ userId: user._id, certificateStatus: 'claimed' });
      }
    }

    if (linkedEnrollment) {
      linkedEnrollment.certificateStatus = 'issued';
      linkedEnrollment.credentialId = finalCredentialId;
      linkedEnrollment.certificateImage = certificateImage;
      linkedEnrollment.certificateIssuedAt = new Date();
      await linkedEnrollment.save();
    }

    // Purge server fastCache
    fastCache.clear();

    // Record audit log
    await recordAudit({
      req,
      action: 'ISSUE_CERTIFICATE',
      resource: 'Certificate',
      resourceId: String(cert._id),
      description: `Issued certificate ${finalCredentialId} for "${studentName}" on course "${courseTitle}".`
    });

    return res.status(201).json({
      success: true,
      message: `Certificate ${finalCredentialId} successfully issued.`,
      certificate: cert
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Admin: PUT /api/admin/certificates/:id - Update an existing certificate
 */
export async function updateAdminCertificate(req: any, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const cert = await Certificate.findOne({
      $or: [
        { _id: /^[0-9a-f]{24}$/i.test(id) ? id : null },
        { credentialId: String(id).toUpperCase() }
      ]
    });

    if (!cert) {
      throw new HttpError(404, 'Certificate record not found.');
    }

    const {
      credentialId: inputId,
      studentName,
      studentEmail,
      studentId,
      enrollmentId,
      courseTitle,
      issueDate,
      status
    } = req.body;

    let certificateImage = req.body.certificateImage;
    if (req.file) {
      certificateImage = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    }

    const oldCredentialId = cert.credentialId;

    if (inputId) {
      const cleanId = String(inputId).trim().toUpperCase();
      if (cleanId !== cert.credentialId) {
        const existing = await Certificate.findOne({ credentialId: cleanId, _id: { $ne: cert._id } });
        if (existing) {
          throw new HttpError(400, `Credential ID "${cleanId}" is already assigned to another certificate.`);
        }
        imageCache.delete(cert.credentialId);
        cert.credentialId = cleanId;
      }
    }

    // Invalidate memory buffer cache
    imageCache.delete(cert.credentialId);
    if (oldCredentialId !== cert.credentialId) {
      imageCache.delete(oldCredentialId);
    }

    if (studentName) cert.studentName = String(studentName).trim();
    if (studentEmail !== undefined) cert.studentEmail = studentEmail ? String(studentEmail).trim().toLowerCase() : undefined;
    if (studentId) cert.studentId = studentId;
    if (enrollmentId) cert.enrollmentId = enrollmentId;
    if (courseTitle) cert.courseTitle = String(courseTitle).trim();
    if (issueDate) cert.issueDate = new Date(issueDate);
    if (status && ['issued', 'revoked'].includes(status)) cert.status = status;
    if (certificateImage) cert.certificateImage = certificateImage;

    await cert.save();

    // Clear server cache
    fastCache.clear();

    // Sync linked enrollment if exists
    await Enrollment.updateMany(
      {
        $or: [
          { credentialId: oldCredentialId },
          { credentialId: cert.credentialId },
          { _id: cert.enrollmentId || null }
        ]
      },
      {
        $set: {
          credentialId: cert.credentialId,
          certificateImage: cert.certificateImage,
          certificateStatus: cert.status === 'revoked' ? 'revoked' : 'issued'
        }
      }
    );

    // Record audit log
    await recordAudit({
      req,
      action: 'UPDATE_CERTIFICATE',
      resource: 'Certificate',
      resourceId: String(cert._id),
      description: `Updated certificate ${cert.credentialId} for "${cert.studentName}".`
    });

    return res.status(200).json({
      success: true,
      message: `Certificate ${cert.credentialId} updated successfully.`,
      certificate: cert
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Admin: DELETE /api/admin/certificates/:id - Revoke or delete certificate
 */
export async function deleteAdminCertificate(req: any, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const cert = await Certificate.findOne({
      $or: [
        { _id: /^[0-9a-f]{24}$/i.test(id) ? id : null },
        { credentialId: id.toUpperCase() }
      ]
    });

    if (!cert) {
      throw new HttpError(404, 'Certificate record not found.');
    }

    imageCache.delete(cert.credentialId);

    // Reset linked enrollment if exists
    await Enrollment.updateMany(
      {
        $or: [
          { credentialId: cert.credentialId },
          { _id: cert.enrollmentId || null }
        ]
      },
      {
        $set: {
          certificateStatus: 'not_claimed',
          credentialId: null,
          certificateImage: null,
          certificateIssuedAt: null
        }
      }
    );

    await Certificate.findByIdAndDelete(cert._id);

    // Clear server cache
    fastCache.clear();

    await recordAudit({
      req,
      action: 'REVOKE_CERTIFICATE',
      resource: 'Certificate',
      resourceId: String(cert._id),
      description: `Revoked certificate with Credential ID ${cert.credentialId}.`
    });

    return res.status(200).json({
      success: true,
      message: `Certificate ${cert.credentialId} has been revoked and removed.`
    });
  } catch (error) {
    next(error);
  }
}
