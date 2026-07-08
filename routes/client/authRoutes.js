const express = require('express');
const router = express.Router();
const authController = require('../../controllers/authController');
const { otpRateLimiter } = require('../../config/rateLimiter');

router.post('/send-otp', otpRateLimiter, authController.sendOtp);
router.post('/verify-otp', otpRateLimiter, authController.verifyOtp);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);

module.exports = router;
