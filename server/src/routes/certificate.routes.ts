import { Router } from 'express';
import { verifyCertificate, serveCertificateImage } from '../controllers/certificate.controller.js';

const router = Router();

// Public verification endpoints
router.get('/verify/:credentialId', verifyCertificate);
router.get('/verify', verifyCertificate);

// Fast raw PNG serving (< 0.2s, 1-hour cache)
router.get('/image/:credentialId', serveCertificateImage);

// Direct lookup fallback
router.get('/:credentialId', verifyCertificate);

export default router;
