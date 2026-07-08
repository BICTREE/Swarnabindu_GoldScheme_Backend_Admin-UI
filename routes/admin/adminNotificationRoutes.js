const express = require('express');
const router = express.Router();
const adminNotificationController = require('../../controllers/admin/adminNotificationController');
const { adminProtect, requireRole } = require('../../middleware/roleMiddleware');

router.use(adminProtect);

router.post('/broadcast', requireRole(['SUPER_ADMIN', 'MODERATOR']), adminNotificationController.broadcastNotification);
router.post('/user/:userId', requireRole(['SUPER_ADMIN', 'MODERATOR']), adminNotificationController.sendTargetedNotification);

module.exports = router;
