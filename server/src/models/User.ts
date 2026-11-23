import { Schema, model, InferSchemaType } from 'mongoose';
import { FIXED_ADMIN_EMAIL } from '../config/env.js';
const sessionSchema = new Schema({ refreshTokenHash: { type: String, required: true }, device: String, ip: String, createdAt: { type: Date, default: Date.now }, expiresAt: Date, familyId: String, revokedAt: Date }, { _id: false });
const webAuthnCredentialSchema = new Schema({
  id: { type: String, required: true },
  publicKey: { type: Buffer, required: true },
  counter: { type: Number, required: true, default: 0 },
  transports: { type: [String], default: [] },
  name: { type: String, default: 'Platform Biometric Key' },
  createdAt: { type: Date, default: Date.now }
}, { _id: false });
const userSchema = new Schema({
  name: { type: String, required: true, trim: true, index: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ['student', 'instructor', 'supervisor', 'youngScholar', 'admin', 'superadmin'], default: 'student', index: true },
  avatar: { type: String, default: '' },
  avatarUrl: { type: String, default: '' },
  phone: { type: String, default: '', trim: true },
  university: { type: String, default: '', trim: true },
  department: { type: String, default: '', trim: true },
  academicLevel: { type: String, default: '', trim: true },
  studentId: { type: String, default: '', trim: true },
  city: { type: String, default: '', trim: true },
  bio: { type: String, default: '', trim: true },
  isActive: { type: Boolean, default: true, index: true },
  twoFactorEnabled: { type: Boolean, default: false },
  twoFactorEnabledAt: Date,
  twoFactorSecretEncrypted: { type: String, select: false },
  isAdmin2FAEnabled: { type: Boolean, default: false },
  adminTwoFactorSecretEncrypted: { type: String, select: false },
  adminStrongKeyHash: { type: String, select: false },
  adminTwoFactorSecretPendingEncrypted: { type: String, select: false },
  adminStrongKeyPendingHash: { type: String, select: false },
  backupRecoveryCodeHashes: { type: [String], default: [], select: false },
  otpFailedAttempts: { type: Number, default: 0, select: false },
  otpLockedUntil: { type: Date, select: false },
  webAuthnEnabled: { type: Boolean, default: false },
  webAuthnCredentials: { type: [webAuthnCredentialSchema], default: [], select: false },
  webAuthnRegisterChallenge: { type: String, select: false },
  webAuthnRegisterExpiresAt: { type: Date, select: false },
  webAuthnLoginChallenge: { type: String, select: false },
  webAuthnLoginTokenHash: { type: String, select: false },
  webAuthnLoginExpiresAt: { type: Date, select: false },
  admin2FASetupTokenHash: { type: String, select: false },
  admin2FASetupExpires: { type: Date, select: false },
  refreshTokens: { type: [sessionSchema], default: [], select: false },
  passwordResetTokenHash: { type: String, select: false },
  resetExpires: { type: Date, select: false }
}, { timestamps: true });
userSchema.pre('validate', function (next) {
  const currentFixedEmail = (process.env.ADMIN_EMAIL || FIXED_ADMIN_EMAIL || 'admin@gmail.com').toLowerCase();
  const allowed = [currentFixedEmail, 'admin@gmail.com', 'admin@aspier.org'];
  if (['admin', 'superadmin'].includes(this.role) && !allowed.includes(this.email.toLowerCase())) {
    this.invalidate('email', 'Only the fixed ASPIER administrator email may have an administrator role');
  }
  next();
});
export type UserDocument = InferSchemaType<typeof userSchema> & { _id: unknown };
export default model('User', userSchema);
