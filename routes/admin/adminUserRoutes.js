const express = require('express');
const router = express.Router();
const adminUserController = require('../../controllers/admin/adminUserController');
const { adminProtect, requireRole } = require('../../middleware/roleMiddleware');

// Protect all routes under admin users
router.use(adminProtect);



// KYC Moderation routes (placed before ID routes to avoid conflict)
router.get('/kyc/pending', requireRole(['SUPER_ADMIN', 'MODERATOR', 'SUPPORT']), adminUserController.getPendingKyc);
router.post('/kyc/:id/approve', requireRole(['SUPER_ADMIN', 'MODERATOR']), adminUserController.approveKyc);
router.post('/kyc/:id/reject', requireRole(['SUPER_ADMIN', 'MODERATOR']), adminUserController.rejectKyc);

// Standard user management routes
router.get('/', requireRole(['SUPER_ADMIN', 'MODERATOR', 'SUPPORT']), adminUserController.getUsers);
router.get('/:id', requireRole(['SUPER_ADMIN', 'MODERATOR', 'SUPPORT']), adminUserController.getUserById);
router.put('/:id/ban', requireRole(['SUPER_ADMIN', 'MODERATOR']), adminUserController.banUser);

module.exports = router;
