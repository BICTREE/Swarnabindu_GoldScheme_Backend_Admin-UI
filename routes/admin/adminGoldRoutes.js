const express = require('express');
const router = express.Router();
const adminGoldController = require('../../controllers/admin/adminGoldController');
const { adminProtect, requireRole } = require('../../middleware/roleMiddleware');

router.use(adminProtect);

router.post('/update', requireRole(['SUPER_ADMIN', 'MODERATOR']), adminGoldController.updateGoldRate);

module.exports = router;
