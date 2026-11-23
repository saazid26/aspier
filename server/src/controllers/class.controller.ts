import type { Response, NextFunction } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
import ClassModel from '../models/Class.js';
import { encrypt } from '../utils/crypto.js';
import { recordAudit } from '../services/audit.service.js';

export async function upsertClass(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const body = { ...req.body };
    if (body.meetingUrl && !body.meetLink) body.meetLink = body.meetingUrl;
    if (body.meetLink && !body.meetingUrl) body.meetingUrl = body.meetLink;
    if (body.meetLink) {
      body.meetLinkEncrypted = encrypt(body.meetLink);
    }
    if (!body.title && body.topic) body.title = body.topic;
    if (!body.topic && body.title) body.topic = body.title;
    if (!body.recordingYoutubeId && body.recordingUrl) body.recordingYoutubeId = body.recordingUrl;
    if (!body.recordingUrl && body.recordingYoutubeId) body.recordingUrl = body.recordingYoutubeId;

    const isEdit = Boolean(req.params.id);
    const item = isEdit
      ? await ClassModel.findByIdAndUpdate(req.params.id, body, { new: true, runValidators: true })
      : await ClassModel.create(body);

    await recordAudit({
      req,
      action: isEdit ? 'update_class_session' : 'create_class_session',
      description: `${isEdit ? 'Updated' : 'Created'} live class session "${body.topic || body.title || 'Live Class'}"`,
      resource: 'Class',
      resourceId: item?._id ? String(item._id) : undefined
    });

    res.status(isEdit ? 200 : 201).json({ success: true, data: item });
  } catch (error) { next(error); }
}

export async function deleteClass(req: AuthRequest, res: Response) {
  const item = await ClassModel.findByIdAndDelete(req.params.id);
  await recordAudit({
    req,
    action: 'delete_class_session',
    description: `Deleted live class session ${String(req.params.id)}`,
    resource: 'Class',
    resourceId: String(req.params.id)
  });
  res.json({ success: true, message: 'Class deleted', data: item });
}
