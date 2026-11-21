import type { Types } from 'mongoose';
import Notification from '../models/Notification.js';
import { encrypt } from '../utils/crypto.js';

export async function notifyAdmins(input: { title: string; body: string; category: string; link: string }) {
  return Notification.create({ ...input, audience: 'admin' });
}

export async function notifyMember(input: {
  userId?: Types.ObjectId;
  applicationId?: Types.ObjectId;
  title: string;
  body: string;
  category: string;
  link?: string;
  secretPayload?: string;
}) {
  const { secretPayload, ...notice } = input;
  return Notification.create({
    ...notice,
    ...(secretPayload ? { secretPayloadEncrypted: encrypt(secretPayload) } : {}),
    audience: 'member'
  });
}
