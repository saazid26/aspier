import { randomBytes } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type AuthenticatorTransportFuture,
  type AuthenticationResponseJSON,
  type RegistrationResponseJSON
} from '@simplewebauthn/server';
import User from '../models/User.js';
import { HttpError } from '../middleware/error.js';
import type { AuthRequest } from '../middleware/auth.js';
import { env } from '../config/env.js';
import { sha256 } from '../utils/crypto.js';
import { issueRefreshSession, signAccessToken } from '../services/token.service.js';
import { setAuthCookies } from '../utils/cookies.js';
import type { Types } from 'mongoose';

const rpID = new URL(env.CLIENT_URL).hostname;
const allowedRoles = ['admin', 'superadmin', 'supervisor', 'youngScholar'];

export async function beginWebAuthnLogin(user: { _id: Types.ObjectId; webAuthnEnabled?: boolean } | null) {
  if (!user) return undefined;
  if (!user.webAuthnEnabled) return undefined;
  const withCredentials = await User.findById(user._id).select('+webAuthnCredentials');
  if (!withCredentials?.webAuthnCredentials.length) return undefined;
  const token = randomBytes(32).toString('base64url');
  const options = await generateAuthenticationOptions({
    rpID,
    allowCredentials: withCredentials.webAuthnCredentials.map((credential) => ({ id: credential.id, transports: credential.transports as AuthenticatorTransportFuture[] })),
    userVerification: 'required'
  });
  await User.updateOne({ _id: user._id }, {
    $set: {
      webAuthnLoginChallenge: options.challenge,
      webAuthnLoginTokenHash: sha256(token),
      webAuthnLoginExpiresAt: new Date(Date.now() + 5 * 60 * 1000)
    }
  });
  return { token, options };
}

export async function webAuthnRegistrationOptions(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!allowedRoles.includes(req.user.role) || !req.user.twoFactorEnabled) throw new HttpError(403, 'Set up TOTP before enabling biometric authentication');
    const user = await User.findById(req.user._id).select('+webAuthnCredentials');
    if (!user) throw new HttpError(404, 'User not found');
    const options = await generateRegistrationOptions({
      rpName: 'ASPIER',
      rpID,
      userID: Buffer.from(String(user._id), 'hex'),
      userName: user.email,
      userDisplayName: user.name,
      attestationType: 'none',
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        residentKey: 'preferred',
        userVerification: 'required'
      },
      excludeCredentials: user.webAuthnCredentials.map((credential) => ({ id: credential.id, transports: credential.transports as AuthenticatorTransportFuture[] }))
    });
    await User.updateOne({ _id: user._id }, {
      $set: {
        webAuthnRegisterChallenge: options.challenge,
        webAuthnRegisterExpiresAt: new Date(Date.now() + 5 * 60 * 1000)
      }
    });
    res.json({ success: true, data: options });
  } catch (error) {
    next(error);
  }
}

export async function verifyWebAuthnRegistration(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const user = await User.findById(req.user._id).select('+webAuthnRegisterChallenge +webAuthnRegisterExpiresAt +webAuthnCredentials');
    if (!user || !user.webAuthnRegisterChallenge || !user.webAuthnRegisterExpiresAt || user.webAuthnRegisterExpiresAt <= new Date()) {
      throw new HttpError(400, 'Biometric enrollment expired. Start setup again.');
    }
    const verification = await verifyRegistrationResponse({
      response: req.body.response as RegistrationResponseJSON,
      expectedChallenge: user.webAuthnRegisterChallenge,
      expectedOrigin: env.CLIENT_URL,
      expectedRPID: rpID,
      requireUserVerification: true
    });
    if (!verification.verified || !verification.registrationInfo) throw new HttpError(400, 'Could not verify platform authenticator');
    const credential = verification.registrationInfo.credential;
    const saved = await User.updateOne({
      _id: user._id,
      webAuthnRegisterChallenge: user.webAuthnRegisterChallenge,
      webAuthnRegisterExpiresAt: { $gt: new Date() },
      'webAuthnCredentials.id': { $ne: credential.id }
    }, {
      $push: {
        webAuthnCredentials: {
          id: credential.id,
          publicKey: Buffer.from(credential.publicKey),
          counter: credential.counter,
          transports: credential.transports || []
        }
      },
      $set: { webAuthnEnabled: true },
      $unset: { webAuthnRegisterChallenge: 1, webAuthnRegisterExpiresAt: 1 }
    }, { runValidators: true });
    if (!saved.modifiedCount) throw new HttpError(409, 'Authenticator setup has expired or this authenticator is already registered');
    res.json({ success: true, data: { enabled: true, credentialCount: user.webAuthnCredentials.length + 1 } });
  } catch (error) {
    next(error);
  }
}

export async function verifyWebAuthnLogin(req: Request, res: Response, next: NextFunction) {
  try {
    const token = String(req.body.challengeToken || '');
    const user = await User.findOne({
      webAuthnLoginTokenHash: sha256(token),
      webAuthnLoginExpiresAt: { $gt: new Date() },
      isActive: true,
      twoFactorEnabled: true,
      webAuthnEnabled: true,
      role: { $in: allowedRoles }
    }).select('+webAuthnLoginChallenge +webAuthnLoginTokenHash +webAuthnLoginExpiresAt +webAuthnCredentials');
    if (!user?.webAuthnLoginChallenge) throw new HttpError(401, 'Biometric login challenge is invalid or expired');
    const response = req.body.response as AuthenticationResponseJSON;
    const credential = user.webAuthnCredentials.find((item) => item.id === response.id);
    if (!credential) throw new HttpError(401, 'Authenticator is not registered for this account');
    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: user.webAuthnLoginChallenge,
      expectedOrigin: env.CLIENT_URL,
      expectedRPID: rpID,
      requireUserVerification: true,
      credential: {
        id: credential.id,
        publicKey: Uint8Array.from(credential.publicKey),
        counter: credential.counter,
        transports: credential.transports as AuthenticatorTransportFuture[]
      }
    });
    if (!verification.verified || !verification.authenticationInfo.userVerified) throw new HttpError(401, 'Biometric verification failed');
    const claimed = await User.updateOne({
      _id: user._id,
      webAuthnLoginTokenHash: sha256(token),
      webAuthnLoginChallenge: user.webAuthnLoginChallenge,
      'webAuthnCredentials.id': credential.id
    }, {
      $set: { 'webAuthnCredentials.$.counter': verification.authenticationInfo.newCounter, otpFailedAttempts: 0 },
      $unset: { webAuthnLoginChallenge: 1, webAuthnLoginTokenHash: 1, webAuthnLoginExpiresAt: 1, otpLockedUntil: 1 }
    });
    if (!claimed.modifiedCount) throw new HttpError(409, 'Biometric login challenge has already been used');
    const accessToken = signAccessToken(user);
    const refreshToken = await issueRefreshSession(String(user._id), { device: req.headers['user-agent'], ip: req.ip });
    setAuthCookies(res, accessToken, refreshToken);
    res.json({ success: true, data: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (error) {
    next(error);
  }
}
