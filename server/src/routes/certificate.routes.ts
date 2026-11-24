import { Router } from 'express';
import {
  verifyCertificate,
  serveCertificateImage,
  getMyCertificates
} from '../controllers/certificate.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Public verification endpoints supporting slash-delimited credential IDs (e.g. AA-MYAS-HSORPW-26/11-06)
router.get(/^\/verify\/(.+)$/, verifyCertificate);
router.get('/verify/:credentialId(*)', verifyCertificate);
router.get('/verify', verifyCertificate);

// Fast raw PNG serving (< 0.2s, 1-hour cache) supporting slash IDs
router.get(/^\/image\/(.+)$/, serveCertificateImage);
router.get('/image/:credentialId(*)', serveCertificateImage);
router.get('/image', serveCertificateImage);

// Logged-in student certificates
router.get('/my', authenticate, getMyCertificates);

// Direct lookup fallback
router.get(/^\/(.+)$/, verifyCertificate);
router.get('/:credentialId(*)', verifyCertificate);

export default router;
