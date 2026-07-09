const express = require('express');
const router = express.Router();
const adminDashboardController = require('../../controllers/admin/adminDashboardController');
const { adminProtect, requireRole } = require('../../middleware/roleMiddleware');

router.use(adminProtect);

// GET /api/v1/admin/dashboard/stats
router.get('/dashboard/stats', requireRole(['SUPER_ADMIN', 'MODERATOR', 'SUPPORT']), adminDashboardController.getStats);

// GET /api/v1/admin/audit-logs
router.get('/audit-logs', requireRole(['SUPER_ADMIN']), adminDashboardController.getAuditLogs);

module.exports = router;
