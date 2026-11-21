import type { Response, NextFunction } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
import ClassModel from '../models/Class.js';
import { encrypt } from '../utils/crypto.js';
export async function upsertClass(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const body = { ...req.body };
    if (body.meetLink) { body.meetLinkEncrypted = encrypt(body.meetLink); delete body.meetLink; }
    else delete body.meetLink;
    const item = req.params.id
      ? await ClassModel.findByIdAndUpdate(req.params.id, body, { new: true, runValidators: true })
      : await ClassModel.create(body);
    res.status(req.params.id ? 200 : 201).json({ success: true, data: item });
  } catch (error) { next(error); }
}
export async function deleteClass(req: AuthRequest, res: Response) {
  await ClassModel.findByIdAndDelete(req.params.id);
  res.json({ success: true, message: 'Class deleted' });
}
