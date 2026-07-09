const express = require('express');
const router = express.Router();
const adminAuthController = require('../../controllers/admin/adminAuthController');
const { adminProtect, requireRole } = require('../../middleware/roleMiddleware');

router.post('/login', adminAuthController.login);
router.post('/create-admin', adminProtect, requireRole(['SUPER_ADMIN']), adminAuthController.createAdmin);





module.exports = router;
