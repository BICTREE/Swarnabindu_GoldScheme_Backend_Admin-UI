const express = require('express');
const router = express.Router();
const userController = require('../../controllers/userController');
const { protect } = require('../../middleware/authMiddleware');
const upload = require('../../middleware/uploadMiddleware');

// Protect all routes
router.use(protect);

router.get('/dashboard', userController.getDashboard);
router.get('/profile', userController.getProfile);
router.get('/kyc/status', userController.getKycStatus);

// ── Step-by-step KYC routes (kept for partial/draft saves) ──────────────────
router.put('/kyc/personal', upload.single('profilePicture'), userController.updatePersonalKyc);

router.put('/kyc/identity', upload.fields([
  { name: 'aadhaarFront', maxCount: 1 },
  { name: 'aadhaarBack', maxCount: 1 },
  { name: 'panCardPhoto', maxCount: 1 }
]), userController.updateIdentityKyc);

router.put('/kyc/address', userController.updateAddressKyc);
router.put('/kyc/bank', userController.updateBankKyc);

router.post('/kyc/submit', upload.single('selfie'), userController.submitKyc);

// ── Unified single-call KYC submission (all sections + all files at once) ────
router.post('/kyc/submit-full', upload.fields([
  { name: 'profilePicture', maxCount: 1 },
  { name: 'aadhaarFront',   maxCount: 1 },
  { name: 'aadhaarBack',    maxCount: 1 },
  { name: 'panCardPhoto',   maxCount: 1 },
  { name: 'selfie',         maxCount: 1 }
]), userController.submitKycFull);

module.exports = router;
